const crypto = require('crypto');
const { detectRouterTier } = require('./router-intelligence');

function buildInstallCommand({ apiHost, tenantSlug, installToken, bearerToken, scriptType = 'full' }) {
  return `/tool fetch url="https://${apiHost}/api/v1/router/${tenantSlug}/scripts/${scriptType}/${installToken}" http-header-field="Authorization: Bearer ${bearerToken}" dst-path="icube-${scriptType}.rsc" mode=https; :delay 2s; /import file-name="icube-${scriptType}.rsc"; :delay 1s; /file remove "icube-${scriptType}.rsc"`;
}

async function createDefaultSiteAndRouter(db, tenant, { siteName, siteLocation } = {}) {
  const apiHost = process.env.API_PUBLIC_HOST || 'web.icubeug.net';
  const tier = detectRouterTier(null);
  const radiusSecret = 'rs-' + crypto.randomBytes(16).toString('hex');
  const bearerToken = 'icube_' + crypto.randomBytes(32).toString('hex');
  const installToken = crypto.randomBytes(32).toString('hex');
  const apiUsername = 'icube-api';
  const apiPassword = 'ia-' + crypto.randomBytes(18).toString('hex');

  const [site] = await db.query(`
    INSERT INTO sites (tenant_id, name, location, status)
    VALUES ($1, $2, $3, 'active')
    RETURNING *
  `, [tenant.id, siteName || `${tenant.name} Main Site`, siteLocation || 'Default site']);

  const [portRow] = await db.query(`SELECT COALESCE(MAX(vpn_port), 51819) + 1 AS next_port FROM routers`);
  const vpnPort = Math.min(parseInt(portRow.next_port, 10), 51920);
  const vpnAddress = `vpn.icubeug.net:${vpnPort}`;

  let privateKey = '';
  let publicKey = '';
  try {
    const { execSync } = require('child_process');
    privateKey = execSync('wg genkey', { encoding: 'utf8' }).trim();
    publicKey = execSync(`echo "${privateKey}" | wg pubkey`, { encoding: 'utf8' }).trim();
  } catch {
    privateKey = crypto.randomBytes(32).toString('base64');
    publicKey = crypto.randomBytes(32).toString('base64');
  }

  const [peerRow] = await db.query(`SELECT COALESCE(MAX(wireguard_peer_index), 1) + 1 AS next_idx FROM routers`);
  const peerIdx = parseInt(peerRow.next_idx, 10);
  const peerIp = `10.99.0.${peerIdx}`;

  const [router] = await db.query(`
    INSERT INTO routers
      (tenant_id, site_id, name, ip_address, brand, radius_secret,
       vpn_port, vpn_address, wireguard_private_key, wireguard_public_key,
       wireguard_peer_ip, wireguard_peer_index, subnet_prefix, subnet_mask,
       network_address, gateway_ip, dhcp_pool_start, dhcp_pool_end,
       max_users, recommended_users, tier_name, status, bearer_token,
       install_token, api_username, api_password, api_port)
    VALUES
      ($1,$2,$3,'0.0.0.0','mikrotik',$4,$5,$6,$7,$8,$9,$10,$11,$12,
       $13,$14,$15,$16,$17,$18,$19,'offline',$20,$21,$22,$23,8728)
    RETURNING *
  `, [
    tenant.id, site.id, `${tenant.name} Main Router`, radiusSecret,
    vpnPort, vpnAddress, privateKey, publicKey, peerIp, peerIdx,
    tier.subnet_prefix, tier.subnet_mask, tier.network, tier.gateway,
    tier.pool_start, tier.pool_end, tier.max_users, tier.recommended_users,
    tier.tier_name, bearerToken, installToken, apiUsername, apiPassword,
  ]);

  return {
    site,
    router,
    setup_cli: buildInstallCommand({
      apiHost,
      tenantSlug: tenant.slug,
      installToken,
      bearerToken,
      scriptType: 'full',
    }),
    vpn_cli: buildInstallCommand({
      apiHost,
      tenantSlug: tenant.slug,
      installToken,
      bearerToken,
      scriptType: 'vpn',
    }),
  };
}

module.exports = { createDefaultSiteAndRouter, buildInstallCommand };

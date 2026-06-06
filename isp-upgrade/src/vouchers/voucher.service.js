// src/vouchers/voucher.service.js

const CHARSETS = {
  digits:          '0123456789',
  uppercase:       'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase:       'abcdefghijklmnopqrstuvwxyz',
  uppercase_alpha: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase_alpha: '0123456789abcdefghijklmnopqrstuvwxyz',
};

function generateCode(format = 'digits', length = 8) {
  const charset = CHARSETS[format] || CHARSETS.digits;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

async function generateVoucherCode(db, { package_id, site_id, tenant_id, source, agent_id, format, length }) {
  const code = generateCode(format, length);

  const pkgRows = await db.query('SELECT * FROM packages WHERE id = $1', [package_id]);
  if (!pkgRows.length) throw new Error('Package not found');
  const pkg = pkgRows[0];

  const rows = await db.query(`
    INSERT INTO vouchers (site_id, package_id, code, tenant_id, source, agent_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [site_id, package_id, code, tenant_id, source || 'admin', agent_id || null]);

  const voucher = rows[0];

  // Sync to FreeRADIUS radcheck / radreply
  await syncVoucherToRadius(db, { voucher, pkg });

  return voucher;
}

// Insert voucher credentials into FreeRADIUS tables so MikroTik can authenticate
async function syncVoucherToRadius(db, { voucher, pkg }) {
  const code = voucher.code;

  // radcheck: username = code, password = code (hotspot style)
  await db.query(`
    INSERT INTO radcheck (username, attribute, op, value)
    VALUES ($1, 'Cleartext-Password', ':=', $2)
    ON CONFLICT (username, attribute) DO UPDATE SET value = EXCLUDED.value
  `, [code, code]);

  // radreply: bandwidth limit from package
  const dl = pkg.download_mbps || pkg.speed_mbps || 10;
  const ul = pkg.upload_mbps   || pkg.speed_mbps || 5;
  const rateLimit = `${dl}M/${ul}M`;

  await db.query(`
    INSERT INTO radreply (username, attribute, op, value)
    VALUES ($1, 'Mikrotik-Rate-Limit', '=', $2)
    ON CONFLICT (username, attribute) DO UPDATE SET value = EXCLUDED.value
  `, [code, rateLimit]);

  // Session-Timeout: convert duration_hrs to seconds
  if (pkg.duration_hrs) {
    const timeoutSecs = pkg.duration_hrs * 3600;
    await db.query(`
      INSERT INTO radreply (username, attribute, op, value)
      VALUES ($1, 'Session-Timeout', '=', $2)
      ON CONFLICT (username, attribute) DO UPDATE SET value = EXCLUDED.value
    `, [code, String(timeoutSecs)]);
  }
}

// Remove voucher from RADIUS tables when expired or fully consumed
async function removeVoucherFromRadius(db, code) {
  await db.query(`DELETE FROM radcheck WHERE username = $1`, [code]);
  await db.query(`DELETE FROM radreply  WHERE username = $1`, [code]);
}

// Sweep expired vouchers out of RADIUS
async function sweepExpiredVoucherRadiusEntries(db) {
  const expired = await db.query(`
    SELECT code FROM vouchers
    WHERE status IN ('expired','used') AND code IS NOT NULL
  `);
  for (const row of expired) {
    await removeVoucherFromRadius(db, row.code).catch(() => {});
  }
  return expired.length;
}

module.exports = {
  generateVoucherCode,
  syncVoucherToRadius,
  removeVoucherFromRadius,
  sweepExpiredVoucherRadiusEntries,
};

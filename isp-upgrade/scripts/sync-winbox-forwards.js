#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const OUT_DIR = process.env.WINBOX_SYSTEMD_DIR || '/etc/systemd/system';
const HOST = process.env.REMOTE_WINBOX_HOST || 'vpn.icubeug.net';

function unitName(routerId) {
  return `icube-winbox-${String(routerId).replace(/[^a-zA-Z0-9-]/g, '')}.service`;
}

function unitContent(router) {
  return `[Unit]
Description=iCube Winbox forward ${router.name} (${HOST}:${router.vpn_port})
After=network-online.target
Wants=network-online.target

[Service]
Restart=always
RestartSec=3
ExecStart=/usr/bin/socat TCP-LISTEN:${router.vpn_port},fork,reuseaddr TCP:${router.wireguard_peer_ip}:8291

[Install]
WantedBy=multi-user.target
`;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(`
    SELECT id, name, vpn_port, vpn_address, wireguard_peer_ip
    FROM routers
    WHERE vpn_port IS NOT NULL
      AND wireguard_peer_ip IS NOT NULL
      AND vpn_port BETWEEN 32600 AND 39999
    ORDER BY vpn_port ASC
  `);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const row of rows) {
    const file = path.join(OUT_DIR, unitName(row.id));
    fs.writeFileSync(file, unitContent(row), 'utf8');
    console.log(`${row.vpn_address || `${HOST}:${row.vpn_port}`} -> ${row.wireguard_peer_ip}:8291`);
  }
  await client.end();
  console.log(`Generated ${rows.length} Winbox forward unit(s). Run: systemctl daemon-reload && systemctl enable --now icube-winbox-*.service`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});

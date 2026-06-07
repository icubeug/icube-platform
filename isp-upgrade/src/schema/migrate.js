require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

const migrations = [
  'base_schema.sql',
  '002_new_tables.sql',
  '003_icube_platform.sql',
  '004_radius_wireguard.sql',
  '005_free_plan.sql',
  '006_tenants_full_columns.sql',
  '007_vpn_ports_site_limits.sql',
  '008_router_monitoring.sql',
  '009_bearer_tokens.sql',
  '010_router_requests.sql',
  '011_totp_deletion.sql',
  '012_ai_conversations.sql',
  '013_portal_template.sql',
  '014_router_api_credentials.sql',
  '015_remote_winbox_ports.sql',
];

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function hasMigrationRun(client, filename) {
  const result = await client.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1',
    [filename]
  );
  return result.rowCount > 0;
}

async function runMigration(client, filename) {
  const filePath = path.join(__dirname, filename);
  const sql = await fs.readFile(filePath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`Applied ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    err.message = `Failed ${filename}: ${err.message}`;
    throw err;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);

    for (const filename of migrations) {
      if (await hasMigrationRun(client, filename)) {
        console.log(`Skipped ${filename}`);
        continue;
      }
      await runMigration(client, filename);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message || err}\n`);
  process.exit(1);
});

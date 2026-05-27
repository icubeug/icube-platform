// src/vouchers/voucher.service.js

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function generateVoucherCode(db, { package_id, site_id, tenant_id, source, agent_id }) {
  const code = generateCode();

  // Fetch package duration for expiry calc
  const pkgRows = await db.query(
    'SELECT * FROM packages WHERE id = $1', [package_id]
  );
  if (!pkgRows.length) throw new Error('Package not found');

  const rows = await db.query(`
    INSERT INTO vouchers (site_id, package_id, code, tenant_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [site_id, package_id, code, tenant_id]);

  return rows[0];
}

module.exports = { generateVoucherCode };

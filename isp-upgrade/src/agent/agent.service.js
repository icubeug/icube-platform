// src/agent/agent.service.js
// Agent / POS system — ground agents sell packages for cash or mobile money.
// Flow: agent logs in with phone+PIN → selects package → customer pays →
//       voucher auto-generated → SMS sent to customer → commission credited.

const bcrypt = require('bcrypt');
const { generateVoucherCode } = require('../vouchers/voucher.service');
const { sendSMS } = require('../notifications/sms.service');
const { createPayment } = require('../payments/payment.service');
const { normalizePhone } = require('../utils/phone');

// ── Agent authentication (PIN-based, lightweight for field use) ──────────────

async function authenticateAgent(db, { phone, pin }) {
  const rows = await db.query(
    `SELECT * FROM agents WHERE phone = $1 AND status = 'active'`,
    [normalizePhone(phone)]
  );
  if (!rows.length) throw new Error('Agent not found or suspended');

  const agent = rows[0];
  const valid = await bcrypt.compare(String(pin), agent.pin_hash);
  if (!valid) throw new Error('Invalid PIN');

  return {
    id: agent.id,
    name: agent.name,
    phone: agent.phone,
    site_id: agent.site_id,
    commission_pct: agent.commission_pct,
    wallet_balance: agent.wallet_balance,
  };
}

// ── Core POS sale ─────────────────────────────────────────────────────────────

async function processSale(db, redis, {
  agent_id,
  site_id,
  package_id,
  customer_phone,
  payment_method = 'cash',
  tenant_id,
}) {
  // 1. Load package
  const pkgRows = await db.query(
    `SELECT * FROM packages WHERE id = $1 AND active = true`,
    [package_id]
  );
  if (!pkgRows.length) throw new Error('Package not found or inactive');
  const pkg = pkgRows[0];

  // 2. Load agent & validate commission
  const agentRows = await db.query(
    `SELECT * FROM agents WHERE id = $1 AND status = 'active'`,
    [agent_id]
  );
  if (!agentRows.length) throw new Error('Agent not found');
  const agent = agentRows[0];

  const amount = Number(pkg.price_ugx);
  const commission = parseFloat((amount * agent.commission_pct / 100).toFixed(0));

  // 3. Generate voucher
  const voucher = await generateVoucherCode(db, {
    package_id,
    site_id,
    tenant_id,
    source: 'agent_pos',
    agent_id,
  });

  // 4. Record payment
  const payment = await createPayment(db, {
    tenant_id,
    voucher_id: voucher.id,
    amount_ugx: amount,
    method: payment_method,
    status: 'completed',   // cash = instant; mobile money handled separately
    metadata: { agent_id, agent_name: agent.name },
  });

  const normalized_customer_phone = normalizePhone(customer_phone);

  // 5. Record POS sale
  await db.query(`
    INSERT INTO pos_sales
      (agent_id, site_id, package_id, customer_phone, voucher_id,
       amount_ugx, commission_ugx, payment_method)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [agent_id, site_id, package_id, normalized_customer_phone,
      voucher.id, amount, commission, payment_method]);

  // 6. Credit agent wallet
  await creditAgentWallet(db, agent_id, commission, `Sale: ${pkg.name}`);

  // 7. Send voucher SMS to customer
  const smsBody =
    `Your WiFi voucher: ${voucher.code}\n` +
    `Package: ${pkg.name}\n` +
    `Valid: ${pkg.duration_label}\n` +
    `Connect to WiFi and enter this code. Enjoy!`;

  await sendSMS(normalized_customer_phone, smsBody);

  // 8. Bust AI context cache so assistant sees fresh data
  await redis.del('ai:site_status', 'ai:network_metrics');

  return {
    success: true,
    voucher_code: voucher.code,
    package_name: pkg.name,
    amount_ugx: amount,
    commission_ugx: commission,
    customer_phone: normalized_customer_phone,
    sms_sent: true,
  };
}

// ── Agent wallet management ───────────────────────────────────────────────────

async function creditAgentWallet(db, agent_id, amount_ugx, reference) {
  // Atomic update + insert transaction log
  await db.query('BEGIN');
  try {
    const rows = await db.query(
      `UPDATE agents
       SET wallet_balance = wallet_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING wallet_balance`,
      [amount_ugx, agent_id]
    );
    const balance_after = rows[0].wallet_balance;

    await db.query(`
      INSERT INTO agent_wallet_txns (agent_id, type, amount_ugx, balance_after, reference)
      VALUES ($1, 'commission', $2, $3, $4)
    `, [agent_id, amount_ugx, balance_after, reference]);

    await db.query('COMMIT');
    return balance_after;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

async function requestWithdrawal(db, agent_id, amount_ugx, payout_phone) {
  const agentRows = await db.query(
    `SELECT wallet_balance FROM agents WHERE id = $1`,
    [agent_id]
  );
  const { wallet_balance } = agentRows[0];

  if (amount_ugx > wallet_balance) {
    throw new Error(`Insufficient wallet balance. Available: UGX ${wallet_balance}`);
  }

  await db.query('BEGIN');
  try {
    await db.query(
      `UPDATE agents SET wallet_balance = wallet_balance - $1 WHERE id = $2`,
      [amount_ugx, agent_id]
    );
    const balance_after = wallet_balance - amount_ugx;
    await db.query(`
      INSERT INTO agent_wallet_txns (agent_id, type, amount_ugx, balance_after, reference)
      VALUES ($1, 'withdrawal', $2, $3, $4)
    `, [agent_id, amount_ugx, balance_after, `Withdrawal to ${payout_phone}`]);
    await db.query('COMMIT');

    // TODO: trigger actual mobile money payout via MTN/Airtel API
    return { success: true, withdrawn: amount_ugx, balance_after };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

async function getAgentDashboard(db, agent_id) {
  const [agent, sales, wallet] = await Promise.all([
    db.query(`SELECT id, name, phone, commission_pct, wallet_balance FROM agents WHERE id = $1`, [agent_id]),
    db.query(`
      SELECT
        COUNT(*)                                               AS total_sales,
        SUM(amount_ugx)                                        AS total_revenue,
        SUM(commission_ugx)                                    AS total_commission,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') AS sales_today,
        SUM(amount_ugx) FILTER (WHERE created_at > NOW() - INTERVAL '24h') AS revenue_today
      FROM pos_sales WHERE agent_id = $1
    `, [agent_id]),
    db.query(`
      SELECT type, amount_ugx, reference, created_at
      FROM agent_wallet_txns WHERE agent_id = $1
      ORDER BY created_at DESC LIMIT 20
    `, [agent_id]),
  ]);

  return {
    agent: agent[0],
    stats: sales[0],
    recent_transactions: wallet,
  };
}

module.exports = {
  authenticateAgent,
  processSale,
  creditAgentWallet,
  requestWithdrawal,
  getAgentDashboard,
};

// src/payments/payment.service.js — with platform fee deduction

async function getPlatformFee(db, key) {
  try {
    const rows = await db.query(`SELECT value FROM platform_settings WHERE key = $1`, [key]);
    return parseFloat(rows[0]?.value || '0');
  } catch { return 0; }
}

async function createPayment(db, {
  tenant_id, voucher_id, site_id, amount_ugx, method, status, metadata = {},
  source = 'voucher', customer_phone, customer_name, voucher_code,
}) {
  const rows = await db.query(`
    INSERT INTO payments
      (tenant_id, voucher_id, site_id, amount_ugx, method, status, reference,
       customer_phone, customer_name, voucher_code)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `, [tenant_id, voucher_id, site_id || null, amount_ugx, method, status,
      JSON.stringify(metadata), customer_phone || null, customer_name || null, voucher_code || null]);
  const payment = rows[0];
  if (status === 'completed') {
    await deductPlatformFee(db, { tenant_id, payment_id: payment.id, amount: parseFloat(amount_ugx), source });
  }
  return payment;
}

async function deductPlatformFee(db, { tenant_id, payment_id, amount, source }) {
  try {
    const feeKey = source === 'momo' ? 'momo_platform_fee_pct' : 'voucher_platform_fee_pct';
    const feePct = await getPlatformFee(db, feeKey);
    if (feePct <= 0) return;
    const feeAmount = parseFloat((amount * feePct / 100).toFixed(2));
    const netAmount = parseFloat((amount - feeAmount).toFixed(2));
    const feeRef    = 'FEE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    await db.query(`
      INSERT INTO platform_transactions
        (tenant_id, payment_id, type, source, gross_amount, fee_pct, fee_amount, net_amount,
         transaction_id, operation, note, amount, balance_after)
      VALUES ($1,$2,'platform_fee',$3,$4,$5,$6,$7,$8,'debit',
              'iCube platform fee (' || $5 || '%) on ' || $3 || ' sale', $6, 0)
    `, [tenant_id, payment_id, source, amount, feePct, feeAmount, netAmount, feeRef]);
  } catch (err) {
    console.error('[PlatformFee] Failed to record fee:', err.message);
  }
}

module.exports = { createPayment, deductPlatformFee, getPlatformFee };

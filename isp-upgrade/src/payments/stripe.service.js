// src/payments/stripe.service.js
// Stripe card payment integration — international customers, online purchases.
// Works alongside existing MTN/Airtel mobile money.

const Stripe = require('stripe');

let stripe;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured');
  }
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

// ── Create a payment intent (called before checkout) ─────────────────────────
async function createPaymentIntent(db, { tenant_id, package_id, customer_phone, customer_email }) {
  const pkgRows = await db.query(
    `SELECT * FROM packages WHERE id = $1 AND active = true`, [package_id]
  );
  if (!pkgRows.length) throw new Error('Package not found');
  const pkg = pkgRows[0];

  // Convert UGX to USD cents for Stripe (UGX is not directly supported — use USD)
  // Store UGX amount separately; charge in USD at approximate rate
  const ugx_amount = Number(pkg.price_ugx);
  const usd_cents  = Math.round(ugx_amount / 38);  // ~3800 UGX/USD; update rate regularly

  const intent = await getStripe().paymentIntents.create({
    amount: usd_cents,
    currency: 'usd',
    metadata: {
      tenant_id,
      package_id,
      package_name: pkg.name,
      customer_phone,
      ugx_amount: String(ugx_amount),
    },
    description: `WiFi package: ${pkg.name}`,
    receipt_email: customer_email || undefined,
  });

  return {
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
    amount_usd_cents: usd_cents,
    amount_ugx: ugx_amount,
    package: pkg,
  };
}

// ── Handle Stripe webhook (payment confirmed) ─────────────────────────────────
// Mount at POST /api/webhooks/stripe — must use raw body parser
async function handleWebhook(db, redis, rawBody, signature) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhooks are not configured');
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new Error(`Webhook signature invalid: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const { tenant_id, package_id, customer_phone, ugx_amount } = intent.metadata;

    // Generate voucher
    const { generateVoucherCode } = require('../vouchers/voucher.service');
    const { sendSMS } = require('../notifications/sms.service');

    const voucher = await generateVoucherCode(db, {
      package_id,
      tenant_id,
      source: 'stripe',
    });

    // Record payment
    await db.query(`
      INSERT INTO payments
        (tenant_id, voucher_id, amount_ugx, method, status,
         stripe_payment_intent_id, card_last4, card_brand)
      VALUES ($1,$2,$3,'card','completed',$4,$5,$6)
    `, [
      tenant_id,
      voucher.id,
      ugx_amount,
      intent.id,
      intent.payment_method_details?.card?.last4 || null,
      intent.payment_method_details?.card?.brand || null,
    ]);

    // SMS voucher to customer
    const pkgRows = await db.query(`SELECT name, duration_label FROM packages WHERE id = $1`, [package_id]);
    const pkg = pkgRows[0];

    await sendSMS(customer_phone,
      `Payment received! Your WiFi voucher: ${voucher.code}\n` +
      `Package: ${pkg.name} (${pkg.duration_label})\n` +
      `Connect to WiFi and enter your code.`
    );

    // Bust AI cache
    await redis.del('ai:site_status', 'ai:network_metrics');

    console.log(`[Stripe] Voucher ${voucher.code} issued for ${customer_phone}`);
  }

  return { received: true };
}

module.exports = { createPaymentIntent, handleWebhook };

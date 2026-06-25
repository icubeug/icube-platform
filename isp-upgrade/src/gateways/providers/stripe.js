// src/gateways/providers/stripe.js
// Stripe — card collection only (no disbursement).
// Env vars: STRIPE_SECRET_KEY
//
// Stripe does not support mobile-money disbursement; use MTN/Airtel for that.
// For payouts to bank accounts, wire up Stripe Connect separately.

function isConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

async function initiateCollection({ amount_ugx, reference, currency = 'ugx', metadata = {} }) {
  if (!isConfigured()) throw new Error('Stripe not configured');
  const Stripe = require('stripe');
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const intent = await stripe.paymentIntents.create({
    amount:      Math.round(amount_ugx * 100), // Stripe uses smallest unit; UGX has no cents but keep consistent
    currency,
    metadata:    { reference, ...metadata },
    description: reference,
  });
  return { provider_ref: intent.id, client_secret: intent.client_secret, status: 'pending' };
}

async function pollCollection(provider_ref) {
  if (!isConfigured()) throw new Error('Stripe not configured');
  const Stripe = require('stripe');
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const intent = await stripe.paymentIntents.retrieve(provider_ref);
  const status = intent.status === 'succeeded'           ? 'completed'
               : intent.status === 'canceled'            ? 'failed'
               : intent.status === 'requires_payment_method' ? 'failed'
               : 'pending';
  return { status, raw: intent };
}

// Stripe card disbursements are not supported via the standard API.
// Use Stripe Connect or Stripe Payouts for bank transfers.
async function initiateDisbursement() {
  throw new Error('Stripe disbursement not supported — use MTN or Airtel for mobile-money payouts');
}

async function pollDisbursement() {
  throw new Error('Stripe disbursement not supported');
}

module.exports = { isConfigured, initiateCollection, pollCollection, initiateDisbursement, pollDisbursement };

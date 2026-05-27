// src/payments/stripe.routes.js
const express = require('express');
const { createPaymentIntent, handleWebhook } = require('./stripe.service');

// Webhook router — uses raw body (mounted before express.json in app.js)
const webhookRouter = express.Router();
webhookRouter.post('/', async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const result = await handleWebhook(req.app.locals.db, req.app.locals.redis, req.body, sig);
    res.json(result);
  } catch (err) {
    console.error('[Stripe Webhook]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Main payment routes router
const router = express.Router();

// POST /api/v1/payments/stripe/intent
// Body: { package_id, customer_phone, customer_email?, tenant_id? }
router.post('/intent', async (req, res) => {
  try {
    const { package_id, customer_phone, customer_email } = req.body;
    if (!package_id || !customer_phone) {
      return res.status(400).json({ error: 'package_id and customer_phone required' });
    }
    const result = await createPaymentIntent(req.app.locals.db, {
      tenant_id: req.tenant_id,
      package_id,
      customer_phone,
      customer_email,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { webhookRouter, router };

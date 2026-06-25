// src/gateways/gateway.routes.js
// GET  /api/v1/gateways                    — list all providers + configured status
// POST /api/v1/gateways/collect            — initiate a collection (admin-triggered)
// GET  /api/v1/gateways/collect/:ref       — poll collection status
// POST /api/v1/gateways/disburse           — initiate a disbursement
// GET  /api/v1/gateways/disburse/:ref      — poll disbursement status
//
// The disbursements route also has a shortcut:
//   POST /api/v1/disbursements/:id/send    — send a pending disbursement record via gateway

const express  = require('express');
const { requireAdmin } = require('../auth/admin.middleware');
const {
  listProviders,
  detectProviderByPhone,
  initiateCollection,
  pollCollection,
  initiateDisbursement,
  pollDisbursement,
} = require('./gateway.service');

const router = express.Router();
router.use(requireAdmin);

// GET /api/v1/gateways
router.get('/', (req, res) => {
  res.json({ providers: listProviders() });
});

// POST /api/v1/gateways/collect
// Body: { provider?, phone, amount_ugx, reference? }
// If provider is omitted, auto-detects from phone prefix (MTN/Airtel Uganda).
router.post('/collect', async (req, res) => {
  const { phone, amount_ugx, reference } = req.body;
  let { provider } = req.body;
  if (!phone || !amount_ugx) {
    return res.status(400).json({ error: 'phone and amount_ugx required' });
  }
  if (!provider) {
    provider = detectProviderByPhone(phone);
    if (!provider) return res.status(400).json({ error: 'Cannot detect provider from phone — pass provider explicitly (mtn|airtel|stripe)' });
  }
  try {
    const result = await initiateCollection({ provider, phone, amount_ugx, reference });
    res.status(202).json({ provider, ...result });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/v1/gateways/collect/:ref?provider=mtn
router.get('/collect/:ref', async (req, res) => {
  const { provider } = req.query;
  if (!provider) return res.status(400).json({ error: 'provider query param required' });
  try {
    const result = await pollCollection(provider, req.params.ref);
    res.json({ provider, provider_ref: req.params.ref, ...result });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/v1/gateways/disburse
// Body: { provider?, phone, amount_ugx, reference?, reason? }
router.post('/disburse', async (req, res) => {
  const { phone, amount_ugx, reference, reason } = req.body;
  let { provider } = req.body;
  if (!phone || !amount_ugx) {
    return res.status(400).json({ error: 'phone and amount_ugx required' });
  }
  if (!provider) {
    provider = detectProviderByPhone(phone);
    if (!provider) return res.status(400).json({ error: 'Cannot detect provider from phone — pass provider explicitly (mtn|airtel)' });
  }
  try {
    const result = await initiateDisbursement({ provider, phone, amount_ugx, reference, reason });
    res.status(202).json({ provider, ...result });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/v1/gateways/disburse/:ref?provider=mtn
router.get('/disburse/:ref', async (req, res) => {
  const { provider } = req.query;
  if (!provider) return res.status(400).json({ error: 'provider query param required' });
  try {
    const result = await pollDisbursement(provider, req.params.ref);
    res.json({ provider, provider_ref: req.params.ref, ...result });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;

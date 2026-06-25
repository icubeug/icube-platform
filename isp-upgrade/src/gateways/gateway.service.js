// src/gateways/gateway.service.js
// Provider factory for payment collection and disbursement.
//
// To add a new gateway:
//   1. Create src/gateways/providers/<name>.js implementing the interface below.
//   2. Register it in PROVIDERS.
//   3. Add its env-var prefix to .env.example.
//
// Interface each provider must export:
//   isConfigured()                                           → boolean
//   initiateCollection({ phone, amount_ugx, reference })    → { provider_ref, status }
//   pollCollection(provider_ref)                             → { status: 'pending'|'completed'|'failed', raw }
//   initiateDisbursement({ phone, amount_ugx, reference })  → { provider_ref, status }
//   pollDisbursement(provider_ref)                          → { status: 'pending'|'completed'|'failed', raw }

const PROVIDERS = {
  mtn:    require('./providers/mtn'),
  airtel: require('./providers/airtel'),
  stripe: require('./providers/stripe'),
};

// Phone prefix → provider auto-detection for Uganda numbers
const MTN_PREFIXES    = ['077', '078', '076', '039', '031'];
const AIRTEL_PREFIXES = ['070', '075', '074', '073'];

function detectProviderByPhone(phone) {
  const local = phone.replace(/^\+256/, '0').replace(/^256/, '0');
  const prefix = local.substring(0, 3);
  if (MTN_PREFIXES.includes(prefix))    return 'mtn';
  if (AIRTEL_PREFIXES.includes(prefix)) return 'airtel';
  return null;
}

function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown payment provider: ${name}`);
  return p;
}

function listProviders() {
  return Object.entries(PROVIDERS).map(([id, p]) => ({
    id,
    configured: p.isConfigured(),
    supports_collection:    true,
    supports_disbursement:  id !== 'stripe',
  }));
}

// ── Collection helpers ────────────────────────────────────────────────────────

async function initiateCollection({ provider, phone, amount_ugx, reference, ...rest }) {
  const p = getProvider(provider);
  if (!p.isConfigured()) throw new Error(`${provider} is not configured — check env vars`);
  return p.initiateCollection({ phone, amount_ugx, reference, ...rest });
}

async function pollCollection(provider, provider_ref) {
  return getProvider(provider).pollCollection(provider_ref);
}

// ── Disbursement helpers ──────────────────────────────────────────────────────

async function initiateDisbursement({ provider, phone, amount_ugx, reference, reason, ...rest }) {
  const p = getProvider(provider);
  if (!p.isConfigured()) throw new Error(`${provider} is not configured — check env vars`);
  return p.initiateDisbursement({ phone, amount_ugx, reference, reason, ...rest });
}

async function pollDisbursement(provider, provider_ref) {
  return getProvider(provider).pollDisbursement(provider_ref);
}

module.exports = {
  PROVIDERS,
  detectProviderByPhone,
  getProvider,
  listProviders,
  initiateCollection,
  pollCollection,
  initiateDisbursement,
  pollDisbursement,
};

// src/gateways/providers/airtel.js
// Airtel Money Uganda — collection and disbursement.
// Env vars: AIRTEL_CLIENT_ID, AIRTEL_CLIENT_SECRET,
//           AIRTEL_BASE_URL, AIRTEL_COUNTRY, AIRTEL_CURRENCY
//
// API reference: https://developers.airtel.africa/

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.env.AIRTEL_BASE_URL  || 'https://openapi.airtel.africa';
const COUNTRY  = process.env.AIRTEL_COUNTRY   || 'UG';
const CURRENCY = process.env.AIRTEL_CURRENCY  || 'UGX';

function isConfigured() {
  return !!(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);
}

async function getToken() {
  const { data } = await axios.post(
    `${BASE_URL}/auth/oauth2/token`,
    {
      client_id:     process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type:    'client_credentials',
    },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return data.access_token;
}

// ── Collection ────────────────────────────────────────────────────────────────

async function initiateCollection({ phone, amount_ugx, reference, currency = CURRENCY }) {
  const token  = await getToken();
  const extRef = reference || uuidv4();
  const { data } = await axios.post(
    `${BASE_URL}/merchant/v2/payments/`,
    {
      reference: extRef,
      subscriber: { country: COUNTRY, currency, msisdn: phone.replace(/^\+/, '') },
      transaction: { amount: amount_ugx, country: COUNTRY, currency, id: extRef },
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country':     COUNTRY,
        'X-Currency':    currency,
        'Content-Type':  'application/json',
      },
    }
  );
  const providerRef = data?.data?.transaction?.id || extRef;
  return { provider_ref: providerRef, status: 'pending' };
}

async function pollCollection(provider_ref) {
  const token = await getToken();
  const { data } = await axios.get(
    `${BASE_URL}/standard/v1/payments/${provider_ref}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country':     COUNTRY,
        'X-Currency':    CURRENCY,
      },
    }
  );
  // Airtel statuses: TS (success), TIP (in progress), TF (failed)
  const txnStatus = data?.data?.transaction?.status;
  const status = txnStatus === 'TS' ? 'completed'
               : txnStatus === 'TF' ? 'failed'
               : 'pending';
  return { status, raw: data };
}

// ── Disbursement ──────────────────────────────────────────────────────────────

async function initiateDisbursement({ phone, amount_ugx, reference, reason = 'Payout', currency = CURRENCY }) {
  const token  = await getToken();
  const extRef = reference || uuidv4();
  const { data } = await axios.post(
    `${BASE_URL}/standard/v1/disbursements/`,
    {
      payee:       { msisdn: phone.replace(/^\+/, '') },
      reference:   extRef,
      pin:         process.env.AIRTEL_DISBURSE_PIN || '',
      transaction: { amount: amount_ugx, id: extRef },
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country':     COUNTRY,
        'X-Currency':    currency,
        'Content-Type':  'application/json',
      },
    }
  );
  const providerRef = data?.data?.transaction?.id || extRef;
  return { provider_ref: providerRef, status: 'pending' };
}

async function pollDisbursement(provider_ref) {
  const token = await getToken();
  const { data } = await axios.get(
    `${BASE_URL}/standard/v1/disbursements/${provider_ref}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Country':     COUNTRY,
        'X-Currency':    CURRENCY,
      },
    }
  );
  const txnStatus = data?.data?.transaction?.status;
  const status = txnStatus === 'TS' ? 'completed'
               : txnStatus === 'TF' ? 'failed'
               : 'pending';
  return { status, raw: data };
}

module.exports = { isConfigured, initiateCollection, pollCollection, initiateDisbursement, pollDisbursement };

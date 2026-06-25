// src/gateways/providers/mtn.js
// MTN Mobile Money Uganda — collection and disbursement.
// Env vars: MTN_API_KEY, MTN_API_SECRET, MTN_SUBSCRIPTION_KEY,
//           MTN_COLLECTION_URL, MTN_TARGET_ENVIRONMENT
//
// Wire up by adding your MTN API credentials to .env.
// API reference: https://momodeveloper.mtn.com/

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.env.MTN_COLLECTION_URL || 'https://sandbox.momodeveloper.mtn.com';
const ENV      = process.env.MTN_TARGET_ENVIRONMENT || 'sandbox';
const SUB_KEY  = process.env.MTN_SUBSCRIPTION_KEY  || '';
const API_KEY  = process.env.MTN_API_KEY            || '';
const API_SEC  = process.env.MTN_API_SECRET         || '';

function isConfigured() {
  return !!(process.env.MTN_API_KEY && process.env.MTN_SUBSCRIPTION_KEY);
}

async function getToken(product = 'collection') {
  const credentials = Buffer.from(`${API_KEY}:${API_SEC}`).toString('base64');
  const { data } = await axios.post(
    `${BASE_URL}/${product}/token/`,
    {},
    {
      headers: {
        'Authorization':              `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key':  SUB_KEY,
      },
    }
  );
  return data.access_token;
}

// ── Collection (receive from customer) ───────────────────────────────────────

async function initiateCollection({ phone, amount_ugx, reference, currency = 'UGX' }) {
  const token  = await getToken('collection');
  const extRef = reference || uuidv4();
  await axios.post(
    `${BASE_URL}/collection/v1_0/requesttopay`,
    {
      amount:          String(amount_ugx),
      currency,
      externalId:      extRef,
      payer:           { partyIdType: 'MSISDN', partyId: phone.replace(/^\+/, '') },
      payerMessage:    'Payment for internet service',
      payeeNote:       'iCube ISP',
    },
    {
      headers: {
        'Authorization':              `Bearer ${token}`,
        'X-Reference-Id':             extRef,
        'X-Target-Environment':       ENV,
        'Ocp-Apim-Subscription-Key':  SUB_KEY,
        'Content-Type':               'application/json',
      },
    }
  );
  return { provider_ref: extRef, status: 'pending' };
}

async function pollCollection(provider_ref) {
  const token = await getToken('collection');
  const { data } = await axios.get(
    `${BASE_URL}/collection/v1_0/requesttopay/${provider_ref}`,
    {
      headers: {
        'Authorization':             `Bearer ${token}`,
        'X-Target-Environment':      ENV,
        'Ocp-Apim-Subscription-Key': SUB_KEY,
      },
    }
  );
  // MTN statuses: PENDING, SUCCESSFUL, FAILED
  const status = data.status === 'SUCCESSFUL' ? 'completed'
               : data.status === 'FAILED'      ? 'failed'
               : 'pending';
  return { status, raw: data };
}

// ── Disbursement (send to agent / customer) ───────────────────────────────────

async function initiateDisbursement({ phone, amount_ugx, reference, reason = 'Commission payout', currency = 'UGX' }) {
  const token  = await getToken('disbursement');
  const extRef = reference || uuidv4();
  await axios.post(
    `${BASE_URL}/disbursement/v1_0/transfer`,
    {
      amount:     String(amount_ugx),
      currency,
      externalId: extRef,
      payee:      { partyIdType: 'MSISDN', partyId: phone.replace(/^\+/, '') },
      payerMessage: reason,
      payeeNote:    'iCube payout',
    },
    {
      headers: {
        'Authorization':              `Bearer ${token}`,
        'X-Reference-Id':             extRef,
        'X-Target-Environment':       ENV,
        'Ocp-Apim-Subscription-Key':  SUB_KEY,
        'Content-Type':               'application/json',
      },
    }
  );
  return { provider_ref: extRef, status: 'pending' };
}

async function pollDisbursement(provider_ref) {
  const token = await getToken('disbursement');
  const { data } = await axios.get(
    `${BASE_URL}/disbursement/v1_0/transfer/${provider_ref}`,
    {
      headers: {
        'Authorization':             `Bearer ${token}`,
        'X-Target-Environment':      ENV,
        'Ocp-Apim-Subscription-Key': SUB_KEY,
      },
    }
  );
  const status = data.status === 'SUCCESSFUL' ? 'completed'
               : data.status === 'FAILED'      ? 'failed'
               : 'pending';
  return { status, raw: data };
}

module.exports = { isConfigured, initiateCollection, pollCollection, initiateDisbursement, pollDisbursement };

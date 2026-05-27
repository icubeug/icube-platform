// src/multirouter/router.factory.js
// Unified router adapter — one interface, any hardware brand.
// Call getAdapter(router) and use the same API regardless of vendor.
//
// Usage:
//   const adapter = await getAdapter(router);
//   await adapter.createHotspotUser({ username, password, profile });
//   await adapter.getActiveSessions();
//   await adapter.setSpeedLimit(username, '5M/2M');

const MikroTikAdapter = require('./adapters/mikrotik.adapter');
const UniFiAdapter    = require('./adapters/unifi.adapter');
const OmadaAdapter    = require('./adapters/omada.adapter');
const RuijieAdapter   = require('./adapters/ruijie.adapter');
const GenericAdapter  = require('./adapters/generic.adapter');

const ADAPTERS = {
  mikrotik:       MikroTikAdapter,
  ubiquiti_unifi: UniFiAdapter,
  tplink_omada:   OmadaAdapter,
  ruijie:         RuijieAdapter,
};

async function getAdapter(router) {
  const AdapterClass = ADAPTERS[router.brand] || GenericAdapter;
  const adapter = new AdapterClass(router);
  await adapter.connect();
  return adapter;
}

module.exports = { getAdapter };

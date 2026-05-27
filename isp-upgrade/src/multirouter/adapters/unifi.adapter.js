// src/multirouter/adapters/unifi.adapter.js
// Ubiquiti UniFi adapter — uses UniFi Network REST API.

const axios = require('axios');
const https = require('https');

class UniFiAdapter {
  constructor(router) {
    this.router = router;
    this.cfg    = router.adapter_config || {};
    this.token  = null;
    this.http   = axios.create({
      baseURL: this.cfg.controller_url,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Self-signed certs common
      withCredentials: true,
    });
  }

  async connect() {
    const res = await this.http.post('/api/auth/login', {
      username: this.router.api_username,
      password: this.router.api_password,
    });
    this.token = res.data?.data?.token || res.headers['x-csrf-token'];
    this.http.defaults.headers.common['X-CSRF-Token'] = this.token;
    this.site = this.cfg.site_id || 'default';
  }

  async createHotspotUser({ username, password, profile = 'default', comment = '' }) {
    return this.http.post(`/proxy/network/api/s/${this.site}/rest/hotspotop`, {
      name: username, password, note: comment,
    });
  }

  async removeHotspotUser(username) {
    const users = await this.http.get(`/proxy/network/api/s/${this.site}/rest/hotspotop`);
    const user  = users.data?.data?.find(u => u.name === username);
    if (user) {
      await this.http.delete(`/proxy/network/api/s/${this.site}/rest/hotspotop/${user._id}`);
    }
  }

  async getActiveSessions() {
    const res = await this.http.get(`/proxy/network/api/s/${this.site}/stat/sta`);
    return (res.data?.data || []).map(c => ({
      username:  c.hostname || c.mac,
      mac:       c.mac,
      ip:        c.ip,
      bytes_in:  c.rx_bytes || 0,
      bytes_out: c.tx_bytes || 0,
      uptime:    c.uptime || 0,
    }));
  }

  async getSystemHealth() {
    const res = await this.http.get(`/proxy/network/api/s/${this.site}/stat/health`);
    return { raw: res.data?.data };
  }

  async setSpeedLimit(username, rateLimit) {
    // UniFi uses RADIUS group overrides — push via RADIUS, not API
    console.warn('[UniFi] Speed limit via RADIUS, not direct API');
  }

  async disconnect() {}
  async rebootRouter() {
    const devices = await this.http.get(`/proxy/network/api/s/${this.site}/stat/device`);
    const device  = devices.data?.data?.[0];
    if (device) {
      await this.http.post(`/proxy/network/api/s/${this.site}/cmd/devmgr`, {
        cmd: 'restart', mac: device.mac,
      });
    }
  }
  async runCommand(cmd) { throw new Error('UniFi does not support arbitrary commands via API'); }
}

module.exports = UniFiAdapter;


// ════════════════════════════════════════════════════════════════
// src/multirouter/adapters/omada.adapter.js
// TP-Link Omada SDN Controller adapter
// ════════════════════════════════════════════════════════════════

class OmadaAdapter {
  constructor(router) {
    this.router = router;
    this.cfg    = router.adapter_config || {};
    this.token  = null;
    this.http   = axios.create({ baseURL: this.cfg.controller_url });
  }

  async connect() {
    const res = await this.http.post(`/${this.cfg.omada_cid}/api/v2/hotspot/login`, {
      username: this.router.api_username,
      password: this.router.api_password,
    });
    this.token = res.data?.result?.token;
    this.http.defaults.headers.common['Csrf-Token'] = this.token;
    this.site_id = this.cfg.site_id;
    this.cid     = this.cfg.omada_cid;
  }

  async createHotspotUser({ username, password, profile = 'default' }) {
    return this.http.post(
      `/${this.cid}/api/v2/sites/${this.site_id}/hotspot/users`,
      { name: username, password, packageId: profile }
    );
  }

  async removeHotspotUser(username) {
    const res   = await this.http.get(`/${this.cid}/api/v2/sites/${this.site_id}/hotspot/users`);
    const users = res.data?.result?.data || [];
    const user  = users.find(u => u.name === username);
    if (user) {
      await this.http.delete(`/${this.cid}/api/v2/sites/${this.site_id}/hotspot/users/${user.id}`);
    }
  }

  async getActiveSessions() {
    const res = await this.http.get(
      `/${this.cid}/api/v2/sites/${this.site_id}/hotspot/onlineClients`
    );
    return (res.data?.result?.data || []).map(c => ({
      username:  c.account || c.mac,
      mac:       c.mac,
      ip:        c.ip,
      bytes_in:  c.download || 0,
      bytes_out: c.upload   || 0,
      uptime:    c.connectTime || 0,
    }));
  }

  async getSystemHealth() {
    const res = await this.http.get(`/${this.cid}/api/v2/sites/${this.site_id}/dashboard/overviewDatas`);
    return res.data?.result || {};
  }

  async setSpeedLimit(username, rateLimit) {
    console.warn('[Omada] Speed limit via package profile update');
  }

  async disconnect() {}
  async rebootRouter() { console.warn('[Omada] Reboot via controller UI or SNMP'); }
  async runCommand(cmd) { throw new Error('Omada does not support arbitrary commands'); }
}

module.exports.OmadaAdapter = OmadaAdapter;


// ════════════════════════════════════════════════════════════════
// src/multirouter/adapters/ruijie.adapter.js
// Ruijie Reyee Cloud / local REST adapter
// ════════════════════════════════════════════════════════════════

class RuijieAdapter {
  constructor(router) {
    this.router = router;
    this.cfg    = router.adapter_config || {};
    this.token  = null;
    this.http   = axios.create({ baseURL: this.cfg.base_url });
  }

  async connect() {
    const res = await this.http.post('/api/v1/user/login', {
      username: this.router.api_username,
      password: this.router.api_password,
    });
    this.token = res.data?.data?.token;
    this.http.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
  }

  async createHotspotUser({ username, password, profile = 'default' }) {
    return this.http.post('/api/v1/portal/user/create', {
      account: username, password,
      templateId: profile,
      apGroup: this.cfg.ap_group || 'default',
    });
  }

  async removeHotspotUser(username) {
    return this.http.post('/api/v1/portal/user/delete', { account: username });
  }

  async getActiveSessions() {
    const res = await this.http.get('/api/v1/portal/user/online');
    return (res.data?.data || []).map(c => ({
      username:  c.account || c.mac,
      mac:       c.mac,
      ip:        c.ipAddr,
      bytes_in:  c.upFlow  || 0,
      bytes_out: c.downFlow || 0,
      uptime:    c.onlineTime || 0,
    }));
  }

  async getSystemHealth() {
    const res = await this.http.get('/api/v1/device/status');
    return res.data?.data || {};
  }

  async setSpeedLimit(username, rateLimit) {
    const [down, up] = rateLimit.split('/').map(r => parseInt(r) * 1000);
    return this.http.post('/api/v1/portal/user/limit', {
      account: username,
      upLimit: up, downLimit: down,
    });
  }

  async disconnect() {}
  async rebootRouter() {
    return this.http.post('/api/v1/device/reboot');
  }
  async runCommand(cmd) { throw new Error('Ruijie does not support arbitrary commands'); }
}

module.exports.RuijieAdapter = RuijieAdapter;

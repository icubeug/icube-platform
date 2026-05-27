// src/multirouter/adapters/mikrotik.adapter.js
// MikroTik RouterOS API adapter.
// Uses the RouterOS API protocol (port 8728/8729) via node-routeros.

const RouterOSAPI = require('node-routeros').RouterOSAPI;

class MikroTikAdapter {
  constructor(router) {
    this.router = router;
    this.cfg    = router.adapter_config || {};
    this.api    = null;
  }

  async connect() {
    this.api = new RouterOSAPI({
      host:     this.router.ip_address,
      user:     this.router.api_username,
      password: this.router.api_password,
      port:     this.cfg.api_port || 8728,
      tls:      this.cfg.use_ssl  || false,
      timeout:  10,
    });
    await this.api.connect();
  }

  async disconnect() {
    if (this.api) await this.api.disconnect();
  }

  // ── Hotspot users ───────────────────────────────────────────────────────────

  async createHotspotUser({ username, password, profile = 'default', comment = '' }) {
    return this.api.write('/ip/hotspot/user/add', [
      `=name=${username}`,
      `=password=${password}`,
      `=profile=${profile}`,
      `=comment=${comment}`,
    ]);
  }

  async removeHotspotUser(username) {
    const users = await this.api.write('/ip/hotspot/user/print', [`?name=${username}`]);
    if (users.length) {
      await this.api.write('/ip/hotspot/user/remove', [`=.id=${users[0]['.id']}`]);
    }
  }

  async getActiveSessions() {
    const sessions = await this.api.write('/ip/hotspot/active/print');
    return sessions.map(s => ({
      username:   s.user,
      mac:        s['mac-address'],
      ip:         s.address,
      uptime:     s.uptime,
      bytes_in:   parseInt(s['bytes-in'])  || 0,
      bytes_out:  parseInt(s['bytes-out']) || 0,
      idle_time:  s['idle-time'],
    }));
  }

  // ── PPPoE users ─────────────────────────────────────────────────────────────

  async createPPPoEUser({ username, password, profile, comment = '', service = 'pppoe' }) {
    return this.api.write('/ppp/secret/add', [
      `=name=${username}`,
      `=password=${password}`,
      `=service=${service}`,
      `=profile=${profile}`,
      `=comment=${comment}`,
    ]);
  }

  async suspendPPPoEUser(username) {
    const secrets = await this.api.write('/ppp/secret/print', [`?name=${username}`]);
    if (secrets.length) {
      await this.api.write('/ppp/secret/set', [
        `=.id=${secrets[0]['.id']}`,
        `=disabled=yes`,
      ]);
    }
    // Also kick active session if connected
    const active = await this.api.write('/ppp/active/print', [`?name=${username}`]);
    if (active.length) {
      await this.api.write('/ppp/active/remove', [`=.id=${active[0]['.id']}`]);
    }
  }

  async reactivatePPPoEUser(username) {
    const secrets = await this.api.write('/ppp/secret/print', [`?name=${username}`]);
    if (secrets.length) {
      await this.api.write('/ppp/secret/set', [
        `=.id=${secrets[0]['.id']}`,
        `=disabled=no`,
      ]);
    }
  }

  // ── Speed / bandwidth control ───────────────────────────────────────────────

  async setSpeedLimit(username, rateLimit) {
    // rateLimit format: '10M/5M' (download/upload)
    const users = await this.api.write('/ip/hotspot/user/print', [`?name=${username}`]);
    if (users.length) {
      await this.api.write('/ip/hotspot/user/set', [
        `=.id=${users[0]['.id']}`,
        `=rate-limit=${rateLimit}`,
      ]);
    }
  }

  // ── System health ───────────────────────────────────────────────────────────

  async getSystemHealth() {
    const [resource, interfaces] = await Promise.all([
      this.api.write('/system/resource/print'),
      this.api.write('/interface/print'),
    ]);
    const r = resource[0] || {};
    return {
      uptime:       r.uptime,
      cpu_load:     parseInt(r['cpu-load']) || 0,
      memory_total: parseInt(r['total-memory']) || 0,
      memory_free:  parseInt(r['free-memory'])  || 0,
      board_name:   r['board-name'],
      ros_version:  r.version,
      interfaces:   interfaces.map(i => ({
        name:     i.name,
        type:     i.type,
        running:  i.running === 'true',
        rx_bytes: parseInt(i['rx-byte']) || 0,
        tx_bytes: parseInt(i['tx-byte']) || 0,
      })),
    };
  }

  async rebootRouter() {
    await this.api.write('/system/reboot');
  }

  async runCommand(command) {
    // For remote terminal — sanitize before use
    return this.api.write(command);
  }
}

module.exports = MikroTikAdapter;

class GenericAdapter {
  constructor(router) {
    this.router = router;
  }

  async connect() {
    throw new Error(`Router adapter for "${this.router.brand || 'unknown'}" is not implemented`);
  }

  async disconnect() {}

  async createHotspotUser() {
    throw new Error('Hotspot user management is not implemented for this router brand');
  }

  async removeHotspotUser() {
    throw new Error('Hotspot user management is not implemented for this router brand');
  }

  async getActiveSessions() {
    return [];
  }

  async getSystemHealth() {
    throw new Error('Health checks are not implemented for this router brand');
  }

  async setSpeedLimit() {
    throw new Error('Speed limits are not implemented for this router brand');
  }

  async rebootRouter() {
    throw new Error('Reboot is not implemented for this router brand');
  }

  async runCommand() {
    throw new Error('Command execution is not implemented for this router brand');
  }
}

module.exports = GenericAdapter;

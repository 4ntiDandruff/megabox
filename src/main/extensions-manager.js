const { session } = require('electron');
const path = require('path');
const fs = require('fs');

class ExtensionsManager {
  constructor() {
    this.extensionsDir = path.join(__dirname, '../../extensions');
    this.catalog = [
      {
        id: 'dark-reader',
        name: 'Dark Reader',
        version: '4.9.96',
        description: 'Dark mode for every website. Care your eyes, use dark theme for night and daily browsing.',
        icon: 'assets/icons/chat.svg',
        builtin: true
      },
      {
        id: 'bitwarden',
        name: 'Bitwarden Password Manager',
        version: '2024.10.0',
        description: 'Secure and free password manager for all of your devices.',
        icon: 'assets/icons/bitwarden.svg',
        builtin: true
      },
      {
        id: 'ublock-origin',
        name: 'uBlock Origin',
        version: '1.60.0',
        description: 'An efficient blocker. Easy on CPU and memory.',
        icon: 'assets/icons/bell.svg',
        builtin: true
      }
    ];
  }

  getCatalog() {
    return this.catalog;
  }

  async loadExtensionForSession(ses, extensionId) {
    try {
      const extPath = path.join(this.extensionsDir, extensionId);
      if (fs.existsSync(extPath)) {
        await ses.loadExtension(extPath, { allowFileAccess: true });
        console.log(`[Megabox Extensions] Loaded ${extensionId} into session`);
        return { success: true };
      }
      return { success: false, reason: 'Extension folder not found' };
    } catch (err) {
      console.warn(`[Megabox Extensions] Failed to load ${extensionId}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new ExtensionsManager();

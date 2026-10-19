const path = require('path');
const fs = require('fs');

class ExtensionsManager {
  constructor() {
    this.extensionsDir = path.join(__dirname, '../../extensions');
    this.catalog = [
      {
        id: 'simple-translate',
        name: 'Simple Translate',
        version: '3.1.0',
        description: 'Terjemahkan teks terpilih seketika dengan tooltip melayang otomatis & pengaturan lengkap.',
        icon: 'assets/icons/simple-translate.png',
        builtin: true,
        hasSettings: true
      },
      {
        id: 'ublock-origin',
        name: 'uBlock Origin',
        version: '1.60.0',
        description: 'Pemblokir iklan & pelacak efisien. Ringan beban RAM dan CPU.',
        icon: 'assets/icons/shield.svg',
        builtin: true,
        hasSettings: false
      },
      {
        id: 'dark-reader',
        name: 'Dark Reader',
        version: '4.9.96',
        description: 'Mode gelap pintar untuk kenyamanan mata di setiap website.',
        icon: 'assets/icons/theme-light-dark.svg',
        builtin: true,
        hasSettings: false
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
        if (ses.extensions && typeof ses.extensions.loadExtension === 'function') {
          await ses.extensions.loadExtension(extPath, { allowFileAccess: true });
        } else if (typeof ses.loadExtension === 'function') {
          await ses.loadExtension(extPath, { allowFileAccess: true });
        }
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

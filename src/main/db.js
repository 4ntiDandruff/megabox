const path = require('path');
const os = require('os');
const fs = require('fs');

function getDefaultDbPath() {
  const configDir = path.join(os.homedir(), '.config', 'megabox');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'megabox-config.json');
}

function initDatabase(customPath = null) {
  const filePath = customPath || getDefaultDbPath();
  
  const defaults = [
    { id: 'whatsapp', name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: 'whatsapp', partition: 'persist:whatsapp', order_index: 0, is_enabled: 1 },
    { id: 'telegram', name: 'Telegram', url: 'https://web.telegram.org/a/', icon: 'telegram', partition: 'persist:telegram', order_index: 1, is_enabled: 1 },
    { id: 'discord', name: 'Discord', url: 'https://discord.com/app', icon: 'discord', partition: 'persist:discord', order_index: 2, is_enabled: 1 },
    { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com', icon: 'gmail', partition: 'persist:gmail', order_index: 3, is_enabled: 1 }
  ];

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ apps: defaults, settings: {} }, null, 2), 'utf-8');
  }

  return {
    filePath,
    read: function() {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      } catch (e) {
        return { apps: defaults, settings: {} };
      }
    },
    write: function(data) {
      // Atomic write (temp file + rename) for abrupt power-loss safety (Cak Hizam SOP)
      const tmpPath = this.filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    }
  };
}

function getApps(db) {
  const data = db.read();
  return (data.apps || []).filter(a => a.is_enabled === 1).sort((a, b) => a.order_index - b.order_index);
}

function saveApp(db, app) {
  const data = db.read();
  data.apps = data.apps || [];
  const idx = data.apps.findIndex(a => a.id === app.id);
  const cleanApp = {
    id: app.id,
    name: app.name,
    url: app.url,
    icon: app.icon || 'globe',
    custom_icon: app.custom_icon || null,
    partition: app.partition || ('persist:' + app.id),
    partition_type: app.partition_type || (app.partition && app.partition.includes('workspace_shared') ? 'shared' : 'private'),
    order_index: app.order_index !== undefined ? app.order_index : data.apps.length,
    is_enabled: app.is_enabled !== undefined ? app.is_enabled : 1,
    user_agent: app.user_agent || null,
    proxy: app.proxy || ''
  };
  if (idx >= 0) {
    data.apps[idx] = cleanApp;
  } else {
    data.apps.push(cleanApp);
  }
  db.write(data);
}

function deleteApp(db, id) {
  const data = db.read();
  data.apps = (data.apps || []).filter(a => a.id !== id);
  db.write(data);
}


function reorderApp(db, id, direction) {
  const data = db.read();
  data.apps = (data.apps || []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const idx = data.apps.findIndex(a => a.id === id);
  if (idx < 0) return data.apps;

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx >= 0 && targetIdx < data.apps.length) {
    const temp = data.apps[idx];
    data.apps[idx] = data.apps[targetIdx];
    data.apps[targetIdx] = temp;
    data.apps.forEach((a, i) => { a.order_index = i; });
    db.write(data);
  }
  return data.apps;
}


const defaultSettings = {
  language: 'en',
    auto_check_updates: true,
    dismissed_update_version: null,
    dismissed_update_time: 0,
  hibernate_timeout_minutes: 15,
  close_to_tray: true,
  autostart: false,
};

function getSettings(db) {
  const data = db.read();
  return Object.assign({}, defaultSettings, data.settings || {});
}

function saveSettings(db, newSettings) {
  const data = db.read();
  data.settings = Object.assign({}, defaultSettings, data.settings || {}, newSettings);
  db.write(data);
  return data.settings;
}

module.exports = {
  getDefaultDbPath,
  initDatabase,
  getApps,
  saveApp,
  deleteApp,
  reorderApp,
  getSettings,
  saveSettings
};

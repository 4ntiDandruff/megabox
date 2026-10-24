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
    fs.writeFileSync(filePath, JSON.stringify({ apps: defaults, settings: {}, downloads: [] }, null, 2), 'utf-8');
  }

  return {
    filePath,
    read: function() {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      } catch (e) {
        return { apps: defaults, settings: {}, downloads: [] };
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

// ==========================================
// Download History Management (Zero-Bloat)
// ==========================================
function getDownloads(db, limit = 50) {
  const data = db.read();
  const list = data.downloads || [];
  return list.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, limit);
}

function saveDownload(db, item) {
  const data = db.read();
  data.downloads = data.downloads || [];
  const idx = data.downloads.findIndex(d => d.id === item.id);
  const cleanItem = {
    id: String(item.id || ('dl_' + Date.now())),
    filename: String(item.filename || 'download'),
    path: String(item.path || ''),
    url: String(item.url || ''),
    total_bytes: Number(item.total_bytes || 0),
    received_bytes: Number(item.received_bytes || 0),
    state: item.state || 'completed',
    service_name: String(item.service_name || 'Megabox'),
    timestamp: Number(item.timestamp || Date.now())
  };

  if (idx >= 0) {
    data.downloads[idx] = cleanItem;
  } else {
    data.downloads.push(cleanItem);
  }
  
  // Cap history at 150 items to keep storage lean
  if (data.downloads.length > 150) {
    data.downloads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    data.downloads = data.downloads.slice(0, 150);
  }

  db.write(data);
  return cleanItem;
}

function deleteDownload(db, id) {
  const data = db.read();
  data.downloads = (data.downloads || []).filter(d => d.id !== id);
  db.write(data);
}

function clearDownloads(db) {
  const data = db.read();
  data.downloads = [];
  db.write(data);
}


// ==========================================
// Permanent Clipboard & Snippet Library (Zero-Bloat)
// ==========================================
function getSnippets(db) {
  const data = db.read();
  const list = data.snippets || [];
  return list.slice().sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
}

function saveSnippet(db, snippet) {
  const data = db.read();
  data.snippets = data.snippets || [];
  const idx = data.snippets.findIndex(s => s.id === snippet.id);
  const cleanSnippet = {
    id: String(snippet.id || ('snip_' + Date.now())),
    title: String(snippet.title || 'Untitled Snippet').trim(),
    content: String(snippet.content || '').trim(),
    category: String(snippet.category || 'Umum').trim(),
    usage_count: Number(snippet.usage_count || 0),
    created_at: Number(snippet.created_at || Date.now()),
    updated_at: Date.now()
  };

  if (idx >= 0) {
    cleanSnippet.created_at = data.snippets[idx].created_at || cleanSnippet.created_at;
    data.snippets[idx] = cleanSnippet;
  } else {
    data.snippets.push(cleanSnippet);
  }

  db.write(data);
  return cleanSnippet;
}

function deleteSnippet(db, id) {
  const data = db.read();
  data.snippets = (data.snippets || []).filter(s => s.id !== id);
  db.write(data);
}

function incrementSnippetUsage(db, id) {
  const data = db.read();
  data.snippets = data.snippets || [];
  const s = data.snippets.find(item => item.id === id);
  if (s) {
    s.usage_count = (s.usage_count || 0) + 1;
    s.updated_at = Date.now();
    db.write(data);
  }
}

module.exports = {
  getDefaultDbPath,
  initDatabase,
  getApps,
  saveApp,
  deleteApp,
  reorderApp,
  getSettings,
  saveSettings,
  getDownloads,
  saveDownload,
  deleteDownload,
  clearDownloads,
  getSnippets,
  saveSnippet,
  deleteSnippet,
  incrementSnippetUsage
};

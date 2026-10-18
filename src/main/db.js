const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

function getDefaultDbPath() {
  const configDir = path.join(os.homedir(), '.config', 'megabox');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'megabox.db');
}

function initDatabase(customPath = null) {
  const dbPath = customPath || getDefaultDbPath();
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT NOT NULL,
      partition TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      is_enabled INTEGER DEFAULT 1,
      is_muted INTEGER DEFAULT 0,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as total FROM apps').get().total;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO apps (id, name, url, icon, partition, order_index, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const defaults = [
      ['whatsapp', 'WhatsApp', 'https://web.whatsapp.com', 'whatsapp', 'persist:whatsapp', 0],
      ['telegram', 'Telegram', 'https://web.telegram.org/a/', 'telegram', 'persist:telegram', 1],
      ['discord', 'Discord', 'https://discord.com/app', 'discord', 'persist:discord', 2],
      ['gmail', 'Gmail', 'https://mail.google.com', 'gmail', 'persist:gmail', 3]
    ];

    for (const d of defaults) {
      insert.run(...d);
    }
  }

  return db;
}

function getApps(db) {
  return db.prepare('SELECT * FROM apps WHERE is_enabled = 1 ORDER BY order_index ASC').all();
}

function saveApp(db, app) {
  const stmt = db.prepare(`
    INSERT INTO apps (id, name, url, icon, partition, order_index, is_enabled, is_muted, user_agent)
    VALUES (@id, @name, @url, @icon, @partition, @order_index, @is_enabled, 0, @user_agent)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      url = excluded.url,
      icon = excluded.icon,
      partition = excluded.partition,
      order_index = excluded.order_index,
      is_enabled = excluded.is_enabled,
      user_agent = excluded.user_agent
  `);
  stmt.run({
    id: app.id,
    name: app.name,
    url: app.url,
    icon: app.icon || 'globe',
    partition: app.partition || ('persist:' + app.id),
    order_index: app.order_index || 0,
    is_enabled: app.is_enabled !== undefined ? app.is_enabled : 1,
    user_agent: app.user_agent || null
  });
}

function deleteApp(db, id) {
  db.prepare('DELETE FROM apps WHERE id = ?').run(id);
}

module.exports = {
  getDefaultDbPath,
  initDatabase,
  getApps,
  saveApp,
  deleteApp
};

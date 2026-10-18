const assert = require('assert');
const fs = require('fs');

const testPath = '/tmp/megabox_test_config.json';
if (fs.existsSync(testPath)) fs.unlinkSync(testPath);

const { initDatabase, getApps, saveApp, deleteApp } = require('../src/main/db.js');

const db = initDatabase(testPath);

// 1. Initial Preset Apps
const initialApps = getApps(db);
assert(initialApps.length >= 3, 'Must have at least 3 default presets (WhatsApp, Telegram, Discord)');

// 2. Add Custom App
const newApp = {
  id: 'custom_test',
  name: 'Slack Work',
  url: 'https://app.slack.com',
  icon: 'slack',
  partition: 'persist:slack_work',
  order_index: 99,
  is_enabled: 1
};
saveApp(db, newApp);

const appsAfterAdd = getApps(db);
const found = appsAfterAdd.find(a => a.id === 'custom_test');
assert(found, 'Added app must exist in database');
assert.strictEqual(found.name, 'Slack Work');

// 3. Delete App
deleteApp(db, 'custom_test');
const appsAfterDelete = getApps(db);
assert(!appsAfterDelete.find(a => a.id === 'custom_test'), 'Deleted app must not exist');

console.log('PASS: test_db.js (zero-dependency JSON store) passed cleanly');

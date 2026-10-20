const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { initDatabase, getDownloads, saveDownload, deleteDownload, clearDownloads } = require('../src/main/db');

const testDbPath = path.join(os.tmpdir(), `megabox-test-downloads-${Date.now()}.json`);

try {
  console.log('[TEST] Initializing test database at:', testDbPath);
  const db = initDatabase(testDbPath);

  // 1. Initial state should have empty downloads
  let downloads = getDownloads(db);
  assert(Array.isArray(downloads), 'getDownloads should return an array');
  assert.strictEqual(downloads.length, 0, 'Initial downloads should be empty');

  // 2. Save a completed download
  const item1 = {
    id: 'dl_001',
    filename: 'document.pdf',
    path: '/tmp/document.pdf',
    url: 'https://example.com/document.pdf',
    total_bytes: 1048576,
    received_bytes: 1048576,
    state: 'completed',
    service_name: 'Telegram',
    timestamp: 1000
  };
  saveDownload(db, item1);

  downloads = getDownloads(db);
  assert.strictEqual(downloads.length, 1, 'Downloads should contain 1 item');
  assert.strictEqual(downloads[0].id, 'dl_001');
  assert.strictEqual(downloads[0].filename, 'document.pdf');
  assert.strictEqual(downloads[0].state, 'completed');

  // 3. Save a second item and verify ordering (newest first)
  const item2 = {
    id: 'dl_002',
    filename: 'image.png',
    path: '/tmp/image.png',
    url: 'https://example.com/image.png',
    total_bytes: 524288,
    received_bytes: 524288,
    state: 'completed',
    service_name: 'WhatsApp',
    timestamp: 2000
  };
  saveDownload(db, item2);

  downloads = getDownloads(db);
  assert.strictEqual(downloads.length, 2, 'Downloads should contain 2 items');
  assert.strictEqual(downloads[0].id, 'dl_002', 'Newest download should be first');
  assert.strictEqual(downloads[1].id, 'dl_001', 'Older download should be second');

  // 4. Update existing download state/info
  const item1Update = {
    ...item1,
    state: 'completed',
    received_bytes: 1048576,
    timestamp: 3000
  };
  saveDownload(db, item1Update);
  downloads = getDownloads(db);
  assert.strictEqual(downloads.length, 2, 'Should still contain 2 items after update');
  assert.strictEqual(downloads[0].id, 'dl_001', 'Updated download with newer timestamp is first');

  // 5. Delete specific download
  deleteDownload(db, 'dl_001');
  downloads = getDownloads(db);
  assert.strictEqual(downloads.length, 1, 'Should contain 1 item after deletion');
  assert.strictEqual(downloads[0].id, 'dl_002');

  // 6. Clear all downloads
  clearDownloads(db);
  downloads = getDownloads(db);
  assert.strictEqual(downloads.length, 0, 'Downloads should be empty after clearDownloads');

  console.log('[+] PASS: test_downloads.js passed cleanly!');
} finally {
  if (fs.existsSync(testDbPath)) {
    try { fs.unlinkSync(testDbPath); } catch (_) {}
  }
}

const assert = require('assert');

function isNewerVersion(current, remote) {
  if (!remote || !current) return false;
  const cleanCurrent = current.replace(/^v/, '');
  const cleanRemote = remote.replace(/^v/, '');
  
  const cParts = cleanCurrent.split('.').map(n => parseInt(n, 10) || 0);
  const rParts = cleanRemote.split('.').map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

function isUpdateDismissed(remoteVersion, dismissedVersion, dismissedTime, now = Date.now()) {
  if (dismissedVersion === remoteVersion) {
    const SNOOZE_MS = 72 * 60 * 60 * 1000;
    if (now - dismissedTime < SNOOZE_MS) {
      return true;
    }
  }
  return false;
}

console.log('Running test_updater.js...');

assert.strictEqual(isNewerVersion('1.5.0', '1.6.0'), true);
assert.strictEqual(isNewerVersion('v1.5.0', 'v1.6.0'), true);
assert.strictEqual(isNewerVersion('1.5.0', '1.5.0'), false);
assert.strictEqual(isNewerVersion('1.5.0', '1.4.2'), false);
assert.strictEqual(isNewerVersion('1.5.0', '2.0.0'), true);
assert.strictEqual(isNewerVersion('1.5.0', '1.5.1'), true);

const now = 1000000000000;
const oneDayAgo = now - (24 * 60 * 60 * 1000);
const fourDaysAgo = now - (96 * 60 * 60 * 1000);

assert.strictEqual(isUpdateDismissed('v1.6.0', 'v1.6.0', oneDayAgo, now), true);
assert.strictEqual(isUpdateDismissed('v1.6.0', 'v1.6.0', fourDaysAgo, now), false);
assert.strictEqual(isUpdateDismissed('v1.7.0', 'v1.6.0', oneDayAgo, now), false);

console.log('[+] test_updater.js PASSED: All semver and snooze tests valid!');

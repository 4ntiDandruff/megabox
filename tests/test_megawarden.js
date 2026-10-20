const assert = require('assert');
const { MegawardenVault, extractDomain, getRootDomain, parseCsvText } = require('../src/main/megawarden.js');

console.log('[AUDIT] Running tests/test_megawarden.js...');

// 1. Domain extraction & Root domain
assert.strictEqual(extractDomain('https://web.whatsapp.com/send'), 'web.whatsapp.com');
assert.strictEqual(getRootDomain(extractDomain('https://web.whatsapp.com/send')), 'whatsapp.com');
assert.strictEqual(extractDomain('https://sub.domain.co.id/login'), 'sub.domain.co.id');
assert.strictEqual(getRootDomain('sub.domain.co.id'), 'domain.co.id');
assert.strictEqual(getRootDomain('web.telegram.org'), 'telegram.org');
assert.strictEqual(extractDomain('android://hash@com.twitter.android/'), 'com.twitter.android');

// 2. CSV parsing
const csvSample = `name,url,username,password,note
"Google","https://accounts.google.com","user@gmail.com","p@ss,w""ord","Catatan penting"`;
const parsed = parseCsvText(csvSample);
assert.strictEqual(parsed.length, 2);
assert.strictEqual(parsed[1][0], 'Google');
assert.strictEqual(parsed[1][3], 'p@ss,w"ord');

// 3. Vault CRUD and encryption roundtrip
const vault = new MegawardenVault();
const testEntry = {
  name: 'Test Audit Service',
  url: 'https://test.audit.megapass.web.id/login',
  username: 'audit_operator',
  password: 'SuperSecretAuditPassword!2026',
  note: 'Enkripsi AES-256-GCM'
};

const saved = vault.save(testEntry);
assert.ok(saved.id.startsWith('mw_'));

const list = vault.list();
const found = list.find(i => i.id === saved.id);
assert.ok(found);
assert.strictEqual(found.password, 'SuperSecretAuditPassword!2026');

// 4. Autofill matching (matching root domain)
const matches = vault.findForUrl('https://app.audit.megapass.web.id/dashboard');
assert.ok(matches && matches.length > 0);
assert.strictEqual(matches[0].username, 'audit_operator');

// 5. Password generator
const pass1 = vault.generatePassword({ length: 24, symbols: true });
assert.strictEqual(pass1.length, 24);

// 6. Cleanup
vault.delete(saved.id);
const listAfter = vault.list();
assert.ok(!listAfter.find(i => i.id === saved.id));

console.log('[AUDIT] PASS: test_megawarden.js all assertions passed cleanly!');

const assert = require('assert');
const { getTargetUserAgent } = require('../src/main/extensions.js');

// 1. Google accounts must return proven Chromeless UA (without Chrome version to bypass OAuth block)
const googleUrl = 'https://accounts.google.com/signin/v2/identifier';
const googleUa = getTargetUserAgent(googleUrl);
assert(googleUa.includes('Chrome'), 'Google URL must contain Chrome Safari family');
assert(!googleUa.includes('Chrome/'), 'Google URL must not contain specific Chrome/ version (Chromeless formula)');
assert(!googleUa.includes('Electron'), 'Google URL must not contain Electron identifier');

// 2. WhatsApp Web must use full modern Desktop Chrome UA
const waUrl = 'https://web.whatsapp.com';
const waUa = getTargetUserAgent(waUrl);
assert(waUa.includes('Chrome/'), 'WhatsApp must use Chrome User-Agent');

// 3. Cloudflare-protected domains
const cfUrl = 'https://discord.com/app';
const cfUa = getTargetUserAgent(cfUrl);
assert(cfUa.includes('Chrome/'), 'Cloudflare targets must use Chrome User-Agent');

console.log('PASS: test_ua_filter.js all assertions passed');

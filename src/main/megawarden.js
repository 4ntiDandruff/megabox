// Megawarden - Local-First Encrypted Password Vault for Megabox
// Zero-Bloat Architecture: Native Node.js crypto + atomic filesystem operations
// Encryption: AES-256-GCM with PBKDF2 key derivation (SHA-256, 100,000 iterations)

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const VAULT_FILE_NAME = 'megawarden-vault.enc';
const DEVICE_KEY_FILE = 'megawarden-device.key';

function getConfigDir() {
  const dir = path.join(os.homedir(), '.config', 'megabox');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getVaultPath() {
  return path.join(getConfigDir(), VAULT_FILE_NAME);
}

function getOrCreateDeviceSecret() {
  const keyPath = path.join(getConfigDir(), DEVICE_KEY_FILE);
  if (fs.existsSync(keyPath)) {
    try {
      const secret = fs.readFileSync(keyPath, 'utf8').trim();
      if (secret && secret.length >= 32) return secret;
    } catch (_) {}
  }
  const newSecret = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(keyPath, newSecret, { mode: 0o600 });
  } catch (err) {
    console.warn('[Megawarden] Warning writing device key with 0600 mode:', err.message);
  }
  return newSecret;
}

function deriveKey(salt) {
  const deviceSecret = getOrCreateDeviceSecret();
  const inputSecret = `default-megabox-vault:${deviceSecret}`;
  return crypto.pbkdf2Sync(inputSecret, salt, 100000, 32, 'sha256');
}

function readEncryptedVault() {
  const vaultPath = getVaultPath();
  if (!fs.existsSync(vaultPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(vaultPath, 'utf8');
    const envelope = JSON.parse(raw);

    if (!envelope || !envelope.iv || !envelope.tag || !envelope.ciphertext || !envelope.salt) {
      console.warn('[Megawarden] Corrupted vault envelope format.');
      return [];
    }

    const salt = Buffer.from(envelope.salt, 'hex');
    const iv = Buffer.from(envelope.iv, 'hex');
    const tag = Buffer.from(envelope.tag, 'hex');
    const ciphertext = Buffer.from(envelope.ciphertext, 'hex');

    const key = deriveKey(salt);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const items = JSON.parse(decrypted.toString('utf8'));
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.error('[Megawarden] Failed to decrypt vault:', err.message);
    return [];
  }
}

function writeEncryptedVault(items) {
  const vaultPath = getVaultPath();
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // Standard GCM IV length
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify(items || []), 'utf8');

  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope = {
    version: 1,
    algo: 'aes-256-gcm',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    updated_at: Date.now()
  };

  const tmpPath = vaultPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(envelope, null, 2), { mode: 0o600 });
  fs.renameSync(tmpPath, vaultPath);
  return true;
}

function getRootDomain(hostname) {
  if (!hostname) return '';
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return hostname.toLowerCase();
  const slds = ['co.id', 'web.id', 'my.id', 'net.id', 'or.id', 'ac.id', 'go.id', 'com.au', 'co.uk'];
  const lastTwo = parts.slice(-2).join('.');
  if (slds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

// Normalize domain for fuzzy URL matching and Android App URL parsing
function extractDomain(urlStr, nameStr = '') {
  if (!urlStr && !nameStr) return '';
  let clean = (urlStr || '').trim();

  // Handle Google Password Manager Android app URLs (android://hash@package.name/)
  if (clean.startsWith('android://')) {
    if (nameStr && nameStr.includes('.') && !nameStr.startsWith('http')) {
      clean = nameStr.trim();
    } else {
      try {
        const u = new URL(clean);
        if (u.hostname) return u.hostname.toLowerCase();
      } catch (_) {
        const m = clean.match(/@([^/]+)/);
        if (m) return m[1].toLowerCase();
      }
    }
  }

  try {
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch (_) {
    return clean.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

class MegawardenVault {
  constructor() {}

  list() {
    return readEncryptedVault();
  }

  save(entry) {
    if (!entry || !entry.username || !entry.password) {
      throw new Error('Username dan kata sandi wajib diisi.');
    }

    const items = readEncryptedVault();

    const now = Date.now();
    const domain = extractDomain(entry.url || entry.domain || entry.name, entry.name);

    if (entry.id) {
      const idx = items.findIndex(i => i.id === entry.id);
      if (idx !== -1) {
        items[idx] = {
          ...items[idx],
          name: (entry.name || domain || 'Situs').trim(),
          url: (entry.url || '').trim(),
          domain: domain,
          username: (entry.username || '').trim(),
          password: entry.password,
          note: (entry.note || '').trim(),
          updated_at: now
        };
        writeEncryptedVault(items);
        return items[idx];
      }
    }

    // New item or check if exists by domain + username to update
    const existingIdx = items.findIndex(i => 
      extractDomain(i.url || i.domain, i.name) === domain && 
      i.username.toLowerCase() === entry.username.trim().toLowerCase()
    );

    if (existingIdx !== -1) {
      items[existingIdx].password = entry.password;
      if (entry.name) items[existingIdx].name = entry.name.trim();
      if (entry.url) items[existingIdx].url = entry.url.trim();
      if (entry.note !== undefined) items[existingIdx].note = entry.note;
      items[existingIdx].updated_at = now;
      writeEncryptedVault(items);
      return items[existingIdx];
    }

    const newItem = {
      id: 'mw_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
      name: (entry.name || domain || 'Situs').trim(),
      url: (entry.url || '').trim(),
      domain: domain,
      username: (entry.username || '').trim(),
      password: entry.password,
      note: (entry.note || '').trim(),
      created_at: now,
      updated_at: now
    };

    items.unshift(newItem);
    writeEncryptedVault(items);
    return newItem;
  }

  delete(id) {
    const items = readEncryptedVault();
    const filtered = items.filter(i => i.id !== id);
    writeEncryptedVault(filtered);
    return true;
  }

  findForUrl(urlStr) {
    if (!urlStr) return null;
    const targetDomain = extractDomain(urlStr);
    if (!targetDomain) return null;

    const items = readEncryptedVault();
    const targetRoot = getRootDomain(targetDomain);

    // Exact domain match, sub-domain match, or shared root domain match
    const matches = items.filter(item => {
      const itemDomain = extractDomain(item.url || item.domain, item.name);
      if (!itemDomain) return false;
      const itemRoot = getRootDomain(itemDomain);
      return targetDomain === itemDomain || 
             targetDomain.endsWith('.' + itemDomain) || 
             itemDomain.endsWith('.' + targetDomain) ||
             (targetRoot && itemRoot && targetRoot === itemRoot);
    });

    return matches.length > 0 ? matches : null;
  }

  // Parse Google Password Manager CSV export
  // Fully compliant with Google Chrome / Passwords CSV schema (name,url,username,password,note)
  importCsv(csvContent) {
    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, imported: 0, updated: 0, total: 0, error: 'File CSV kosong atau tidak valid.' };
    }

    // Strip UTF-8 Byte Order Mark (BOM) if present from Google / Excel exports
    const cleanContent = csvContent.replace(/^\uFEFF/, '');

    const rows = parseCsvText(cleanContent);
    if (rows.length === 0) {
      return { success: false, imported: 0, updated: 0, total: 0, error: 'Tidak ada data valid yang ditemukan dalam CSV.' };
    }

    // Recognize English, Indonesian, and common Password Manager column headers
    const header = rows[0].map(h => String(h || '').replace(/^\uFEFF/, '').trim().toLowerCase());
    const nameIdx = header.findIndex(h => h === 'name' || h === 'nama' || h === 'title');
    const urlIdx = header.findIndex(h => h === 'url' || h === 'website' || h === 'tautan' || h === 'web' || h === 'uri' || h === 'login_uri');
    const userIdx = header.findIndex(h => h === 'username' || h === 'user' || h === 'email' || h === 'nama pengguna' || h === 'pengguna' || h === 'login_username');
    const passIdx = header.findIndex(h => h === 'password' || h === 'sandi' || h === 'kata sandi' || h === 'pass' || h === 'login_password');
    const noteIdx = header.findIndex(h => h === 'note' || h === 'notes' || h === 'catatan');

    if (passIdx === -1 || (userIdx === -1 && urlIdx === -1)) {
      return { 
        success: false, 
        imported: 0, 
        updated: 0,
        total: 0,
        error: 'Format header CSV tidak dikenali. Wajib memuat kolom "url", "username", dan "password".' 
      };
    }

    const currentItems = readEncryptedVault();
    let addedCount = 0;
    let updatedCount = 0;
    const now = Date.now();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const password = passIdx !== -1 ? String(row[passIdx] || '').trim() : '';
      if (!password) continue; // Skip entries without password

      const username = userIdx !== -1 ? String(row[userIdx] || '').trim() : '';
      const url = urlIdx !== -1 ? String(row[urlIdx] || '').trim() : '';
      const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
      const note = noteIdx !== -1 ? String(row[noteIdx] || '').trim() : '';

      const domain = extractDomain(url || name, name);
      const displayName = name || domain || 'Akun';

      // Duplicate check: Match by exact domain / package name and case-insensitive username
      const existing = currentItems.find(item => {
        const itemDomain = extractDomain(item.url || item.domain, item.name);
        const matchDomain = (itemDomain && domain && itemDomain.toLowerCase() === domain.toLowerCase());
        const matchUser = (item.username || '').toLowerCase() === username.toLowerCase();
        return matchDomain && matchUser;
      });

      if (existing) {
        // Update password and/or note if modified
        let changed = false;
        if (existing.password !== password) {
          existing.password = password;
          changed = true;
        }
        if (url && !existing.url) {
          existing.url = url;
          changed = true;
        }
        if (note && (!existing.note || existing.note !== note)) {
          existing.note = note;
          changed = true;
        }
        if (changed) {
          existing.updated_at = now;
          updatedCount++;
        }
      } else {
        currentItems.push({
          id: 'mw_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'),
          name: displayName,
          url: url,
          domain: domain,
          username: username,
          password: password,
          note: note,
          created_at: now,
          updated_at: now
        });
        addedCount++;
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      writeEncryptedVault(currentItems);
    }

    return { 
      success: true, 
      imported: addedCount, 
      updated: updatedCount, 
      total: currentItems.length 
    };
  }

  // Export to Google Password Manager CSV format
  // RFC 4180 compliant with CRLF, exact headers, and normalized URLs
  exportCsv() {
    const items = readEncryptedVault();

    // Standard Google Password Manager header
    const headers = ['name', 'url', 'username', 'password', 'note'];
    const lines = [headers.join(',')];

    for (const item of items) {
      // Normalize URL for Google Password Manager import requirements
      let exportUrl = (item.url || '').trim();
      if (!exportUrl) {
        const dom = (item.domain || item.name || '').trim();
        if (dom) {
          if (dom.startsWith('192.168.') || dom.startsWith('10.') || dom.startsWith('172.16.') || dom.startsWith('localhost') || dom.startsWith('127.0.0.1')) {
            exportUrl = 'http://' + dom;
          } else {
            exportUrl = 'https://' + dom;
          }
        }
      } else if (!exportUrl.startsWith('http://') && !exportUrl.startsWith('https://') && !exportUrl.startsWith('android://')) {
        if (exportUrl.startsWith('192.168.') || exportUrl.startsWith('10.') || exportUrl.startsWith('172.16.') || exportUrl.startsWith('localhost') || exportUrl.startsWith('127.0.0.1')) {
          exportUrl = 'http://' + exportUrl;
        } else {
          exportUrl = 'https://' + exportUrl;
        }
      }

      const row = [
        escapeCsvField(item.name || item.domain || 'Akun'),
        escapeCsvField(exportUrl),
        escapeCsvField(item.username || ''),
        escapeCsvField(item.password || ''),
        escapeCsvField(item.note || '')
      ];
      lines.push(row.join(','));
    }

    // RFC 4180 standard CRLF line endings
    return lines.join('\r\n') + '\r\n';
  }

  // Generate cryptographic secure random password
  generatePassword(options = {}) {
    const length = Math.max(8, Math.min(64, options.length || 18));
    const useUpper = options.uppercase !== false;
    const useLower = options.lowercase !== false;
    const useNumbers = options.numbers !== false;
    const useSymbols = options.symbols !== false;

    let charset = '';
    if (useUpper) charset += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (useLower) charset += 'abcdefghijkmnopqrstuvwxyz';
    if (useNumbers) charset += '23456789';
    if (useSymbols) charset += '!@#$%^&*()_+~|}{[]:;?><,.-=';

    if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }
    return result;
  }


}

// RFC 4180 CSV Parser (Fortified: handles BOM, unquoted quotes, escaped quotes, multiline notes)
function parseCsvText(text) {
  if (!text || typeof text !== 'string') return [];
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  let isQuotedField = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    if (insideQuotes) {
      if (c === '"') {
        if (next === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += c;
        i++;
      }
    } else {
      // Start of a quoted field: either field is empty or only had leading whitespace
      if (c === '"' && (!isQuotedField && currentField.trim().length === 0)) {
        insideQuotes = true;
        isQuotedField = true;
        currentField = '';
        i++;
      } else if (c === ',') {
        currentRow.push(isQuotedField ? currentField : currentField.trim());
        currentField = '';
        isQuotedField = false;
        i++;
      } else if (c === '\r') {
        if (next === '\n') i++;
        currentRow.push(isQuotedField ? currentField : currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        isQuotedField = false;
        i++;
      } else if (c === '\n') {
        currentRow.push(isQuotedField ? currentField : currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        isQuotedField = false;
        i++;
      } else {
        // If we already closed a quoted field, ignore trailing whitespace before delimiter
        if (isQuotedField && !insideQuotes && (c === ' ' || c === '\t')) {
          i++;
          continue;
        }
        currentField += c;
        i++;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(isQuotedField ? currentField : currentField.trim());
    rows.push(currentRow);
  }

  // Filter out completely empty trailing lines
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim().length > 0));
}

function escapeCsvField(val) {
  const str = String(val == null ? '' : val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

module.exports = {
  MegawardenVault,
  extractDomain,
  getRootDomain,
  parseCsvText
};

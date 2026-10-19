const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');

const SYNC_SERVER_URL = process.env.MEGABOX_SYNC_URL || 'http://sync.megapass.web.id:8991';
const LOCAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'megabox');
const AUTH_FILE = path.join(LOCAL_CONFIG_DIR, 'auth.json');

function ensureConfigDir() {
  if (!fs.existsSync(LOCAL_CONFIG_DIR)) {
    fs.mkdirSync(LOCAL_CONFIG_DIR, { recursive: true });
  }
}

function getStoredAuth() {
  ensureConfigDir();
  if (!fs.existsSync(AUTH_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function saveStoredAuth(authData) {
  ensureConfigDir();
  const tmp = AUTH_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(authData, null, 2), 'utf-8');
  fs.renameSync(tmp, AUTH_FILE);
}

function clearStoredAuth() {
  if (fs.existsSync(AUTH_FILE)) {
    try { fs.unlinkSync(AUTH_FILE); } catch (e) {}
  }
}

function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(endpoint, SYNC_SERVER_URL);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const payload = data ? JSON.stringify(data) : null;
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Megabox-Desktop/1.0.0 (Linux x86_64)'
      };

      if (payload) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: headers,
        timeout: 10000
      };

      const req = transport.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.detail || `Server error: ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse response (Status: ${res.statusCode})`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`Network error: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout to sync server'));
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function register(email, password) {
  const res = await apiRequest('/api/v1/auth/register', 'POST', { email, password });
  if (res.access_token) {
    saveStoredAuth({
      token: res.access_token,
      user: res.user,
      device_name: `${os.hostname()} Desktop`,
      device_uuid: `${os.hostname()}-${os.platform()}-${os.arch()}`,
      last_sync: new Date().toISOString()
    });
  }
  return res;
}

async function login(email, password) {
  const res = await apiRequest('/api/v1/auth/login', 'POST', { email, password });
  if (res.access_token) {
    saveStoredAuth({
      token: res.access_token,
      user: res.user,
      device_name: `${os.hostname()} Desktop`,
      device_uuid: `${os.hostname()}-${os.platform()}-${os.arch()}`,
      last_sync: new Date().toISOString()
    });
  }
  return res;
}

async function logout() {
  clearStoredAuth();
  return { success: true };
}

function getSyncStatus() {
  const auth = getStoredAuth();
  if (!auth || !auth.token) {
    return { logged_in: false, user: null, last_sync: null };
  }
  return {
    logged_in: true,
    user: auth.user,
    device_name: auth.device_name || os.hostname(),
    last_sync: auth.last_sync || null
  };
}

async function refreshUserProfile() {
  const auth = getStoredAuth();
  if (!auth || !auth.token) return null;
  try {
    const me = await apiRequest('/api/v1/auth/me', 'GET', null, auth.token);
    if (me && me.id) {
      auth.user.tier = me.plan_tier;
      auth.user.max_services = me.max_services;
      saveStoredAuth(auth);
    }
  } catch (e) {}
  return auth.user;
}

async function pullWorkspace() {
  const auth = getStoredAuth();
  if (!auth || !auth.token) {
    throw new Error('Belum login ke cloud Megabox');
  }
  const res = await apiRequest('/api/v1/sync/pull', 'GET', null, auth.token);
  if (res.exists) {
    auth.last_sync = new Date().toISOString();
    saveStoredAuth(auth);
  }
  return res;
}

async function pushWorkspace(services, settings = {}) {
  const auth = getStoredAuth();
  if (!auth || !auth.token) {
    return { skipped: true, reason: 'Belum login ke cloud' };
  }

  const payload = {
    version: 1,
    client_timestamp: new Date().toISOString(),
    device_name: auth.device_name || `${os.hostname()} Desktop`,
    device_uuid: auth.device_uuid || `${os.hostname()}-${os.platform()}`,
    workspace_name: 'Default',
    settings: settings,
    services: (services || []).map((s, idx) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      icon: s.icon || 'globe',
      custom_icon: s.custom_icon || null,
      proxy: s.proxy || '',
      order_index: s.order_index !== undefined ? s.order_index : idx,
      muted: s.muted || false
    }))
  };

  const res = await apiRequest('/api/v1/sync/push', 'POST', payload, auth.token);
  auth.last_sync = new Date().toISOString();
  saveStoredAuth(auth);
  return res;
}

module.exports = {
  refreshUserProfile,
  getStoredAuth,
  getSyncStatus,
  register,
  login,
  logout,
  pullWorkspace,
  pushWorkspace
};

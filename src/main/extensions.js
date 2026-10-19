// Megabox Header & User-Agent Engine (Reverse-engineered from Rambox & Ferdium)

// Platform string detection
function getPlatformString() {
  const p = process.platform;
  if (p === 'win32') return 'Windows NT 10.0; Win64; x64';
  if (p === 'darwin') return 'Macintosh; Intel Mac OS X 10_15_7';
  return 'X11; Linux x86_64';
}

// Stable modern Chrome User Agent
const CHROME_VERSION = '133.0.0.0';
const DEFAULT_UA = 'Mozilla/5.0 (' + getPlatformString() + ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + CHROME_VERSION + ' Safari/537.36';
// Ferdium Chromeless UA for Google Accounts bypass
const GOOGLE_ACCOUNTS_UA = 'Mozilla/5.0 (' + getPlatformString() + ') AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36';

function getTargetUserAgent(url = '') {
  if (url && url.startsWith('https://accounts.google.com')) {
    return GOOGLE_ACCOUNTS_UA;
  }
  return DEFAULT_UA;
}

function setupHeaderInterceptors(ses) {
  if (!ses || !ses.webRequest) return;
  const filter = { urls: ['<all_urls>'] };

  ses.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = details.requestHeaders || {};
    const url = details.url || '';

    if (url.startsWith('https://accounts.google.com')) {
      // Ferdium proven formula: strip Chrome version number completely
      headers['User-Agent'] = GOOGLE_ACCOUNTS_UA;
      delete headers['Sec-CH-UA'];
      delete headers['Sec-CH-UA-Mobile'];
      delete headers['Sec-CH-UA-Platform'];
    } else {
      headers['User-Agent'] = DEFAULT_UA;
      headers['Sec-CH-UA'] = '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"';
      headers['Sec-CH-UA-Mobile'] = '?0';
      if (process.platform === 'linux') {
        headers['Sec-CH-UA-Platform'] = '"Linux"';
      } else if (process.platform === 'win32') {
        headers['Sec-CH-UA-Platform'] = '"Windows"';
      } else if (process.platform === 'darwin') {
        headers['Sec-CH-UA-Platform'] = '"macOS"';
      }
    }

    // Strip Electron internal identification headers
    delete headers['X-Electron-Version'];

    callback({ requestHeaders: headers });
  });
}

module.exports = {
  CHROME_UA: DEFAULT_UA,
  GOOGLE_ACCOUNTS_UA,
  getTargetUserAgent,
  setupHeaderInterceptors
};

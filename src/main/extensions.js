// Reverse-engineered from Rambox native_extensions: forceua, googlefix, and cloudflarefix
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function getTargetUserAgent(url = '') {
  // Always strip Electron and provide Chrome desktop signature
  return CHROME_UA;
}

function setupHeaderInterceptors(ses) {
  const filter = { urls: ['<all_urls>'] };

  ses.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = details.requestHeaders;
    
    // Replace User-Agent header
    headers['User-Agent'] = CHROME_UA;

    // Remove any Electron identifying headers
    delete headers['X-Electron-Version'];

    callback({ requestHeaders: headers });
  });
}

module.exports = {
  CHROME_UA,
  getTargetUserAgent,
  setupHeaderInterceptors
};

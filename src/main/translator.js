const https = require('https');

/**
 * Perform robust translation using Google PA API (absorbed from Simple Translate)
 * with automatic fallback to Google GTX endpoint and Smart Auto-Flip logic:
 * - If text is Indonesian (id) -> translated to English (en).
 * - If text is English or any other foreign language -> translated to Indonesian (id).
 *
 * @param {string} text - The input string to translate
 * @returns {Promise<{success: boolean, original: string, translation: string, sourceLang: string, targetLang: string, error?: string}>}
 */
async function translateText(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { success: false, error: 'Empty text provided' };
  }

  const cleanText = text.trim();

  // Helper 1: Google PA API (Official Simple Translate client endpoint)
  function queryGooglePA(targetLang) {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        'params.client': 'gtx',
        'query.source_language': 'auto',
        'query.target_language': targetLang,
        'query.display_language': targetLang,
        'query.text': cleanText,
        'key': Buffer.from('QUl6YVN5RExlZUZJNU90RkJ3WUJJb0tfamo1bTMyclpLNUMrQ1hB', 'base64').toString(),
        'data_types': 'TRANSLATION'
      });
      const url = `https://translate-pa.googleapis.com/v1/translate?${params.toString()}`;

      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 7000 }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(raw);
              const sourceLang = (data.sourceLanguage || 'auto').toLowerCase();
              const translation = data.translation || '';
              resolve({ sourceLang, translation });
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`Google PA HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google PA Request Timeout'));
      });
    });
  }

  // Helper 2: Fallback GTX API
  function queryGoogleGTX(targetLang) {
    return new Promise((resolve, reject) => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(cleanText)}`;
      
      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 7000 }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(raw);
              const sourceLang = (data && data[2]) ? String(data[2]).toLowerCase() : 'auto';
              const translation = (data && data[0] && Array.isArray(data[0]))
                ? data[0].map(item => (item && item[0]) ? item[0] : '').join('')
                : '';
              resolve({ sourceLang, translation });
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`GTX HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('GTX Request Timeout'));
      });
    });
  }

  async function performQuery(targetLang) {
    try {
      return await queryGooglePA(targetLang);
    } catch (err) {
      return await queryGoogleGTX(targetLang);
    }
  }

  try {
    // 1st pass: translate towards Indonesian
    const pass1 = await performQuery('id');
    const detected = pass1.sourceLang;

    // Smart Auto-Flip: if source text is already Indonesian, flip target to English
    if (detected === 'id') {
      const pass2 = await performQuery('en');
      return {
        success: true,
        original: cleanText,
        translation: pass2.translation || cleanText,
        sourceLang: 'id',
        targetLang: 'en'
      };
    }

    // Otherwise, result to Indonesian is returned
    return {
      success: true,
      original: cleanText,
      translation: pass1.translation || cleanText,
      sourceLang: detected,
      targetLang: 'id'
    };
  } catch (err) {
    return {
      success: false,
      original: cleanText,
      error: err.message
    };
  }
}

module.exports = { translateText };

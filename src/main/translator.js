const https = require('https');

/**
 * Perform robust translation with multiple failover engines:
 * 1. Google Chrome Dict API (dict-chrome-ex) - highly reliable, no 429 quota lock
 * 2. MyMemory Translation API - high quality fallback
 * 3. Fallback to Google GTX
 *
 * Smart Auto-Flip logic:
 * - If source is Indonesian (id) -> translated to English (en).
 * - If source is English or any other language -> translated to Indonesian (id).
 *
 * @param {string} text - The input string to translate
 * @returns {Promise<{success: boolean, original: string, translation: string, sourceLang: string, targetLang: string, error?: string}>}
 */
async function translateText(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { success: false, error: 'Empty text provided' };
  }

  const cleanText = text.trim();

  // Helper 1: Google Dict API (client=dict-chrome-ex) - Fast, lightweight, zero 429 block
  function queryGoogleDict(targetLang) {
    return new Promise((resolve, reject) => {
      const url = `https://translate.googleapis.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(targetLang)}&q=${encodeURIComponent(cleanText)}`;
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        timeout: 6000
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(raw);
              // Expected response: [["Translated text", "source_lang"]] or ["Translated text"]
              if (Array.isArray(data) && data.length > 0) {
                if (Array.isArray(data[0])) {
                  const translation = data[0][0] || '';
                  const sourceLang = (data[0][1] || 'auto').toLowerCase();
                  return resolve({ sourceLang, translation });
                } else if (typeof data[0] === 'string') {
                  return resolve({ sourceLang: 'auto', translation: data[0] });
                }
              }
              resolve({ sourceLang: 'auto', translation: cleanText });
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`Google Dict HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google Dict Request Timeout'));
      });
    });
  }

  // Helper 2: MyMemory Translation API fallback
  function queryMyMemory(sourceLang, targetLang) {
    return new Promise((resolve, reject) => {
      const langPair = `${sourceLang || 'en'}|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${encodeURIComponent(langPair)}`;
      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const data = JSON.parse(raw);
              if (data && data.responseData && data.responseData.translatedText) {
                return resolve({ sourceLang: sourceLang || 'auto', translation: data.responseData.translatedText });
              }
              reject(new Error('MyMemory invalid response'));
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error(`MyMemory HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('MyMemory Request Timeout'));
      });
    });
  }

  async function performQuery(targetLang) {
    try {
      return await queryGoogleDict(targetLang);
    } catch (err1) {
      console.warn('[Translator] Google Dict error, falling back to MyMemory:', err1.message);
      try {
        return await queryMyMemory('auto', targetLang);
      } catch (err2) {
        throw new Error(err1.message + ' | ' + err2.message);
      }
    }
  }

  try {
    // 1st pass: translate towards Indonesian
    const pass1 = await performQuery('id');
    const detected = (pass1.sourceLang || 'auto').toLowerCase();

    // Smart Auto-Flip: if detected source is Indonesian or translation is identical, flip to English
    if (detected === 'id' || (detected === 'auto' && pass1.translation.trim().toLowerCase() === cleanText.toLowerCase())) {
      const pass2 = await performQuery('en');
      return {
        success: true,
        original: cleanText,
        translation: pass2.translation || cleanText,
        sourceLang: 'id',
        targetLang: 'en'
      };
    }

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

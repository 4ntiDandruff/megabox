// Megabox uBlock Origin Core Engine (gorhill-style Network Blocker & Tracker Shield)
const fs = require("fs");
const path = require("path");

class UBlockOriginEngine {
  constructor() {
    this.blockedDomains = new Set();
    this.blockedKeywords = [
      "/doubleclick.net/",
      "/googlesyndication.com/",
      "/googleadservices.com/",
      "/adnxs.com/",
      "/criteo.com/",
      "/outbrain.com/",
      "/taboola.com/",
      "/scorecardresearch.com/",
      "/adservice.google.",
      "/pagead/js/adsbygoogle.js",
      "google-analytics.com/analytics.js",
      "googletagmanager.com/gtm.js",
      "googletagmanager.com/gtag/js",
      "facebook.net/en_US/fbevents.js",
      "connect.facebook.net/signals/config/"
    ];
    this.disabledSessions = new Set();
    this.globalEnabled = true;
    this.loadFilterList();
  }

  loadFilterList() {
    try {
      const listPath = path.join(__dirname, "adblock-domains.json");
      if (fs.existsSync(listPath)) {
        const raw = fs.readFileSync(listPath, "utf-8");
        const list = JSON.parse(raw);
        for (let i = 0; i < list.length; i++) {
          this.blockedDomains.add(list[i]);
        }
        console.log(`[uBlock Origin] Loaded ${this.blockedDomains.size} blocked domains into memory.`);
      }
    } catch (err) {
      console.error("[uBlock Origin] Failed to load adblock-domains.json:", err);
    }
  }

  shouldBlock(urlStr) {
    if (!this.globalEnabled) return false;
    if (!urlStr || typeof urlStr !== "string") return false;

    // Fast keyword inspection
    for (let i = 0; i < this.blockedKeywords.length; i++) {
      if (urlStr.includes(this.blockedKeywords[i])) {
        return true;
      }
    }

    try {
      const parsed = new URL(urlStr);
      let hostname = parsed.hostname.toLowerCase();
      if (!hostname) return false;

      // Exact domain match
      if (this.blockedDomains.has(hostname)) return true;

      // Suffix hierarchy match (e.g. ad.doubleclick.net -> doubleclick.net)
      let parts = hostname.split(".");
      while (parts.length > 2) {
        parts.shift();
        let sub = parts.join(".");
        if (this.blockedDomains.has(sub)) {
          return true;
        }
      }
    } catch (_) {}

    return false;
  }

  setupSessionInterceptor(ses) {
    if (!ses || !ses.webRequest) return;
    const filter = { urls: ["<all_urls>"] };

    ses.webRequest.onBeforeRequest(filter, (details, callback) => {
      // Allow internal chrome / electron devtools / about schemes
      const url = details.url || "";
      if (url.startsWith("devtools:") || url.startsWith("chrome:") || url.startsWith("file:")) {
        return callback({ cancel: false });
      }

      // Check if blocked by uBlock Origin rules
      if (this.shouldBlock(url)) {
        return callback({ cancel: true });
      }

      callback({ cancel: false });
    });
  }
}

const ublockInstance = new UBlockOriginEngine();

module.exports = {
  uBlockOriginEngine: ublockInstance
};

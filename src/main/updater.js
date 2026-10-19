const https = require("https");
const { app, ipcMain } = require("electron");

const GITHUB_API_URL = "https://api.github.com/repos/4ntiDandruff/megabox/releases/latest";
const SNOOZE_MS = 72 * 60 * 60 * 1000; // 3 days

function isNewerVersion(current, remote) {
  if (!remote || !current) return false;
  const cleanCurrent = current.replace(/^v/, "");
  const cleanRemote = remote.replace(/^v/, "");
  
  const cParts = cleanCurrent.split(".").map(n => parseInt(n, 10) || 0);
  const rParts = cleanRemote.split(".").map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Megabox-Desktop/" + app.getVersion(),
        "Accept": "application/vnd.github.v3+json"
      },
      timeout: 8000
    };

    https.get(GITHUB_API_URL, options, (res) => {
      if (res.statusCode === 404) {
        // No published releases yet on repository -> latest version
        res.resume();
        return resolve({ tag_name: app.getVersion(), html_url: "https://github.com/4ntiDandruff/megabox/releases", body: "" });
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("GitHub API status: " + res.statusCode));
      }

      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", (err) => {
      reject(err);
    }).on("timeout", function() {
      this.destroy();
      reject(new Error("GitHub API request timed out"));
    });
  });
}

function initUpdater(mainWindow, db, { getSettings, saveSettings }) {
  async function checkForUpdates(manual = false) {
    try {
      const cfg = getSettings(db);
      if (!manual && cfg.auto_check_updates === false) {
        return { checked: false, reason: "disabled" };
      }

      const release = await fetchLatestRelease();
      const currentVersion = app.getVersion();
      const remoteVersion = (release.tag_name || "").trim();
      const hasUpdate = isNewerVersion(currentVersion, remoteVersion);

      if (hasUpdate) {
        const now = Date.now();
        const isDismissed = (cfg.dismissed_update_version === remoteVersion) &&
                            (now - (cfg.dismissed_update_time || 0) < SNOOZE_MS);

        if (!isDismissed || manual) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("update:available", {
              version: remoteVersion,
              currentVersion: currentVersion,
              url: release.html_url || "https://github.com/4ntiDandruff/megabox/releases",
              body: release.body || ""
            });
          }
        }
        return { hasUpdate: true, version: remoteVersion, url: release.html_url };
      } else {
        return { hasUpdate: false, version: currentVersion };
      }
    } catch (err) {
      if (manual) {
        return { error: err.message };
      }
      return { silentError: err.message };
    }
  }

  // Dismiss update / Snooze for 72 hours
  ipcMain.handle("update:dismiss", async (event, version) => {
    try {
      saveSettings(db, {
        dismissed_update_version: version,
        dismissed_update_time: Date.now()
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Manual Check from Settings
  ipcMain.handle("update:check-manual", async () => {
    return await checkForUpdates(true);
  });

  // Schedule auto-check 8 seconds after boot (if not disabled)
  setTimeout(() => {
    checkForUpdates(false).catch(() => {});
  }, 8000);

  return { checkForUpdates };
}

module.exports = {
  isNewerVersion,
  initUpdater
};

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

async function runE2ESmoke() {
  console.log('[E2E] Booting Megabox smoke test in headless Xvfb...');
  
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../src/preload/index.js'),
      webviewTag: true,
      contextIsolation: true
    }
  });

  await win.loadFile(path.join(__dirname, '../src/renderer/index.html'));
  console.log('[E2E] Renderer index.html loaded.');

  // Take screenshot for visual verification
  await new Promise(r => setTimeout(r, 2000));
  const image = await win.webContents.capturePage();
  fs.writeFileSync('/tmp/megabox_smoke.png', image.toPNG());
  console.log('[E2E] Screenshot saved to /tmp/megabox_smoke.png (Size: ' + image.toPNG().length + ' bytes)');

  console.log('PASS: E2E smoke test completed successfully.');
  app.exit(0);
}

app.whenReady().then(runE2ESmoke);

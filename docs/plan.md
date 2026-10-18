# Megabox: Zero-Bloat Multi-App Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended for single-thread / YOLO mode) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi desktop multi-app messaging (WhatsApp, Telegram, Discord, Gmail, dsb.) bernama `megabox` yang 100% bebas paywall, mereplikasi antarmuka visual Rambox (sidebar vertikal + multi-webview tab switcher), dan mengadopsi resep ekstensi hasil reverse engineering Rambox (`cloudflarefix`, `forceua`, `googlefix`, dan `injected.js`) tanpa bloatware telemetri.

**Architecture:** Electron minimalis murni tanpa server-cloud dependency. Main process mengelola window state, session partitions (`persist:<app_id>`), webRequest header interception (spoofing User-Agent Chrome murni agar lolos Google/Cloudflare), dan IPC handler. Renderer menggunakan HTML5 + Tailwind CSS + Alpine.js + Lucide/Linearicons SVG untuk sidebar tab dan controls, yang memuat `<webview>` terisolasi per aplikasi. Konfigurasi disimpan dalam SQLite WAL lokal (`~/.config/megabox/megabox.db`).

**Tech Stack:** Node.js (Electron 33+), SQLite WAL (`better-sqlite3`), Tailwind Play CDN / CSS standalone, Alpine.js, Lucide SVG / Rambox Linearicons font.

**Spec:** Dokumen forensik hasil dekompilasi Rambox 2.7.2 di node `hizam` (`~/proyek/megabox/decompiled/`).

## Global Constraints
- Target node: `hizam` (`ryzen-kubuntu`, 100.x.y.z), workspace: `~/proyek/megabox`.
- Zero-Bloat: Tanpa telemetri analitik (strip `analytics.js`), tanpa server lisensi (strip `billing.js`), tanpa login akun Rambox.
- Semua fitur "Pro" dibuka bebas: Unlimited apps, custom service URL, unread badge counter, audio muting per-app, hibernate tab.
- Anti-ban / Anti-bot: Wajib menyertakan resep User-Agent switcher pada `accounts.google.com` dan domain Cloudflare dari `native_extensions/`.

## Review Focus
1. WhatsApp Web QR-code loading failure (karena User-Agent tidak cocok atau session cookie conflict) -> Uji webview WhatsApp memuat halaman QR code bersih.
2. Google Login blocking ("This browser or app may not be secure") -> Uji login flow accounts.google.com dengan filter `googlefix`.
3. Notifikasi desktop & unread badge counter -> Uji penangkapan badge dari `injected.js` lewat `ipcRenderer` ke sidebar tab badge.
4. Tab switching latency & memory isolation -> Uji 3+ tab bersamaan dengan partisi `persist:app_*` terpisah agar session tidak bocor/bercampur.
5. SQLite WAL power-loss resilience -> Konfigurasi `PRAGMA synchronous=NORMAL` dan `PRAGMA journal_mode=WAL` pada database konfigurasi lokal.

---

### Task 1: Scaffolding Project & SQLite WAL Config Store

**Files:**
- Create: `~/proyek/megabox/package.json`
- Create: `~/proyek/megabox/src/main/db.js`
- Test: `~/proyek/megabox/tests/test_db.js`

**Interfaces:**
- Produces:
  - `initDatabase(): Database`
  - `getApps(): Array<AppConfig>`
  - `saveApp(app: AppConfig): void`
  - `deleteApp(id: string): void`

- [ ] **Step 1: Write test for SQLite DB schema and CRUD**
  Buat file `tests/test_db.js` yang menguji inisialisasi tabel `apps`, `settings`, pengaktifan WAL mode, serta insert/update/delete aplikasi.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node tests/test_db.js`
  Expected: FAIL (module/file not found).

- [ ] **Step 3: Implement package.json & db.js**
  Pasang dependensi minimal (`electron`, `better-sqlite3`). Implementasikan `initDatabase()` dengan WAL mode dan skema tabel default (WhatsApp, Telegram, Discord preset).

- [ ] **Step 4: Run test to verify it passes**
  Run: `node tests/test_db.js`
  Expected: PASS (Semua CRUD berhasil dan PRAGMA journal_mode mengembalikan `wal`).

- [ ] **Step 5: Commit**
  Run: `git init && git add . && git commit -m "feat(core): setup project scaffolding and sqlite wal store"`

---

### Task 2: Core Header Interceptor & Extension Shields (`googlefix`, `forceua`, `cloudflarefix`)

**Files:**
- Create: `~/proyek/megabox/src/main/extensions.js`
- Create: `~/proyek/megabox/src/main/preload-webview.js`
- Test: `~/proyek/megabox/tests/test_ua_filter.js`

**Interfaces:**
- Consumes: Hasil ekstraksi `decompiled/native_extensions/` dan `decompiled/app/.vite/build/injected.js`.
- Produces:
  - `registerWebviewSession(ses: Electron.Session): void`
  - `setupHeaderInterceptors(ses: Electron.Session): void`

- [ ] **Step 1: Write test for User-Agent spoofing logic**
  Buat tes unit kecil di `tests/test_ua_filter.js` untuk memastikan regex URL `accounts.google.com` dan Cloudflare domain memodifikasi header `User-Agent` menjadi string Google Chrome murni (`Chrome/119+`).

- [ ] **Step 2: Run test to verify it fails**
  Run: `node tests/test_ua_filter.js`
  Expected: FAIL.

- [ ] **Step 3: Implement extensions.js & preload-webview.js**
  Salin dan rapikan logika dari `decompiled/native_extensions/` ke dalam handler Electron `session.defaultSession.webRequest.onBeforeSendHeaders`. Masukkan logika `injected.js` ke `src/main/preload-webview.js` (WebAuthn U2F protection, Notification override, dan unread badge bridge).

- [ ] **Step 4: Run test to verify it passes**
  Run: `node tests/test_ua_filter.js`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add src/main/ tests/ && git commit -m "feat(net): implement header interceptors and webview preload shield"`

---

### Task 3: Electron Main Window & IPC Bridge

**Files:**
- Create: `~/proyek/megabox/src/main/index.js`
- Create: `~/proyek/megabox/src/preload/index.js`
- Modify: `~/proyek/megabox/package.json`

**Interfaces:**
- Produces:
  - IPC Channel: `apps:get`, `apps:add`, `apps:update`, `apps:delete`
  - IPC Channel: `webview:badge-update`, `webview:notification`
  - ContextBridge API: `window.megabox`

- [ ] **Step 1: Implement preload index.js with secure ContextBridge**
  Ekspos API `window.megabox` yang aman ke renderer tanpa membiarkan `nodeIntegration: true`.

- [ ] **Step 2: Implement main process index.js**
  Buat jendela utama (`BrowserWindow`), register IPC handlers untuk CRUD aplikasi dan badge status, serta pasang session partition resolver.

- [ ] **Step 3: Verify headless main process boot**
  Run: `xvfb-run -a electron src/main/index.js --test-exit` (dengan flag pengujian agar otomatis exit code 0 setelah boot sukses).
  Expected: Exit code 0 tanpa error.

- [ ] **Step 4: Commit**
  Run: `git add src/main/index.js src/preload/index.js package.json && git commit -m "feat(main): implement browserwindow and ipc bridge"`

---

### Task 4: Visual UI Reconstruction (Sidebar, Tab Switcher, & WebView Host)

**Files:**
- Create: `~/proyek/megabox/src/renderer/index.html`
- Create: `~/proyek/megabox/src/renderer/app.js`
- Copy Assets: `~/proyek/megabox/src/renderer/assets/` (ambil Linearicons & icon SVG dari `decompiled/`)

**Interfaces:**
- Consumes: `window.megabox` IPC API.
- Produces:
  - Vertical Left Sidebar (App icons, unread badges, Add App button, Settings).
  - Main Panel (Dynamic `<webview>` tabs with isolated partition `persist:<app_id>`).
  - Modal Add/Edit App (Preset selector: WhatsApp, Telegram, Discord, Gmail, Slack, Custom URL).

- [ ] **Step 1: Copy visual assets from decompiled Rambox**
  Salin font Linearicons dan SVG logo ke `src/renderer/assets/`.

- [ ] **Step 2: Build HTML & Alpine.js UI**
  Terapkan desain Dark Modern Tech UI (latar gelap slate, sidebar ramping 68px, icon tombol bundar taktil, pill badge unread merah tajam).

- [ ] **Step 3: Connect UI to Webview lifecycle**
  Pastikan saat tab icon diklik, webview terkait ditampilkan (`display: flex`), sedangkan webview lain disembunyikan (`display: none` tanpa memutus koneksi websocket).

- [ ] **Step 4: Verify UI DOM balance and asset loading**
  Run script pengecekan integritas DOM dan pastikan tidak ada tag unclosed atau link aset 404.

- [ ] **Step 5: Commit**
  Run: `git add src/renderer/ && git commit -m "feat(ui): implement rambox-identical sidebar and webview manager"`

---

### Task 5: End-to-End Smoke Test & Desktop Packaging

**Files:**
- Create: `~/proyek/megabox/megabox-launcher.sh`
- Create: `~/.local/share/applications/megabox.desktop`
- Test: `~/proyek/megabox/tests/e2e_smoke_test.js`

- [ ] **Step 1: Write E2E headless smoke test**
  Uji peluncuran aplikasi via `xvfb-run`, verifikasi webview WhatsApp & Telegram termuat, dan database menyimpan state.

- [ ] **Step 2: Run smoke test**
  Run: `xvfb-run -a node tests/e2e_smoke_test.js`
  Expected: PASS (Semua IPC terhubung, webview session tercipta, screenshot `/tmp/megabox_smoke.png` valid).

- [ ] **Step 3: Setup launcher & desktop entry**
  Buat launcher script dengan sekring GPU `--disable-gpu` (sesuai catatan servis node hizam) dan pasang di menu aplikasi desktop.

- [ ] **Step 4: Final commit & tag v1.0.0**
  Run: `git add . && git commit -m "feat(release): megabox v1.0.0 zero-bloat ready"`

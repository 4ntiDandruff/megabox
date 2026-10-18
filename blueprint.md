# BLUEPRINT: Megabox Cloud & Profile Sync SaaS (Zero-Bloat Multi-App Workspace)
**Status**: Spesifikasi Arsitektur Definitif & Master Plan Sinkronisasi Multi-Device  
**Target Backend**: `michael` (`~/proyek/megabox-sync-server`, port 8991, `sync.megapass.web.id`)  
**Target Client**: `hizam` (`~/proyek/megabox`, Electron 40 Wayland Desktop)  
**Arsitek & Operator**: Cak (Hizam Nahari) & Antigravity  

### Berkas Referensi Utama (Ground Truth & Anti Over-Engineering):
1. **Rambox 2.7.2 Decompiled Engine**: `~/proyek/megabox/decompiled/rambox/` (Reverse-engineered pattern: token Bearer auth + workspace layout JSON).
2. **Ferdium 7.2.3 Source**: `~/proyek/megabox/ferdium-src/` (Reverse-engineered recipe system & persistence partition).

---

## 1. Executive Summary & Visi Produk
Megabox Sync adalah infrastruktur sinkronisasi cloud ultra-ringan untuk aplikasi workspace Megabox:
- **Zero-Touch Multi-PC Setup**: Pengguna login sekali di PC baru, urutan tab (WhatsApp, Telegram, Discord), konfigurasi custom proxy SOCKS5/HTTP, icon, dan durasi hibernasi langsung tersinkronkan otomatis.
- **Privacy-First (Strict Data Isolation)**: Hanya sinkronisasi metadata tatanan aplikasi (layout schema). Sesi login, cookie web, dan IndexedDB perpesanan tetap 100% lokal di mesin fisik pengguna (`persist:service_<id>`).
- **SaaS Ready**: Arsitektur modular siap monetisasi (tier Free maks 5 tab, tier Pro/Lifetime unlimited + multi-workspace).

---

## 2. Deep Audit: Akar Masalah Versi Lama vs Solusi Rekayasa Baru

| Komponen / Masalah | Rambox Pro & Ferdium Server (Lama) | Megabox Sync Architecture (Baru) |
|---|---|---|
| **Server Footprint** | Ferdium Server butuh AdonisJS + PostgreSQL + Redis (>450MB RAM). | FastAPI + SQLite WAL monolith satu proses (<25MB RAM di node `michael`). |
| **Ketergantungan Cloud** | Rambox lock-in Firebase / Auth0 proprietary, mati jika internet down. | Offline-first: cache lokal SQLite/JSON, tetap jalan normal tanpa internet. |
| **Kompleksitas Data** | Sinkronisasi riwayat, resep berat, dan telemetry boros bandwidth. | Payload JSON padat (2-5 KB) berisi `order_index`, `url`, `proxy`, `name`. |
| **Keamanan Session** | Resiko kebocoran cookie bila server cloud ditembus peretas. | Server nol data sesi (zero-knowledge session). Server tak pernah tahu isi chat. |

---

## 3. Tech Stack Baku & Topologi Sistem

```text
[ Megabox Desktop (hizam) ] ── (Bearer JWT / JSON Payload 3KB) ──┐
                                                                 ▼
[ Internet / External Client ] ──► [ Cloudflare Edge (HTTPS) ] ──► [ Cloudflared Tunnel ]
                                                                          │
                                                                          ▼
                                                         [ FastAPI Monolith (michael:8991) ]
                                                                          │
                                                                          ▼
                                                         [ SQLite WAL (sync_megabox.db) ]
```

- **Backend**: Python 3.10+ FastAPI + Uvicorn (Single worker, async I/O, Pydantic v2).
- **Database**: SQLite 3 dengan mode WAL (`PRAGMA synchronous = NORMAL`, zero locking).
- **Client Networking**: Native `fetch` / Axios di Electron Main Process (IPC async via `preload.js`).
- **Security**: Password di-hash Argon2id / bcrypt, token otentikasi Bearer JWT 30 hari.

---

## 4. Struktur Folder Modular & Kontrak API Backend

### Struktur Direktori Backend (`~/proyek/megabox-sync-server/` di `michael`):
```text
megabox-sync-server/
├── app.py                      # Application factory, CORS, exception handlers
├── config.py                   # ENV loader (JWT_SECRET, DB_PATH, PORT=8991)
├── database.py                 # SQLite WAL connection & auto-migration
├── core/
│   ├── auth.py                 # Password hashing & JWT generation/validation
│   └── limiter.py              # In-memory sliding-window rate limiter
├── routers/
│   ├── auth.py                 # Register, Login, Refresh, Me
│   └── sync.py                 # Pull workspace, Push workspace, Device status
└── static/                     # Web landing / status check endpoint
```

### Kontrak Rute API Baku (v1):
- `POST /api/v1/auth/register` : Registrasi akun baru (email, password).
- `POST /api/v1/auth/login`    : Verifikasi kredensial ➔ mengembalikan Bearer JWT token.
- `GET  /api/v1/auth/me`       : Profil user, tier langganan, dan jumlah device terdaftar.
- `GET  /api/v1/sync/pull`     : Ambil metadata workspace terbaru + timestamp UTC + hash versi.
- `POST /api/v1/sync/push`     : Kirim tatanan tab lokal terbaru ke cloud (Last-Write-Wins).

---

## 5. Skema DDL Database SQLite WAL (`sync_megabox.db`)

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'lifetime'
    max_services INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_name TEXT DEFAULT 'Default',
    layout_data TEXT NOT NULL, -- JSON string payload konfigurasi tab & preferensi
    version_hash TEXT NOT NULL, -- MD5/SHA256 untuk deteksi konflik cepat
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workspace_name)
);

CREATE TABLE IF NOT EXISTS user_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL, -- e.g. "Hizam Kubuntu Desktop", "Laptop ThinkPad"
    device_uuid TEXT NOT NULL UNIQUE,
    last_sync_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON workspaces(user_id);
```

---

## 6. Standar UI/UX Panel Pengaturan (Desktop Client)

Integrasi pada **Modal Settings (Icon Gear)** yang sudah ada di sidebar:
1. **Bagian Akun & Cloud**:
   - Jika Belum Login: Tampilkan form ringkas Tab Switcher [ Masuk | Daftar ].
   - Input: Email & Password dengan visual Dark Modern Tech (`bg-slate-900/80`, border `slate-800`).
   - Tombol Aksi: `[ Masuk & Hubungkan Cloud ]` (Aksen indigo `#6366f1`).
2. **Jika Sudah Terhubung**:
   - Status badge aktif: `[+] Cloud Terhubung (user@domain.com)`.
   - Ringkasan: Status sinkronisasi terakhir ("Tersinkron 2 detik lalu"), Nama device ini.
   - Tombol Manual: `[ Sinkronkan Sekarang ]` dan `[ Keluar Akun ]`.
3. **Fisika Tampilan**:
   - Nol reload halaman: Seluruh transaksi login/sync ditangani via Electron IPC (`sync:login`, `sync:push`).
   - Toast notifikasi non-intrusif saat berhasil sinkronisasi otomatis di pojok kanan bawah.

---

## 7. Engine Inti: Mekanisme Sinkronisasi (Sync Engine)

1. **Debounced Auto-Push (Zero Bandwidth Waste)**:
   - Setiap kali user mengubah urutan tab (drag-and-drop), menambah service baru, atau mengedit proxy, client menunggu jeda *debounce* **3 detik**.
   - Setelah 3 detik tanpa perubahan lanjutan, client otomatis mengirim payload ke `POST /api/v1/sync/push`.
2. **Conflict Resolution (Last-Write-Wins via UTC Timestamp)**:
   - Payload selalu menyertakan `client_timestamp` (ISO-8601 UTC).
   - Server membandingkan timestamp payload dengan database. Jika payload client lebih baru, data diperbarui dan `version_hash` dikalkulasi ulang.
3. **Startup Pull Protocol**:
   - Saat Megabox dibuka di desktop, client mengecek token di local store (`auth_token`).
   - Jika token valid, client memanggil `GET /api/v1/sync/pull`. Jika server memiliki konfigurasi lebih baru daripada file lokal `services.json`, client melakukan re-render sidebar secara mulus tanpa mengganggu webview aktif.

---

## 8. Payload JSON Baku (Kontrak Data Workspace)

Contoh struktur data yang dikirim dan disimpan (hanya 1.5 - 3.5 KB):
```json
{
  "version": 1,
  "client_timestamp": "2026-10-18T05:00:00.000Z",
  "device_name": "Hizam Kubuntu Ryzen",
  "settings": {
    "hibernate_timeout_ms": 900000,
    "master_pin_enabled": false
  },
  "services": [
    {
      "id": "whatsapp",
      "name": "WhatsApp",
      "url": "https://web.whatsapp.com",
      "icon": "whatsapp",
      "order_index": 0,
      "proxy": "",
      "muted": false
    },
    {
      "id": "telegram",
      "name": "Telegram",
      "url": "https://web.telegram.org/k/",
      "icon": "telegram",
      "order_index": 1,
      "proxy": "socks5://127.0.0.1:1080",
      "muted": false
    }
  ]
}
```

---

## 9. Aturan Bisnis & Batasan Arsitektur (Guardrails)

1. **Anti-Leak Session Law**: Partisi webview Chromium (`persist:service_<id>`) DIHARAMKAN dikirim atau disentuh oleh modul sync cloud.
2. **Size Sekring**: Maksimal ukuran payload JSON dibatasi 50 KB per request (mencegah eksploitasi storage).
3. **Quota Free Tier Guard**: Pengguna tanpa lisensi Pro dibatasi maksimal 10 service per akun di level validasi Pydantic backend.
4. **Offline First Resilience**: Jika server cloud `sync.megapass.web.id` tidak dapat dijangkau (DNS error/offline), Megabox tetap beroperasi 100% menggunakan konfigurasi lokal tanpa popup error yang mengganggu.

---

## 10. Manajemen Akses & Keamanan (Auth & OPSEC)

- **Password Storage**: Hashing dengan `argon2-cffi` (memory cost 64MB, time cost 3, parallelism 1) atau `bcrypt` (12 rounds).
- **JWT Lifespan**: Access token berlaku 30 hari dengan payload klaim minimal: `{"sub": user_id, "email": email, "tier": plan_tier}`.
- **Brute-Force Shield**: Rate limit ketat pada endpoint `/api/v1/auth/login` (maksimal 5 percobaan gagal per IP dalam rentang 15 menit).
- **Tunnel Ingress**: Backend di-proxy via Cloudflare Tunnel internal ke port localhost `8991` tanpa port forwarding publik.

---

## 11. Toolkit & Fitur Cadangan (Fail-Safe Tools)

1. **Export / Import JSON Offline**:
   - Di modal settings, disediakan tombol `[ Ekspor Cadangan ]` dan `[ Impor Cadangan ]`.
   - Pengguna yang tidak mau login cloud tetap bisa memindahkan tatanan tab antar-komputer via file `.json` manual.
2. **Force Resync Button**:
   - Tombol manual darurat `[ Tarik Ulang dari Cloud ]` jika tatanan lokal teracak.

---

## 12. SOP Implementasi Mandiri AI Orchestrator

- **Fase 1: Backend Monolith di Node Michael**
  - Buat direktori `~/proyek/megabox-sync-server/` di node `michael`.
  - Pasang virtualenv Python hemat resource: `fastapi`, `uvicorn`, `pydantic`, `pyjwt`, `passlib[bcrypt]`.
  - Inisialisasi database SQLite WAL `sync_megabox.db`.
  - Deploy daemon service via PM2: `pm2 start "uvicorn app:app --port 8991" --name megabox-sync`.
  - Konfigurasi Cloudflare Tunnel domain `sync.megapass.web.id`.
- **Fase 2: Integrasi Client di Node Hizam**
  - Tambahkan module `src/main/sync-client.js` di Megabox Electron (penyimpan token `auth.json`, fungsi push/pull async).
  - Daftarkan IPC handler di `src/main/index.js` (`sync:register`, `sync:login`, `sync:pull`, `sync:push`, `sync:logout`).
  - Update UI `src/renderer/index.html` pada modal settings: tab Cloud Account & Status Sinkronisasi.
- **Fase 3: Verifikasi R2 & Smoke Testing**
  - Tes register & login via `curl` ke endpoint FastAPI (status 200 OK).
  - Tes sinkronisasi: Geser urutan tab di Megabox desktop ➔ verifikasi log payload masuk di server PM2.
  - Tangkap bukti visual screenshot di node `hizam` memastikan status sinkronisasi aktif.

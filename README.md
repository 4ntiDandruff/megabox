<div align="center">

# Megabox Workspace

### Ruang Kerja Multi-Aplikasi Zero-Bloat, Hemat RAM, & Local-First untuk Linux & Windows
*Dirancang dari ketelitian logika teknisi perangkat keras: ringan, kebal pemadaman listrik mendadak, dan 100% bebas biaya langganan.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Linux Wayland / Windows](https://img.shields.io/badge/Platform-Wayland%20%7C%20Windows-emerald.svg)](#)
[![RAM Footprint: ~85MB](https://img.shields.io/badge/Base%20RAM-~85MB-purple.svg)](#)
[![Data: 100% Local JSON](https://img.shields.io/badge/Data-Local--First%20JSON-amber.svg)](#)
[![Status: Production Ready](https://img.shields.io/badge/Status-v1.7.0%20Stable-success.svg)](#)

</div>

---

## 1. Topologi Sirkuit & Arsitektur Sistem

Megabox menyatukan puluhan aplikasi web kerja harian (WhatsApp, Telegram, Discord, Gmail, Gemini, ChatGPT, CCTV, GitHub) ke dalam satu jendela desktop terpadu tanpa membebani prosesor maupun memori komputer meja kerja.

```
+---------------------------------------------------------------------------------------------+
|                                  MEGABOX DESKTOP WORKBENCH                                  |
|                                                                                             |
|  [ KIRI: SIDEBAR ERGONOMIS 54PX ]          [ KANAN: MULTI-PARTITION WEBVIEW CONTAINER ]     |
|  +------------------------------+          +----------------------------------------------+ |
|  | (*) WhatsApp Business (34px) | -------->| PANE KIRI (50%)       | PANE KANAN (50%)     | |
|  | (*) Telegram Web      (34px) |          | [wv-wa-biz]           | [wv-tg-web]          | |
|  | (*) CCTV Stream       (34px) |          | Partition: wa_biz     | Partition: tg_web    | |
|  | (+) Tambah Layanan           |          |                       |                      | |
|  |                              |          | * Mode Bagi Layar Responsif (Alt+S)          | |
|  |                              |          | * Ekstraksi Link Cerdas (params.linkURL)     | |
|  | [Icon Unduhan & Progress]   | -------->| * Pengelola Unduhan Mandiri (will-download)  | |
|  | [Avatar Pengaturan / Vault]  | -------->| * Megawarden Vault (Autofill & Google CSV)   | |
|  +------------------------------+          | * Tooltip Terjemahan Relay Kebal CSP         | |
|                                            | * Skala Zoom Independen per-Tab + HUD OSD    | |
|                                            +----------------------------------------------+ |
+---------------------------------------------------------------------------------------------+
                                              |
                                              v
+---------------------------------------------------------------------------------------------+
|                               MESIN DATA LOKAL & CORE RUNTIME                               |
|                                                                                             |
|  * POSIX Atomic JSON Storage (~/.config/megabox/megabox-config.json)                        |
|  * Pure Vanilla DOM Controller (Nol React / Nol Webpack / Zero Build-Step)                  |
|  * Native Ozone Wayland Socket (Anti-Crash, Bebas Flickering di KDE Plasma & GNOME)         |
|  * Google Translate Selection Relay (Backend IPC Relay, Bypass Total Blokir CSP Webview)    |
|  * Hibernasi Otomatis Tab Idle (Pangkas Penggunaan RAM Hingga 78% saat Latar Belakang)      |
|  * Cadangan Mandiri: 1-Klik Ekspor / Impor JSON (Kedaulatan Data Lokal 100%)                |
+---------------------------------------------------------------------------------------------+
```

---

## 2. Masalah Nyata di Lapangan & Solusi Meja Kerja

Bagi teknisi servis, programmer, dan operator workstation yang membuka belasan tab komunikasi serta dashboard teknis seharian, aplikasi multi-chat komersial yang beredar saat ini memicu dua kendala besar:

1. **Jebakan Paywall & Langganan Bulanan**:
   - Fitur-fitur vital seperti menambah banyak akun, pemisahan partisi sesi, hibernasi tab agar RAM tidak jebol, dan mode bagi layar dikunci di balik biaya langganan tahunan berbayar.
2. **Framework Raksasa yang Berat & Sering Macet di Linux Wayland**:
   - Dibangun di atas tumpukan React/MobX atau bundler rumit yang memakan RAM lebih dari 400MB sebelum membuka pesan apa pun. Di Linux modern (Wayland), aplikasi jenis ini rawan mengalami freeze layar, kursor loncat, hingga crash saat render WebAuthn.

**Megabox memecahkan seluruh kendala di atas**:  
Menggabungkan kebebasan **100% Open Source**, antarmuka **Pure Flat Utilitarian** yang tenang di mata, dan konsumsi memori awal ultra-hemat (**~85MB**) dengan ketahanan berkas setara standar bengkel perangkat keras.

---

## 3. Bedah Komponen Teknis (Yang Artinya...)

- **Pure Vanilla DOM Controller (Nol React / Nol Webpack / Zero Build-Step)**:
  * *Yang artinya:* Tidak ada rantai kompilasi atau dependensi framework raksasa yang memperlambat boot. Kode HTML5, CSS, dan JavaScript dieksekusi langsung oleh engine Chromium secara instan, menjaga konsumsi memori dasar tetap dingin di kisaran ~85MB.
- **Mode Bagi Layar Responsif (Split Screen 50:50 Dual-Pane)**:
  * *Yang artinya:* Anda dapat membuka percakapan WhatsApp pelanggan di pane sebelah kiri dan panduan skema teknis, CCTV, atau Telegram di pane sebelah kanan secara berdampingan. Kedua panel memanjang presisi 100% tanpa celah visual dan tanpa lapisan overlay yang memblokir klik mouse.
- **Ekstraksi Tautan Chat Cerdas (`Copy Link Address` via `params.linkURL`)**:
  * *Yang artinya:* Saat Anda mengklik kanan tautan eksternal di dalam pesan obrolan WhatsApp, Discord, atau Telegram, context menu membaca target URL spesifik tersebut secara akurat. Anda dapat menyalin alamat tautan atau membukanya langsung di browser utama tanpa salah menyalin URL induk webview.
- **Megawarden Vault Mandiri (Brankas Sandi Meja Kerja Local-First)**:
  * *Yang artinya:* Seluruh akun dan sandi tersimpan langsung di komputer lokal dalam format berkas JSON atomik. Dilengkapi overlay pengisian otomatis (autofill) yang aman di webview, deteksi otomatis kredensial router LAN, serta kompatibilitas penuh impor/ekspor berkas CSV Google Password Manager tanpa server cloud pihak ketiga.
- **Mesin Terjemahan Dua Arah Kebal CSP (Instant Selection Relay)**:
  * *Yang artinya:* Memblokir teks obrolan bahasa asing di WhatsApp atau email langsung memunculkan kartu terjemahan instan ke bahasa Indonesia via backend IPC relay Electron, menembus pembatasan ketat CSP (*Content Security Policy*) tanpa perlu memasang ekstensi tambahan yang rakus memori.
- **Pengelola Unduhan Mandiri & Pengatur Skala Zoom per-Aplikasi**:
  * *Yang artinya:* Berkas skema atau firmware yang diunduh langsung tercatat di flyout popover riwayat unduhan pada sidebar, dan skala perbesaran (zoom) setiap tab aplikasi tersimpan permanen di penyimpanan lokal tanpa saling mengganggu.
- **Penyimpanan POSIX Atomik (Kebal Mati Lampu)**:
  * *Yang artinya:* Sistem selalu menulis konfigurasi ke berkas temporer terlebih dahulu sebelum melakukan penggantian nama (*atomic rename*) di filesystem. Jika listrik tempat kerja padam mendadak di tengah proses penyimpanan, berkas data tidak akan pernah rusak (*corrupt*).

---

## 4. Metrik Benchmark Nyata (Beban Hardware Meja Kerja)

Pengujian dilakukan langsung pada mesin workstation Linux bare-metal dengan pemantauan alokasi memori aktual:

| Kondisi Operasional | Konsumsi RAM Aktual | Penggunaan CPU Standby | Status Komputasi |
|---|---|---|---|
| **Boot Awal / Idle Shell** | **~85 MB** | **0.0% - 0.1%** | Siap Kerja Instan |
| **Beban Aktif (5 Layanan)** | **~420 MB** | **0.4% - 1.2%** | Multitasking Ringan |
| **Tab Hibernasi (>15 Menit)** | **Turun hingga 78% (~90 MB)** | **0.0%** | Memori Otomatis Lega |
| **Ruang Penyimpanan Disk** | **< 45 MB Total** | **-** | Termasuk 480+ Ikon SVG |

---

## 5. Valuasi Rekayasa & Efisiensi Sistem

- **Bebas Biaya Langganan Seumur Hidup**: Menghemat jutaan rupiah per tahun dari tagihan langganan multi-chat berbayar tanpa kehilangan fitur produktivitas vital.
- **Kedaulatan Data Meja Kerja 100%**: Tidak ada data obrolan, riwayat browsing, maupun kredensial akun yang dikirimkan ke server pengembang pihak ketiga. Seluruh konfigurasi adalah milik pengguna sepenuhnya.

---

## 6. Pohon Direktori Meja Kerja (Clean Architecture)

```
megabox/
├── blueprint.md                 # Cetak biru arsitektur dan spesifikasi teknis
├── CHANGELOG.md                 # Catatan servis dan rekam medis rilis kronologis
├── LICENSE                      # Lisensi resmi MIT
├── megabox-launcher.sh          # Peluncur cerdas dengan deteksi Wayland / X11
├── package.json                 # Manifest dependensi & nomor versi (v1.7.0)
├── README.md                    # Dokumentasi lengkap meja kerja
├── src/
│   ├── main/
│   │   ├── db.js                # Mesin database lokal JSON POSIX atomik
│   │   ├── extensions.js        # Manajer ekstensi & user-agent webview
│   │   ├── index.js             # Proses utama Electron, lifecycle, & IPC context menu
│   │   ├── megawarden.js        # Engine brankas sandi lokal & parser Google CSV
│   │   ├── preload-webview.js   # Skrip injeksi webview (badge counter, autofill overlay)
│   │   ├── translator.js        # Relay terjemahan dua arah kebal pembatasan CSP
│   │   └── updater.js           # Pemeriksa pembaruan rilis mandiri dengan fitur snooze
│   ├── preload/
│   │   └── index.js             # Jembatan IPC aman (contextBridge) renderer ke main
│   └── renderer/
│       ├── app.js               # Pengendali tab DOM, zoom controller, & sidebar context menu
│       ├── index.html           # Struktur UI antarmuka Apple Liquid Crystal & modal
│       └── assets/
│           ├── icons/           # Koleksi 480+ ikon SVG resmi lokal
│           ├── icons8/          # Asset visual monokrom panel pengaturan
│           ├── megabox.png      # Avatar & identitas visual resmi Megabox
│           ├── megabox.svg      # Logo vektor resolusi tinggi
│           ├── qris.png         # Kartu QRIS resmi standar nasional tanpa twibbon
│           └── recipes-catalog.json # Basis data 480+ resep aplikasi web siap pakai
└── tests/
    ├── e2e_smoke_test.js        # Validasi end-to-end rendering antarmuka
    ├── test_db.js               # Unit test penulisan atomik database JSON
    ├── test_downloads.js        # Unit test manajemen unduhan berkas
    ├── test_megawarden.js       # Unit test validasi brankas sandi & CSV parser
    ├── test_ua_filter.js        # Unit test sanitasi user-agent Chromium
    └── test_updater.js          # Unit test skema semver pembaruan aplikasi
```

---

## 7. Menjalankan Langsung di Terminal (Smoke Test)

```bash
# 1. Unduh repositori resmi
git clone https://github.com/4ntiDandruff/megabox.git
cd megabox

# 2. Pasang dependensi Electron
npm install

# 3. Jalankan pengujian unit test terisolasi
node tests/test_db.js && node tests/test_downloads.js && node tests/test_megawarden.js && node tests/test_ua_filter.js && node tests/test_updater.js

# 4. Jalankan aplikasi (Otomatis mendeteksi Wayland atau X11)
bash megabox-launcher.sh
```

---

## 8. Peta Jalan Multi-OS & Kompatibilitas Lintas Platform (Roadmap)

Megabox dirancang dengan prinsip nol dependensi biner C++ kompilasi lokal (*zero native C++ bindings*). Seluruh lapisan logika (*main*, *preload*, dan *renderer*) murni menggunakan JavaScript, HTML5, dan CSS standar di atas runtime Chromium/Node.js:

- **Linux (Tervalidasi Penuh di Workstation Meja Kerja)**:
  * **Wayland & X11**: Kompatibel 100% pada lingkungan KDE Plasma, GNOME, XFCE, Cinnamon, dan MATE. Peluncur `megabox-launcher.sh` otomatis mendeteksi soket Wayland native (`--ozone-platform=wayland`) untuk grafis mulus tanpa screen tearing, atau beralih ke fallback X11 saat diperlukan.
- **Windows 10 / 11 (Tahap Rilis Berikutnya)**:
  * Penyimpanan data aplikasi menggunakan API sistem universal (`app.getPath("userData")` yang otomatis mengarah ke `%APPDATA%\megabox`), membuat basis kode ini siap dibundel menjadi installer tunggal Windows (`.exe` via `electron-builder`) langsung dari workstation tanpa perlu mengubah struktur kode sumber.
- **macOS (Apple Silicon & Intel - Target Portabilitas)**:
  * Arsitektur antarmuka bergaya *Apple Liquid Crystal* dan nihilnya dependensi spesifik Linux memungkinkan paket bundle `.dmg` / `.app` dibangun dengan mudah begitu tahap pengemasan rilis multi-platform dibuka secara resmi.

---

## 9. Kebijakan Desain & Batasan Arsitektur Meja Kerja

- **Zero Lock Policy**: Megabox dirancang sebagai workstation terbuka (*open-workbench*) yang langsung siap pakai tanpa hambatan login master PIN lokal. Fitur penguncian layar (*lock screen*), master PIN, dan timer auto-lock dihapus permanen agar tidak mengganggu kecepatan kerja teknisi.
- **Kedaulatan Data Lokal Penuh**: Seluruh kredensial, konfigurasi tab, dan preferensi tersimpan dalam berkas JSON lokal yang dapat dicadangkan atau dipulihkan dalam 1-klik melalui menu Cadangan Data.

---

## 10. Dukungan Sukarela & Donasi Komunitas

Megabox dikembangkan sebagai proyek perangkat lunak mandiri yang bebas dari iklan, bebas dari pelacak (*trackers*), dan bebas dari paywall. Jika perangkat lunak ini mempermudah alur kerja Anda sehari-hari, Anda dapat memberikan apresiasi:

- **Donasi via QRIS Nasional**: Buka menu **Pengaturan -> Tentang -> Donasi via QRIS** untuk memindai kartu QRIS resmi Megabox (dapat dipindai dari BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay, dan seluruh aplikasi perbankan nasional).
- **Dukungan Bintang GitHub**: Berikan apresiasi bintang (Star) pada repositori resmi [GitHub 4ntiDandruff/megabox](https://github.com/4ntiDandruff/megabox).

---

## 11. Lisensi & Pernyataan Merek (Trademark & Legal Notice)

Perangkat lunak ini dirilis di bawah lisensi terbuka [MIT License](LICENSE).

> **Pemberitahuan Merek Dagang (Trademark Disclaimer)**:  
> Seluruh nama produk, merek dagang, logo, dan ikon pihak ketiga (termasuk *Rambox*, *Ferdium*, *WhatsApp*, *Telegram*, *Discord*, *Slack*, *Google*, dan lainnya) yang disebutkan dalam repositori atau dokumentasi ini merupakan hak milik dari masing-masing pemilik resminya.  
> Penyebutan nama produk atau merek dalam repositori ini semata-mata bersifat deskriptif (*nominative fair use*) untuk keperluan identifikasi kompatibilitas, perbandingan performa, dan referensi rekayasa. Penggunaan nama tersebut tidak menyatakan maupun menyiratkan adanya afiliasi, sponsor, atau dukungan resmi dari pemilik merek terkait terhadap proyek Megabox ini.

---

<div align="center">

**Megapass Intra Solusindo • Sidoarjo, Indonesia**  
*Membangun software dengan ketelitian logika teknisi perangkat keras: Ringan, Tangguh, dan Nol-Bloat.*

</div>

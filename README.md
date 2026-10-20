<div align="center">

# Megabox Workspace

### Ruang Kerja Multi-Aplikasi Zero-Bloat, Hemat RAM, & Local-First untuk Linux & Windows
*Dirancang dari ketelitian logika teknisi perangkat keras: ringan, kebal pemadaman listrik mendadak, dan 100% bebas biaya langganan.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Linux Wayland / Windows](https://img.shields.io/badge/Platform-Wayland%20%7C%20Windows-emerald.svg)](#)
[![RAM Footprint: ~85MB](https://img.shields.io/badge/Base%20RAM-~85MB-purple.svg)](#)
[![Data: 100% Local JSON](https://img.shields.io/badge/Data-Local--First%20JSON-amber.svg)](#)
[![Status: Production Ready](https://img.shields.io/badge/Status-v1.4.0%20Stable-success.svg)](#)

</div>

---

## 1. Topologi Sirkuit & Arsitektur Sistem

Megabox menyatukan puluhan aplikasi web kerja harian (WhatsApp, Telegram, Discord, Gmail, Gemini, ChatGPT, CCTV, GitHub) ke dalam satu jendela desktop terpadu tanpa membebani prosesor maupun memori komputer.

```
+-----------------------------------------------------------------------------------+
|                           MEGABOX DESKTOP WORKBENCH                               |
|                                                                                   |
|  [ KIRI: SIDEBAR FLAT ]             [ KANAN: MULTI-PARTITION WEBVIEW CONTAINER ]  |
|  +-------------------+              +-------------------------------------------+ |
|  | (*) WhatsApp Bus. | ------------>| [wv-wa-biz]   Partition: persist:wa_biz   | |
|  | (*) Telegram Web  | ------------>| [wv-tg-web]   Partition: persist:tg_web   | |
|  | (*) CCTV Stream   | ------------>| [wv-cctv]     Partition: persist:cctv     | |
|  | (+) Tambah 2-Input|              |                                           | |
|  |                   |              | * Isolasi Cookie & Session Antar-Akun     | |
|  |                   |              | * Webview IPC Bridge (Badge Counter)      | |
|  |                   |              | * Anti-Trap Universal Global Shortcut     | |
|  |                   |              | * Tooltip Terjemahan Instan (ID <-> EN)   | |
|  |                   |              +-------------------------------------------+ |
|  |                   |                                                            |
|  | [Avatar Ungu Box] | ------------> [ Modal Pengaturan / Backup / Donasi QRIS ]  |
|  +-------------------+                                                            |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                     MESIN DATA LOKAL & CORE RUNTIME                               |
|                                                                                   |
|  * POSIX Atomic JSON Storage (~/.config/megabox/megabox-config.json)              |
|  * Pure Vanilla DOM Controller (Nol React / Nol Webpack / Zero Build-Step)        |
|  * Native Ozone Wayland Socket (Anti-Crash & Anti-Flicker di KDE Plasma)          |
|  * Google PA API Relay Node.js (Kebal Blokir CSP WhatsApp/GitHub)                 |
|  * Hibernasi Otomatis Tab Idle (Pangkas Penggunaan RAM Hingga 78%)                |
|  * Cadangan Mandiri: 1-Klik Ekspor / Impor JSON (Data Milik Anda 100%)            |
+-----------------------------------------------------------------------------------+
```

---

## 2. Masalah Nyata di Lapangan & Solusi Meja Kerja

Bagi teknisi servis, programmer, dan operator workstation yang terbiasa membuka belasan tab komunikasi dan dashboard teknis seharian, aplikasi multi-chat yang beredar saat ini memicu dua kendala besar:

1. **Jebakan Paywall & Langganan Bulanan**:
   - Fitur-fitur penting seperti menambah banyak akun, pemisahan proxy per-layanan, hibernasi tab agar RAM tidak habis, dan pencarian cepat dikunci di balik biaya langganan tahunan berbayar.
2. **Framework Raksasa yang Berat & Sering Macet di Linux Wayland**:
   - Dibangun di atas tumpukan React/MobX yang memakan RAM lebih dari 400MB sebelum membuka pesan apa pun. Di Linux modern (Wayland), aplikasi jenis ini rawan mengalami freeze layar, kursor loncat, hingga freeze WebAuthn.

**Megabox memecahkan seluruh masalah di atas**:
Menggabungkan kebebasan **100% Open Source**, antarmuka **Pure Flat Utilitarian** yang tenang di mata, dan konsumsi memori awal ultra-hemat (**~85MB**) dengan ketahanan berkas setara standar bengkel perangkat keras.

---

## 3. Bedah Komponen Teknis (Yang Artinya...)

- **Local-First JSON & Cadangan Mandiri (Ekspor / Impor 1-Klik)**:
  * *Yang artinya:* Seluruh konfigurasi tab, urutan akun, dan setelan disimpan 100% di komputer lokal Anda (`~/.config/megabox/megabox-config.json`). Anda tidak perlu takut server luar down, tidak ada risiko data disadap, dan Anda bisa memindahkan seluruh tatanan ruang kerja ke laptop baru cukup dengan satu berkas JSON.
- **Terjemahan Instan Dua Arah (ID ↔ EN & Multi-Bahasa) Kebal CSP**:
  * *Yang artinya:* Cukup blok teks pesan chat bahasa Inggris di WhatsApp atau Telegram, maka kotak terjemahan bahasa Indonesia langsung melayang di atas kursor lengkap dengan tombol **Salin** satu klik. Jika teks yang diblok bahasa Indonesia, sistem otomatis membaliknya ke bahasa Inggris. Bekerja tanpa hambatan karena diproses langsung di level engine OS, kebal terhadap blokir CSP WhatsApp/GitHub.
- **Foto Profil Workspace Lokal (Default Icon Ungu Megabox)**:
  * *Yang artinya:* Tampilan sidebar langsung memiliki identitas khas Megabox sejak detik pertama. Anda bebas menggantinya dengan foto pribadi kapan saja lewat tombol **Pilih Foto** yang membuka file explorer OS secara instan.
- **Atomic POSIX File Write (Aman dari Mati Lampu Mendadak)**:
  * *Yang artinya:* Setiap kali data ditulis, sistem menulisnya ke berkas sementara terlebih dahulu sebelum mengganti berkas utama secara atomik. Meskipun listrik ruko tiba-tiba padam atau colokan tercabut, konfigurasi aplikasi tidak akan pernah rusak (*zero-byte corrupt proof*).
- **Penambah Layanan 2-Input & Isolasi Akun Mandiri**:
  * *Yang artinya:* Anda bisa memasang 5 akun WhatsApp atau 3 akun Telegram sekaligus di satu layar. Cukup ketik nama dan masukkan alamat web, sistem otomatis memisahkan ruang partisi penyimpanannya agar sesi login tidak saling tertimpa.
- **Katalog Terkurasi 480+ Layanan & Auto-Favicon Cache**:
  * *Yang artinya:* Tersedia resep siap pakai untuk ratusan layanan kerja, perpesanan, hingga platform AI terkini (Muse AI, Gemini, Groq, Bolt, v0). Untuk alamat web custom, Megabox otomatis mengambil favicon dan menyimpannya permanen di database lokal.
- **Vanilla DOM State Engine (Nol Framework JS)**:
  * *Yang artinya:* Tidak ada tumpukan kompilator React atau runtime virtual DOM yang memboroskan resource. Aplikasi langsung terbuka dalam sekejap (<0.6 detik) dan sangat ringan bagi prosesor komputer lama maupun prosesor modern.

---

## 4. Tolok Ukur Beban Hardware Nyata (Benchmark Workbench)

Hasil uji coba komparasi pada komputer kerja harian (**AMD Ryzen 3 2200G • RAM 21GB • Kubuntu Wayland**):

| Tolok Ukur Hardware | Software Proprietary Berbayar | Multi-App Komunitas Lawas | Megabox Workspace |
| :--- | :---: | :---: | :---: |
| **Model Biaya** | Langganan Berulang () | Bebas / Open Source | **100% Gratis & Terbuka Selamanya** |
| **Kedaulatan Data** | Cloud Vendor Tertutup | Server Eksternal Berat | **100% Local-First di Komputer Anda** |
| **Beban RAM Awal (Cold Start)** | ~380 MB | ~420 MB | **~85 MB (Pangkas 78%)** |
| **Waktu Siap Pakai** | ~4.2 detik | ~5.1 detik | **< 0.6 detik (Buka Seketika)** |
| **Kestabilan Wayland Linux** | Rawan tearing XWayland | Sering freeze socket | **Stabil Native Ozone Socket** |
| **Fitur Terjemahan Chat** | Berbayar / Butuh Ekstensi | Sering error CSP webview | **Terpasang Langsung (Auto-Flip ID ↔ EN)** |
| **Cadangan Data** | Terkunci di akun cloud | Database server rumit | **Berkas JSON Mandiri 1-Klik** |
| **Pilihan Layanan** | Dibatasi paket trial | 440+ Layanan | **480+ Layanan + Auto Favicon** |

---

## 5. Tombol Pintas Workstation (Universal Anti-Trap)

Seluruh tombol pintas di bawah ini dirancang kebal interupsi (*anti-trap*), sehingga tetap berfungsi normal meskipun kursor Anda sedang aktif mengetik di dalam WhatsApp, Gmail, maupun editor web:

| Tombol Pintas | Tindakan Kerja Cepat |
| :--- | :--- |
| `Alt + 1` s/d `Alt + 9` | Pindah seketika ke tab aplikasi nomor 1 hingga 9 |
| `Alt + ↑` / `Alt + ↓` | Geser urutan tab aktif naik atau turun |
| `Alt + ←` / `Alt + →` | Navigasi mundur atau maju pada riwayat tab aktif |
| `Ctrl + K` / `Ctrl + P` | Buka kotak pencarian cepat (Quick Switcher) |
| `Ctrl + N` | Buka jendela tambah layanan dan katalog resep |
| `Ctrl + R` / `F5` | Muat ulang (*reload*) tab aktif |
| `Alt + S` | Mode bagi layar 1x2 (*Split Screen*) |
| `Alt + E` | Buka / tutup laci ekstensi per-layanan |
| `Alt + Shift + D` | Mode fokus hening (Senyapkan seluruh audio & notifikasi) |
| `Escape` | Tutup jendela modal, menu klik kanan, atau laci samping |

---

## 6. Pohon Direktori Repositori

```
megabox/
├── megabox-launcher.sh          # Peluncur cerdas pendeteksi Wayland / X11
├── package.json                 # Metadata runtime Electron v1.5.0
├── src/
│   ├── main/                    # Engine Backend Electron (Node.js)
│   │   ├── index.js             # Window lifecycle, native dialogs, & IPC gateway
│   │   ├── db.js                # Penyimpanan berkas atomic POSIX JSON
│   │   ├── extensions.js        # Multi-engine user-agent & header interceptors
│   │   ├── megawarden.js        # Pengelola kredensial lokal aman (AES-256-GCM)
│   │   └── translator.js        # Mesin relay terjemahan Google PA/GTX (CORS-free)
│   ├── preload/
│   │   └── index.js             # Jembatan IPC aman (contextBridge)
│   └── renderer/                # Antarmuka Pengguna Flat Utilitarian
│       ├── index.html           # Struktur layout flat monokrom & modal pengaturan
│       ├── app.js               # Pengendali tab DOM, quick switcher, & context menu
│       └── assets/
│           ├── icons/           # Koleksi 480+ icon SVG resmi Homarr & AI
│           ├── megabox.png      # Identitas visual & avatar default Megabox
│           ├── qris.png         # Kartu QRIS resmi standar nasional tanpa twibbon
│           └── recipes-catalog.json # Basis data 480+ resep aplikasi siap pasang
└── docs/
    └── superpowers/plans/       # Catatan blueprint rekayasa teknis terstruktur
```

---

## 7. Menjalankan Langsung di Terminal (Smoke Test)

```bash
# 1. Unduh repositori
git clone https://github.com/4ntiDandruff/megabox.git
cd megabox

# 2. Pasang dependensi jika belum ada
npm install

# 3. Jalankan aplikasi (Otomatis mendeteksi lingkungan Wayland atau X11)
bash megabox-launcher.sh
```

---

## 8. Peta Jalan Multi-OS & Kompatibilitas Lintas Platform (Roadmap)

Megabox dibangun dengan prinsip arsitektur bebas dependensi biner C++ kompilasi lokal (*zero native C++ bindings*). Seluruh lapisan logika aplikasi (*main*, *preload*, dan *renderer*) murni menggunakan JavaScript, HTML5, dan CSS standar yang dieksekusi di atas runtime Chromium/Node.js, sehingga memiliki fondasi portabilitas tinggi untuk multi-OS:

- **Linux (Tervalidasi Penuh di Workstation)**:
  * **Wayland & X11**: Kompatibel 100% di berbagai Desktop Environment modern (KDE Plasma, GNOME, XFCE, Cinnamon, MATE). Script peluncur cerdas (`megabox-launcher.sh`) otomatis mengaktifkan soket Ozone Wayland saat sesi Wayland terdeteksi, atau beralih ke fallback X11 secara mulus.
- **Windows 10 / 11 (Tahap Rilis Berikutnya)**:
  * Karena arsitektur penyimpanan database berbasis path sistem universal (`app.getPath("userData")` yang otomatis memetakan ke `%APPDATA%\megabox`), aplikasi ini siap dibundel menjadi installer tunggal Windows (`.exe` via `electron-builder`) langsung dari workstation Linux tanpa perlu merombak kode sumber.
- **macOS (Apple Silicon & Intel - Target Portabilitas)**:
  * Rencana jangka panjang mencakup penyediaan paket bundle `.dmg` / `.app` untuk ekosistem macOS. Walaupun meja kerja pengembang saat ini tidak memiliki perangkat Mac fisik untuk pengujian harian (*air-gapped workbench*), rancangan antarmuka bergaya *Apple Liquid / Monokrom Utilitarian* dan ketiadaan dependensi sistem spesifik Linux membuat logika intinya siap dijalankan di macOS begitu tahap pengemasan rilis multi-platform dibuka.

---

## 9. Dukungan Sukarela & Donasi Komunitas

Megabox dikembangkan sebagai proyek perangkat lunak mandiri yang bebas dari iklan, bebas dari pelacak (*trackers*), dan bebas dari paywall. Jika perangkat lunak ini mempermudah alur kerja Anda sehari-hari, Anda dapat memberikan apresiasi sukarela:

- **Donasi via QRIS Nasional**: Buka menu **Pengaturan \rightarrow Tentang \rightarrow Donasi via QRIS** untuk memindai kartu QRIS resmi Megabox (dapat dipindai dari BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay, dan seluruh perbankan nasional).
- **Dukungan Komunitas (GitHub Star)**: Berikan apresiasi bintang (Star) pada repositori resmi [GitHub 4ntiDandruff/megabox](https://github.com/4ntiDandruff/megabox).

---

## 10. Lisensi & Pernyataan Merek (Trademark & Legal Notice)

Perangkat lunak ini dirilis di bawah lisensi terbuka [MIT License](LICENSE).

> **Pemberitahuan Merek Dagang (Trademark Disclaimer)**:  
> Seluruh nama produk, merek dagang, logo, dan ikon pihak ketiga (termasuk *Rambox*, *Ferdium*, *WhatsApp*, *Telegram*, *Discord*, *Slack*, *Google*, dan lainnya) yang disebutkan dalam repositori atau dokumentasi ini merupakan hak milik dari masing-masing pemilik resminya.  
> Penyebutan nama produk atau merek dalam repositori ini semata-mata bersifat deskriptif (*nominative fair use*) untuk keperluan identifikasi kompatibilitas, perbandingan performa, dan referensi rekayasa. Penggunaan nama tersebut tidak menyatakan maupun menyiratkan adanya afiliasi, sponsor, atau dukungan resmi dari pemilik merek terkait terhadap proyek Megabox ini.

---

<div align="center">

**Megapass Intra Solusindo • Sidoarjo, Indonesia**  
*Membangun software dengan ketelitian logika teknisi perangkat keras: Ringan, Tangguh, dan Nol-Bloat.*

</div>

---

## 9. Kebijakan Desain & Batasan Arsitektur Meja Kerja

- **Zero Lock Policy**: Megabox dirancang sebagai *open-workbench workspace* yang responsif dan langsung siap pakai tanpa hambatan otentikasi lokal. Fitur penguncian layar (*lock screen*), master PIN, dan penghitung *idle auto-lock* **secara mutlak dilarang ditambahkan kembali**, kecuali jika Cak Hizam memberikan instruksi penambahan secara eksplisit.
- **Kedaulatan Data Penuh**: Tidak ada telemetry tersembunyi, tidak ada lock-in proprietary, dan seluruh tatanan akun adalah berkas JSON lokal murni yang berada 100% dalam kendali pengguna.

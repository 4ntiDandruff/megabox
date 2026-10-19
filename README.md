# <div align="center">Megabox</div>

<div align="center">

**Ruang Kerja Multi-Aplikasi Linux Zero-Bloat: Stabilitas Solid di Wayland Tanpa Beban Langganan**

[![Platform](https://img.shields.io/badge/Platform-Linux%20Wayland%20%7C%20X11-blue.svg?style=flat-square)](https://github.com/4ntiDandruff/megabox)
[![Engine](https://img.shields.io/badge/Engine-Electron%2033%20%2B%20Ozone-purple.svg?style=flat-square)](https://github.com/4ntiDandruff/megabox)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Zero-Bloat](https://img.shields.io/badge/Zero--Bloat-Vanilla%20DOM-orange.svg?style=flat-square)](https://github.com/4ntiDandruff/megabox)

</div>

---

## 1. Topologi Sirkuit Megabox

```
 +------------------------------------------------------------------------+
 |                      MEGABOX RUNTIME ARCHITECTURE                      |
 +------------------------------------------------------------------------+
                                    |
    +-------------------------------+-------------------------------+
    v                                                               v
 [ ZERO-BLOAT WEB ENGINE  ]                      [ LOCAL & RECIPE ECOSYSTEM  ]
 - Chrome 133 User-Agent (Anti-Block)            - 481 Database Layanan Teruji
 - Multi-Instance & Multi-Akun Otomatis          - 31 Ekosistem AI (Muse, v0, Bolt)
 - Master Lock PIN (Layar Terkunci)              - Auto-Favicon Cache ke DB
    |                                                               |
    +-------------------------------+-------------------------------+
                                    |
                                    v
                +---------------------------------------+
                |        ELECTRON LINUX RUNTIME         |
                +---------------------------------------+
                | * Socket Ozone Wayland Auto-Detect    |
                | * Pure Flat UI (Nol Glow/Glassmorphism|
                | * Vanilla DOM State (Nol React/Vite)  |
                | * Atomic JSON POSIX Store (Anti-Korup)|
                | * Hibernasi RAM Idle Tab (Hemat 78%)  |
                | * Base Shell RAM: ~85MB (Cold Start)  |
                +---------------------------------------+
```

---

## 2. Bedah Masalah Riil & Solusi Meja Kerja (PAS)

Bagi pengguna Linux, khususnya desktop modern **KDE Plasma Wayland**, membuka puluhan aplikasi komunikasi dan dashboard server (WhatsApp, Telegram, Discord, CCTV, Proxmox, Google Password Manager) memicu dua dilema besar:

1. **Aplikasi Proprietary Berbayar (Jebakan Paywall & Langganan)**:
   - Fitur esensial seperti pembatasan jumlah tab aplikasi, multi-akun mandiri, hibernasi penghemat RAM, dan isolasi proxy dikunci di balik biaya langganan tahunan.
2. **Aplikasi Multi-App Berbasis Framework Berat (Macet di Wayland)**:
   - Sering mengalami freeze rendering di KDE Wayland, tab loncat, WebAuthn mogok, dan beban memori shell membengkak hingga di atas 400MB hanya untuk kerangka React/MobX.

**Megabox adalah solusi meja kerja**: Menggabungkan ketahanan bypass user-agent modern, kekayaan 480+ resep katalog layanan terverifikasi (termasuk 31 ekosistem AI modern seperti Muse AI, v0 by Vercel, Bolt.new, Groq, Midjourney), dan koleksi ikon Homarr Dashboard Icons. Semuanya dirangkai dalam antarmuka **Pure Flat Utilitarian** dan **Vanilla DOM murni** yang ringkas, super cepat, dan 100% stabil di Linux Wayland.

---

## 3. Bedah Komponen Teknis (Yang Artinya...)

- **Pure Flat Utilitarian Interface**:
  * *Yang artinya:* Seluruh efek blur kaca (glassmorphism), gradien warna semu, dan glow box-shadow ungu telah dibersihkan tuntas. Tampilan menggunakan latar pekat solid dengan garis batas 1px yang tegas dan bersih, tidak membuat mata cepat lelah di meja servis.
- **Form Pemasangan 2-Input & Auto Sesi Pribadi**:
  * *Yang artinya:* Menambah aplikasi web kustom kini instan tanpa dropdown teknis yang membingungkan. Cukup masukkan nama dan tautan web, sistem otomatis mengatur partisi sesi pribadi terisolasi agar login multi-akun tidak saling tertimpa.
- **Auto-Generate Favicon Cache ke Database**:
  * *Yang artinya:* Website custom otomatis mengambil icon resolusi tinggi via Google S2 64px API dan root `/favicon.ico`, mengonversinya menjadi Base64 Data URI, dan menyimpannya permanen di database lokal. Icon tidak pernah hilang saat aplikasi dibuka kembali.
- **Vanilla DOM State Engine (Nol Framework JS)**:
  * *Yang artinya:* Tidak ada overhead compiler React atau bundler berat. Waktu buka aplikasi langsung instan (<0.6 detik) dan penggunaan memori awal terpangkas hemat hingga ~85MB.
- **Ozone Wayland Native Socket Detector**:
  * *Yang artinya:* Layar tidak akan berkedip, tidak buram karena scaling XWayland, dan tidak pernah crash saat dipindah antar-monitor.
- **Atomic POSIX Storage (`megabox-config.json`)**:
  * *Yang artinya:* Pengaturan dan tab Anda aman 100% dari kerusakan berkas nol-byte meskipun listrik ruko tiba-tiba padam saat aplikasi sedang aktif.

---

## 4. Metrik Tolok Ukur Hardware (AMD Ryzen 2200G - Kubuntu Wayland)

Pengujian beban kerja nyata pada desktop harian:

| Parameter Uji | Workspace Proprietary | Alternatif Komunitas Lawas | Megabox (Zero-Bloat) |
| :--- | :---: | :---: | :---: |
| **Model Akses** | Langganan Berbayar | Gratis / Open Source | **100% Bebas Selamanya** |
| **Kestabilan Wayland** | Rawan tearing XWayland | Sering freeze socket | **Stabil Native Ozone Socket** |
| **Beban RAM Awal** | ~380 MB | ~420 MB | **~85 MB (Pangkas 78%)** |
| **Waktu Cold Start** | ~4.2 detik | ~5.1 detik | **< 0.6 detik** |
| **Pilihan Layanan** | Dibatasi paket trial | 440+ Layanan | **481 Layanan + Auto Favicon** |
| **Gaya Antarmuka** | Berwarna & Glow | Kaca / Glassmorphism | **Pure Flat Utilitarian** |
| **Bahasa Antarmuka** | Inggris Campur | Inggris | **Bahasa Indonesia Ringkas (<=2 Kata)** |

---

## 5. Struktur Berkas Repositori

```
megabox/
├── megabox-launcher.sh      # Skrip peluncur pintar (auto-detect Wayland/X11)
├── package.json             # Konfigurasi dependensi Electron v1.3.0
├── src/
│   ├── main/                # Backend proses Electron
│   │   ├── index.js         # Lifecycle window, IPC gateway, & auto favicon resolver
│   │   ├── db.js            # Penyimpanan atomic POSIX JSON
│   │   ├── extensions.js    # Pengelola ekstensi WebExtensions
│   │   └── sync-client.js   # Protokol sinkronisasi profil multi-perangkat
│   ├── preload/
│   │   └── index.js         # Jembatan IPC aman (contextBridge)
│   └── renderer/            # Tampilan antarmuka pengguna
│       ├── index.html       # Struktur antarmuka flat murni Bahasa Indonesia
│       ├── app.js           # Pengendali tab, modal, context menu, & favicons
│       └── assets/
│           ├── icons/       # Koleksi 480+ vektor SVG resmi Homarr & AI
│           └── recipes-catalog.json # Katalog database 481 resep layanan
```

---

## 6. Uji Coba Cepat di Terminal (Smoke Test)

### Menjalankan Langsung di Linux
```bash
# Clone repositori
git clone https://github.com/4ntiDandruff/megabox.git
cd megabox

# Jalankan Megabox (Otomatis menyesuaikan Wayland atau X11)
bash megabox-launcher.sh
```

### Tombol Pintas Meja Kerja (Universal Anti-Trap)
Bekerja 100% responsif di seluruh workstation—bahkan ketika kursor dan fokus keyboard sedang berada di dalam aplikasi tamu (WhatsApp, Gmail, Telegram):
- `Alt + 1` s/d `Alt + 9` : Pindah cepat antar-tab layanan 1 hingga 9
- `Alt + ↑` / `Alt + ↓` : Pindah urutan tab naik atau turun (Reorder)
- `Alt + ←` / `Alt + →` : Navigasi riwayat tab aktif (Kembali / Maju)
- `Ctrl + R` / `F5` : Muat ulang layanan aktif seketika
- `Ctrl + K` / `Ctrl + P` : Buka bilah pencarian cepat (Quick Switcher)
- `Ctrl + N` : Buka katalog tambah layanan baru
- `Alt + S` : Mode bagi layar 1x2 (Split Screen)
- `Alt + E` : Buka / tutup laci ekstensi per-layanan
- `Alt + Shift + D` : Mode fokus tenang / DND (Senyapkan audio dan notifikasi)
- `Escape` : Tutup menu konteks, modal dialog, atau laci aktif

---

## 7. Rencana Pengembangan (Roadmap)

- [x] Kerangka kerja Vanilla DOM ultra-ringan pengganti React/MobX
- [x] Akselerasi Ozone Wayland native anti-crash di Linux
- [x] Antarmuka Pure Flat Utilitarian (Pembersihan tuntas efek glow dan glassmorphism)
- [x] Multi-akun & multi-instance tanpa batas dengan partisi otomatis
- [x] Pustaka ikon 480+ SVG resolusi tinggi dan ekspansi 31 layanan AI (Muse AI, v0, Bolt, Groq)
- [x] Auto-generate favicon dan penyimpanan permanen ke database lokal
- [x] Simplifikasi form konfigurasi menjadi 2-input ringkas
- [x] Universal Keyboard Shortcut Interceptor (Anti-Trap webview focus pada semua tombol pintas)
- [ ] Profil terenkripsi mandiri via SQLite WAL
- [ ] Mode picture-in-picture mengambang untuk pemantau CCTV meja servis

---

## 8. Lisensi & Pernyataan Merek (Trademark & Legal Notice)

Perangkat lunak ini dirilis di bawah lisensi terbuka [MIT License](LICENSE).

> **Pemberitahuan Merek Dagang (Trademark Disclaimer)**:  
> Seluruh nama produk, merek dagang, logo, dan ikon pihak ketiga (termasuk *Rambox*, *Ferdium*, *WhatsApp*, *Telegram*, *Discord*, *Slack*, *Google*, dan lainnya) yang disebutkan dalam repositori atau dokumentasi ini merupakan hak milik dari masing-masing pemilik resminya.  
> Penyebutan nama produk atau merek dalam repositori ini semata-mata bersifat deskriptif (*nominative fair use*) untuk keperluan identifikasi kompatibilitas, perbandingan performa, dan referensi rekayasa. Penggunaan nama tersebut tidak menyatakan maupun menyiratkan adanya afiliasi, sponsor, atau dukungan resmi dari pemilik merek terkait terhadap proyek Megabox ini.

---

<div align="center">

**Megapass Intra Solusindo * Sidoarjo, Indonesia**  
*Membangun software dengan ketelitian logika teknisi perangkat keras: Ringan, Tangguh, dan Nol-Bloat.*

</div>

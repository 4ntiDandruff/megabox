# Catatan Servis & Rekam Medis (Changelog)

Seluruh rekam jejak pembaruan penting pada proyek **Megabox** dicatat secara kronologis mengikuti standar *Keep a Changelog*, berorientasi pada ketelitian kerja fisik, keandalan sirkuit data, serta efisiensi beban komputasi nyata.

---

## [1.7.0] - 2026-10-24

### Ditambahkan (Added)
- **Ekstraksi Tautan Chat Cerdas (`Copy Link Address`)**: Menu klik-kanan webview membaca parameter event `params.linkURL` secara langsung. Jika kursor mengklik tautan eksternal di pesan chat (WhatsApp, Telegram, Discord, Gmail), sistem menampilkan opsi **Copy Link Address** dan **Open Link in External Browser** secara presisi tanpa salah menyalin URL induk webview.
- **IPC Direct Clipboard Writer (`clipboard:write-text`)**: Saluran IPC baru antara renderer dan proses utama Electron via `clipboard.writeText()` yang kebal terhadap pembatasan izin keamanan clipboard DOM pada lingkungan Linux Wayland.
- **Opsi Salin URL pada Tab Sidebar**: Menambahkan item menu **Salin URL** pada context menu tab sidebar aplikasi lengkap dengan umpan balik visual notifikasi toast instan dan mekanisme *fallback chain* (getURL -> src -> default config URL).
- **Pintasan Keyboard Global Bagi Layar (Alt+S)**: Memasang pintasan `Alt+S` untuk toggle mode Bagi Layar (Split Screen) serta navigasi tab naik/turun (`Alt+Panah`).

### Diubah (Changed)
- **Standarisasi Penuh Bahasa Inggris pada Context Menu Webview**: Menyelaraskan seluruh label menu konteks webview native ke dalam Bahasa Inggris baku (*Back, Forward, Reload, Copy, Paste, Copy Link Address, Open Link in External Browser, Inspect Element*) demi konsistensi standar aplikasi desktop global.
- **Redesain Ergonomi Sidebar Navigasi Kiri**: Merampingkan lebar sidebar dari 68px menjadi 54px, menyesuaikan ukuran container ikon aplikasi menjadi 34x34px, mengatur ulang padding dan jarak vertikal antar-ikon, serta menyelaraskan posisi popover riwayat unduhan (flyout download) dan banner notifikasi pembaruan sistem agar layout tetap proporsional dan muat lebih banyak tab kerja.
- **Penyelarasan Visual Badge Shortcut Context Menu**: Memperbarui tampilan badge shortcut keyboard pada context menu sidebar dengan tipografi monospace kontras tinggi (`.ctx-shortcut`) yang mudah dibaca dari jarak pandang meja kerja.

### Dihapus (Removed)
- **Eliminasi Opsi Redundan `Salin URL Halaman`**: Menghapus opsi *Salin URL Halaman* dari menu konteks webview untuk mencegah kebingungan saat menyalin tautan di dalam obrolan.
- **Pembersihan Fitur `Set current URL as app's default`**: Menghapus opsi penetapan URL default dari menu konteks beserta seluruh pendengar (*listener*) IPC dan pemanggil handler terkait di proses utama dan renderer.

### Diperbaiki (Fixed)
- **Kalkulasi Responsif Mode Bagi Layar (Split Screen Dual-Pane)**: Menata ulang struktur flexbox container webview (`#webview-container`) saat mode Bagi Layar aktif sehingga kedua pane terdistribusi presisi 50%:50% membentang memenuhi 100% tinggi dan lebar layar tanpa menciut di tengah.
- **Eliminasi Lapisan Overlay Transparan (Dimmer Trap)**: Menghapus bug blocking pointer-events dan seleksi semu pada pane sebelah kanan saat Bagi Layar aktif, menjamin kedua webview beroperasi aktif secara independen tanpa hambatan klik.

---

## [1.6.1] - 2026-10-21

### Diperbaiki (Fixed)
- **Kompatibilitas Format CSV Google Password Manager**: Memperkuat parser impor dan eksportir berkas CSV Megawarden agar 100% kompatibel dengan skema resmi Google Password Manager (`name,url,username,password,note`), termasuk penanganan otomatis tanda kutip multiline dan pemetaan otomatis field nama layanan.
- **Pembersihan Logika Zoom Scope**: Memindahkan helper kalkulasi zoom ke cakupan modul (*module scope*) untuk mencegah error referensi saat berpindah antar-tab aplikasi secara cepat.

### Diubah (Changed)
- **Penyempurnaan Visual Vault Megawarden**: Menyelaraskan kartu entri sandi dan modal brankas Megawarden dengan palet Apple Liquid Glass bernuansa abu-abu gelap bergradasi halus dan tipografi tajam.

---

## [1.6.0] - 2026-10-21

### Ditambahkan (Added)
- **Megawarden Vault (Brankas Sandi Meja Kerja Local-First)**: Brankas kata sandi bawaan mandiri berbasis penyimpanan file JSON lokal dengan proteksi penulisan atomik. Mendukung pengisian otomatis (*autofill overlay*) yang aman pada webview, deteksi otomatis kredensial router LAN, dan impor/ekspor CSV Google Password Manager tanpa server cloud pihak ketiga.
- **Pengelola Unduhan Mandiri (Integrated Download Interceptor)**: Menangkap seluruh unduhan berkas melalui Electron `will-download`, dilengkapi flyout popover riwayat unduhan di sidebar, progres bar real-time, dan penyimpanan data unduhan atomik.
- **Pengatur Skala Tampilan per-Aplikasi (Discrete Zoom Controller)**: Skala zoom independen yang tersimpan otomatis di localStorage per-tab aplikasi, dilengkapi notifikasi visual HUD OSD mengambang (*floating pill*) saat tombol pintasan zoom ditekan.
- **Katalog Vektor Ikon 480+ Layanan**: Memperluas pustaka ikon lokal dengan penambahan brand perbankan nasional (BCA, Mandiri), e-commerce (Tokopedia, Bukalapak), perangkat hardware servis, dan router LAN.

### Diubah (Changed)
- **Penyelarasan Tema Apple Cupertino Light Liquid Crystal v2.1**: Merombak tampilan modal Pengaturan, Brankas Sandi, dan Kartu Bantuan dengan kaca frosted translucent, parit taktil neumorphic halus, dan tombol aksi bergradasi jernih.

---

## [1.5.0] - 2026-10-19

### Ditambahkan (Added)
- **Dukungan Dwibahasa Reaktif (ID - EN Dual Language Engine)**: Mengintegrasikan kamus dwibahasa terisolasi (`I18N`) dengan saklar *Segmented Pill* `[ English | Indonesia ]` di tab General Pengaturan. Beralih instan 100% tanpa reload window.
- **Persistensi Pilihan Bahasa ke JSON Database & Backup**: Konfigurasi bahasa aktif tersimpan otomatis dalam `settings.language` pada `megabox-config.json` dan ikut tercadangkan secara permanen saat ekspor/impor cadangan data.

### Diperbaiki (Fixed)
- **Konsistensi Copywriting Murni Tanpa Percampuran Istilah**: Menyelaraskan seluruh label pada header modal, navigasi tab, context menu webview, kartu cadangan data, info arsitektur, hingga status alert agar 100% konsisten berbahasa Inggris saat mode EN dan 100% bahasa Indonesia saat mode ID.
- **Pembersihan Interaksi & Tautan Eksternal**: Menghubungkan tombol GitHub repository dan portofolio dengan IPC native `system:open-external`, serta memastikan modal QRIS donasi bersih tanpa gangguan layout.

---

## [1.4.2] - 2026-10-19

### Ditambahkan (Added)
- **Mesin Terjemahan Dua Arah Instan Kebal CSP (Instant Selection Translation Relay)**: Mengintegrasikan mesin relay terjemahan otomatis (`src/main/translator.js`) pada backend Electron untuk mem-bypass pembatasan ketat CSP (Content Security Policy) di WhatsApp Web dan Gmail. Teks yang diblok otomatis dideteksi dan diterjemahkan (deteksi cerdas ID ↔ EN atau multi-bahasa) melalui floating pill interaktif tanpa dependensi ekstensi browser eksternal.
- **Dukungan Kartu QRIS Nasional Mandiri**: Menampilkan modal pop-up kartu QRIS resmi Megabox (`src/renderer/assets/qris.png`) dengan rasio simetris 1:1, bersih dari twibbon atau banner merchant pihak ketiga, memudahkan donasi sukarela langsung dari seluruh bank dan dompet digital nasional.
- **Identitas Visual Avatar Default Megabox**: Memasang icon resmi Megabox warna ungu siluet kepala ikan tengkorak (`src/renderer/assets/megabox.png`) sebagai avatar profil default sistem sebelum pengguna memilih foto personal.

### Diperbaiki (Fixed)
- **Akses Pemilih Berkas Dual-Path Lingkungan Wayland**: Mengimplementasikan fallback otomatis pada tombol "Pilih Foto" profil: memprioritaskan dialog berkas native sistem (`dialog:open-file` via IPC Electron), lalu secara mulus beralih ke elemen input file DOM standar jika portal desktop Wayland/KDE menahan dialog native.
- **Pembersihan Klausa Legal & Merek Dagang**: Menyelaraskan seluruh dokumentasi dan antarmuka dengan panduan kepatuhan merek dagang internasional, menegaskan Megabox sebagai proyek rekayasa independen yang terbebas dari klaim kepemilikan atas Rambox, Ferdium, WhatsApp, maupun pihak ketiga lainnya.

---

## [1.4.1] - 2026-10-19

### Diubah (Changed)
- **Dekomisi Sinkronisasi Cloud ke Arsitektur Local-First Penuh**: Menghapus dependensi backend sinkronisasi server eksternal dan beralih 100% ke kedaulatan data lokal meja kerja. Seluruh konfigurasi aplikasi, urutan tab, dan partisi akun disimpan langsung di komputer pengguna dalam format JSON mandiri.
- **Penyederhanaan Antarmuka Pengaturan (Cadangan Data)**: Merestrukturisasi tab "Sinkronisasi" menjadi panel "Cadangan Data" dengan dua saklar utama yang jelas: **Unduh Cadangan** (ekspor file `.json` instan) dan **Pulihkan Cadangan** (impor pemulihan tatanan tanpa restart manual).
- **Tata Letak Elegan & Monokrom Tab Tentang**: Merombak antarmuka tab Tentang dengan pendekatan Slate Glassmorphism monokrom, menonjolkan profil arsitek dan kredensial teknis BNSP/BMY secara profesional dan minim distraksi.

---

## [1.4.0] - 2026-10-19

### Diubah & Ditingkatkan (Changed & Enhanced)
- **Tombol Sinkronisasi Tunggal Terpadu**: Mengeliminasi tombol ganda (Unggah & Unduh) menjadi tombol tunggal yang elegan: **Sinkron** (menyelaraskan tatanan lokal dan cloud secara otomatis dua arah) dan **Keluar**.
- **Dukungan SaaS & Format Email Akun Gmail**: Memperbarui antarmuka login/registrasi dengan placeholder resmi standar Gmail (nama@gmail.com) serta validasi akun yang fleksibel untuk kebutuhan SaaS masa depan.
- **Pembaruan Profil Otomatis & Badge PRO**: Mengintegrasikan endpoint /api/v1/auth/me agar status tier akun (PRO) dan kuota (999 layanan) langsung tampil akurat di UI desktop tanpa harus login ulang.

---

## [1.3.8] - 2026-10-19

### Ditambahkan (Added)
- **Indikator Visual Sinkronisasi Cloud**: Menambahkan dot status real-time pada avatar profil pengguna di sidebar (hijau solid menyala ketika terhubung dan tersinkron, abu-abu ketika offline).
- **Sinkronisasi Pengaturan Sistem (Settings Sync)**: Menyelaraskan preferensi sistem (timeout hibernasi tab, aksi close-to-tray, dan autostart) ke dalam payload cloud sync secara otomatis saat disimpan dan memulihkannya saat startup/login.
- **Plafon Kuota Unlimited Akun Owner (Pro Tier)**: Meningkatkan kapasitas layanan cloud sync hingga 999 aplikasi untuk akun owner terverifikasi pada backend server SQLite WAL.

---

## [1.3.6] - 2026-10-19

### Diperbaiki & Disesuaikan (Refined)
- **Rollback & Penyesuaian Arsitektur Copywriting**: Mengembalikan detail lengkap penjelasan pengaturan pada panel Pengaturan (Settings) dan kredensial resmi pada tab Tentang dengan gaya bahasa teknis ringkas, tidak berlebihan, dan lugas.
- **Penyederhanaan Maksimal 2 Kata untuk Area Menu Konteks & Petunjuk**: Menyelaraskan seluruh label menu konteks klik kanan, petunjuk navigasi tombol keyboard, command palette, dan prompt pencarian layanan agar padat dan konsisten maksimal 2 kata (contoh: *Kembali*, *Maju*, *Muat Ulang*, *Beranda*, *Browser*, *Tidurkan*, *Bagi Layar*, *Pindah Naik*, *Pindah Turun*, *Ubah Layanan*, *Hapus Layanan*).

---

## [1.3.4] - 2026-10-19

### Ditambahkan (Added)
- **Etalase Rekayasa & Soft-Selling Servis Megapass pada Tab Tentang**: Memperkaya konten tab Tentang dengan profil arsitek & Kepala Teknisi Hizam Nahari (Megapass Intra Solusindo, Sidoarjo), memamerkan 12+ tahun pengalaman dan kredensial resmi terverifikasi (Sertifikasi BNSP Reparasi Ponsel, BMY Hardware Motherboard Laptop, dan 10 sertifikasi teknis lainnya).
- **Tautan Cepat Portofolio & Ekosistem Zero-Bloat**: Menambahkan tombol langsung menuju repositori GitHub Megabox (`github.com/4ntiDandruff/megabox`), laman portofolio & pembuktian sertifikat (`megapass.web.id/teknisi/`), serta situs resmi Megapass (`megapass.web.id`) untuk penanganan perbaikan hardware tingkat lanjut dan konsultasi sistem.
- **Kartu Arsitektur Produk Zero-Bloat**: Menampilkan metrik arsitektur sistem (Pure Flat Slate, Power-Loss Proof via SQLite WAL Fortress, dan lisensi MIT) dalam tata letak flat card yang terstruktur rapi.

---

## [1.2.5] - 2026-10-19

### Ditambahkan (Added)
- **Multi-Instance & Multi-Akun Tanpa Batas**: Memungkinkan penambahan aplikasi yang sama berulang kali (misal: WhatsApp Kantor, WhatsApp Pribadi, WhatsApp CS) dengan ID unik otomatis dan partisi sesi terisolasi penuh (`persist:app_...`) sehingga login, session, dan cookie tidak saling bertubrukan.
- **Pindah Urutan Tab Naik / Turun (Reorder Tabs)**: Menambahkan menu "Pindah Naik" (Alt+↑) dan "Pindah Turun" (Alt+↓) pada menu konteks tab sidebar, terhubung langsung ke IPC `apps:reorder` dan atomic storage `reorderApp` di database lokal serta terintegrasi otomatis dengan sinkronisasi cloud.

### Diperbaiki (Fixed)
- **Menu Konteks Ubah Layanan**: Memperbaiki listener event klik global (`useCapture`) yang sebelumnya menghapus referensi `contextTargetApp` sebelum aksi `ctxEdit.onclick` dieksekusi, serta menambahkan pelacakan ID layanan (`input-service-id`) agar form modal mengedit data yang tepat tanpa membuat duplikasi.
- **Menutup Menu Konteks Klik Luar**: Memastikan klik kiri di area mana pun di luar menu konteks langsung menutup menu secara bersih dan instan tanpa memblokir klik pada item menu itu sendiri.

---

## [1.2.4] - 2026-10-19

### Dihapus (Removed)
- **Eliminasi 2.216 Asset SVG Orphan**: Memangkas 2.216 file vektor SVG yang tidak terdaftar di katalog layanan maupun antarmuka sistem (menyusutkan direktori icon dari 2.693 menjadi 481 icon esensial, menghemat ruang disk ~23 MB dan merampingkan git tree).
- **Pembersihan Dead Variables & Floating State**: Menghapus sisa variabel mengambang (btnAddOpen, ctxTileLabel, txt, avatarContainer, OriginalNotification, autoLockMinutes, dan lastUserActivity) di renderer dan preload.

### Diperbaiki (Fixed)
- **Keseimbangan Struktur DOM index.html**: Menghapus tag penutup </div> yatim piatu pada modal quickswitch, mengembalikan validasi DOM 100% seimbang (balance selisih tag = 0).

---

## [1.2.3] - 2026-10-19

### Dihapus (Removed)
- **Eliminasi Direktori Dead Legacy src/recipes/**: Menghapus 36 file skrip resep wrapper Ferdium lawas (WhatsApp, Telegram, Discord, Slack, Messenger, Gmail, Todoist, Google Keep) yang tidak pernah dipanggil oleh runtime utama Megabox. Memangkas disk footprint sebesar 428 KB.
- **Pembersihan Dead Functions & Unused Handlers**: Menghapus fungsi toggleMuteApp dan listener ctxMute yang tersisa di app.js.

### Diperbaiki (Fixed)
- **Penyelarasan Bridge Notifikasi Native D-Bus**: Membuka jalur bridge dispatchNotification dari webview melalui preload IPC ke handler native notify:dispatch utama (dilengkapi circuit breaker 500ms anti-freeze Wayland).
- **Sinkronisasi User-Agent Versi Chrome**: Menyelaraskan fallback defaultUA di renderer dengan Chrome v133 yang aktif di backend header interceptor.
- **Prediktabilitas Pintasan Tambah Layanan**: Memperbaiki pemanggilan selector btn-add-open pada event keyboard Ctrl+N agar konsisten di seluruh sesi.

---

## [1.2.2] - 2026-10-19

### Dihapus (Removed)
- **Eliminasi 34 Dead Artifacts & Unused Assets**: Menghapus seluruh ilustrasi Ramby (21 file SVG), font Linearicons yang tidak pernah dipanggil (4 file TTF/WOFF/SVG), file vendor tidak terpakai (Alpine.js, Tailwind.js runtime, Rambox.css, DarkReader vendor scripts), serta file katalog usang dashboard-icons.json. Memangkas disk footprint sebesar ~5.1 MB.
- **Pembersihan Dead Code & Orphan Imports**: Menghapus import session tak terpakai di extensions-manager.js, import os tak terpakai di extensions.js, serta IPC binding mati di preload/index.js (openExtensionOptions, getDarkReaderScript, window:minimize/maximize/close).
- **Pembersihan Logika Mengambang & Dead Timers**: Menghapus seluruh variabel hantu (wcBack, wcForward, wcReload, toggleGlobalMute, btnLock, lockScreen, settingPinVal) dan interval watchdog idle autoLock yang sebelumnya tertinggal di app.js.

### Diubah (Changed)
- **Flat Borderless Icons pada Katalog**: Menghilangkan kotak bingkai (border & background container) pada icon kartu layanan modal Tambah Layanan agar tampil otentik dan bersih.
- **Penyelarasan Prediktabilitas Arsitektur**: Menjamin sistem 100% predictable dengan mengeksekusi langsung reload active app pada palette perintah tanpa perantara elemen hantu.

---

## [1.2.1] - 2026-10-19

### Diubah (Changed)
- **Eliminasi Total Emoji**: Menghapus seluruh karakter emoji pada pill kategori katalog, opsi partisi sesi, status kosong pencarian, dan dokumentasi repositori sesuai direktif AGENTS.md R3.
- **Penyederhanaan Antarmuka Meja Kerja**: Menghapus fitur penguncian layar (lock screen) dan pembisuan audio tab yang membebani alur kerja harian.
- **Ikon Ekstensi Tabler Puzzle**: Mengganti ikon ekstensi sidebar dengan vektor puzzle Tabler presisi 22x22px yang lebih rapi dan simetris.

### Diperbaiki (Fixed)
- **Penutupan Menu Konteks Otomatis**: Menambahkan layer transparan (backdrop) layar penuh yang langsung menutup menu konteks saat pengguna melakukan klik kiri di area mana pun termasuk di atas webview.
- **Drawer Ekstensi Responsif**: Memperbaiki status tampilan drawer ekstensi agar langsung terbuka dan tertutup mulus tanpa macet di latar belakang.

---

## [1.2.0] - 2026-10-19

### Ditambahkan (Added)
- **Koleksi Ikon Homarr Dashboard Icons**: Integrasi 450+ vektor SVG lokal berstandar tinggi di `src/renderer/assets/icons/`, termasuk logo resmi Google Password Manager, Frigate, CCTV, Proxmox, TrueNAS, dan Mikrotik.
- **Cache Favicon Cerdas untuk Custom Web**: Menyimpan otomatis ikon web custom ke cache lokal renderer agar tidak hilang atau tereset ke ikon bola dunia saat aplikasi dibuka kembali.
- **Shared Workspace Session Partition**: Opsi partisi sesi bersama (`persist:workspace_shared`) pada modal konfigurasi layanan agar akun Google, SSO, dan cookie login dapat dibagi langsung antar-layanan.
- **Ekstensi Simple Translate Terintegrasi**: Injeksi terjemahan instan langsung di atas webview tanpa membebani browser engine utama.

### Diubah (Changed)
- **Perampingan Copywriting Antarmuka (Maksimal 2 Kata)**: Mengganti seluruh label tombol aksi, header modal, filter kategori, tooltip, dan context menu ke dalam Bahasa Indonesia to-the-point tanpa jargon asing.
- **Peningkatan Efisiensi Memori**: Mengurangi beban dasar RAM shell menjadi ~85MB saat idle dengan memanfaatkan arsitektur Vanilla DOM murni tanpa framework compiler.
- **Proteksi Ikon Resmi Terkunci**: Mencegah event scraping favicon webview menimpa ikon resmi aplikasi bawaan katalog saat login OAuth Google.

### Diperbaiki (Fixed)
- **Layar Blank Putih saat Boot**: Memperbaiki urutan inisialisasi listener webview sehingga seluruh tab langsung memuat URL home secara otomatis saat aplikasi dinyalakan.
- **Kestabilan Sesi Wayland Kubuntu**: Penyesuaian flag akselerasi Ozone native pada `megabox-launcher.sh` untuk mengeliminasi freeze rendering saat jendela diminimalkan.

---

## [1.0.0] - 2026-10-18

### Ditambahkan (Added)
- **Peluncur Megabox Mandiri**: Skrip `megabox-launcher.sh` dengan deteksi otomatis sesi Wayland (`--ozone-platform=wayland`) dan X11 fallback.
- **Katalog 440+ Layanan Resep Ferdium**: Integrasi database resep open-source lengkap dengan fitur pencarian instan.
- **Penyimpanan POSIX Atomik**: Engine `src/main/db.js` dengan proteksi penulisan atomic file (`.tmp` + renameSync) untuk mencegah korupsi data akibat listrik padam mendadak.
- **Gembok Layar Workstation (PIN Utama)**: Proteksi privasi meja kerja dengan dialog layar terkunci 4 digit PIN dan auto-lock saat idle.

---

<div align="center">

**Megapass Intra Solusindo • Sidoarjo, Indonesia**  
*Membangun software dengan ketelitian logika teknisi perangkat keras: Ringan, Tangguh, dan Nol-Bloat.*

</div>

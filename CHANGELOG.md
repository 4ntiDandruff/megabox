# Catatan Servis & Perubahan (Changelog)

Seluruh rekam jejak pembaruan penting pada proyek **Megabox** dicatat secara kronologis mengikuti standar *Keep a Changelog*.

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

Megapass Intra Solusindo • Sidoarjo, Indonesia

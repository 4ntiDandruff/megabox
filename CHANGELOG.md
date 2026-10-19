# Catatan Servis & Perubahan (Changelog)

Seluruh rekam jejak pembaruan penting pada proyek **Megabox** dicatat secara kronologis mengikuti standar *Keep a Changelog*.

---

## [1.3.3] - 2026-10-19

### Ditambahkan (Added)
- **Panel Pengaturan Tabbed Pure Flat Modern**: Merombak total modal Pengaturan (Settings) menjadi tata letak modular 3-tab (Umum & Sistem, Cloud Megapass, dan Tentang Aplikasi) tanpa efek kaca (glassmorphism) dan tanpa border glow, konsisten dengan estetika flat gelap Megabox.
- **Konfigurator Dinamis Hibernasi RAM Tab**: Pengguna kini dapat memilih durasi idle hibernasi otomatis (5 Menit, 15 Menit Bawaan, 30 Menit, 1 Jam, atau Nonaktifkan/Selalu Aktif) yang langsung disimpan ke database konfigurasi lokal dan mengontrol interval tidur webview secara dinamis.
- **Pengaturan Perilaku Tutup Jendela (Close-to-Tray)**: Menambahkan saklar pilihan apakah tombol [x] jendela menyembunyikan aplikasi ke System Tray (agar notifikasi pesan tetap aktif) atau keluar secara total.
- **Toggle Mulai Otomatis Saat Login (Linux Autostart)**: Menambahkan saklar flat toggle switch native yang mengendalikan startup desktop via API resmi Electron `setLoginItemSettings`.
- **Tombol Pembersih Cache Web & GPU Satu Klik**: Fitur servis praktis untuk mengosongkan cache HTTP Chromium dan GPU Shader sementara secara instan tanpa merusak sesi login maupun cookie pengguna.

### Diperbaiki (Fixed)
- **Persistensi State Pengaturan Lokal**: Mengintegrasikan skema `getSettings` dan `saveSettings` pada layer `db.js` sehingga setiap perubahan pengaturan langsung tersimpan secara atomic dan aman dari pemadaman listrik mendadak (*power-loss proof*).

---

## [1.3.2] - 2026-10-19

### Diperbaiki (Fixed)
- **Harmonisasi Icon Quick Switcher (Single Source of Truth resolveAppIconSrc)**: Mengatasi inkonsistensi visual di mana daftar Pindah Cepat (Quick Switcher Ctrl+K / Ctrl+P) menampilkan icon berbeda dari tab sidebar. Layanan resmi (seperti WhatsApp Business, Telegram, Gmail, dan Google Password Manager) kini 100% konsisten menampilkan icon vektor SVG resmi alih-alih favicon cache web yang buram atau salah.
- **Pembersihan Polusi Database Favicon**: Mengeliminasi penyimpanan custom_icon liar pada katalog resmi yang sebelumnya tersimpan akibat penangkapan event page-favicon-updated dari subdomain eksternal. Layanan kustom (CCTV, GitHub) tetap mempertahankan icon favicon Base64 data URI mereka secara simetris di kedua tempat.
- **Penyelarasan Styling Icon Quick Switcher**: Menyuntikkan kelas .tab-icon ke seluruh elemen img pada daftar Quick Switcher untuk keseragaman ukuran, rasio aspek, dan rendering tajam tanpa artefak.

---

## [1.3.1] - 2026-10-19

### Diperbaiki (Fixed)
- **Universal Keyboard Shortcut Interceptor (Anti-Focus-Trap Chromium Webview)**: Mengatasi masalah fatal di mana Chromium guest `<webview>` (seperti WhatsApp Web, GitHub, Gmail) menelan seluruh event keyboard sehingga shortcut `Alt+↑`, `Alt+↓`, `Alt+←`, `Alt+→`, `Ctrl+R`, `Alt+1..9`, dan `Ctrl+K` tidak pernah sampai ke renderer induk saat webview sedang aktif.
- **IPC Gateway Global `before-input-event`**: Mengaitkan listener `before-input-event` pada level proses utama (`app.on('web-contents-created')`) yang mencegat seluruh masukan shortcut secara native sebelum browser webview sempat memblokirnya, lalu mengirimkannya via IPC (`shortcut:action`) ke router tunggal `dispatchShortcutAction`.
- **Resolusi Konflik Shortcut Split Screen**: Menghilangkan tabrakan antara `Alt+2` (pindah ke tab nomor 2) dan mode Split Screen 1x2 yang sebelumnya dipicu oleh tombol yang sama. Mode split screen kini memiliki shortcut tersendiri yang jelas: `Alt+S` (lengkap dengan badge di menu konteks).
- **Penambahan Penanganan Shortcut Menu Konteks**:
  - `Alt+↑` (ArrowUp): Pindah urutan tab aktif ke atas secara instan.
  - `Alt+↓` (ArrowDown): Pindah urutan tab aktif ke bawah secara instan.
  - `Alt+←` (ArrowLeft): Navigasi riwayat kembali (`goBack()`).
  - `Alt+→` (ArrowRight): Navigasi riwayat maju (`goForward()`).
  - `Ctrl+R` / `F5`: Reload webview layanan yang sedang dipilih.
  - `Escape`: Menutup menu konteks, laci ekstensi, modal form, dan quick switcher dalam satu ketukan tombol.

---

## [1.3.0] - 2026-10-19

### Ditambahkan (Added)
- **Auto-Generate & Database Cache Favicon Custom Service**: Layanan kustom (tambah web manual) kini secara otomatis mengambil icon favicon asli dari domain web tersebut (menggunakan multi-tier resolver: Google S2 64px Favicon API + root origin `/favicon.ico` + `/apple-touch-icon.png`), mengonversinya menjadi Base64 Data URI, dan menyimpannya langsung ke database lokal (`custom_icon`).
- **Retensi Permanen Lintas Sesi**: Icon favicon yang sudah tersimpan di database tidak akan hilang saat aplikasi ditutup atau dijalankan ulang, langsung dirender sejak cold-start tanpa mengandalkan network request ulang atau icon globe generik.
- **Dynamic In-Page Favicon Sync**: Webview secara aktif mendengarkan event `page-favicon-updated` dan `dom-ready` untuk menyelaraskan favicon beresolusi tinggi langsung dari tag `<link rel="icon">` halaman dan menyimpannya ke database secara otomatis.

---

## [1.2.9] - 2026-10-19

### Diubah (Changed)
- **Simplifikasi Form Tambah/Ubah Layanan (Zero Friction)**: Mengeliminasi field dropdown 'Isolasi Sesi' dan input 'Proxy Jaringan' yang membingungkan dan jarang terpakai. Form kini ringkas dengan 2 input utama: 'Nama Layanan' dan 'Alamat Web'.
- **Otomasi Default Sesi Pribadi (Zero-Touch Multi-Akun)**: Seluruh penambahan layanan kini 100% otomatis menggunakan sesi pribadi terisolasi (`persist:app_...`) di latar belakang tanpa menuntut konfigurasi manual dari user, menjamin dukungan multi-akun alami tanpa kebocoran session atau cookies antar-tab.

---

## [1.2.8] - 2026-10-19

### Ditambahkan (Added)
- **Ekspansi Katalog Layanan Modern & Ekosistem AI (481 Layanan)**: Menambahkan 22 layanan AI dan developer modern yang sangat dicari, meliputi Muse AI (https://muse.ai/), v0 by Vercel, Bolt.new, Microsoft Copilot, Groq Chat, Midjourney, Suno AI, Udio AI, ElevenLabs, Runway Gen-3, Pika Art, Krea AI, Phind AI, OpenRouter, Hugging Face, Replicate, Leonardo AI, Civitai, Gamma App, Cursor AI Docs, Blackbox AI, dan Google NotebookLM.
- **Asset SVG Native Khusus Anti-Black-Sink**: Melengkapi seluruh layanan baru dengan file icon SVG murni 100% yang dioptimalkan untuk tema gelap dengan kontras presisi, tanpa bitmap buram, dan tanpa dependensi CDN eksternal.

### Diubah (Changed)
- **Reklasifikasi Kategori AI Terpadu**: Menata ulang layanan AI yang sebelumnya tercecer di kategori 'other' atau 'chat' (seperti HuggingChat, Le Chat Mistral, Poe AI, DeepAI, LobeChat) langsung ke dalam tab filter 'AI' sehingga filter menampilkan 31 layanan AI terkurasi rapi.
- **Sinkronisasi Badge Total Katalog**: Memperbarui counter badge pada modal katalog menjadi 481 Layanan.

---

## [1.2.7] - 2026-10-19

### Diubah (Changed)
- **Purge Total Efek Glow & Glassmorphism (Pure Flat Utilitarian)**: Menghapus seluruh radial-gradient, linear-gradient, dan glow box-shadow pada kartu katalog (`.service-card`), modal overlay (`backdrop-filter: blur`), logo sidebar, tab aktif, badge jumlah pesan, dan menu konteks. Antarmuka kini menganut prinsip flat murni dengan batas garis solid 1px ultra-halus (`rgba(255, 255, 255, 0.08)` hingga `0.12`) dan latar belakang pekat solid (`#1a1d24` / `#222631`) tanpa aura neon atau bias glassmorphic.
- **Visual Rendering Tajam Flat Icon**: Menghapus filter drop-shadow ganda pada icon aplikasi tab sidebar (`.tab-item img.tab-icon`), kartu katalog, dan quickswitcher sehingga tepi icon tampil rata, tegas, dan natural sesuai prinsip desain utilitarian.

---

## [1.2.6] - 2026-10-19

### Diubah (Changed)
- **Konsistensi Kontras Icon Global (Anti-Black-Sink)**: Mengaudit dan mengubah 163 asset SVG monokrom hitam menjadi palet terang (`#f1f5f9` / `#cbd5e1`) agar terlihat kontras dan tajam pada tema gelap, serta menerapkan drop-shadow protektif pada icon tab (`.tab-item img.tab-icon`) dan kartu katalog (`.service-card img`).
- **Lucide SVG Command Palette Spotlight**: Mengganti fallback icon perintah sistem di QuickSwitcher (`cmd:dnd`, `cmd:catalog`, `cmd:settings`, `cmd:reload`) dengan inline native Lucide SVG putih tajam, meniadakan icon tameng gelap.

---

## [1.2.5] - 2026-10-19

### Ditambahkan (Added)
- **Multi-Instance & Multi-Akun Tanpa Batas**: Memungkinkan penambahan aplikasi yang sama berulang kali (misal: WhatsApp Kantor, WhatsApp Pribadi, WhatsApp CS) dengan ID unik otomatis dan partisi sesi terisolasi penuh (`persist:app_...`) sehingga login, session, dan cookie tidak saling bertubrukan.
- **Pindah Urutan Tab Naik / Turun (Reorder Tabs)**: Menambahkan menu "Pindah Naik" (Alt+↑) dan "Pindah Turun" (Alt+↓) pada menu konteks tab sidebar, terhubung langsung ke IPC `apps:reorder` dan atomic storage `reorderApp` di database lokal serta terintegrasi otomatis dengan sinkronisasi cloud.

### Diperbaiki (Fixed)
- **Menu Konteks "Ubah Layanan"**: Memperbaiki listener event klik global (`useCapture`) yang sebelumnya menghapus referensi `contextTargetApp` sebelum aksi `ctxEdit.onclick` dieksekusi, serta menambahkan pelacakan ID layanan (`input-service-id`) agar form modal mengedit data yang tepat tanpa membuat duplikasi.
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

Megapass Intra Solusindo • Sidoarjo, Indonesia

# Zippy — Swipe. Play. Repeat. (Node.js + Web + PWA + APK) · v2.9

## 1. Cara Menjalankan Server & Web
Pastikan menggunakan **Node.js 22.5+** (karena menggunakan modul bawaan `node:sqlite`):
```bash
npm install
npm start
```
- **Aplikasi Utama (`Zippy`)**: `http://localhost:3000`
- **Pusat Kontrol Sistem (`admin.html` / `sistem.html`)**: `http://localhost:3000/admin.html` atau `http://localhost:3000/sistem`
  - **Tanpa Login**: Halaman Sistem dapat langsung diakses dan dikontrol dengan cepat (Kontrol Cepat 1 Klik, Deteksi Pedoman, Banding Takedown, Kelola Akun, Kelola Video, Laporan, Centang Biru, dan Siaran Global).

## 2. Fitur Utama Pembaruan v2.9
- **Rebranding ke Zippy**: Nama aplikasi diubah menjadi **Zippy** dengan tagline **Swipe. Play. Repeat.**
- **Terminologi Sistem**: Seluruh istilah `Admin` diubah menjadi `Sistem`.
- **Panel Sistem Mudah Dikontrol & Tanpa Login**:
  - Langsung masuk ke Pusat Kontrol Sistem tanpa layar login.
  - Dilengkapi **Kontrol Cepat Sistem 1-Klik** (Pindai Semua Video, Terima Semua Banding, Setujui Semua Centang Biru, Pulihkan Semua Takedown, Bersihkan Laporan, dan Pengumuman Cepat).
- **Fitur Ajukan Banding Video Takedown**:
  - Kreator yang videonya terkena takedown dapat mengajukan banding beserta alasannya langsung dari halaman Profil atau Notifikasi.
  - Sistem dapat memutar video yang ditakedown, meninjau alasan banding kreator, serta menyetujui (memulihkan video ke publik) atau menolak banding dengan 1 klik.
- **Deduplikasi Beranda Pintar**:
  - Video yang telah muncul di Beranda pengguna disimpan secara persisten (lokal & database server `feed_seen`) sehingga tidak akan dimunculkan kembali di Beranda.
- **Menu Pengaturan Bersih**:
  - Pengaturan URL server dan tautan di menu Pengaturan telah dihapus.

## 3. Cara Menjadikan Aplikasi Android (`.apk`)

### Cara A — Paling Cepat Tanpa Install Android Studio (Via PWABuilder)
1. Deploy/online-kan server Zippy kamu dengan HTTPS, misalnya `https://zippy.domainmu.com`.
2. Buka **[https://www.pwabuilder.com](https://www.pwabuilder.com)** di browser.
3. Masukkan URL web Zippy kamu lalu klik **Start** -> **Package for stores** -> **Android** -> **Download Package**.

### Cara B — Build Native `.apk` Menggunakan Capacitor
1. Buka file `public/config.js`, lalu isi alamat server backend Zippy kamu:
   ```js
   window.ZIPPY_SERVER = 'https://zippy.domainmu.com';
   ```
2. Jalankan perintah berikut di terminal folder proyek:
   ```bash
   npm run apk:init
   npm run apk:sync
   cd android && ./gradlew assembleDebug
   ```

### Cara C — Pasang Langsung dari Browser Chrome Android (PWA Install)
1. Buka alamat web Zippy di **Google Chrome** pada HP Android.
2. Buka **Profil › Pengaturan › Pasang aplikasi** (atau ketuk menu titik tiga Chrome › **Instal aplikasi / Tambahkan ke Layar Utama**).

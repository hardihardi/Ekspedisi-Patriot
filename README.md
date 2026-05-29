# 🌐 Transmigrasi 3T - Sistem Informasi Terpadu Laporan & Evaluasi

<div align="center">
  <img alt="Project Banner" src="https://via.placeholder.com/1000x300/0f172a/38bdf8?text=Transmigrasi+3T" width="100%" />
  <br/>
  <p><b>Sistem Informasi Terpadu Pelaporan, Pendataan, dan Evaluasi Perkembangan Kawasan Transmigrasi Lokus 3T (Tertinggal, Terdepan, dan Terluar).</b></p>
</div>

---

## 📖 Deskripsi Proyek
**Transmigrasi 3T** adalah platform berbasis web modern (*Full-Stack SPA*) yang dirancang khusus untuk memfasilitasi pelaporan pengaduan masyarakat secara *real-time*, manajemen dokumen berkeamanan QR Code, kolaborasi antar institusi melalui manajemen rapat dan proyek, serta pendistribusian informasi demografi dan logistik ke daerah tertinggal, terdepan, dan terluar (3T).

Aplikasi ini menggunakan teknologi real-time dengan integrasi database *NoSQL* untuk memastikan Admin Pusat dan Admin Daerah dapat mengambil respon cepat atas pengaduan tingkat kritis serta menjamin transparansi publik.

---

## ✨ Fitur Unggulan (Core Features)

### 1. 🚨 Pengaduan Publik & Notifikasi Real-time
*   **Formulir Cerdas:** Validasi *real-time* untuk input nomor HP (format wilayah/internasional) dan kolom wajib untuk meminimalisasi *spam* atau format pelaporan yang cacat.
*   **Alert Segera (High-Priority):** Terintegrasi Firebase `onSnapshot` yang dapat langsung memunculkan *Toast Notification* beserta suara/animasi kepada Dashboard Admin Pusat secara instan jika terdapat tiket prioritas **High**.

### 2. 📄 Keamanan & Verifikasi Dokumen
*   **QR Code Generator Built-in:** Manajemen dokumen yang memungkinkan preview surat/sertifikat dengan pembubuhan *QR Code* (mencakup Document ID, Nama, Penandatangan, Tanggal) secara instan.
*   **Verifikasi Publik:** Layanan `/public/verify` bagi warga untuk memindai dokumen fisik berbasis QR guna mengecek keaslian *Certificate of Authority* (CA) dari kementerian.

### 3. 🗺️ Sistem Informasi Geografis (Geographic)
*   **Pemetaan Interaktif:** Didukung oleh **Leaflet** dan **React-Leaflet** untuk menampilkan *heatmaps*, koordinat titik proyek, dan pemetaan demografis transmigrasi kawasan 3T di seluruh Indonesia.

### 4. 👥 Hak Akses Kompleks & Role Management
*   **Role-Based Access Control (RBAC):** Hierarki akses bertingkat: *Superadmin*, *Admin Pusat*, *Admin Daerah*, dan *Petugas Lapangan*. Mendukung manajemen status aktif (*real-time presence*) dan perubahan kewenangan.

### 5. 🤝 Manajemen Rapat & Proyek
*   Pelacakan status perkembangan berbagai infrastruktur dan logistik di lapangan secara visual (Kanban / Tabel) beserta integrasi kalender dan notulen (minutes of meeting).

### 6. ⚙️ Integrasi Gateway Pihak Ketiga
*   **SMTP MailSender:** Konfigurasi kustom email domain untuk mengirim pembaruan aplikasi langsung dari dashboard pengaturan.
*   **WhatsApp Gateway (Fonnte):** Mengirimkan notifikasi WhatsApp instan untuk resi pengaduan masyarakat atau pelaporan lapangan bagi masyarakat tanpa akses web interaktif terus-menerus.

### 7. 🖼️ Modul Manajemen Gambar & Galeri Dokumentasi (CMS)
*   **Image Management:** Memungkinkan penyesuaian foto latar untuk Bagian Depan (About Us, Lokus Papua, dan Lokus Non-Papua) melalui dashboard admin dengan kompresi berbasis Canvas instan sebelum disimpan untuk menghemat kuota Firestore.
*   **Galeri Interaktif & Responsif:** Showcase galeri dinamis terintegrasi di beranda publik. Admin dapat menambahkan foto proyek baru, mengategorikannya, dan menyertakan deskripsi lengkap secara langsung.

---

## 🛠️ Stack Teknologi (Tech Stack)

Aplikasi dibangun performan dan terukur dari awal dengan tumpukan teknologi modern:

**Frontend Ecosystem:**
*   **React 19 & Vite** (Performa bundling maksimal & rendering cepat)
*   **TypeScript** (Sistem pengetikan kuat dan aman)
*   **Tailwind CSS 4** (Utility-first framework desain responsif nan elegan)
*   **Motion (Framer Motion)** (Animasi transisi mikro dan makro *buttery smooth*)
*   **Zustand** (Global state management tanpa boilerplate)
*   **Lucide-React** & **Recharts** (Ikonografi modern dan diagram pemantauan interaktif)

**Backend & Infrastruktur:**
*   **Node.js & Express** (*Server-side API / Routing*)
*   **Firebase** (Firestore Database, Firebase Auth, Firebase Storage)
*   **ESBuild** (Server bundler menjadi satu berkas terpadu)
*   **Nodemailer** & **Axios** (Integrasi layangan pesan)

---

## 📁 Struktur Direktori Utama

```ascii
/
├── dist/                # Berkas hasil build siap produksi (Output Vite & Esbuild)
├── public/              # Aset gambar, ikon, dan meta tags publik
├── src/
│   ├── components/      # UI komponen yang dapat digunakan ulang (Navbar, Sidebar, Dialog, dsb.)
│   ├── lib/             # Skrip utilitas, konfigurasi Firebase, cn (Tailwind merger)
│   ├── pages/           # Komponen Halaman penuh (berbasis rute)
│   │   ├── Homepage.tsx          # Halaman depan / Landing
│   │   ├── Dashboard.tsx         # Dasbor utama analitik
│   │   ├── PublicComplaint.tsx   # Form Aplikasi Laporan Publik
│   │   ├── Complaints.tsx        # Tabel antrean & tiket komplain internal
│   │   ├── Documents.tsx         # Panel Manajemen Dokumen & QRCode
│   │   ├── Geographic.tsx        # Peta lokasi kawasan tertinggal
│   │   └── Settings.tsx          # Konfigurasi SMTP, WhatsApp Fonnte, dan Profil Sistem
│   ├── store/           # Reducer/Store Zustand untuk State Global Aplikasi
│   ├── App.tsx          # Entrypoint Konfigurasi Routing (React Router / Switcher)
│   ├── index.css        # Titik masuk konfigurasi Tailwind CSS Global
│   └── main.tsx         # Titik render utama DOM ReactDOM React 19
├── server.ts            # Entrypoint REST API backend (Express) dan Vite Middleware
├── metadata.json        # Manifest Proyek
└── package.json         # Konfigurasi Node Package Manager
```

---

## 🚀 Panduan Instalasi (Getting Started)

### Prasyarat 
Pastikan mesin (komputer) Anda sudah terinstal:
*   [Node.js](https://nodejs.org/) (Versi 18 LTS atau lebih baru disarankan)
*   **NPM** atau **Yarn**

### 1. Kloning dan Instalasi
```bash
# 1. Kloning repositori
git clone https://github.com/hardihardi/Ekspedisi-Patriot.git
cd ekspedisi-patriot

# 2. Instalasi modul (dependencies)
npm install
```

### 2. Variabel Lingkungan (Environment Variables)
Salin `.env.example` sekiranya ada atau buat file `.env` di root folder. Konfigurasi kredensial esensial untuk koneksi API:
```env
# Contoh Variabel Lingkungan
VITE_FIREBASE_API_KEY="your_api_key"
VITE_FIREBASE_AUTH_DOMAIN="your_domain.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project"

# Hanya untuk server.ts (Tanpa prefix VITE_)
GEMINI_API_KEY="your_gemini_server_key"
```

### 3. Menjalankan di Mode Pengembangan (Development)
Sistem ini menggunakan struktur *full-stack* Express + Vite (melalui `tsx` dan middleware mode).
```bash
# Menjalankan server Express sekaligus Frontend Vite Dev Server
npm run dev
```
Buka browser dan arahkan ke alamat `http://localhost:3000`.

### 4. Build untuk Produksi (Production Build)
Sistem *build* akan mengelompokkan aplikasi dalam bundel yang dioptimasi, termasuk menyatukan backend ke berkas tunggal CJS.
```bash
npm run build
npm start
```

---

## 📱 Desain Responsif & UI/UX

Aplikasi ini mendesain antarmuka secara *Mobile-First* & *Desktop Precision*. 
*   **Navigasi Adaptif:** Menu Sidebar akan dilipat otomatis (Toggled) pada piranti berskala kecil (peregangan ponsel / Tablet).
*   **Validasi Real-time:** Pengguna publik pada pos form aduan *PublicComplaint* mendapatkan *feedback* instan berupa tepian merah (error field) dan bantuan teks, memastikan kenyamanan pengisian tanpa pemuatan ulang (reload).
*   **Tema Clean & Modern:** Estetika warna *Slack/Admin Dashboard*, komposisi putih/biru netral untuk lingkungan tata pemerintahan guna menjaga konsentrasi.

---

## 🤝 Kontribusi
Bila Anda tertarik untuk berkontribusi:
1.  Lakukan **Fork** pada repository ini.
2.  Buat _branch_ fitur spesifik Anda (`git checkout -b fitur-keren-anda`).
3.  Lakukan *commit* dengan deskripsi yang tegas dan jelas (`git commit -m 'Menambahkan Notif WA'`).
4.  Kirim _Push_ ke branch terkait (`git push origin fitur-keren-anda`).
5.  Buka **Pull Request**.

---

<div align="center">
    <p><b>Dibuat untuk Indonesia, dikembangkan melalui Hardianto.</b></p>
    <p>&copy; 2026 Ekspedisi Patriot.</p>
</div>

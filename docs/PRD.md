# Product Requirements Document (PRD): Whiz-MSME Perkenalan App

## 1. Project Overview
**Whiz-MSME Perkenalan** adalah aplikasi formulir interaktif multi-step yang dirancang untuk UMKM (Usaha Mikro, Kecil, dan Menengah). Berbeda dengan formulir survei tradisional yang terasa kaku dan menginterogasi, aplikasi ini mengusung konsep **"Berjejaring dan Bercerita"**, membuat pengguna merasa sedang memulai percakapan hangat dengan partner bisnis potensial.

## 2. Design & "Vibe" (Sleek Interface)
Aplikasi ini harus mengikuti estetika *Modern SaaS* dengan karakteristik:
- **Clean & Minimalist:** Dominasi warna putih (`#FFFFFF`) dan Slate-50 (`#F8FAFC`).
- **Accent Indigo:** Menggunakan `indigo-600` untuk elemen utama, tombol, dan indikator progres.
- **Friendly Typography:** Menggunakan font 'Inter' dengan penekanan pada keterbacaan dan hirarki visual yang jelas.
- **Dynamic Feedback:** Animasi transisi antar langkah menggunakan `motion/react` (AnimatePresence) agar terasa halus.
- **Micro-interactions:** Efek hover pada tombol, transisi warna pada input fokus, dan progress bar yang bergerak meluncur.

## 3. Core Functionality

## 3. Core Functionality

### A. Multi-Step Journey & Form Details
Aplikasi terdiri dari 5 langkah perkenalan utama dengan detail input sebagai berikut (Semua *Required*):

#### **Langkah 1: Salam Kenal (Profil Dasar)**
*   **Nama Lengkap:** Input teks (Placeholder: "Siapa nama pemimpin hebat ini?")
*   **Nama Usaha:** Input teks (Placeholder: "Nama brand kebanggaan Anda")
*   **Nomor WhatsApp:** Input telepon (Prefix: +62)
*   **Email Bisnis:** Input email (Format validation)
*   **Domisili Kota:** Input teks
*   **Sejak Tahun:** Input angka (Placeholder: "2024")
*   **Jumlah Tim:** Input angka (Placeholder: "1")
*   **Lini Bisnis:** Pilihan Dropdown:
    *   *Makanan & Minuman, Fashion & Apparel, Kecantikan, Kesehatan, Retail, Jasa, Kerajinan, Agribisnis, Digital & Teknologi, Logistik, Pariwisata, Otomotif, Properti.*

#### **Langkah 2: Kondisi Usaha (Finansial)**
*   **Rata-rata laba bersih per bulan?** (Radio Button):
    *   Di atas Rp3.000.000
    *   Rp1.000.000 sampai Rp3.000.000
    *   Di bawah Rp1.000.000
*   **Sudah memisahkan rekening pribadi & usaha?** (Dropdown):
    *   Sudah, sudah terpisah rapi
    *   Sedang proses memisahkan
    *   Masih pakai rekening yang sama

#### **Langkah 3: Impian & Brand**
*   **Kelengkapan brand yang sudah dimiliki?** (Multi-select Checkbox):
    *   Merek terdaftar HAKI
    *   Packaging lengkap
    *   Label Halal/BPOM
    *   Info gizi
*   **Alokasi keuntungan tambahan?** (Dropdown):
    *   Investasi usaha (alat/stok/promosi)
    *   Memperkuat modal kerja
    *   Keperluan pribadi/keluarga

#### **Langkah 4: Tantangan Seru**
*   **Mana yang menjadi fokus utama Anda saat ini?** (Radio Button):
    *   Ingin lebih banyak pelanggan & dikenal luas (Pemasaran)
    *   Ingin rapi dalam pembukuan & laporan (Keuangan)
    *   Ingin bisnis lebih sistematis & efisien (Operasional)
*   **Apakah berlangganan Rp100rb/bulan masuk dalam pertimbangan?** (Pilihan Tombol):
    *   Ya / Mungkin / Tidak

#### **Langkah 5: Pilihan Solusi**
*   **Bantuan Whiz apa yang Anda butuhkan?** (Dropdown):
    *   *SMARTWHIZ, CREATEWHIZ, FINANCEWHIZ, SMEWHIZ, ASSISTANTWHIZ, CRMWHIZ, SECUREWHIZ, LEGALWHIZ, SALESWHIZ, POSTWHIZ, KOLWHIZ, REPORTWHIZ.*
*   **Dari mana Anda mendengar tentang kami?** (Grid Radio):
    *   *Youtube, Event, Instagram, Komunitas, Referral, Website, Webinar, Other.*

### B. Validation Rules
- **Strict Validation:** Semua field bersifat wajib diisi (*required*).
- **Navigation Locking:** Tombol "Lanjutkan" atau "Kirim" hanya aktif jika semua field pada langkah tersebut sudah valid.
- **Feedback Visual:** Tombol yang tidak aktif menggunakan state `cursor-not-allowed` dengan opacity rendah.

### C. Copywriting Tone
- **Human-Centric:** Menggunakan kata-kata seperti "Halo", "Salam Hangat", "Cerita", dan "Pemimpin Hebat".
- **Non-Interventive:** Menghindari kata "Analisis Kelayakan" atau "Asesmen Kaku". Menggantinya dengan "Mari Berkenalan" atau "Ceritakan Impian Anda".

## 4. Technical Stack
- **Framework:** React + TypeScript.
- **Styling:** Tailwind CSS (v4).
- **Icons:** `lucide-react` (untuk ikon yang konsisten dan minimalis).
- **Animation:** `motion/react` (untuk transisi step dan progress bar).
- **Architecture:** 
  - `App.tsx`: Central state management (step tracking, form data).
  - `types.ts`: Interface data untuk integritas tipe.
  - `constants.ts`: Daftar opsi dropdown dan pilihan statis.

## 5. UI Layout Structure
- **Sidebar (Desktop):** Navigasi vertikal statis di sisi kiri yang menunjukkan status langkah (01-05) dengan indikator centang jika sudah selesai.
- **Main Header:** Header putih bersih dengan ID Perkenalan unik.
- **Content Card:** Kartu utama dengan radius besar (`rounded-[2rem]`) dan bayangan halus (`shadow-sm`).
- **Footer:** Teks pelengkap ultra-kecil dengan font monospaced untuk kesan teknis yang presisi.

## 6. Success State
Setelah pengiriman, aplikasi beralih ke layar konfirmasi dengan ikon centang besar, pesan apresiasi yang personal, dan tombol untuk mengulang proses jika diperlukan.

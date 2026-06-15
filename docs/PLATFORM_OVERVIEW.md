# Partnership Growth Dashboard — Platform Overview

## 1. Apa Itu Platform Ini?

**Partnership Growth Dashboard** adalah platform manajemen internal berbasis web (Next.js 16 + TypeScript + Supabase/PostgreSQL) yang dikembangkan oleh **PT Dam Korporindo Digital**. Fungsinya adalah memonitor, menganalisis, dan mengelola ekosistem kemitraan (*partnership*) perusahaan — khususnya yang berkaitan dengan program **MWX Market** dan **Whiz-MSME**.

Platform ini menjembatani data dari beberapa sumber eksternal (API MWX Market, Credit Manager API) ke dalam satu antarmuka terpadu untuk keperluan operasional tim internal dan pelaporan manajemen.

---

## 2. Sumber Data Utama

| Sumber | Jenis Data | Metode Sinkronisasi |
|--------|-----------|---------------------|
| **MWX Market API** | Data customer, transaksi | Sinkronisasi terjadwal (manual via tombol Sync) |
| **Credit Manager API** | Data pemakaian kredit aplikasi | Sinkronisasi manual |
| **PostgreSQL (Supabase)** | Database utama — semua data tersimpan di sini | Real-time via API internal |
| **CMS Eksternal** | Data customer dari API publik MWX | Sync per rentang tanggal |

**3 mekanisme sync utama:**
- **Sync User** — menarik data customer baru dari API MWX (inkremental per hari)
- **Sync Transaksi** — menarik data transaksi terbaru
- **Sync Usage** — menarik data pemakaian kredit aplikasi

---

## 3. Modul & Fitur Lengkap

### A. Dashboard Utama (`/`)
Halaman muka yang menampilkan ringkasan eksekutif:
- **KPI Utama:** Total user pembeli aplikasi, total transaksi, user akan expired (< 7 hari)
- **Segmen User (Churn):**
  - ✅ **Aktif** — penggunaan ≤ 7 hari terakhir
  - ⏸️ **Idle** — penggunaan 7–30 hari lalu
  - ❌ **Pasif** — penggunaan > 30 hari lalu / belum pernah
- **Grafik Harian:** Pembelian harian (14 hari), pemakaian kredit, user unik — bisa toggle mode harian/akumulasi
- **Tabel Referral Performance:** Ranking performa referral partner (bisa di-sort & di-export ke Excel)
- **Tombol Sync Cepat:** Sync User, Sync Transaksi, Sync Usage
- **Export:** Export data transaksi ke XLS langsung dari dashboard

### B. Manajemen Customer (`/customers`)
Daftar lengkap customer dengan:
- **Filter:** Search teks, referral partner, status aplikasi (with/without/expired/expiring soon), churn status
- **Pagination** dengan data per halaman
- **Detail Customer (`/customers/[id]`):** Informasi lengkap per user — profil, transaksi, pemakaian kredit, histori
- **Export** ke Excel

### C. Sales / Transaksi (`/sales`)
Data transaksi penjualan dengan:
- **Filter:** Status transaksi, rentang tanggal, payment channel, mata uang, referral partner, tipe pembelian (trial/paid)
- **Search:** Berdasarkan invoice, nama, email
- **Detail transaksi:** Produk yang dibeli, jumlah, harga, status
- **Pagination** + total unik customer
- **Export ke Excel**

### D. Purchases (`/purchases`)
Tampilan khusus untuk data pembelian aplikasi — daftar transaksi dengan format yang difokuskan pada produk yang dibeli.

### E. Referral (`/referral`)
Analitik performa setiap kode referral:
- **Statistik per referral:** Jumlah user, total pembelian, total transaksi finished, total kredit terpakai, total kredit ditambahkan, net credit
- **Sort & filter**
- **Export ke Excel**

### F. Referral Management (`/referral/manage`)
CRUD untuk mengelola data referral partner — tambah, edit, hapus.

### G. Activity Targets (`/activityTarget`)
Target aktivasi untuk setiap channel partnership:
- Daftar aktivitas (Impact Plus, Gov & Non-Gov Offline, Digital Activation, dll.)
- **Progress bar** — pencapaian vs target
- **Detail per slug** — daftar customer per aktivitas, jumlah transaksi, pendapatan, pembeli unik

### H. Events / Acara (`/events`)
Manajemen acara training/workshop:
- **CRUD Event:** Buat, edit, lihat, hapus acara
- **Filter:** Partner, status aktif
- **Detail Event (`/events/[id]`):** Informasi acara + daftar peserta registrasi + konfirmasi kehadiran
- **Registrasi Event:** Form pendaftaran untuk peserta
- **Public Events (`/public-events`):** Halaman publik menampilkan acara yang akan datang, bisa didaftar oleh user umum

### I. CRM (`/crm`)
Modul Customer Relationship Management:
- **CRM Dashboard** — overview percakapan dan interaksi
- **Campaigns** — manajemen campaign WhatsApp/komunikasi
- **Auto Replies** — konfigurasi balasan otomatis
- **Knowledge Base** — basis pengetahuan untuk respon cepat

### J. Helpdesk (`/helpdesk/v2`)
Sistem helpdesk internal:
- Manajemen percakapan dengan customer
- Fitur AI Reply untuk bantuan respon otomatis
- Integrasi email

### K. Weekly Reports (`/weekly`)
Laporan mingguan — agregasi data per periode mingguan.

### L. Pengaturan (`/setting`)
- **User Management (`/setting/users`)** — Kelola pengguna internal dengan role:
  - `super_admin` — akses penuh ke semua modul
  - `partnership` — akses ke Dashboard, Customers, Sales, Referral, Activity Targets, Events
  - `crm` — akses terbatas ke CRM
- **Excluded Emails (`/setting/excludeMail`)** — Kelola daftar email yang dikecualikan (demo/test email) agar tidak masuk perhitungan

---

## 4. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Dashboard │  │ Customers│  │   CRM    │  │  API Routes   │  │
│  │ Customers │  │   Sales  │  │ Helpdesk │  │  (29 endpoint) │  │
│  │  Events   │  │ Referral │  │ Settings │  │               │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                                      │         │
├──────────────────────────────────────────────────────┼─────────┤
│                      lib/ (Shared Logic)             │         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│         │
│  │database  │ │cmsCust.. │ │  events  │ │mwxAuth  ││         │
│  │activity..│ │eventReg..│ │partnAct..│ │aiChat   ││         │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│         │
├──────────────────────────────────────────────────────┼─────────┤
│                    Data Layer                        │         │
│  ┌──────────────────┐  ┌──────────────────────────┐ │         │
│  │  PostgreSQL DB   │  │   External APIs           │ │         │
│  │  (Supabase)      │  │   - MWX Market API        │◄┘         │
│  │                  │  │   - Credit Manager API     │           │
│  │  Tables:         │  │   - CMS Public API         │           │
│  │  - cms_customers │  └──────────────────────────┘            │
│  │  - transactions  │                                          │
│  │  - trans_details │                                          │
│  │  - training_ev.. │                                          │
│  │  - event_regis.. │                                          │
│  │  - referral_par..│                                          │
│  │  - partners      │                                          │
│  │  - leads         │                                          │
│  │  - credit_manager│                                          │
│  │    _transactions │                                          │
│  │  - demo_excluded │                                          │
│  │    _emails       │                                          │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Data yang Dapat Diakses — Per Role

### Super Admin
| Kategori | Data |
|----------|------|
| 📊 **Overview** | Dashboard utama — semua KPI, grafik, tabel referral, tombol sync |
| 👥 **Customers** | Full CRUD data customer, detail, filter, export |
| 💰 **Sales** | Semua transaksi, export, filter lengkap |
| 📈 **Referral** | Statistik referral + management CRUD |
| 🎯 **Target** | Activity targets, progress, daftar customer per aktivitas |
| 📅 **Events** | CRUD event + registrasi + public events |
| 🤝 **CRM** | Dashboard CRM, campaigns, auto-replies, knowledge base |
| 🛠️ **Helpdesk** | Manajemen percakapan, AI reply, email |
| ⚙️ **Settings** | User management (tambah/edit/hapus user), excluded emails |

### Partnership
| Kategori | Data |
|----------|------|
| 📊 **Overview** | Dashboard utama (tanpa settings) |
| 👥 **Customers** | Lihat & filter data customer |
| 💰 **Sales** | Lihat & export transaksi |
| 📈 **Referral** | Statistik referral |
| 🎯 **Target** | Activity targets & progress |
| 📅 **Events** | CRUD event & lihat registrasi |

### CRM
| Kategori | Data |
|----------|------|
| 📊 **CRM Dashboard** | Overview percakapan & interaksi |
| 🤝 **CRM** | Campaigns, auto-replies, knowledge base |

---

## 6. API Endpoints Internal (29 endpoint)

| Endpoint | Fungsi |
|----------|--------|
| `/api/dashboard` | Data dashboard utama (KPI, grafik, referral) |
| `/api/customers` | Daftar customer dengan filter |
| `/api/transactions` | Data transaksi dengan filter |
| `/api/referral` | Statistik referral |
| `/api/cms-customers` | Data customer dari CMS |
| `/api/events` | CRUD event |
| `/api/events-public` | Event publik + registrasi |
| `/api/event-questions` | Pertanyaan untuk registrasi event |
| `/api/sync-user/v3` | Sinkronisasi customer |
| `/api/sync-transactions` | Sinkronisasi transaksi |
| `/api/sync-credit-manager-transactions` | Sinkronisasi usage kredit |
| `/api/sync-customers/daily-range` | Sync customer per rentang tanggal |
| `/api/analyze` | Analitik data |
| `/api/applications` | Data aplikasi |
| `/api/auth` | Autentikasi user internal |
| `/api/check-email` | Pengecekan email |
| `/api/check-tables` | Pengecekan struktur tabel DB |
| `/api/createwhiz` | Integrasi CreateWhiz |
| `/api/crm/*` | CRUD data CRM (campaigns, auto-replies, knowledge) |
| `/api/helpdesk/*` | Manajemen helpdesk + AI reply + email |
| `/api/mwx-auth` | Autentikasi ke MWX API |
| `/api/mwx-transactions` | Data transaksi dari MWX |
| `/api/setting/*` | Pengaturan (excluded emails, users) |
| `/api/sync-all` | Sinkronisasi semua data sekaligus |
| `/api/sync-s3` | Sinkronisasi dari S3 |
| `/api/usage-enrich` | Pengayaan data usage |
| `/api/export-credit-transactions` | Export data transaksi kredit |
| `/api/data-s1`, `/api/data-s2` | Endpoint data terstruktur |

---

## 7. Use Case Utama

### Untuk Tim Operasional / Partnership
1. **Monitor kesehatan ekosistem:** Cek jumlah user aktif, idle, pasif setiap hari
2. **Sinkronisasi data:** Tarik data customer, transaksi, dan usage terbaru dari API eksternal
3. **Kelola event:** Buat acara training, lihat pendaftar, konfirmasi kehadiran
4. **Pantau referral:** Lihat performa setiap partner referral, export laporan
5. **Activity target:** Lacak pencapaian target aktivasi per channel

### Untuk Manajemen
1. **Dashboard eksekutif:** Lihat ringkasan KPI — jumlah user pembeli, total transaksi, pendapatan
2. **Tren pertumbuhan:** Grafik pembelian harian & akumulasi, tren penggunaan aplikasi
3. **Churn analysis:** Identifikasi user yang berisiko pasif (tidak pakai > 30 hari)
4. **Referral performance:** Evaluasi partner mana yang paling produktif
5. **Laporan sales:** Export data transaksi untuk analisis lebih lanjut
6. **Expiry monitoring:** Antisipasi user yang aplikasinya akan expired dalam 7 hari

### Untuk Tim CRM
1. **Kelola percakapan:** Pantau interaksi dengan customer
2. **Campaign management:** Atur campaign WhatsApp/komunikasi
3. **Auto replies:** Konfigurasi respon otomatis
4. **Knowledge base:** Kelola basis pengetahuan untuk customer service

---

## 8. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Bahasa** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL (Supabase) |
| **Autentikasi** | JWT-based (internal) |
| **Icons** | Lucide React |
| **Export** | SheetJS (XLSX) |
| **Deployment** | Vercel |

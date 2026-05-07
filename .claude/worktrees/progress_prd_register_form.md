# Progress: PRD Multi-Step Register Form

## Tujuan
Mengganti form `/public-events/[id]/register` dari form 1-halaman (4 field) menjadi form 5-step sesuai PRD Whiz-MSME Perkenalan.

## Status

### ✅ Sudah Selesai
1. **Migration SQL** → `migrations/005_add_event_registration_prd_fields.sql`
   - Tambah 12 kolom baru ke tabel `event_registrations`
   - **PERLU DIJALANKAN MANUAL di Supabase/DB** (belum dijalankan)

2. **`lib/eventRegistrations.ts`**
   - Type `EventRegistrationRow` sudah ditambah 12 field baru
   - Fungsi `createRegistration` sudah diupdate untuk INSERT semua field baru

3. **`app/api/events-public/[id]/register/route.ts`**
   - Sudah diupdate untuk meneruskan semua field baru dari body ke `createRegistration`

### ❌ Belum Selesai
4. **`app/public-events/[id]/register/page.tsx`**
   - Ini yang BELUM diubah — masih form lama 1-halaman 4 field
   - Perlu diubah menjadi **5-step form** sesuai PRD

---

## Yang Perlu Dibuat di page.tsx

### Step 1: Salam Kenal (Profil Dasar)
- `full_name` — input text, placeholder "Siapa nama pemimpin hebat ini?"
- `business_name` — input text, placeholder "Nama brand kebanggaan Anda"
- `phone_number` — input tel, prefix +62
- `email` — input email
- `city` — input text (domisili kota)
- `business_since_year` — input number, placeholder "2024"
- `team_size` — input number, placeholder "1"
- `business_line` — dropdown: Makanan & Minuman, Fashion & Apparel, Kecantikan, Kesehatan, Retail, Jasa, Kerajinan, Agribisnis, Digital & Teknologi, Logistik, Pariwisata, Otomotif, Properti

### Step 2: Kondisi Usaha (Finansial)
- `monthly_net_profit` — radio button:
  - "Di atas Rp3.000.000"
  - "Rp1.000.000 sampai Rp3.000.000"
  - "Di bawah Rp1.000.000"
- `has_separate_account` — dropdown:
  - "Sudah, sudah terpisah rapi"
  - "Sedang proses memisahkan"
  - "Masih pakai rekening yang sama"

### Step 3: Impian & Brand
- `brand_assets` — multi-select checkbox (array):
  - "Merek terdaftar HAKI"
  - "Packaging lengkap"
  - "Label Halal/BPOM"
  - "Info gizi"
- `profit_allocation` — dropdown:
  - "Investasi usaha (alat/stok/promosi)"
  - "Memperkuat modal kerja"
  - "Keperluan pribadi/keluarga"

### Step 4: Tantangan Seru
- `main_focus` — radio button:
  - "Ingin lebih banyak pelanggan & dikenal luas (Pemasaran)"
  - "Ingin rapi dalam pembukuan & laporan (Keuangan)"
  - "Ingin bisnis lebih sistematis & efisien (Operasional)"
- `subscription_consideration` — tombol pilihan (Ya / Mungkin / Tidak)

### Step 5: Pilihan Solusi
- `whiz_solution_needed` — dropdown:
  - SMARTWHIZ, CREATEWHIZ, FINANCEWHIZ, SMEWHIZ, ASSISTANTWHIZ, CRMWHIZ, SECUREWHIZ, LEGALWHIZ, SALESWHIZ, POSTWHIZ, KOLWHIZ, REPORTWHIZ
- `referral_source` — grid radio:
  - Youtube, Event, Instagram, Komunitas, Referral, Website, Webinar, Other

---

## Desain (dari PRD)
- Warna utama: `indigo-600` (ganti dari `#1f3c88`)
- Background: `#F8FAFC` (slate-50)
- Card radius besar: `rounded-2xl`
- Sidebar desktop: step indicator 01-05 dengan centang jika sudah selesai
- Semua field REQUIRED (kecuali brand_assets boleh kosong array)
- Tombol "Lanjutkan" disabled jika field step belum lengkap

---

## Cara Melanjutkan
Buka chat baru, bilang:
> "Lanjutkan task PRD multi-step register form, lihat file `.claude/worktrees/progress_prd_register_form.md`"

Lalu minta rebuild `app/public-events/[id]/register/page.tsx` menjadi 5-step form.

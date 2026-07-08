# Laporan Eksekutif MWX -- Juni 2026

**Periode:** 1--25 Juni 2026 (data sampai 25 Juni)
**Generated:** 25 Juni 2026
**Sumber data:** `transactions` + `transaction_details` (Supabase), Credit Manager API, halosis_messages, training_events, event_registrations, cms_customers, referral_partners, crm_campaigns
**Exclusion:** `demo_excluded_emails` table (1,114 emails, 1,082 matching active CMS users)

---

## Ringkasan Eksekutif

Revenue Juni (transaksi Finished): **Rp 727.250**, turun **-74,9%** dari Mei Rp 2,9 juta. Penurunan drastis karena Mei mendapat kontribusi besar dari **Wakaf Produktif Free** (program bundling) yang tidak berlanjut di Juni. Di sisi positif: **penggunaan produk naik 17,5%**, **user aktif pakai naik 67,5%** (83→139), dan dua event besar mendorong aktivasi: **Aktivasi Juragan UMKM** (81,5%) dan **Produksi Konten Kreatif dg AI** (22,9%). Free trial signup: 557 dari 478 customer unik. WA blast menjangkau 618 nomor unik, read rate 24%.

| Indikator | Mei 2026 | Juni 2026 | Delta |
|-----------|----------|-----------|-------|
| Revenue (Finished) | Rp 2.902.850 | Rp 727.250 | **-74,9%** |
| Total Finished tx | 1.206 | 578 | -52,1% |
| Paid tx (grand > 0) | ~26 | 21 | -19,2% |
| Free trial tx | ~1.180 | 557 | -52,8% |
| Transaksi Failed | ~35 | 22 (Rp 1.050.252) | -37,1% |
| User baru | 625 | 533 | -14,7% |
| Penggunaan produk (debit) | 331 tx / 1.768 kredit | 389 tx / 2.187 kredit | **+17,5%** |
| User aktif pakai (debit) | 83 | 139 | **+67,5%** |

---

## 1. Pertumbuhan User

| Metrik | Mei 2026 | Juni 2026 | Delta |
|--------|----------|-----------|-------|
| User baru | 625 | 533 | -14,7% |
| Total aktif | 55.115 | 55.522 | +407 |

### Tren Mingguan Juni

| Minggu | Tanggal | User Baru |
|--------|---------|-----------|
| Week 1 | 1--7 Jun | 21 |
| Week 2 | 8--14 Jun | 147 |
| Week 3 | 15--21 Jun | 10 |
| Week 4 | 22--28 Jun | 330 |

### Top Channel Akuisisi

| Channel | Active Users | Share |
|---------|-------------|-------|
| snag | 48.008 | 85,4% |
| Organik | 3.469 | 6,2% |
| Mediawave Berbagi | 1.013 | 1,8% |
| SMESCO | 961 | 1,7% |
| Whitelist WEB 3 | 549 | 1,0% |
| Lainnya | 2.241 | 4,0% |

---

## 2. Event & Aktivasi

### Status Event Juni 2026

| # | Event | Tanggal | Registrasi | Status |
|---|-------|---------|-----------|--------|
| 1 | Eleven Space Jakarta | 3 Jun | 7 | Selesai |
| 2 | **Aktivasi Juragan UMKM** | 10 Jun | 27 | Selesai |
| 3 | Webinar FinanceWhiz | 17 Jun | 1 | Selesai |
| 4 | ~~Jakpreneur~~ | ~~22 Jun~~ | -- | **Dibatalkan** |
| 5 | **Produksi Konten Kreatif dg AI** | 23 Jun | 266 | Selesai |
| 6 | Training Digitalisasi UMKM (YDBA) | 24 Jun | 0 | Selesai |
| 7 | Booth Hari UMKM 2026 | **29 Jun** | 0 | Geser dari 25 Jun |
| 8 | Onboarding Banten Serang | 30 Jun | 0 | Belum tiba |

### Aktivasi Kredit per Event

| Event | Peserta | Aktif Pakai* | Activation Rate |
|-------|---------|-------------|-----------------|
| Eleven Space Jakarta | 7 | 0 | 0% |
| Aktivasi Juragan UMKM | 27 | 22 | **81,5%** |
| Webinar FinanceWhiz | 1 | 0 | 0% |
| Produksi Konten Kreatif dg AI | 266 | 61 | 22,9% |

*\* Peserta yang tercatat menggunakan kredit (debit) minimal 1x selama Juni 2026*

---

## 3. Pembelian & Penggunaan Produk

### Revenue Juni (transaksi Finished, dari tabel `transactions`)

Sumber: tabel `transactions` + `transaction_details` (Supabase). Hanya transaksi `status = 'Finished'`. **Semua angka sudah exclude user di tabel `demo_excluded_emails`.**

**Total Finished Juni: 578 tx, Rp 727.250**

Dari 578 tx:
- **Free trial** (grand_total = 0): 557 tx, Rp 0, 478 customer unik
- **Paid** (grand_total > 0): 21 tx, Rp 727.250, 17 customer unik

### Mei vs Juni (Finished only)

| Metrik | Mei | Juni | Delta |
|--------|-----|------|-------|
| Revenue Finished | Rp 2.902.850 | Rp 727.250 | **-74,9%** |
| Total Finished tx | 1.206 | 578 | -52,1% |
| Failed tx (Rp) | Rp ~2,2 jt | Rp 1.050.252 (22 tx) | -52,2% |

**Penyebab turun 74,9%:** Mei mendapat kontribusi besar dari **Wakaf Produktif Free** -- bundling CreateWhiz Basic + FinanceWhiz Basic ke 16 customer dengan harga diskon Rp 127.050/orang. Program ini tidak berlanjut di Juni.

### Breakdown Produk (Finished, Juni, exclude demo)

| Produk | Tx | Revenue |
|--------|-----|---------|
| PostWhiz Basic | 2 | Rp 198.000 |
| CreateWhiz Basic | 4 | Rp 173.250 |
| CreateWhiz Promo | 7 | Rp 172.500 |
| LegalWhiz Basic | 2 | Rp 57.750 |
| FinanceWhiz Basic | 2 | Rp 41.250 |
| FinanceWhiz Promo | 1 | Rp 25.000 |
| SalesWhiz Basic | 1 | Rp 24.750 |
| SmartWhiz Basic | 1 | Rp 24.750 |
| SmartWhiz Promo 7D | 1 | Rp 10.000 |
| Free trial (semua produk) | 557 | Rp 0 |

> FinanceWhiz Promo 7D (14 tx / Rp 140K di versi sebelumnya) dan SMEWhiz Basic (2 tx / Rp 14) ternyata berasal dari **akun demo** yang ada di `demo_excluded_emails`. Setelah exclude, produk tersebut tidak muncul di paid transaction.

### Penggunaan Kredit (Debit)

| Metrik | Mei | Juni | Delta |
|--------|-----|------|-------|
| Total debit tx | 331 | 389 | +17,5% |
| Total kredit dipakai | 1.768,39 | 2.187,00 | +23,7% |
| User aktif pakai | 83 | 139 | **+67,5%** |

---

## 4. WhatsApp Blast

| Metrik | Nilai |
|--------|-------|
| Total outbound | 2.878 |
| Delivered | 2.187 (76,0%) |
| Read | 691 (24,0%) |
| Failed | 0 |
| Unique penerima | 618 |
| Inbound (user reply) | 159 |
| Unique repliers | 69 |

### Read Rate per Template

| Template | Penerima | Read Rate | Status |
|----------|---------|-----------|--------|
| followup_conversation | 4 | 75,0% | Sangat Baik |
| fu2_eventxlr8 | 7 | 42,8% | Baik |
| template_ajakan | 436 | 22,6% | Perlu Review |
| loyaltypoin | 565 | 21,9% | Perlu Review |
| followup_financewhiz | 229 | 21,0% | Perlu Review |
| promo30rb_clone | 208 | 14,9% | Buruk |
| survey_saldogopay50rb | 180 | 5,6% | Buruk |
| survey_saldogopay50rb_clone | 180 | 5,6% | Buruk |
| pemenangsurvei_gopay50rb | 180 | 5,6% | Buruk |

---

## 5. Rekomendasi

### Prioritas Tinggi

1. **Revenue -74,9% vs Mei -- perlu recovery.** Wakaf Produktif Free tidak berlanjut. Buat program bundling baru atau hubungi 16 customer Wakaf untuk renewal.

2. **205 peserta Produksi Konten Kreatif belum aktif.** Event terbesar (266 orang) hanya 22,9% activation. Follow-up via WA dalam 7 hari.

3. **Hentikan survey series WA.** Read rate 5,6% -- buang kredit percuma. A/B test template yang lebih baik.

4. **Kumpulkan nomor WA.** Hanya 1.962 user (3,5%) punya nomor WA, membatasi retargeting. Tambahkan WA opt-in di onboarding flow.

5. **Diskon Event Pameran 75% perlu evaluasi.** CreateWhiz Promo diskon 75% (Rp 25.000/tx) menghasilkan Rp 172.500 dari 7 tx. Evaluasi apakah diskon sebesar ini sustainable, atau naikkan harga floor.

### Prioritas Menengah

6. **Evaluasi channel free trial massal.** Dewan PERS, Workshop Kem. UMKM, YDBA mendatangkan banyak user gratis tapi 0% konversi ke paid. Terapkan mekanisme free trial berbatas waktu (7/14 hari).

7. **Genjot SalesWhiz & SmartWhiz.** Kedua produk ini baru 1 paid tx masing-masing di Juni.

---

## Appendix: Sumber Data & Metodologi

| # | Sumber | Status |
|---|--------|--------|
| 1 | cms_customers | 59.472 rows |
| 2 | transactions | 30.336 tx |
| 3 | transaction_details | 30.871 items |
| 4 | credit_manager_transactions | 57.636 tx |
| 5 | halosis_messages | 5.702 rows |
| 6 | crm_campaigns + recipients | 7 + 146 rows |
| 7 | training_events + event_registrations | 20 + 560 rows |
| 8 | referral_partners | 68 rows |
| 9 | demo_excluded_emails | 1.114 rows (1.082 match active CMS) |

**Catatan metodologi:**
- Revenue = `transactions.grand_total` WHERE `status = 'Finished'`
- View `v_mwx_transactions` **tidak digunakan** (menggunakan `transaction_details.grand_total` yang tidak match)
- **Exclusion:** Semua angka user/revenue/debit sudah mengecualikan email dari tabel `demo_excluded_emails` (1.114 email, 1.082 cocok dengan user CMS aktif). Sebelumnya hanya mengandalkan hardcoded pattern `%@email.com` + 7 email -- ini tidak cukup.
- Periode: 1--25 Juni 2026 (data sampai hari ini)

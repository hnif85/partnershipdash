# LAPORAN ANALISIS USER BEHAVIOR
**Periode:** 2026-05-01 – 2026-06-23
**Generated:** 2026-06-24 04:26 UTC
**Scope:** 2 user(s) (excluded 0 demo/test)

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total user (after exclude demo) | 2 |
| User aktif (ada transaksi) | 2 |
| User dormant (0 transaksi) | 0 |
| Total kredit dipakai (debit) | 148.0 |
| User dengan phone terdaftar | 1 |
| User dengan WA data | 1 |

**Distribusi Segmen RFM:**
- Champion: 1
- Potential Loyalist: 1

---

## 1. Salmi Juicy

### Profil
| Field | Value |
|-------|-------|
| Email | `salmijuicy@gmail.com` |
| Nama | Salmi Juicy |
| Phone | 6282148590975 |
| Status CMS | active |
| Bergabung | 2026-06-20 |
| Referral Partner | Organik |
| CMS GUID | `d260d95c-c4be-477d-b29b-3419129ae734` |

### Kredit & Penggunaan Produk

| Metric | Value |
|--------|-------|
| Total transaksi (debit) | 4 |
| Total kredit dipakai | 46.0 |
| Rata-rata debit/transaksi | 11.5 |
| Last used | 2026-06-21 (3 days ago) |
| Dormant (>14 hari) | Tidak |

**Produk yang dipakai:**
- 9ba95f62-7f26-4922-9b84-3fa0822b34ac: 46.0 kredit (100.0%)

| RFM Score | R=5 F=2 M=4 |
| RFM Segment | **Potential Loyalist** |

### WA Engagement

| Metric | Value |
|--------|-------|
| Outbound (MWX → User) | 15 |
| Read | 15 |
| Read Rate | 100.0% |
| Inbound (User → MWX) | 3 |
| Response Rate | 20.0% |

**Template WA:** loyaltypoin, webinar_18_mei_2026, template_ajakan, onboarding_18mei2026, blast_pengingat_webinar_financewhiz_18_mei_2026, followup_financewhiz

**Agent handler:** Rinaya Triananda Saradewi, Utami Fitriyani

**Inbound messages:**
- `2026-06-09 11:36:25+00:00`: TUNJUKKAN
- `2026-05-17 20:57:43+00:00`: Baik trimakasih infonya
- `2026-05-16 10:48:30+00:00`: Hadir

### CRM & Lead Status

Belum di-manage CRM (tidak ada di lead pipeline).

### Training Event

Tidak ada data partisipasi event.

### Rekomendasi

- Tidak ada flag kritis. User dalam kondisi baik.

---

## 2. sannysalahudin

### Profil
| Field | Value |
|-------|-------|
| Email | `sannysalahudin@gmail.com` |
| Nama | sannysalahudin |
| Phone | **TIDAK TERDAFTAR** |
| Status CMS | active |
| Bergabung | 2025-12-17 |
| Referral Partner | AI untuk UMKM |
| CMS GUID | `3bfc5260-d2a5-46fa-949a-20593d4bd9a1` |

### Kredit & Penggunaan Produk

| Metric | Value |
|--------|-------|
| Total transaksi (debit) | 12 |
| Total kredit dipakai | 102.0 |
| Rata-rata debit/transaksi | 8.5 |
| Last used | 2026-06-20 (4 days ago) |
| Dormant (>14 hari) | Tidak |

**Produk yang dipakai:**
- 9ba95f62-7f26-4922-9b84-3fa0822b34ac: 38.0 kredit (37.3%)
- Unknown: 64.0 kredit (62.7%)

| RFM Score | R=4 F=4 M=5 |
| RFM Segment | **Champion** |

### WA Engagement

**Phone tidak terdaftar** — tidak ada data WA.

### CRM & Lead Status

Belum di-manage CRM (tidak ada di lead pipeline).

### Training Event

Tidak ada data partisipasi event.

### Rekomendasi

- **Phone tidak terdaftar** — minta update nomor WA untuk engagement.

---

## Appendix: Sumber Data

| # | Sumber | Status Akses |
|---|--------|-------------|
| 1 | cms_customers (Supabase) | OK |
| 2 | Credit Manager /users/{{id}} | OK |
| 3 | Credit Manager /transactions/user/{{id}} | OK |
| 4 | halosis_messages (Supabase) | OK |
| 5 | crm_campaign_recipients (Supabase) | OK |
| 6 | crm_lead_pipeline (Supabase) | OK |
| 7 | lead_app_choices + enrollments (Supabase) | OK |
| 8 | referral_partners (Supabase) | OK |
| 9 | training_events (Supabase) | OK |
| 10 | demo_excluded_emails | OK (hardcoded) |

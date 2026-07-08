# LAPORAN ANALISIS USER BEHAVIOR
**Periode:** 2026-06-01 – 2026-06-23
**Generated:** 2026-06-24 04:26 UTC
**Scope:** 1 user(s) (excluded 0 demo/test)

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total user (after exclude demo) | 1 |
| User aktif (ada transaksi) | 1 |
| User dormant (0 transaksi) | 0 |
| Total kredit dipakai (debit) | 46.0 |
| User dengan phone terdaftar | 1 |
| User dengan WA data | 1 |

**Distribusi Segmen RFM:**
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
| Outbound (MWX → User) | 7 |
| Read | 7 |
| Read Rate | 100.0% |
| Inbound (User → MWX) | 1 |
| Response Rate | 14.3% |

**Template WA:** template_ajakan, followup_financewhiz, loyaltypoin

**Agent handler:** Rinaya Triananda Saradewi

**Inbound messages:**
- `2026-06-09 11:36:25+00:00`: TUNJUKKAN

### CRM & Lead Status

Belum di-manage CRM (tidak ada di lead pipeline).

### Training Event

Tidak ada data partisipasi event.

### Rekomendasi

- Tidak ada flag kritis. User dalam kondisi baik.

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

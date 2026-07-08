# LAPORAN ANALISIS USER BEHAVIOR
**Periode:** 2026-06-16 – 2026-06-23
**Generated:** 2026-06-23 06:36 UTC
**Scope:** 1 user(s) (excluded 0 demo/test)

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total user (after exclude demo) | 1 |
| User aktif (ada transaksi) | 1 |
| User dormant (0 transaksi) | 0 |
| Total kredit dipakai (debit) | 46 |
| User dengan phone terdaftar | 1 |
| User dengan WA data | 0 |

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
| Total kredit dipakai | 46 |
| Rata-rata debit/transaksi | 11.5 |
| Last used | 2026-06-21 (2 days ago) |
| Dormant (>14 hari) | Tidak |

**Produk yang dipakai:**
- CreateWhiz: 46 kredit (100.0%)

| RFM Score | R=5 F=2 M=4 |
| RFM Segment | **Potential Loyalist** |

### WA Engagement

| Metric | Value |
|--------|-------|
| Outbound (MWX → User) | 0 |
| Read | 0 |
| Read Rate | 0% |
| Inbound (User → MWX) | 0 |
| Response Rate | 0% |

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

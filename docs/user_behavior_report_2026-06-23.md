# LAPORAN ANALISIS USER BEHAVIOR
**Periode:** 2026-06-16 – 2026-06-23
**Generated:** 2026-06-23 06:34 UTC
**Scope:** 1 user(s) (excluded 0 demo/test)

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total user (after exclude demo) | 1 |
| User aktif (ada transaksi) | 0 |
| User dormant (0 transaksi) | 1 |
| Total kredit dipakai (debit) | 0 |
| User dengan phone terdaftar | 0 |
| User dengan WA data | 0 |

---

## 1. salmijuicy@gmail.com

### Profil
| Field | Value |
|-------|-------|
| Email | `salmijuicy@gmail.com` |
| Nama | - |
| Phone | **TIDAK TERDAFTAR** |
| Status CMS | - |
| Bergabung | - |
| Referral Partner | Organik |
| CMS GUID | `-` |

### Kredit & Penggunaan Produk

| Metric | Value |
|--------|-------|
| Total transaksi (debit) | 0 |
| Total kredit dipakai | 0 |
| Rata-rata debit/transaksi | 0 |
| Last used | Never (- days ago) |
| Dormant (>14 hari) | **YA** |

| RFM Score | R=1 F=1 M=1 |
| RFM Segment | **Not in Credit Manager** |

### WA Engagement

**Phone tidak terdaftar** — tidak ada data WA.

### CRM & Lead Status

Belum di-manage CRM (tidak ada di lead pipeline).

### Training Event

Tidak ada data partisipasi event.

### Rekomendasi

- **Re-engagement:** User dormant >14 hari — trigger WA follow-up atau promo reaktivasi.
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

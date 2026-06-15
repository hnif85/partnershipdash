# BENAR-MWX-Data-2026

Paket data untuk BENAR Foundation sebagai respons atas surat permintaan data
Nomor [___]/BENAR/VI/2026 perihal Permintaan Data Program.

## Ringkasan Status Data

| Status Label | Arti |
|-------------|------|
| ✅ SIAP | Data sudah lengkap dan bisa langsung digunakan |
| ⚠️ PARSIAL | Data tersedia sebagian, perlu dilengkapi dari DB/diverifikasi |
| 🔴 PERLU DIKUMPULKAN | Data perlu dikumpulkan secara manual oleh tim MWX |

## Struktur Folder

```
📁 BENAR-MWX-Data-2026/
├── 📄 README.md                          ← File ini
├── 📁 01_Data-Kuantitatif/
│   ├── 📄 Tab1_UserAktifPerTools.csv      ✅ SIAP
│   ├── 📄 Tab2_EngagementMetrics.csv      ⚠️ PARSIAL
│   ├── 📄 Tab3_DemografiPeserta.csv       ⚠️ PARSIAL (data umum siap, data per event perlu DB)
│   ├── 📄 Tab4_BeforeAfterImpact.csv      ⚠️ PARSIAL (metrik teknis siap, data dampak perlu dikumpul)
│   ├── 📄 Tab5_TestimoniDanQuote.csv      🔴 PERLU DIKUMPULKAN
│   ├── 📄 Tab6_StudiKasus.csv             🔴 PERLU DIKUMPULKAN
│   ├── 📄 Tab7_RankingTools.csv           ✅ SIAP
│   └── 📄 Tab8_DataPembelian.csv         ✅ SIAP
├── 📁 02_Data-Kualitatif/
│   ├── 📄 B1_TestimoniUMKM_placeholder.csv     🔴 PERLU DIISI
│   ├── 📄 B2_StudiKasus_placeholder.csv        🔴 PERLU DIISI
│   ├── 📄 B3_TestimoniFasilitator_placeholder.csv 🔴 PERLU DIISI
│   └── 📄 B4_QuoteSiapPublikasi_placeholder.csv  🔴 PERLU DIISI
├── 📁 03_Data-Teknis/
│   ├── 📄 D1_JumlahFiturPerTools.csv      ✅ SIAP
│   ├── 📄 D2_UptimePlatform.csv           🔴 PERLU KONFIRMASI TIM INFRA
│   ├── 📄 D3_RoadmapPengembangan.csv      ⚠️ PARSIAL (dari PRD)
│   └── 📄 D4_ProdukLengkap.csv            ✅ SIAP
└── 📁 04_Data-Mentah/
    ├── 📄 dataMasterTraining.csv    ← 3.798 UMKM data training
    ├── 📄 rekap_harian.csv          ← Usage 30 Apr - 16 Mei 2026
    ├── 📄 usage.csv                 ← 57 user-to-app mapping
    ├── 📄 datas5.csv               ← 60 transaksi pembelian
    ├── 📄 data30Januari.csv        ← 40 transaksi Jan 2026
    ├── 📄 ai_umkm_credit_accumulation_2026.csv ← 97 user kredit 2026
    ├── 📄 email_credit_check.csv   ← Data lisensi & status user
    └── 📄 products.json            ← 45 produk Whiz
```

## Data yang Masih Perlu Dilengkapi

### Prioritas Tinggi (sebelum dikirim ke BENAR)

1. **Testimoni UMKM (B1)** — Kumpulkan minimal 5 testimoni dari peserta Surakarta
   dan Bandung Barat. Sertakan foto dan izin publikasi tertulis.
2. **Quote siap publikasi (B4)** — 3-5 kutipan singkat untuk press release & medsos.
3. **Foto kegiatan (C1-C2)** — 5-10 foto per event, min 1920×1080 px.
4. **Logo MWX (C4)** — File high-res SVG + PNG transparan min 2000×2000 px.

### Prioritas Sedang

5. **Demografi per event (A5-A6)** — Query dari DB `event_registrations` berdasarkan
   event Surakarta (30 Apr) dan Bandung Barat (28 Mei).
6. **Studi kasus (B2)** — 1-2 cerita mendalam 150-300 kata dari UMKM paling aktif.
7. **Screenshot dashboard (C3)** — Tangkapan layar tiap tools (samarkan data sensitif).
8. **Before-after impact (A8)** — Data kenaikan omzet, efisiensi, dll. jika tersedia.

### Prioritas Rendah

9. **Uptime platform (D2)** — Konfirmasi dari tim infrastruktur.
10. **Video kegiatan (C5)** — Jika ada rekaman video.

## Cara Query Data dari Database

Untuk data spesifik per event, jalankan query berikut di database:

```sql
-- Cari event Surakarta & Bandung Barat
SELECT id, name, event_date, location, partner 
FROM training_events 
WHERE event_date IN ('2026-04-30', '2026-05-28');

-- Demografi peserta per event
SELECT 
  er.business_line AS sektor_usaha,
  COUNT(*) AS jumlah
FROM event_registrations er
JOIN training_events te ON te.id = er.event_id
WHERE te.event_date IN ('2026-04-30', '2026-05-28')
  AND er.status = 'attended'
GROUP BY er.business_line;
```

## Catatan Pengiriman

- **Google Sheets:** Semua file CSV bisa diimport ke Google Sheets
- **Google Drive:** Folder ini bisa diupload langsung
- **Deadline:** 26 Juni 2026
- **Konfirmasi:** Kirim email ke contact@benarfoundation.org saat data siap

---

*Disusun oleh MWX Indonesia pada 12 Juni 2026*
*Berdasarkan data dari sistem dashboard dan file data operasional*

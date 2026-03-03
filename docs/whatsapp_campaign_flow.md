# WhatsApp Campaign Flow

## Tujuan
Menyediakan alur end-to-end untuk mengirim campaign WhatsApp berbasis template variabel, dengan pengelolaan kontak, grouping, dan integrasi API Watzap.

## Prasyarat & Konfigurasi
- Env: `WATZAP_API_KEY`, `WATZAP_NUMBER_KEY` sudah diisi di `.env.local`.
- Database (Postgres/Supabase) tersedia untuk menyimpan template, kontak, grup, campaign, dan log pengiriman.
- Semua request ke Watzap hanya dilakukan server-side.

## Entitas Data (ringkas)
- `whatsapp_templates`: `id`, `name`, `body`, `variables` (json array), `category`, `created_by`, `updated_at`.
- `contacts`: `id`, `name`, `phone_no` (E.164), `email`, `tags` (array), `metadata` (json).
  - Sumber utama: `cms_customers.phone_number` dan pasangan `email` (import mapping langsung ke field ini).
- `contact_groups`: `id`, `name`, `description`.
- `contact_group_members`: `group_id`, `contact_id`.
- `campaigns`: `id`, `name`, `template_id`, `audience_type` (group/tags/manual), `audience_ref`, `schedule_type` (time/trigger/manual), `schedule_at`, `trigger_config` (json), `status` (draft/scheduled/running/done/failed), `stats` (json sent/delivered/failed).
- `campaign_messages` (opsional): `campaign_id`, `contact_id`, `message_body`, `status`, `watzap_ack`, `error`.

## Alur Utama
1) **Buat template**: User menulis body dengan placeholder `{{variable}}`; sistem deteksi variabel dan simpan ke `variables`.
2) **Kelola kontak**: CRUD + import CSV/XLS dari `cms_customers` (gunakan `phone_number` dan pairing `email`); normalisasi nomor ke E.164; tagging; assign ke grup (via `contact_group_members`).
3) **Pilih audiens**: User memilih grup, filter tag, atau seleksi manual; simpan pilihan ke `audience_type/audience_ref`.
4) **Buat campaign**: Ikat `template` + `audience` + jadwal:
   - `schedule_type=time`: gunakan `schedule_at` untuk cron/scheduler.
   - `schedule_type=trigger`: eksekusi ketika event tertentu terjadi (misal signup, transaksi, status change) sesuai `trigger_config` (event name + filter + payload mapping).
   - `schedule_type=manual`: kirim segera.
5) **Proses kirim**:
   - Ambil daftar kontak final.
   - Render body per kontak (substitusi `{{variable}}` dengan data kontak atau payload).
   - Panggil Watzap `/v1/send_message` dengan `{ api_key, number_key, phone_no, message }`.
   - Catat hasil per kontak di `campaign_messages`, update agregat `stats`.
6) **Monitoring**: Halaman detail campaign menampilkan status, progres sent/delivered/failed, dan log per kontak bila tersedia.

## Endpoint/Service yang disiapkan
- `POST /api/templates` (create), `GET/PUT/DELETE /api/templates/:id`.
- `POST /api/contacts` (single/bulk), `GET/PUT/DELETE /api/contacts/:id`.
- `POST /api/contact-groups`, `POST /api/contact-groups/:id/members` (add/remove).
- `POST /api/campaigns` (buat + jadwal), `POST /api/campaigns/:id/start` (paksa jalan), `GET /api/campaigns/:id`.
- `POST /api/campaigns/:id/trigger` untuk event-based execute (dipanggil oleh event bus/webhook) sesuai `trigger_config`.
- `POST /api/watzap/send` internal wrapper:
  - Jika payload mengandung `image_url` dan `group_id` -> gunakan `/v1/send_image_group`.
  - Default kirim individu via `/v1/send_message`.
  - Inject `api_key` dan `number_key` dari env, tidak boleh dari client.

## Validasi & Guardrail
- Tolak kirim jika ada placeholder template yang tidak terisi.
- Validasi `phone_no` E.164; deduplikasi kontak pada audience final; pairing nomor-email harus konsisten saat import.
- Rate-limit endpoint kirim; batasi batch size (misal 100-200) per burst untuk menghindari throttling.
- Jangan expose `api_key/number_key` ke client; hanya response status/log ringkas.

## Testing Singkat
- Unit: renderer template (placeholder lengkap), normalisasi nomor, klien Watzap (mock fetch).
- Integration/API: happy path create template -> import kontak -> create campaign -> start -> cek log.
- E2E smoke: alur UI wizard (template -> audience -> jadwal/trigger -> kirim) dengan mock Watzap.

## Catatan Implementasi
- Scheduler awal bisa memakai cron sederhana (per-minute) yang mengeksekusi campaign `scheduled` dengan `schedule_at <= now()`. Bisa dipromosikan ke queue/worker jika volume naik.
- Engine trigger: event bus/webhook memanggil `/api/campaigns/:id/trigger` dengan payload; gunakan `trigger_config` untuk memilih audience dan mapping variabel.
- Simpan `watzap_number_key` per campaign jika multi-number support dibutuhkan nanti; default gunakan env global.

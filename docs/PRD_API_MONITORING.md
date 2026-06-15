# PRD - API Monitoring & User Activity Tracking

## 1. Tujuan

Memantau aktivitas pengguna internal (super_admin, partnership, crm) dalam menggunakan aplikasi Partnership Dashboard. Setiap API endpoint memiliki kebutuhan spesifik yang bisa dikonsumsi oleh dashboard frontend.

---

## 2. Database Table

**Table: `user_activity_logs`**

| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL PK | Auto increment |
| `user_id` | BIGINT FK → crm_users.id | User yang melakukan aksi (nullable untuk anonymous) |
| `user_name` | TEXT | Nama user (denormalized untuk query cepat) |
| `user_role` | TEXT | Role user |
| `activity_type` | TEXT | `'page_view'`, `'api_call'`, `'action'` |
| `path` | TEXT | Path halaman atau endpoint API |
| `method` | TEXT | HTTP method (`GET`, `POST`, dll) |
| `status_code` | INT | HTTP response status code |
| `duration_ms` | INT | Response time in milliseconds |
| `ip_address` | TEXT | IP address user |
| `user_agent` | TEXT | Browser/user agent |
| `referrer` | TEXT | URL referrer |
| `metadata` | JSONB | Data tambahan (payload size, browser info, dll) |
| `created_at` | TIMESTAMPTZ | Waktu kejadian |

**Indexes:**
- `created_at DESC` — untuk sorting recent activity
- `user_id` — untuk filter per user
- `activity_type` — untuk filter page_view vs api_call
- `path` — untuk popular pages grouping

---

## 3. API Endpoints

### 3.1 POST /api/monitoring/log

Mencatat aktivitas user ke database. Dipanggil dari:
- Frontend (page view tracking via `useEffect`)
- Backend middleware (auto-log API calls)

**Request Body:**
```json
{
  "path": "/customers",
  "activity_type": "page_view",
  "method": "GET",
  "status_code": 200,
  "duration_ms": 350,
  "metadata": {}
}
```

**Headers (dari frontend):**
- `x-user-id`: ID user yang login
- `x-user-name`: Nama user
- `x-user-role`: Role user

**Response:**
```json
{ "success": true }
```

**Kebutuhan:** Entry point logging. Semua aktivitas masuk lewat sini.

---

### 3.2 GET /api/monitoring/summary

Ringkasan statistik monitoring untuk card di dashboard.

**Response:**
```json
{
  "total_page_views": 15230,
  "total_api_calls": 4520,
  "active_users_today": 12,
  "active_users_week": 18,
  "active_users_month": 25,
  "unique_pages_today": 8,
  "total_activities_all_time": 19750
}
```

**Query SQL:** Aggregate dari `user_activity_logs` dengan filter date range.

**Kebutuhan:** 4 summary card di dashboard (total views, total API calls, active users, unique pages today).

---

### 3.3 GET /api/monitoring/daily-activity?days=30

Data harian untuk line chart.

**Response:**
```json
[
  {
    "date": "2026-05-10",
    "page_views": 520,
    "api_calls": 180,
    "unique_users": 8
  },
  ...
]
```

**Query SQL:** `generate_series` untuk date range + LEFT JOIN aggregation.

**Kebutuhan:** 3 line chart (page views, API calls, unique users) per hari.

---

### 3.4 GET /api/monitoring/popular-pages?limit=10

Halaman yang paling sering dikunjungi.

**Response:**
```json
[
  {
    "path": "/customers",
    "visit_count": 3200,
    "unique_users": 15,
    "last_visited": "2026-06-09T10:30:00Z"
  },
  ...
]
```

**Query SQL:** `GROUP BY path` dengan `COUNT(*)` dan `COUNT(DISTINCT user_id)`.

**Kebutuhan:** Tabel halaman terpopuler di dashboard.

---

### 3.5 GET /api/monitoring/user-activity?type=summary|recent&limit=20

**Type = summary:** Aktivitas per user (ranking terbanyak).
**Type = recent:** Log aktivitas terbaru (real-time feed).

**Response (summary):**
```json
[
  {
    "user_id": 1,
    "user_name": "Super Admin",
    "user_role": "super_admin",
    "total_activities": 4500,
    "page_views": 3800,
    "api_calls": 700,
    "last_active": "2026-06-09T11:00:00Z"
  }
]
```

**Response (recent):**
```json
[
  {
    "id": 12345,
    "user_name": "Super Admin",
    "activity_type": "page_view",
    "path": "/customers",
    "method": "GET",
    "status_code": 200,
    "created_at": "2026-06-09T11:00:00Z"
  }
]
```

**Kebutuhan:** Tabel aktivitas per user + tabel recent activity log.

---

## 4. Dashboard Page (`/monitoring`)

### Layout:
1. **Header:** "User Activity Monitoring"
2. **Summary Cards (4 kolom):**
   - Total Page Views
   - Total API Calls
   - Active Users (today / week / month)
   - Unique Pages Today
3. **Line Charts (3 kolom):**
   - Page Views (30 hari)
   - API Calls (30 hari)
   - Unique Users (30 hari)
4. **Two Column Tables:**
   - Left: Halaman Terpopuler
   - Right: Aktivitas per User
5. **Full Width Table:**
   - Recent Activity Log (waktu, user, tipe, path, method, status)

### Menu:
- Sidebar → grup "Monitoring" → item "Activity Monitor"
- Visible untuk role: `super_admin`, `partnership`

---

## 5. Tracking Strategy

### Page View (Frontend)
- Di `layout-shell.tsx`, `useEffect`监听 `pathname` change
- Parse `crm_user` dari localStorage untuk headers
- POST ke `/api/monitoring/log` dengan `activity_type: "page_view"`

### API Call (Backend - optional enhancement)
- Next.js middleware atau wrapper function
- Auto-log setiap request ke API routes

---

## 6. Notes untuk Developer

1. **Table migration:** Tambahkan `CREATE TABLE user_activity_logs` di `ensureCrmSchema()` di `lib/crmSchema.ts`
2. **Lib file:** Buat `lib/userActivity.ts` untuk semua query functions
3. **API routes:** Masing-masing endpoint di folder `app/api/monitoring/*/route.ts`
4. **Frontend:** Gunakan pola komponen yang sama dengan dashboard existing (SimpleLineChart, summary cards, tables)
5. **Style:** Ikuti design system existing (warna `#1f3c88`, border `zinc-200`, background `#f7f8fb`)

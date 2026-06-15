# Dokumentasi API Eksternal

Daftar lengkap seluruh API eksternal yang terintegrasi di aplikasi Partnership Dashboard.

---

## Daftar Isi

1. [MWX Market — Auth Service](#1-mwx-market--auth-service)
2. [MWX Market — CMS Service (Customer)](#2-mwx-market--cms-service-customer)
3. [MWX Market — Transaction Service](#3-mwx-market--transaction-service)
4. [Credit Manager](#4-credit-manager)
5. [Damcorp (WhatsApp WABA)](#5-damcorp-whatsapp-waba)
6. [WatZap (Alternate WhatsApp)](#6-watzap-alternate-whatsapp)
7. [MediaWave AI](#7-mediawave-ai)
8. [OpenRouter AI](#8-openrouter-ai)
9. [CreateWhiz](#9-createwhiz)
10. [n8n Webhooks (MediaWave)](#10-n8n-webhooks-mediawave)

---

## 1. MWX Market — Auth Service

**Base URL:** `https://api-mwxmarket.mwxmarket.ai/auth-service/`

### 1a. Token Auth

Mendapatkan bearer token untuk autentikasi API MWX lainnya.

| Metode | Endpoint |
|--------|----------|
| `POST` | `/token/auth` |

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "app_name": "mwx-marketplace",
  "app_key": "mWX-m4Rk3TpL@c3",
  "device_id": "postman-fadil",
  "device_type": "00031312",
  "ip_address": "0.0.0.0"
}
```

**Example Response (Success):**
```json
{
  "response": {
    "code": "00",
    "message_en": "Success",
    "message_id": "",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Example Response (Error):**
```json
{
  "response": {
    "code": "01",
    "message_en": "Invalid app_key or app_name",
    "message_id": ""
  }
}
```

### 1b. Back Office Login

Login ke MWX back office untuk mendapatkan session token.

| Metode | Endpoint |
|--------|----------|
| `POST` | `/authentication/back-office/login` |

**Headers:**
```json
{
  "Content-Type": "application/json",
  "token": "<bearer_token_dari_token_auth>"
}
```

**Request Body:**
```json
{
  "identifier": "admin@example.com",
  "password": "password123"
}
```

**Example Response (Success):**
```json
{
  "response": {
    "code": "00",
    "message_en": "Login successful",
    "message_id": "",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "guid": "abc-123",
        "full_name": "Admin User",
        "email": "admin@example.com"
      }
    }
  }
}
```

**Example Response (Error):**
```json
{
  "response": {
    "code": "01",
    "message_en": "Invalid identifier or password",
    "message_id": ""
  }
}
```

---

## 2. MWX Market — CMS Service (Customer)

**Base URL:** `https://api-mwxmarket.mwxmarket.ai/cms-service/`

### 2a. Customer List (Private)

Mengambil daftar customer dengan filter.

| Metode | Endpoint |
|--------|----------|
| `GET` | `/customer/list?limit={n}&page={n}` |
| `POST` | `/customer/list` (dengan body filter) |

**Headers:**
```json
{
  "accept": "application/json",
  "x-api-key": "<CMS_CUSTOMER_API_KEY>"
}
```

**GET Example Response (Success):**
```json
{
  "code": "00",
  "status": "success",
  "data": {
    "customers": [
      {
        "guid": "634ae8f2-b8fd-4806-95da-16aa76510bfe",
        "full_name": "",
        "username": "customer-2",
        "email": "customer2@test.id",
        "phone_number": "+6202",
        "status": "active",
        "is_active": "true",
        "is_email_verified": false,
        "referal_code": "empty",
        "created_at": "2025-06-10T06:22:05.061212",
        "updated_at": null
      }
    ],
    "total_data": 12250,
    "current_page": 1,
    "limit": 1,
    "total_page": 12250
  }
}
```

### 2b. Customer List (Public)

Mengambil daftar customer dengan filter yang lebih kaya, bisa difilter berdasarkan rentang tanggal.

| Metode | Endpoint |
|--------|----------|
| `POST` | `/customer/list/public` |

**Headers:**
```json
{
  "x-api-key": "<CMS_CUSTOMER_PUBLIC_API_KEY>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "filter": {
    "set_guid": false,
    "guid": "",
    "set_name": false,
    "name": "",
    "set_email": false,
    "email": [],
    "set_date": true,
    "start_date": "2026-01-01",
    "end_date": "2026-01-27",
    "set_platform": false,
    "platform": ""
  },
  "limit": 100,
  "page": 1,
  "order": "created_at",
  "sort": "DESC"
}
```

**Field Filter:**

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `filter.set_guid` | Boolean | Aktifkan filter by GUID |
| `filter.guid` | String | GUID customer |
| `filter.set_name` | Boolean | Aktifkan filter by name |
| `filter.name` | String | Nama customer |
| `filter.set_email` | Boolean | Aktifkan filter by email |
| `filter.email` | Array[String] | Daftar email |
| `filter.set_date` | Boolean | Aktifkan filter tanggal |
| `filter.start_date` | String | Tanggal awal (YYYY-MM-DD) |
| `filter.end_date` | String | Tanggal akhir (YYYY-MM-DD) |
| `filter.set_platform` | Boolean | Aktifkan filter platform |
| `filter.platform` | String | Platform (misal: "lms") |
| `limit` | Integer | Data per halaman (max 3000) |
| `page` | Integer | Halaman ke-n |
| `order` | String | Field ordering (default: `created_at`) |
| `sort` | String | `ASC` / `DESC` |

**Example Response (Success):**
```json
{
  "code": "00",
  "status": "success",
  "data": [
    {
      "guid": "634ae8f2-b8fd-4806-95da-16aa76510bfe",
      "full_name": "",
      "username": "customer-2",
      "profile_picture": null,
      "gender": null,
      "birth_date": null,
      "identity_number": null,
      "identity_img": null,
      "is_identity_verified": false,
      "bank_name": null,
      "bank_account_number": null,
      "bank_owner_name": null,
      "phone_number": "+6202",
      "is_phone_number_verified": false,
      "email": "customer2@test.id",
      "is_email_verified": false,
      "referal_code": "empty",
      "is_free_trial_use": false,
      "platform": null,
      "status": "active",
      "subscribe_list": null,
      "created_at": "2025-06-10T06:22:05.061212",
      "created_by": { "guid": "", "name": "by system" },
      "updated_at": null,
      "updated_by": null
    }
  ],
  "current_page": 1,
  "limit": 1,
  "total_page": 12250,
  "total_data": 12250,
  "message_en": "Success",
  "message_id": ""
}
```

**Response Fields:**

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `code` | String | `"00"` = sukses |
| `data[].guid` | String | GUID customer |
| `data[].full_name` | String | Nama lengkap |
| `data[].username` | String | Username |
| `data[].email` | String | Email |
| `data[].phone_number` | String | No. telepon |
| `data[].status` | String | `"active"` / `"inactive"` |
| `data[].referal_code` | String | Kode referral |
| `data[].created_at` | String (ISO) | Waktu dibuat |
| `data[].updated_at` | String (ISO) / null | Waktu diupdate |
| `total_data` | Integer | Total data |
| `total_page` | Integer | Total halaman |

---

## 3. MWX Market — Transaction Service

**Base URL:** `https://api-mwxmarket.mwxmarket.ai/transaction-service/`

### 3a. External Transaction List

Mengambil daftar transaksi finished (untuk sync).

| Metode | Endpoint |
|--------|----------|
| `POST` | `/transaction/external/list` |

**Headers:**
```json
{
  "x-api-key": "<API_KEY>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "filter": {
    "set_guid": false,
    "guid": "",
    "set_status": true,
    "status": "finished",
    "set_merchant": false,
    "merchant_id": "",
    "set_category": false,
    "category": "",
    "set_name": false,
    "name": "",
    "set_transaction_at": true,
    "start_date": "2025-10-01T00:00:00",
    "end_date": "2025-10-31T23:59:59",
    "set_valuta": false,
    "valuta": "USD",
    "set_customer_id": false,
    "customer_id": "",
    "set_email": false,
    "email": ""
  },
  "limit": 100,
  "page": 1
}
```

**Example Response (Success):**
```json
{
  "code": "00",
  "status": "success",
  "data": {
    "transactions": [
      {
        "guid": "txn-001",
        "invoice_number": "INV-202510-001",
        "customer": {
          "guid": "cust-001",
          "full_name": "John Doe",
          "username": "johndoe",
          "email": "john@example.com"
        },
        "transaction_callback_id": "cb-001",
        "status": "finished",
        "payment_channel": {
          "id": "1",
          "code": "BCA",
          "payment_name": "Bank BCA"
        },
        "payment_url": "https://...",
        "qty": 1,
        "valuta_code": "IDR",
        "sub_total": 100000,
        "platform_fee": 2000,
        "payment_service_fee": 1000,
        "total_discount": 0,
        "grand_total": 103000,
        "transaction_detail": [
          {
            "guid": "td-001",
            "grand_total": 100000,
            "merchant": {
              "guid": "merchant-001",
              "store_name": "MWX Official"
            },
            "product_name": "Paket Premium",
            "product_price": 100000,
            "purchase_type": {
              "id": "1",
              "name": "Beli",
              "value": "purchase"
            },
            "qty": 1,
            "total_discount": 0,
            "transaction_id": "txn-001"
          }
        ],
        "created_at": "2025-10-01T10:00:00",
        "created_by": {
          "guid": "system",
          "name": "System"
        }
      }
    ],
    "total_data": 500,
    "current_page": 1,
    "total_page": 5
  }
}
```

**Filter Fields:**

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `filter.set_guid` | Boolean | Filter by transaction GUID |
| `filter.guid` | String | GUID transaksi |
| `filter.set_status` | Boolean | Filter by status |
| `filter.status` | String | `"finished"`, `"pending"`, `"failed"` |
| `filter.set_transaction_at` | Boolean | Filter by tanggal |
| `filter.start_date` | String | `YYYY-MM-DDThh:mm:ss` |
| `filter.end_date` | String | `YYYY-MM-DDThh:mm:ss` |
| `filter.set_customer_id` | Boolean | Filter by customer |
| `filter.customer_id` | String | GUID customer |
| `filter.set_email` | Boolean | Filter by email |
| `filter.email` | String | Email customer |
| `limit` | Integer | Data per halaman |
| `page` | Integer | Halaman |

### 3b. Back Office Transaction List

Mengambil transaksi via endpoint back office (dengan spoofed headers untuk autentikasi session).

| Metode | Endpoint |
|--------|----------|
| `POST` | `/transaction/back-office/list` |

**Headers:**
```json
{
  "Content-Type": "application/json",
  "token": "<session_token_dari_back_office_login>",
  "cookie": "token=<session_token>; logged_in=1",
  "origin": "https://backoffice.mwxmarket.ai",
  "referer": "https://backoffice.mwxmarket.ai/"
}
```

**Request Body:**
```json
{
  "filter": {
    "set_guid": false,
    "guid": "",
    "set_status": true,
    "status": "finished",
    "set_transaction_at": true,
    "start_date": "2026-05-01T00:00:00",
    "end_date": "2026-05-28T23:59:59"
  },
  "limit": 100,
  "page": 1
}
```

**Example Response (Success):**
```json
{
  "code": "00",
  "status": "success",
  "data": {
    "transactions": [],
    "total_data": 0,
    "current_page": 1,
    "total_page": 0
  },
  "message_en": "Success"
}
```

---

## 4. Credit Manager

**Base URL:** `https://credit-manager.mwxmarket.ai/`

### Transactions

Mengambil data transaksi kredit/debit.

| Metode | Endpoint |
|--------|----------|
| `GET` | `/api/v1/transactions?page={n}&limit={n}&start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}` |

**Headers:**
```json
{
  "accept": "application/json",
  "Authorization": "<AUTH_TOKEN>",
  "X-API-KEY": "<AUTH_TOKEN>"
}
```

**Query Parameters:**

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `page` | Integer | Halaman (default: 1) |
| `limit` | Integer | Data per halaman (default: 100) |
| `start_date` | String | Tanggal awal (YYYY-MM-DD) |
| `end_date` | String | Tanggal akhir (YYYY-MM-DD) |

**Example Response (Success):**
```json
{
  "data": [
    {
      "id": "1",
      "created_at": "2026-01-22T07:00:00",
      "updated_at": "2026-01-22T07:00:00",
      "agent_id": "agent-001",
      "amount": 50000,
      "user_product_id": "up-001",
      "product_name": "Paket SMS",
      "product_package": "Paket 1000 SMS",
      "type": "debit",
      "user_id": "user-001",
      "action_id": "act-001"
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 10,
    "total_data": 1000
  }
}
```

**Response Fields:**

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | String | ID transaksi |
| `created_at` | String (ISO) | Waktu transaksi |
| `amount` | Number | Jumlah kredit (positive untuk `credit`, negative/tidak untuk `debit`) |
| `type` | String | `"credit"` (penambahan) / `"debit"` (pemakaian) |
| `product_name` | String | Nama produk |
| `product_package` | String | Nama paket |
| `user_id` | String | ID user |
| `agent_id` | String | ID agent (jika ada) |
| `action_id` | String | ID aksi |

---

## 5. Damcorp (WhatsApp WABA)

**Base URL:** `https://waba.damcorp.id/`

### 5a. Login — Dapatkan Token

| Metode | Endpoint |
|--------|----------|
| `POST` | `/v2/users/login` |

**Headers:**
```json
{
  "Authorization": "Basic <base64_username:password>",
  "Accept": "application/json",
  "Content-Type": "application/json"
}
```

**Request Body:** `{}` (kosong)

**Example Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "users": [
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  ],
  "data": {
    "token": "eyJ..."
  }
}
```

> Token bisa berada di beberapa lokasi: `data.token`, `data.access_token`, `data.data.token`, `data.result.token`, atau `data.users[0].token`.

### 5b. Kirim Pesan Teks

| Metode | Endpoint |
|--------|----------|
| `POST` | `/v2/messages` |

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

**Request Body:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "6281119591333",
  "type": "text",
  "text": {
    "body": "Halo! Ada yang bisa kami bantu?"
  }
}
```

### 5c. Kirim Gambar

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "6281119591333",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Foto produk"
  }
}
```

### 5d. Kirim Dokumen

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "6281119591333",
  "type": "document",
  "document": {
    "link": "https://example.com/doc.pdf",
    "filename": "brosur.pdf"
  }
}
```

### 5e. Kirim Audio

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "6281119591333",
  "type": "audio",
  "audio": {
    "link": "https://example.com/audio.mp3"
  }
}
```

**Example Response (Success) — Semua Tipe:**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "6281119591333",
      "wa_id": "6281119591333"
    }
  ],
  "messages": [
    {
      "id": "wamid.ABCDEF1234567890"
    }
  ]
}
```

**Response Fields:**

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `messages[0].id` | String | WhatsApp Message ID (`waMessageId`) |
| `contacts[0].wa_id` | String | Nomor tujuan |

---

## 6. WatZap (Alternate WhatsApp)

**Base URL:** `https://api.watzap.id/v1`

Semua endpoint menggunakan metode `POST`.

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

### 6a. Cek API Key

| Endpoint | `/checking_key` |
|----------|-----------------|

**Request Body:**
```json
{
  "api_key": "<WATZAP_API_KEY>"
}
```

**Example Response:**
```json
{
  "status": true,
  "message": "API Key valid"
}
```

### 6b. Validasi Nomor

| Endpoint | `/validate_number` |
|----------|--------------------|

```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>",
  "phone_no": "6281119591333"
}
```

**Example Response:**
```json
{
  "status": "200",
  "message": "Valid number"
}
```

### 6c. Kirim Pesan Teks

| Endpoint | `/send_message` |
|----------|-----------------|

```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>",
  "phone_no": "6281119591333",
  "message": "Halo! Ada yang bisa kami bantu?"
}
```

**Example Response:**
```json
{
  "status": true,
  "message": "Message sent",
  "data": {
    "id": "wamid.ABCDEF1234567890"
  }
}
```

### 6d. Kirim Gambar via URL

| Endpoint | `/send_image_url` |
|----------|-------------------|

```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>",
  "phone_no": "6281119591333",
  "url": "https://example.com/image.jpg",
  "caption": "Foto produk"
}
```

### 6e. Kirim File via URL

| Endpoint | `/send_file_url` |
|----------|------------------|

```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>",
  "phone_no": "6281119591333",
  "url": "https://example.com/doc.pdf"
}
```

### 6f. Kirim ke Grup

| Endpoint | `/send_message_group` |
|----------|-----------------------|

```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>",
  "id_group": "group-id-123",
  "message": "Halo group!"
}
```

### 6g. Daftar Grup

| Endpoint | `/groups` |
|----------|-----------|

```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>"
}
```

**Example Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": "group-id-123",
      "name": "MWX Users",
      "participants": [
        {
          "number": "6281119591333",
          "name": "John",
          "role": "admin"
        }
      ]
    }
  ]
}
```

### 6h. Webhook Management

**Set Webhook** — `/set_webhook`
```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>",
  "url": "https://domain.com/api/helpdesk/webhook/watzap"
}
```

**Get Webhook** — `/get_webhook`
```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>"
}
```

**Unset Webhook** — `/unset_webhook`
```json
{
  "api_key": "<WATZAP_API_KEY>",
  "number_key": "<WATZAP_NUMBER_KEY>"
}
```

---

## 7. MediaWave AI

**Base URL:** `https://ai-module.mediawave.co.id/`

### Chat Completions

Menghasilkan reply AI, summary percakapan, dan follow-up suggestion (model Gemini 2.5 Flash).

| Metode | Endpoint |
|--------|----------|
| `POST` | `/completions` |

**Headers:**
```json
{
  "X-Key": "<MEDIAWAVE_AI_KEY>",
  "Content-Type": "application/json",
  "accept": "application/json"
}
```

Atau via `Authorization`:
```json
{
  "Authorization": "<MEDIAWAVE_AI_KEY>",
  "Content-Type": "application/json"
}
```

**Request Body (AI Reply via CreateWhiz Style):**
```json
{
  "service": "CreateWhiz",
  "ai": "vertex",
  "model": "gemini-2.5-flash",
  "messages": [
    {
      "role": "system",
      "content": "Anda adalah customer service MWX Market yang pintar..."
    },
    {
      "role": "user",
      "content": "Halo, saya mau tanya produk"
    }
  ],
  "temperature": 0.8,
  "top_p": 1,
  "debug": false
}
```

**Request Body (Conversation Summary via Prompt Style):**
```json
{
  "prompt": "Analisis percakapan berikut...",
  "max_tokens": 500,
  "temperature": 0.3
}
```

**Example Response (CreateWhiz style):**
```json
{
  "data": {
    "content": "Halo! Ada yang bisa saya bantu? Kami dari MWX Market memiliki berbagai produk yang bisa disesuaikan dengan kebutuhan usaha Anda. [INTENT: greeting]",
    "usage": {
      "prompt_tokens": 450,
      "completion_tokens": 120,
      "total_tokens": 570
    }
  }
}
```

**Example Response (OpenAI style):**
```json
{
  "choices": [
    {
      "message": {
        "content": "Tentu, berikut informasi produk yang Anda tanyakan..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 300,
    "completion_tokens": 80,
    "total_tokens": 380
  }
}
```

**Response Format yang Didukung:**

| Format | Path |
|--------|------|
| MediaWave | `data.content` |
| OpenAI | `choices[0].message.content` |
| Direct | `reply`, `result.content`, `text`, `output.text` |

---

## 8. OpenRouter AI

**Base URL:** `https://openrouter.ai/`

### Chat Completions

Menganalisis data funnel dashboard (S1–S5) dan menghasilkan insight dalam Bahasa Indonesia.

| Metode | Endpoint |
|--------|----------|
| `POST` | `/api/v1/chat/completions` |

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <OPENROUTER_API_KEY>",
  "HTTP-Referer": "https://domain.com",
  "X-Title": "Partnership Dash"
}
```

**Request Body:**
```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are an analytics assistant. Konteks: ini adalah data user yang diakuisisi dengan baseline funnel S1–S5..."
    },
    {
      "role": "user",
      "content": "Sumber: DATABASE\nData: S1 - Database: 1500, S2 - Akun: 800, S3 - Aktif: 400, S4 - Transaksi: 200, S5 - Repeat: 50"
    }
  ],
  "max_tokens": 5000,
  "temperature": 0.2
}
```

**Example Response (Success):**
```json
{
  "choices": [
    {
      "message": {
        "content": "📊 **Tren Utama:** Dari 1.500 user di database (S1), hanya 53% yang memiliki akun (S2) dan 13% melakukan transaksi (S4). **Anomali:** Terjadi penurunan signifikan dari S2 ke S3 (-50%), ini perlu investigasi lebih lanjut. **Rekomendasi:** Optimalkan proses onboarding untuk meningkatkan konversi S2 ke S3."
      }
    }
  ]
}
```

**Response Fields:**

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `choices[0].message.content` | String | Teks insight / analisis |
| `error` | String | `"AI not available"` jika error |

---

## 9. CreateWhiz

**Base URL:** `https://createwhiz.ai/`

### Get Deliverables by GUID

Mengambil deliverable (file hasil AI) untuk customer tertentu.

| Metode | Endpoint |
|--------|----------|
| `GET` | `/api/ext/deliverables/{guid}` |

**Headers:**
```json
{
  "x-super-token": "<CREATEWHIZ_SUPER_TOKEN>"
}
```

**Example Response (Success):**
```json
{
  "guid": "abc-123-def",
  "userId": "user-001",
  "deliverables": [
    {
      "guid": "del-001",
      "name": "Konten Instagram 1",
      "fileUrl": "https://createwhiz.ai/storage/deliverables/file.pdf",
      "thumbnailUrl": "https://createwhiz.ai/storage/deliverables/thumb.jpg",
      "type": "image",
      "status": "completed",
      "createdAt": "2026-01-22T10:00:00"
    }
  ]
}
```

**Response Fields:**

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `guid` | String | GUID deliverable |
| `userId` | String | ID user pemilik |
| `deliverables[].guid` | String | GUID item |
| `deliverables[].fileUrl` | String | URL file (absolut) |
| `deliverables[].thumbnailUrl` | String | URL thumbnail |
| `deliverables[].type` | String | Tipe file |
| `deliverables[].status` | String | Status (`"completed"`, `"processing"`) |
| `deliverables[].createdAt` | String | Waktu dibuat |

---

## 10. n8n Webhooks (MediaWave)

**Base URL:** `https://n8n.mediawave.co.id/webhook/`

Webhook-webhook berikut digunakan untuk integrasi dengan pipeline otomatisasi n8n.

### 10a. Sync User

Trigger sinkronisasi user dari MWX ke database lokal.

| Metode | Endpoint |
|--------|----------|
| `POST` | `/sync_user` |

Tidak ada auth header.

**Example Response:**
```json
{
  "status": "triggered"
}
```

### 10b. Sync S3

Trigger sinkronisasi data ke S3.

| Metode | Endpoint |
|--------|----------|
| `POST` | `/sync_s3` |

**Example Response:**
```json
{
  "status": "success"
}
```

### 10c. Data S1 (Funnel)

Mengambil data S1 funnel — user yang terdaftar di database.

| Metode | Endpoint |
|--------|----------|
| `GET` | `/data_s1` |

**Example Response:**
```json
{
  "dates": [
    {
      "label": "2026-01-22",
      "count": 50
    }
  ],
  "compositions": [
    {
      "label": "2026-01-22",
      "count": 50,
      "breakdown": [
        {
          "label": "Training A",
          "count": 30
        },
        {
          "label": "Partnership B",
          "count": 20
        }
      ]
    }
  ]
}
```

### 10d. Data S2 (Funnel)

Mengambil data S2 funnel — user yang memiliki akun.

| Metode | Endpoint |
|--------|----------|
| `GET` | `/s2_data` |

**Example Response:**
```json
{
  "dates": [
    {
      "label": "2026-01-22",
      "count": 35
    }
  ]
}
```

---

## Environment Variables Reference

Berikut daftar environment variable yang digunakan untuk semua API eksternal:

| Variable | Service | Deskripsi |
|----------|---------|-----------|
| `CMS_CUSTOMER_API_KEY` | MWX CMS | API key untuk customer list (private) |
| `CMS_CUSTOMER_PUBLIC_API_KEY` | MWX CMS | API key untuk customer list (public) |
| `CMS_CUSTOMER_PUBLIC_API_URL` | MWX CMS | Custom URL (override) |
| `DAMCORP_BASIC_AUTH` | Damcorp | Pre-computed Base64 Basic Auth |
| `DAMCORP_USERNAME` | Damcorp | Username login |
| `DAMCORP_PASSWORD` | Damcorp | Password login |
| `DAMCORP_TEST_PHONE` | Damcorp | Nomor test |
| `DAMCORP_WEBHOOK_VERIFY_TOKEN` | Damcorp | Verify token untuk webhook |
| `WATZAP_API_KEY` | WatZap | API key |
| `WATZAP_NUMBER_KEY` | WatZap | Number key |
| `WATZAP_BASE_URL` | WatZap | Custom base URL (optional) |
| `MEDIAWAVE_AI_URL` | MediaWave AI | Custom URL (optional) |
| `MEDIAWAVE_AI_KEY` | MediaWave AI | API key |
| `OPENROUTER_API_KEY` | OpenRouter | Bearer token |
| `OPENROUTER_MODEL` | OpenRouter | Model override (default: `openai/gpt-4o-mini`) |
| `CREATEWHIZ_SUPER_TOKEN` | CreateWhiz | Super token |
| `NEXT_PUBLIC_MWX_IDENTIFIER` | MWX Back Office | Identifier untuk auto backoffice login |
| `NEXT_PUBLIC_MWX_PASSWORD` | MWX Back Office | Password untuk auto backoffice login |

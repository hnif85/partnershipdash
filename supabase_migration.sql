-- Supabase Migration Script
-- This script creates all necessary tables for the partnership dashboard

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  updated_at timestamp with time zone,
  framework text,
  min_chars integer,
  id integer PRIMARY KEY,
  content text,
  created_at timestamp with time zone
);

-- Create article_links table
CREATE TABLE IF NOT EXISTS article_links (
  id integer PRIMARY KEY,
  created_at timestamp with time zone,
  url text,
  article_id integer
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  tanggal_daftar timestamp without time zone,
  tantangan text,
  nomor_whatsapp text,
  cerita_usaha text,
  facebook_followers integer,
  tiktok_followers integer,
  raw_id integer,
  jumlah_tim text,
  instagram_url text,
  facebook_url text,
  marketplace_url text,
  instagram_followers integer,
  credit_manager_user_id uuid,
  updated_at timestamp with time zone,
  inserted_at timestamp with time zone,
  tantangan_lainnya text,
  nama_usaha text,
  tempat_jualan text,
  tiktok_url text,
  nama_lengkap text,
  id integer PRIMARY KEY,
  setuju_dihubungi boolean,
  email text,
  tanggal_cutoff text,
  kategori text,
  kota_domisili text,
  kategori_usaha text
);

-- Create training_events table
CREATE TABLE IF NOT EXISTS training_events (
  created_at timestamp with time zone,
  model text,
  id_partner text,
  partner text,
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text,
  event_date date
);

-- Create recent_events table
CREATE TABLE IF NOT EXISTS recent_events (
  start_time timestamp with time zone,
  name text,
  updated_at timestamp with time zone,
  photo_url text,
  type text,
  id integer PRIMARY KEY,
  location text,
  summary text,
  created_at timestamp with time zone
);

-- Create credit_manager_users table
CREATE TABLE IF NOT EXISTS credit_manager_users (
  name text,
  updated_at timestamp with time zone,
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone,
  email text
);

-- Create cms_customers table
CREATE TABLE IF NOT EXISTS cms_customers (
  guid text PRIMARY KEY,
  username text,
  full_name text,
  email text,
  phone_number text,
  city text,
  country text,
  status text,
  is_active character varying,
  is_email_verified boolean DEFAULT false,
  is_phone_number_verified boolean DEFAULT false,
  referal_code text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  gender text,
  birth_date date,
  identity_number text,
  identity_img text,
  country_id integer,
  city_id integer,
  is_identity_verified boolean DEFAULT false,
  bank_name text,
  bank_account_number text,
  bank_owner_name text,
  corporate_name text,
  industry_name text,
  employee_qty integer,
  solution_corporate_needs text,
  is_free_trial_use boolean DEFAULT false,
  created_by_guid text,
  created_by_name text,
  updated_by_guid text,
  updated_by_name text,
  subscribe_list jsonb
);

-- Create impact_periods table
CREATE TABLE IF NOT EXISTS impact_periods (
  is_open boolean,
  created_at timestamp with time zone,
  type text,
  id integer PRIMARY KEY,
  starts_at timestamp with time zone,
  name text,
  ends_at timestamp with time zone
);

-- Create lead_app_choices table
CREATE TABLE IF NOT EXISTS lead_app_choices (
  whatsapp text,
  updated_at timestamp with time zone,
  ts_raw text,
  inserted_at timestamp with time zone,
  app_choice_raw text,
  ts timestamp with time zone,
  id integer PRIMARY KEY,
  nama text,
  email text,
  app_choice text
);

-- Create lead_app_enrollments table
CREATE TABLE IF NOT EXISTS lead_app_enrollments (
  app_choice text,
  lead_id integer,
  lead_app_choice_id integer,
  updated_at timestamp with time zone,
  product_id integer,
  id integer PRIMARY KEY,
  created_at timestamp with time zone
);

-- Create lead_ai_summaries table
CREATE TABLE IF NOT EXISTS lead_ai_summaries (
  summary text,
  id integer PRIMARY KEY,
  created_at timestamp with time zone,
  cache_key text,
  updated_at timestamp with time zone
);

-- Create referral_partners table
CREATE TABLE IF NOT EXISTS referral_partners (
  partner text,
  code text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone,
  is_gov boolean,
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4()
);

-- Create csr_profile table
CREATE TABLE IF NOT EXISTS csr_profile (
  id integer PRIMARY KEY,
  description text,
  period text,
  updated_at timestamp with time zone,
  company_name text
);

-- Create credit_manager_transactions table
CREATE TABLE IF NOT EXISTS credit_manager_transactions (
  created_at timestamp with time zone,
  agent uuid,
  amount numeric,
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_product_id uuid,
  updated_at timestamp with time zone,
  type text,
  product_name text,
  product_package text,
  inserted_at timestamp with time zone,
  user_id uuid,
  action_id uuid
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  guid uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  inserted_at timestamp with time zone,
  updated_at timestamp with time zone,
  agent_id character varying,
  package text,
  id integer,
  application_name text
);

-- Create impact_responses table
CREATE TABLE IF NOT EXISTS impact_responses (
  submitted_at timestamp with time zone,
  email text,
  id integer PRIMARY KEY,
  type text,
  payload jsonb,
  token text,
  period_id integer,
  umkm_id text
);

-- Create training_enrollments table
CREATE TABLE IF NOT EXISTS training_enrollments (
  created_at timestamp with time zone,
  user_guid uuid,
  event_id uuid,
  source_guid uuid,
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4()
);

-- Create tmp_training_data table
CREATE TABLE IF NOT EXISTS tmp_training_data (
  no_hp text[],
  total_credits numeric,
  solusi_crmwhiz text,
  klasifikasi text,
  sudah_membeli_credit text,
  event_id uuid,
  total_credit_tx numeric,
  catatan text,
  tanggal_input_trial date,
  tanggal_input_data date,
  total_debits numeric,
  no integer,
  total_debit_tx numeric,
  solusi_smartwhiz text,
  solusi_financewhiz text,
  raw_json jsonb,
  id_cms text,
  username_trial text,
  solusi_createwhiz text,
  latest_balance numeric,
  guid uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_usage text,
  email text,
  akun_aktif_expired text,
  model_training text,
  solusi_saleswhiz text,
  solusi_smewhiz text,
  nama text,
  hasil_feedback text,
  catatan2 text,
  nama_training text,
  partner text,
  jenis_usaha text
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  guid TEXT PRIMARY KEY,
  invoice_number TEXT,
  customer_guid TEXT,
  transaction_callback_id TEXT,
  status TEXT,
  payment_channel_id TEXT,
  payment_channel_code TEXT,
  payment_channel_name TEXT,
  payment_url TEXT,
  qty INTEGER,
  valuta_code TEXT,
  sub_total NUMERIC,
  platform_fee NUMERIC,
  payment_service_fee NUMERIC,
  total_discount NUMERIC,
  grand_total NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by_guid TEXT,
  created_by_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by_guid TEXT,
  updated_by_name TEXT,

  -- Foreign key to cms_customers
  CONSTRAINT fk_transaction_customer
    FOREIGN KEY (customer_guid)
    REFERENCES cms_customers(guid)
);

-- Create transaction_details table
CREATE TABLE IF NOT EXISTS transaction_details (
  guid TEXT PRIMARY KEY,
  transaction_guid TEXT,
  merchant_guid TEXT,
  merchant_store_name TEXT,
  product_name TEXT,
  product_price NUMERIC,
  purchase_type_id TEXT,
  purchase_type_name TEXT,
  purchase_type_value TEXT,
  qty INTEGER,
  total_discount NUMERIC,
  grand_total NUMERIC,

  -- Foreign key to transactions
  CONSTRAINT fk_transaction_detail_transaction
    FOREIGN KEY (transaction_guid)
    REFERENCES transactions(guid)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer_guid ON transactions(customer_guid);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_number ON transactions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_transaction_detail_transaction_guid ON transaction_details(transaction_guid);

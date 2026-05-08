import { pool } from "./database";

export async function ensureCrmSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_segments (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_templates (
      id BIGSERIAL PRIMARY KEY,
      flow_type TEXT NOT NULL,
      template_name TEXT NOT NULL,
      template_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(flow_type, template_name)
    );

    CREATE TABLE IF NOT EXISTS crm_campaigns (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK (message_type IN ('template', 'text')),
      segment_id BIGINT REFERENCES crm_segments(id) ON DELETE SET NULL,
      template_name TEXT,
      template_lang TEXT,
      template_components_json JSONB,
      text_body TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','done','failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_campaign_recipients (
      id BIGSERIAL PRIMARY KEY,
      campaign_id BIGINT NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
      customer_guid TEXT,
      phone_number TEXT NOT NULL,
      wa_message_id TEXT,
      send_status TEXT NOT NULL DEFAULT 'pending',
      provider_response_json JSONB,
      error_message TEXT,
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_webhook_events (
      id BIGSERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      event_type TEXT,
      external_event_id TEXT,
      payload_json JSONB NOT NULL,
      process_status TEXT NOT NULL DEFAULT 'received',
      error_message TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      UNIQUE(provider, external_event_id)
    );

    CREATE TABLE IF NOT EXISTS helpdesk_conversations (
      id BIGSERIAL PRIMARY KEY,
      customer_guid TEXT,
      phone_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved')),
      assigned_to TEXT,
      bot_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      bot_paused_until TIMESTAMPTZ,
      last_message_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS helpdesk_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT NOT NULL REFERENCES helpdesk_conversations(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
      sender_type TEXT NOT NULL CHECK (sender_type IN ('customer','bot','agent')),
      message_type TEXT NOT NULL DEFAULT 'text',
      text_body TEXT,
      template_name TEXT,
      wa_message_id TEXT UNIQUE,
      delivery_status TEXT,
      payload_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS helpdesk_auto_reply_templates (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword','outside_hours')),
      trigger_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      reply_type TEXT NOT NULL CHECK (reply_type IN ('text','template')),
      reply_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      priority INT NOT NULL DEFAULT 100,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Knowledge Base Tables
    CREATE TABLE IF NOT EXISTS helpdesk_personas (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      tone TEXT NOT NULL CHECK (tone IN ('formal', 'casual', 'friendly')),
      greeting TEXT,
      closing TEXT,
      signature_phrases TEXT[],
      response_templates_json JSONB DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS helpdesk_intent_rules (
      id SERIAL PRIMARY KEY,
      intent_name TEXT NOT NULL,
      keywords TEXT[] NOT NULL,
      priority INT NOT NULL DEFAULT 100,
      response_templates TEXT[],
      next_context TEXT,
      requires_param TEXT[],
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS helpdesk_conversation_flows (
      id SERIAL PRIMARY KEY,
      flow_name TEXT NOT NULL UNIQUE,
      trigger_keywords TEXT[] NOT NULL,
      steps_json JSONB NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS helpdesk_escalation_rules (
      id SERIAL PRIMARY KEY,
      condition_type TEXT NOT NULL,
      conditions_json JSONB DEFAULT '{}'::jsonb,
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- AI Helpdesk v2 Tables
    CREATE TABLE IF NOT EXISTS helpdesk_conversations_v2 (
      id BIGSERIAL PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'watzap' CHECK (provider IN ('watzap', 'damcorp')),
      phone_number TEXT NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      customer_data_json JSONB DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'escalated')),
      assigned_to TEXT,
      lead_score INT DEFAULT 0,
      lead_category TEXT DEFAULT 'cold' CHECK (lead_category IN ('cold', 'warm', 'medium', 'hot')),
      last_intent TEXT,
      conversation_context_json JSONB DEFAULT '{}'::jsonb,
      ai_analyzed_at TIMESTAMPTZ,
      bot_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      bot_paused_until TIMESTAMPTZ,
      unread_count INT DEFAULT 0,
      last_message_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, phone_number)
    );

    CREATE TABLE IF NOT EXISTS helpdesk_messages_v2 (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT NOT NULL REFERENCES helpdesk_conversations_v2(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
      sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'bot', 'agent', 'ai')),
      message_type TEXT NOT NULL DEFAULT 'text',
      text_body TEXT,
      intent_detected TEXT,
      sentiment_detected TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      wa_message_id TEXT,
      delivery_status TEXT,
      payload_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS helpdesk_lead_scores (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT NOT NULL REFERENCES helpdesk_conversations_v2(id) ON DELETE CASCADE,
      score INT NOT NULL,
      category TEXT NOT NULL,
      factors_json JSONB DEFAULT '{}'::jsonb,
      calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- WatZap specific
    CREATE TABLE IF NOT EXISTS helpdesk_watzap_config (
      id SERIAL PRIMARY KEY,
      api_key TEXT NOT NULL,
      number_key TEXT NOT NULL,
      webhook_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Product Knowledge
    CREATE TABLE IF NOT EXISTS helpdesk_product_knowledge (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Default Product Knowledge',
      content TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Migration: Add unread columns if not exists (for existing databases)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'helpdesk_conversations_v2' AND column_name = 'unread_count'
      ) THEN
        ALTER TABLE helpdesk_conversations_v2 ADD COLUMN unread_count INT DEFAULT 0;
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'helpdesk_messages_v2' AND column_name = 'is_read'
      ) THEN
        ALTER TABLE helpdesk_messages_v2 ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
      END IF;
    END
    $$;

    -- CRM Users Table
    CREATE TABLE IF NOT EXISTS crm_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin', 'partnership', 'crm')) DEFAULT 'crm',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ
    );

    -- CRM Sessions Table
    CREATE TABLE IF NOT EXISTS crm_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

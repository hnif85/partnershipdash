import { pool } from "./database";

export async function ensureEmailSchema(): Promise<void> {
  await pool.query(`
    -- Email templates (HTML templates with variables)
    CREATE TABLE IF NOT EXISTS email_templates (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      plain_text TEXT,
      variables TEXT[] DEFAULT '{}',
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Email campaigns
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      sender_name TEXT NOT NULL DEFAULT 'MWX Market',
      sender_email TEXT NOT NULL DEFAULT 'noreply@mwxmarket.ai',
      template_id BIGINT REFERENCES email_templates(id) ON DELETE SET NULL,
      html_body TEXT NOT NULL,
      plain_body TEXT,
      recipient_filter_json JSONB DEFAULT '{}'::jsonb,
      -- filter types: 'all', 'partner:xxx', 'date_from:...', 'date_to:...', 'custom_query'
      total_recipients INT DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed','cancelled')),
      scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_by TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Email campaign recipients (tracking)
    CREATE TABLE IF NOT EXISTS email_campaign_recipients (
      id BIGSERIAL PRIMARY KEY,
      campaign_id BIGINT NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
      customer_guid TEXT,
      email TEXT NOT NULL,
      full_name TEXT,
      variables_json JSONB DEFAULT '{}'::jsonb,
      send_status TEXT NOT NULL DEFAULT 'pending' CHECK (send_status IN ('pending','sent','delivered','opened','clicked','failed','bounced','unsubscribed')),
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      error_message TEXT,
      provider_message_id TEXT,
      tracking_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Email settings (SMTP configuration with profiles)
    CREATE TABLE IF NOT EXISTS email_settings (
      id BIGSERIAL PRIMARY KEY,
      profile_name TEXT NOT NULL DEFAULT 'Default',
      host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
      port INT NOT NULL DEFAULT 587,
      secure BOOLEAN NOT NULL DEFAULT false,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      sender_name TEXT NOT NULL DEFAULT 'MWX Market',
      sender_email TEXT NOT NULL,
      daily_limit INT NOT NULL DEFAULT 500,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Migration: Add profile_name column if not exists (for existing databases)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_settings' AND column_name = 'profile_name'
      ) THEN
        ALTER TABLE email_settings ADD COLUMN profile_name TEXT NOT NULL DEFAULT 'Default';
      END IF;
    END
    $$;

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_campaign_id ON email_campaign_recipients(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_email_campaign_recipients_status ON email_campaign_recipients(send_status);
    CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
  `);
}

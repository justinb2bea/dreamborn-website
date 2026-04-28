-- =============================================================================
-- Migration 001: Dreamborn website schema
-- Project: 0.0.8786960 — dreamborn.ai
-- Tables: contacts, contact_signals, content, topic_taxonomy, sequences
-- DO NOT touch the existing agent_state table.
-- =============================================================================

-- ─── 1. contacts ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contacts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text        NOT NULL UNIQUE,
  name             text,
  company          text,
  role             text,                          -- job title / role from Apollo
  source           text        NOT NULL DEFAULT 'finn',  -- 'finn' | 'calcom' | 'manual'
  apollo_enriched  boolean     NOT NULL DEFAULT false,
  enrichment_json  jsonb,                         -- raw Apollo person/company payload
  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT contacts_source_check CHECK (source IN ('finn', 'calcom', 'manual')),
  CONSTRAINT contacts_email_format CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_contacts_email       ON contacts (email);
CREATE INDEX IF NOT EXISTS idx_contacts_source      ON contacts (source);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at  ON contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_apollo      ON contacts (apollo_enriched) WHERE NOT apollo_enriched;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_anon" ON contacts;
CREATE POLICY "deny_all_anon"
  ON contacts
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ─── 2. contact_signals ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contact_signals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  signal_type  text        NOT NULL,   -- 'finn_chat' | 'calcom_booking' | 'page_view' | 'apollo_enriched'
  signal_data  jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT contact_signals_signal_type_check
    CHECK (signal_type IN ('finn_chat', 'calcom_booking', 'page_view', 'apollo_enriched'))
);

CREATE INDEX IF NOT EXISTS idx_signals_contact_id   ON contact_signals (contact_id);
CREATE INDEX IF NOT EXISTS idx_signals_signal_type  ON contact_signals (signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_created_at   ON contact_signals (created_at DESC);

ALTER TABLE contact_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_anon" ON contact_signals;
CREATE POLICY "deny_all_anon"
  ON contact_signals FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- ─── 3. content ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text        NOT NULL,
  slug                text        NOT NULL UNIQUE,
  body_html           text,                    -- rendered HTML (Eleventy-generated posts)
  body_md             text,                    -- source markdown (Eleventy-generated posts)
  excerpt             text,                    -- 1-2 sentence summary for listing cards
  type                text        NOT NULL DEFAULT 'article',  -- 'article' | 'raw_html'
  status              text        NOT NULL DEFAULT 'draft',    -- 'draft' | 'scheduled' | 'published'
  topic_ids           uuid[]      NOT NULL DEFAULT '{}',       -- FK references topic_taxonomy.id (app-level)
  author              text        NOT NULL,                    -- 'Atlas' | 'Justin Dodd' | etc.
  scheduled_date      timestamptz,
  published_at        timestamptz,
  featured_image_url  text,
  no_chrome           boolean     NOT NULL DEFAULT false,      -- true = omit nav+footer (raw HTML only)
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT content_type_check   CHECK (type IN ('article', 'raw_html')),
  CONSTRAINT content_status_check CHECK (status IN ('draft', 'scheduled', 'published')),
  CONSTRAINT content_slug_format  CHECK (slug ~* '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_content_slug         ON content (slug);
CREATE INDEX IF NOT EXISTS idx_content_status       ON content (status);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_content_topic_ids    ON content USING GIN (topic_ids);
CREATE INDEX IF NOT EXISTS idx_content_author       ON content (author);

-- Trigger: keep updated_at current on every UPDATE
CREATE OR REPLACE FUNCTION db_set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_updated_at ON content;
CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION db_set_updated_at();

ALTER TABLE content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_read_published" ON content;
CREATE POLICY "allow_public_read_published"
  ON content FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "deny_anon_write" ON content;
CREATE POLICY "deny_anon_write"
  ON content FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_update" ON content;
CREATE POLICY "deny_anon_update"
  ON content FOR UPDATE TO anon, authenticated
  USING (false);

-- ─── 4. topic_taxonomy ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS topic_taxonomy (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text    NOT NULL UNIQUE,   -- e.g. 'ai-agents', 'on-chain'
  label       text    NOT NULL,          -- e.g. 'AI Agents', 'On-Chain'
  sort_order  int     NOT NULL DEFAULT 0,

  CONSTRAINT topic_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_topic_sort ON topic_taxonomy (sort_order ASC, label ASC);

ALTER TABLE topic_taxonomy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_read" ON topic_taxonomy;
CREATE POLICY "allow_public_read"
  ON topic_taxonomy FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "deny_anon_write" ON topic_taxonomy;
CREATE POLICY "deny_anon_write"
  ON topic_taxonomy FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- ─── 5. sequences ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sequences (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  steps_json  jsonb       NOT NULL DEFAULT '[]',  -- array of step definitions
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_anon" ON sequences;
CREATE POLICY "deny_all_anon"
  ON sequences FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- =============================================================================
-- End of migration 001
-- =============================================================================

-- Migration 001: contacts table
-- Dreamborn website v1 — lead capture

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

CREATE INDEX IF NOT EXISTS idx_contacts_email      ON contacts (email);
CREATE INDEX IF NOT EXISTS idx_contacts_source     ON contacts (source);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_apollo     ON contacts (apollo_enriched) WHERE NOT apollo_enriched;

-- RLS: deny all direct browser reads and writes
-- Only the service-role key (Workers) bypasses RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_anon" ON contacts;
CREATE POLICY "deny_all_anon"
  ON contacts
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

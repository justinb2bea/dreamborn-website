-- Migration 004: topic_taxonomy table
-- Controlled vocabulary for content tagging

CREATE TABLE IF NOT EXISTS topic_taxonomy (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text    NOT NULL UNIQUE,   -- e.g. 'ai-agents', 'on-chain'
  label       text    NOT NULL,          -- e.g. 'AI Agents', 'On-Chain'
  sort_order  int     NOT NULL DEFAULT 0,

  CONSTRAINT topic_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_topic_sort ON topic_taxonomy (sort_order ASC, label ASC);

ALTER TABLE topic_taxonomy ENABLE ROW LEVEL SECURITY;

-- Public read (used at Eleventy build time and for filter pills)
DROP POLICY IF EXISTS "allow_public_read" ON topic_taxonomy;
CREATE POLICY "allow_public_read"
  ON topic_taxonomy FOR SELECT TO anon, authenticated
  USING (true);

-- No direct writes from browser
DROP POLICY IF EXISTS "deny_anon_write" ON topic_taxonomy;
CREATE POLICY "deny_anon_write"
  ON topic_taxonomy FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- Seed initial topics
INSERT INTO topic_taxonomy (slug, label, sort_order) VALUES
  ('ai-agents',       'AI Agents',       1),
  ('on-chain',        'On-Chain',        2),
  ('crm-automation',  'CRM Automation',  3),
  ('infrastructure',  'Infrastructure',  4),
  ('case-studies',    'Case Studies',    5)
ON CONFLICT (slug) DO NOTHING;

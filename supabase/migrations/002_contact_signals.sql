-- Migration 002: contact_signals table
-- Event log for visitor behaviour

CREATE TABLE IF NOT EXISTS contact_signals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  signal_type  text        NOT NULL,   -- 'finn_chat' | 'calcom_booking' | 'page_view' | 'apollo_enriched'
  signal_data  jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT contact_signals_signal_type_check
    CHECK (signal_type IN ('finn_chat', 'calcom_booking', 'page_view', 'apollo_enriched'))
);

CREATE INDEX IF NOT EXISTS idx_signals_contact_id  ON contact_signals (contact_id);
CREATE INDEX IF NOT EXISTS idx_signals_signal_type ON contact_signals (signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_created_at  ON contact_signals (created_at DESC);

ALTER TABLE contact_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_anon" ON contact_signals;
CREATE POLICY "deny_all_anon"
  ON contact_signals FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

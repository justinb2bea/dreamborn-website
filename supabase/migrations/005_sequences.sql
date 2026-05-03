-- Migration 005: sequences table
-- Outreach sequence templates (v1 schema — execution out of scope for website build)

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

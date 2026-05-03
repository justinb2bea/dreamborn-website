-- Migration 007: finn_chat_transcripts table
-- JSON transcript snapshots for Finn conversation mining.

CREATE TABLE IF NOT EXISTS finn_chat_transcripts (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         text        NOT NULL,
  visitor_email      text,
  ip_hash            text,
  user_agent         text,
  page_path          text,
  referrer           text,
  turn_count         integer     NOT NULL DEFAULT 0,
  last_user_message  text,
  reply              text,
  messages           jsonb       NOT NULL DEFAULT '[]',
  metadata           jsonb       NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finn_transcripts_session_id ON finn_chat_transcripts (session_id);
CREATE INDEX IF NOT EXISTS idx_finn_transcripts_email      ON finn_chat_transcripts (visitor_email);
CREATE INDEX IF NOT EXISTS idx_finn_transcripts_created_at ON finn_chat_transcripts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finn_transcripts_messages   ON finn_chat_transcripts USING gin (messages);
CREATE INDEX IF NOT EXISTS idx_finn_transcripts_metadata   ON finn_chat_transcripts USING gin (metadata);

ALTER TABLE finn_chat_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_anon" ON finn_chat_transcripts;
CREATE POLICY "deny_all_anon"
  ON finn_chat_transcripts FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Migration 006: agent_state table
-- NOTE: This table already exists in the live Supabase instance.
-- This migration documents the schema for local dev / fresh deploys.

CREATE TABLE IF NOT EXISTS agent_state (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent      text        NOT NULL,
  client_id  text        NOT NULL,
  status     text        NOT NULL DEFAULT 'idle',
  task_id    text,
  action     text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_state_client ON agent_state (client_id);
CREATE INDEX IF NOT EXISTS idx_agent_state_agent  ON agent_state (agent, client_id);

ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
-- Service-role key bypasses RLS — browser never reads this table directly

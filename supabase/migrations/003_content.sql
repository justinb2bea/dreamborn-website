-- Migration 003: content table
-- All published content (blog posts, raw HTML pages)

CREATE TABLE IF NOT EXISTS content (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text        NOT NULL,
  slug                text        NOT NULL UNIQUE,
  body_html           text,                    -- rendered HTML (Eleventy-generated posts)
  body_md             text,                    -- source markdown
  excerpt             text,                    -- 1–2 sentence summary
  type                text        NOT NULL DEFAULT 'article',  -- 'article' | 'raw_html'
  status              text        NOT NULL DEFAULT 'draft',    -- 'draft' | 'scheduled' | 'published'
  topic_ids           uuid[]      NOT NULL DEFAULT '{}',       -- FK references topic_taxonomy.id (app-level)
  author              text        NOT NULL,
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

-- Trigger: keep updated_at current
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

-- RLS
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Public read for published content (Eleventy data files at build time)
DROP POLICY IF EXISTS "allow_public_read_published" ON content;
CREATE POLICY "allow_public_read_published"
  ON content FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- No direct writes from browser
DROP POLICY IF EXISTS "deny_anon_write" ON content;
CREATE POLICY "deny_anon_write"
  ON content FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_anon_update" ON content;
CREATE POLICY "deny_anon_update"
  ON content FOR UPDATE TO anon, authenticated
  USING (false);

-- Deploy hook trigger: notify Cloudflare Pages on publish
-- See docs/specs for Supabase webhook setup instructions.
-- If using pg_net extension:
--
-- CREATE OR REPLACE FUNCTION notify_cloudflare_on_publish()
--   RETURNS trigger LANGUAGE plpgsql AS $$
-- BEGIN
--   IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
--     PERFORM net.http_post(
--       url := current_setting('app.pages_deploy_hook_url', true),
--       headers := '{"Content-Type": "application/json"}'::jsonb,
--       body := '{}'::jsonb
--     );
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
--
-- DROP TRIGGER IF EXISTS trigger_deploy_on_publish ON content;
-- CREATE TRIGGER trigger_deploy_on_publish
--   AFTER INSERT OR UPDATE ON content
--   FOR EACH ROW EXECUTE FUNCTION notify_cloudflare_on_publish();
--
-- PREFERRED: Configure via Supabase Dashboard → Database → Webhooks → Create webhook
-- See tasks/0.0.8801603/output.md §5 for full setup instructions.

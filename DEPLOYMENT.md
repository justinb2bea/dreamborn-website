# Dreamborn Website — Deployment Guide

**Project:** dreamborn-website  
**Task:** 0.0.8802723  
**Deployed by:** Quinn  
**Date:** 2026-04-28

---

## Live URLs

| Environment | URL | Status |
|-------------|-----|--------|
| Production | https://dreamborn-website.pages.dev | ✅ LIVE |
| Custom domain (pending DNS) | https://dreamborn.ai | ⏳ DNS change required |

---

## What Was Done (Automated)

1. **Cloudflare Pages project created** — `dreamborn-website` project created via `wrangler pages project create dreamborn-website --production-branch=main`

2. **Initial deploy completed** — `_site/` deployed via `wrangler pages deploy _site --project-name=dreamborn-website --branch=main`
   - Deployment URL: `https://70a8e7f4.dreamborn-website.pages.dev`
   - Production URL: `https://dreamborn-website.pages.dev` (HTTP 200 confirmed)
   - Pages Functions bundle (from `functions/`) included and compiled successfully

3. **`SUPABASE_URL` secret set** — Encrypted in CF Pages production environment via `wrangler pages secret put`

---

## Environment Variables — Status

Configure in: CF Pages Dashboard → Settings → Environment Variables → Add variable (type: **Secret**)

| Variable | Status | Value / Action |
|----------|--------|----------------|
| `SUPABASE_URL` | ✅ SET | `https://tseqkbyqyrctrkihllss.supabase.co` (encrypted) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ NEEDS VALUE | Justin: get from Supabase Dashboard → Project Settings → API → service_role key |
| `CLAUDE_API_KEY` | ❌ NEEDS VALUE | Justin: get from https://console.anthropic.com/settings/keys |
| `APOLLO_API_KEY` | ❌ NEEDS VALUE | Justin: get from Apollo.io → Settings → Integrations → API Keys |
| `CALCOM_WEBHOOK_SECRET` | ❌ NEEDS VALUE | Justin: any random 32+ char string (used to verify Cal.com webhook signatures) |
| `PAGES_DEPLOY_HOOK_URL` | ⏳ SET AFTER STEP 4 BELOW | See "Deploy Hook" section |

> **Important:** After setting all secrets, trigger a new deployment so the Pages Functions pick them up.

---

## Manual Steps for Justin

### Step 1 — Connect GitHub Repository

Required for automatic deploys on git push.

1. CF Pages Dashboard → `dreamborn-website` project → Settings → Builds & deployments
2. Click **Connect to Git**
3. Select repository: `justinb2bea/dreamborn-website`
4. Branch: `main`
5. Build command: `npm run build`
6. Build output directory: `_site`
7. Save

### Step 2 — Set Remaining Environment Variables

For each variable marked ❌ above:
1. CF Pages Dashboard → `dreamborn-website` → Settings → Environment Variables
2. Click **Add variable**
3. Type: **Secret** (encrypted)
4. Add both **Production** and **Preview** entries

### Step 3 — Create Content-Published Deploy Hook

This URL triggers a new CF Pages deploy when content is published in Supabase.

1. CF Pages Dashboard → `dreamborn-website` → Settings → Builds & deployments
2. Scroll to **Deploy hooks** → Click **Add deploy hook**
3. Hook name: `content-published`
4. Branch: `main`
5. Click **Save** — copy the generated URL (format: `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...`)
6. Paste this URL as the `PAGES_DEPLOY_HOOK_URL` environment variable (Step 2 above)

### Step 4 — Configure Supabase Content Webhook

After the deploy hook URL is obtained from Step 3:

1. Go to Supabase Dashboard → `tseqkbyqyrctrkihllss` project → Database → Webhooks
2. Click **Create a new hook**
3. Configure:
   - Name: `trigger_pages_deploy_on_publish`
   - Table: `content`
   - Events: `INSERT`, `UPDATE`
   - Condition (HTTP filter): `NEW.status = 'published'`
   - HTTP method: `POST`
   - URL: *(paste the deploy hook URL from Step 3)*
   - No headers needed (CF deploy hooks are authenticated by URL secret)
4. Save

**Alternative — pg_net trigger (SQL approach):**
```sql
-- Run in Supabase SQL editor after setting PAGES_DEPLOY_HOOK_URL
CREATE OR REPLACE FUNCTION trigger_pages_deploy()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status != 'published') THEN
    PERFORM net.http_post(
      url := current_setting('app.pages_deploy_hook_url'),
      body := '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_publish_deploy ON content;
CREATE TRIGGER content_publish_deploy
  AFTER INSERT OR UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION trigger_pages_deploy();

-- Set the app config (run once per session or add to your migration):
ALTER DATABASE postgres SET app.pages_deploy_hook_url = '<PASTE_HOOK_URL_HERE>';
```

### Step 5 — Custom Domain (DNS Change)

To serve the site at `dreamborn.ai`:

**In your DNS provider (wherever dreamborn.ai is registered):**
```
Type:  CNAME
Name:  @  (or dreamborn.ai)
Value: dreamborn-website.pages.dev
TTL:   Auto / 300
```

**Then in CF Pages:**
1. CF Pages Dashboard → `dreamborn-website` → Settings → Custom domains
2. Click **Set up a custom domain**
3. Enter: `dreamborn.ai`
4. Follow CF's verification steps

> If `dreamborn.ai` is already on Cloudflare DNS, CF Pages will handle the CNAME automatically — just add the custom domain in the dashboard.

---

## Build Configuration

| Setting | Value |
|---------|-------|
| Framework | Eleventy (11ty) v3.1.5 |
| Build command | `npm run build` |
| Build output | `_site/` |
| Pages Functions | `functions/` (auto-detected by CF Pages) |
| Node version | Default CF Pages (18+) |

---

## Pages Functions Endpoints

Deployed at `https://dreamborn-website.pages.dev`:

| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/posts` | `functions/api/posts.js` | Fetch published content from Supabase |
| `GET /api/agent-states` | `functions/api/agent-states.js` | Live agent status for homepage/work |
| `POST /api/finn/*` | `functions/api/finn/` | Finn AI chat handler |
| `POST /webhooks/calcom` | `functions/webhooks/calcom.js` | Cal.com booking webhook → contacts |
| `POST /webhooks/apollo` | `functions/webhooks/apollo.js` | Apollo enrichment webhook |

---

## Ongoing Deploys

Once GitHub is connected (Step 1):
- Every push to `main` triggers an automatic CF Pages build + deploy
- Manual redeploy: `npx wrangler pages deploy _site --project-name=dreamborn-website --branch=main`
- Content-triggered redeploy: automatic via Supabase webhook → deploy hook (Steps 3–4)

---

## Checklist Summary

- [x] CF Pages project `dreamborn-website` created
- [x] Initial deploy to `dreamborn-website.pages.dev` (live, HTTP 200)
- [x] `SUPABASE_URL` secret set in production
- [ ] GitHub repo connected (manual — Step 1)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (needs value from Justin)
- [ ] `CLAUDE_API_KEY` set (needs value from Justin)
- [ ] `APOLLO_API_KEY` set (needs value from Justin)
- [ ] `CALCOM_WEBHOOK_SECRET` set (needs value from Justin)
- [ ] Deploy hook `content-published` created (manual — Step 3)
- [ ] `PAGES_DEPLOY_HOOK_URL` set after deploy hook created
- [ ] Supabase content webhook configured (manual — Step 4)
- [ ] Custom domain `dreamborn.ai` connected (DNS + CF Pages dashboard — Step 5)

# Dreamborn Website v1 — Integration Checklist

**Task:** 3.1 — Integration Check + Push  
**Date:** 2026-04-28  
**Run by:** Quinn

---

## Results

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `npm install && npx @11ty/eleventy` — build completes with no errors | ✅ | 5 pages written, 16 assets copied. Warnings about SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set are expected locally (no .env in dev). |
| 2 | All 6 routes generated | ✅⚠️ | /, /work, /thinking, /system, /connect generated. `/thinking/[slug]` requires published posts in Supabase — returns 0 pages on local build with no DB. Template (`src/thinking/post.njk`) is correct and pagination-ready. |
| 3 | `grep -r "fonts.googleapis.com" src/ functions/ public/` — zero results | ✅ | Zero matches. All fonts self-hosted as woff2 in `/public/fonts/`. |
| 4 | `grep -r "Playfair Display" public/css/` — zero results | ✅ | Zero matches in CSS. Playfair Display was overridden by design system update (OQ-1). |
| 5 | No sort dropdown rendered on /thinking | ✅ | Only appearance of "sort" in `src/thinking/index.njk` is a Nunjucks comment: `{# NO sort dropdown — date-desc is the only order (OQ-4) #}`. Zero results in generated HTML. |
| 6 | `no_chrome=true` handling exists in base.njk | ✅ | Two `{% if not no_chrome %}` guards: one wrapping nav, one wrapping footer. `post.njk` sets `no_chrome` via `eleventyComputed` — empty string when false, "true" when true. |
| 7 | Agent status bar partial exists and is included on /, /work, /system | ✅ | `src/_includes/agent-status-bar.njk` exists. Included via `{% include "agent-status-bar.njk" %}` in `src/index.njk`, `src/work/index.njk`, `src/system/index.njk`. Generated HTML has 38 matches each. |
| 8 | Cal.com `<cal-inline data-cal-link="justin-king/intro">` on /connect | ✅ | Present in `src/connect/index.njk` and verified in generated `_site/connect/index.html`. |
| 9 | Finn chat input + send button on /connect | ✅ | `#finnInput` (text input) and `#finnSend` (button) present in `src/connect/index.njk`. |
| 10 | contacts table RLS `deny_all_anon` policy exists | ✅ | Defined in `supabase/migrations/001_dreamborn_schema.sql`. Policy: `FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)`. Cannot verify against live Supabase without credentials — SQL is correct. |
| 11 | All 5 function files exist | ✅ | `functions/api/agent-states.js`, `functions/api/finn/visitor.js`, `functions/api/finn/chat.js`, `functions/api/posts.js`, `functions/webhooks/calcom.js` — all present. |
| 12 | `functions/README.md` exists with env var list | ✅ | Present. Documents all 6 required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY, APOLLO_API_KEY, CALCOM_WEBHOOK_SECRET, PAGES_DEPLOY_HOOK_URL. |
| 13 | HTML source comments in base.njk | ✅ | Three comment lines present in `<head>`: `dreamborn.ai — built by Quinn`, `stack: eleventy + cloudflare pages...`, `you're looking at a live AI-native company`. |
| 14 | SUPABASE_SERVICE_ROLE_KEY used in all functions (never anon key for writes) | ✅ | `agent-states.js`, `finn/chat.js`, `posts.js`, `webhooks/calcom.js` all use `SUPABASE_SERVICE_ROLE_KEY`. `finn/visitor.js` makes no Supabase calls — it is a pure Cloudflare metadata classification with no DB writes. |

---

## Issues Found + Fixed

### Missing page templates (critical fix applied)

The following Eleventy page templates were missing from `src/` and were created as part of this task:

- `src/index.njk` — Homepage (`/`)
- `src/work/index.njk` — Work page (`/work`)
- `src/system/index.njk` — System page (`/system`)
- `src/connect/index.njk` — Connect page (`/connect`)

Without these, a fresh build produced only 1 HTML file (`/thinking/index.html`). After creating all 4 templates, the build produces 5 pages (all except `/thinking/[slug]` which requires live DB data).

---

## Build Command Output

```
[featured_posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning []
[posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning []
[thinking] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning empty data
[11ty] Writing ./_site/index.html from ./src/index.njk
[11ty] Writing ./_site/connect/index.html from ./src/connect/index.njk
[11ty] Writing ./_site/work/index.html from ./src/work/index.njk
[11ty] Writing ./_site/system/index.html from ./src/system/index.njk
[11ty] Writing ./_site/thinking/index.html from ./src/thinking/index.njk
[11ty] Copied 16 Wrote 5 files in 0.16 seconds (v3.1.5)
```

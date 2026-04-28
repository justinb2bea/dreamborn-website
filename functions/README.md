# Cloudflare Pages Functions — Dreamborn Website

All server-side logic runs as Cloudflare Pages Functions in this directory. They deploy automatically alongside the Eleventy static site.

## Directory Structure

```
functions/
  _shared/
    apollo.js          — Apollo.io enrichment helper (shared by chat + calcom)
  api/
    agent-states.js    — GET /api/agent-states
    posts.js           — GET /api/posts
    finn/
      visitor.js       — GET /api/finn/visitor
      chat.js          — POST /api/finn/chat
  webhooks/
    calcom.js          — POST /api/webhooks/calcom
```

Files and directories prefixed with `_` are NOT treated as route handlers by Cloudflare Pages.

---

## Endpoints

### `GET /api/agent-states`

Returns real-time status of all Dreamborn agents (polled every 60 s by client-side JS).

- **Source:** `agent_state` table, filtered by `client_id=dreamborn`
- **Columns returned:** `agent`, `status`, `action`, `updated_at`
- **Cache:** `no-store`
- **Errors:** 502 on Supabase failure

---

### `GET /api/finn/visitor`

Classifies the visitor by country + bot score + referer to personalise the homepage hero subhead.

- **Input:** Cloudflare request metadata (no query params needed)
- **Output:** `{ audience: 'business' | 'developer' | 'unknown', subhead: string | null }`
- **Bot threshold:** score < 30 → `audience: 'unknown'`
- **No rate limiting** — read-only, no external calls at v1

---

### `POST /api/finn/chat`

Relays visitor messages to Claude API (claude-sonnet-4-6) as Finn, the Dreamborn AI agent.

- **Rate limit:** 20 req/min per IP (in-memory, per-isolate)
- **Input:** `{ messages: Array<{role,content}>, visitor_email: string|null }`
- **Validation:** messages required, max 50 items
- **Lead capture:** scans last user message for email regex. On match: upserts to `contacts`, inserts `contact_signals` (type: `finn_chat`), schedules Apollo enrichment via `context.waitUntil()`
- **Output:** `{ reply: string }`
- **Errors:** 400 bad input, 429 rate limit, 502 Claude unavailable

---

### `GET /api/posts`

Paginated post listing for the /thinking Load More button.

- **Query params:**
  - `topic=<uuid>` — optional topic filter (array contains on `topic_ids`)
  - `page=<int>` — 1-indexed (default 1)
  - `limit=<int>` — default 12, max 24
- **Source:** `content` table where `status=published`, ordered `published_at desc`
- **Output:** `{ posts, page, limit, total, has_more }`
- **Errors:** 502 on Supabase failure

---

### `POST /api/webhooks/calcom`

Receives Cal.com booking webhooks.

- **Signature:** Verifies `X-Cal-Signature-256` HMAC-SHA256 (returns 401 on failure — Cal.com will retry)
- **Events handled:** `BOOKING_CREATED` only (all others return 200 silently)
- **Actions:** upsert attendee to `contacts` (source: `calcom`), insert `calcom_booking` signal, fire-and-forget Apollo enrichment
- **Always returns 200** on DB failures so Cal.com does not retry unnecessarily

---

## Required Environment Variables

Set these as **encrypted** environment variables in the Cloudflare Pages dashboard
(**Settings → Environment Variables**). Never commit secrets to the repo.

| Variable | Used by | Description |
|---|---|---|
| `SUPABASE_URL` | All endpoints | Supabase project URL, e.g. `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | All endpoints | Service-role key — bypasses RLS. Never expose to the browser. |
| `CLAUDE_API_KEY` | `/api/finn/chat` | Anthropic API key for Claude (claude-sonnet-4-6) |
| `APOLLO_API_KEY` | `_shared/apollo.js` | Apollo.io API key for B2B contact enrichment |
| `CALCOM_WEBHOOK_SECRET` | `/api/webhooks/calcom` | Cal.com webhook signing secret for HMAC-SHA256 verification |
| `PAGES_DEPLOY_HOOK_URL` | Supabase webhook → CF Pages | Cloudflare Pages deploy hook URL — triggered on content INSERT where status=published. Set via CF Pages dashboard → Settings → Builds → Deploy hooks. |

---

## Notes

- **Apollo enrichment** is fire-and-forget (`context.waitUntil`). Failure is silent and does not affect user-facing responses.
- **Rate limiting** in `finn/chat.js` is per-isolate. Cloudflare may spin up multiple isolates — rate limit is not globally enforced. Acceptable for v1.
- **Cal.com retries:** Only 401 (bad signature) causes Cal.com to retry. DB failures return 200 — idempotent upserts handle duplicates.

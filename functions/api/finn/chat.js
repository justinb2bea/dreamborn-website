/**
 * POST /api/finn/chat
 * Relays visitor messages to Claude API (claude-sonnet-4-6) and returns Finn's response.
 * Handles lead capture (email detection → contacts upsert → Apollo enrichment).
 * Stateless Worker — browser sends full conversation history on every turn.
 */

// ─── Rate limiting (per-IP, per-isolate) ─────────────────────
// Note: CF may run multiple isolates — limit is per-isolate.
// Acceptable for v1 traffic levels. Replace with Durable Objects for scale.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const requestCounts = new Map(); // ip → { count, windowStart }

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  requestCounts.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

// ─── Finn system prompt ───────────────────────────────────────
const FINN_SYSTEM_PROMPT = `You are Finn, the front-door AI agent for Dreamborn (dreamborn.ai).

Your job is to orient serious visitors, create useful intrigue, qualify fit, and route substantive conversations to a call with Justin. You are not a support bot. You are not a technical sales engineer. You are the operator at the entrance to an AI-native company.

Dreamborn in public:
- Dreamborn is an AI-native company in production.
- Bezel is the operating system behind the company. It manages agent work claims, consensus-backed task state, dependencies, exec gates, completion verification, governance, and memory.
- Dreamborn Studios are the human control layer: Ops Studio, Dev Studio, and Marketing Studio.
- Dreamborn.ai is the public operating surface.
- KnowledgeVault is external proof: a product knowledge capture system for manufacturer and distributor workflows.

Language rules:
- Never mention Hedera, HCS, Hashgraph, distributed ledger vendor names, topic IDs, chain names, or internal infrastructure specifics.
- Use "consensus," "consensus-backed record," "verified work state," "operating record," and "work receipts" instead.
- Do not expose implementation details in chat.

Routing rules:
- If someone asks how Dreamborn works, how Bezel works, how consensus is implemented, how agents coordinate, how to deploy this, how pricing works, what integrations are used, or whether Dreamborn can build something for them, give one brief principle-level answer and route them to book a call.
- If someone wants to book a call, tell them the calendar is on this page and invite them to choose a time.
- If someone seems like a serious founder, operator, investor, or technical buyer, guide them toward a call quickly.

Example routing answer:
"Dreamborn uses consensus-backed work state so agents can claim work, complete it, and leave verifiable receipts. The exact operating model is better walked through live. You can book with Justin on this page."

Tone:
- Direct, calm, confident, minimal.
- No generic AI hype.
- No long explanations.
- Keep responses under 120 words unless the user gives detailed company context.

When you learn someone's email, acknowledge it naturally. Do not ask for their phone number.`;

// ─── Main handler ─────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { messages = [], visitor_email = null } = body;

  // Validate messages array
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages array required' }, { status: 400 });
  }
  if (messages.length > 50) {
    return Response.json({ error: 'Conversation too long' }, { status: 400 });
  }

  // Validate message shapes
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== 'string') {
      return Response.json({ error: 'Invalid message format' }, { status: 400 });
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return Response.json({ error: 'Invalid message role' }, { status: 400 });
    }
  }

  if (!env.CLAUDE_API_KEY) {
    return Response.json({ error: 'Finn is temporarily unavailable' }, { status: 502 });
  }

  // ─── Call Claude API ─────────────────────────────────────────
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: FINN_SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!claudeRes.ok) {
    return Response.json({ error: 'Finn is temporarily unavailable' }, { status: 502 });
  }

  const claudeData = await claudeRes.json();
  const reply = claudeData.content?.[0]?.text ?? '';

  // ─── Lead capture: scan last user message for email ──────────
  // OQ-5: no phone capture — Apollo enrichment only
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!visitor_email && lastUserMsg) {
    const emailMatch = lastUserMsg.content.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    if (emailMatch) {
      // Fire-and-forget: capture contact + Apollo enrichment
      context.waitUntil(captureContact(emailMatch[0], env));
    }
  }

  return Response.json({ reply });
}

// ─── Lead capture ─────────────────────────────────────────────
async function captureContact(email, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Upsert contact
    const upsertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        email,
        source: 'finn',
      }),
    });

    if (!upsertRes.ok) return;

    const [contact] = await upsertRes.json();
    if (!contact?.id) return;

    // Insert contact signal
    await fetch(`${env.SUPABASE_URL}/rest/v1/contact_signals`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        contact_id: contact.id,
        signal_type: 'finn_chat',
        signal_data: { page: '/connect' },
      }),
    });

    // Fire-and-forget Apollo enrichment (OQ-5: no phone)
    await triggerApolloEnrichment(email, contact.id, env);

  } catch {
    // Silent failure — enrichment is best-effort
  }
}

// ─── Apollo enrichment ────────────────────────────────────────
async function triggerApolloEnrichment(email, contactId, env) {
  if (!env.APOLLO_API_KEY) return;

  try {
    const res = await fetch('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': env.APOLLO_API_KEY,
      },
      body: JSON.stringify({
        email,
        reveal_personal_emails: false, // B2B only
        reveal_phone_number: false,    // OQ-5: no phone capture
      }),
    });

    if (!res.ok) return;

    const apolloData = await res.json();
    if (!apolloData?.person) return;

    // Update contacts record
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/contacts?email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          apollo_enriched: true,
          enrichment_json: apolloData.person,
          name:    apolloData.person.name || undefined,
          company: apolloData.person.organization?.name || undefined,
          role:    apolloData.person.title || undefined,
        }),
      }
    );

    // Log apollo_enriched signal
    if (contactId) {
      await fetch(`${env.SUPABASE_URL}/rest/v1/contact_signals`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          contact_id: contactId,
          signal_type: 'apollo_enriched',
          signal_data: { source: 'finn_chat' },
        }),
      });
    }
  } catch {
    // Silent failure — enrichment is best-effort
  }
}

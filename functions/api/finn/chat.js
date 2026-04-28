/**
 * POST /api/finn/chat
 *
 * Relays visitor messages to Claude API (claude-sonnet-4-6) and returns Finn's response.
 * Handles per-IP rate limiting, lead capture (email detection → contacts upsert),
 * and fire-and-forget Apollo enrichment.
 *
 * Env vars: CLAUDE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APOLLO_API_KEY
 *
 * Input:  { messages: Array<{role,content}>, visitor_email: string|null }
 * Output: { reply: string }
 */

import { triggerApolloEnrichment } from '../../_shared/apollo.js';

// ─── Finn system prompt ────────────────────────────────────────────────────
const FINN_SYSTEM_PROMPT = `You are Finn, an AI agent for Dreamborn (dreamborn.ai). Your role is to qualify inbound leads, answer questions about Dreamborn's services, and guide interested visitors toward booking a call.

Dreamborn builds AI-native systems: agent workflows, CRM automation, and the infrastructure to run them. The website (dreamborn.ai) demonstrates this — you are running live as an example.

Be direct. Do not over-explain. If someone wants to book a call, help them book one. The Cal.com widget is on this same page.

When you learn someone's email, acknowledge it naturally. Do not ask for their phone number.

Keep responses under 150 words unless the question requires more detail.`;

// ─── Per-IP rate limiting ──────────────────────────────────────────────────
// In-memory Map — resets per isolate. Acceptable for v1 traffic.
// For production scale, replace with Durable Objects or KV.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const requestCounts = new Map(); // ip → { count, windowStart }

function checkRateLimit(ip) {
  const now   = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count       = 0;
    entry.windowStart = now;
  }
  entry.count++;
  requestCounts.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

// ─── Contact capture helper ────────────────────────────────────────────────
async function captureContact(email, env, context) {
  try {
    // Upsert to contacts (source='finn')
    const upsertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ email, source: 'finn' }),
    });

    if (!upsertRes.ok) return;

    const contacts = await upsertRes.json();
    const contactId = Array.isArray(contacts) ? contacts[0]?.id : contacts?.id;
    if (!contactId) return;

    // Insert finn_chat signal
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
        signal_type: 'finn_chat',
        signal_data: { page: '/connect' },
      }),
    });

    // Fire-and-forget Apollo enrichment — runs after response is sent
    context.waitUntil(triggerApolloEnrichment(email, env));
  } catch {
    // Silent failure — don't block the Finn reply
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env, context }) {
  // Rate limit check
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { messages = [], visitor_email = null } = body;

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages array required' }, { status: 400 });
  }
  if (messages.length > 50) {
    return Response.json({ error: 'Conversation too long' }, { status: 400 });
  }

  // Call Claude API
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
  const reply      = claudeData.content?.[0]?.text ?? '';

  // Lead capture: scan last user message for email address
  if (!visitor_email) {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      const emailMatch = lastUserMsg.content.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      );
      if (emailMatch) {
        // captureContact handles Supabase upsert + signal + schedules Apollo via context.waitUntil
        await captureContact(emailMatch[0], env, context);
      }
    }
  }

  return Response.json({ reply });
}

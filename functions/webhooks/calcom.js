/**
 * POST /api/webhooks/calcom
 *
 * Receives Cal.com booking events, verifies HMAC-SHA256 signature, upserts
 * the attendee to contacts, logs a contact_signal, and fires Apollo enrichment.
 *
 * Always returns 200 on success so Cal.com does not retry on DB failures.
 * Returns 401 only for invalid signatures (Cal.com will retry).
 *
 * Env vars: CALCOM_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APOLLO_API_KEY
 */

import { triggerApolloEnrichment } from '../_shared/apollo.js';

// ─── Signature verification ────────────────────────────────────────────────
async function verifyCalcomSignature(body, signature, secret) {
  if (!signature || !secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected =
    'sha256=' +
    Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

  return expected === signature;
}

// ─── Handler ───────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env, context }) {
  const signature = request.headers.get('X-Cal-Signature-256') || '';
  const rawBody   = await request.text();

  // Verify HMAC-SHA256 signature — invalid sigs get 401 so Cal.com retries
  const valid = await verifyCalcomSignature(rawBody, signature, env.CALCOM_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // Malformed JSON — return 200 so Cal.com doesn't retry
    console.error('[calcom] Failed to parse webhook body');
    return new Response('OK', { status: 200 });
  }

  // Only handle BOOKING_CREATED — silently ignore everything else
  if (body.triggerEvent !== 'BOOKING_CREATED') {
    return new Response('OK', { status: 200 });
  }

  const attendee = body.payload?.attendees?.[0];
  if (!attendee?.email) {
    return new Response('OK', { status: 200 });
  }

  const supabaseHeaders = {
    apikey:        env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Upsert attendee to contacts (source: 'calcom')
    const upsertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        email:  attendee.email,
        name:   attendee.name || null,
        source: 'calcom',
      }),
    });

    if (upsertRes.ok) {
      const contacts  = await upsertRes.json();
      const contactId = Array.isArray(contacts) ? contacts[0]?.id : contacts?.id;

      if (contactId) {
        // Insert calcom_booking signal
        await fetch(`${env.SUPABASE_URL}/rest/v1/contact_signals`, {
          method: 'POST',
          headers: {
            ...supabaseHeaders,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            contact_id:  contactId,
            signal_type: 'calcom_booking',
            signal_data: {
              booking_title: body.payload?.title || null,
              start_time:    body.payload?.startTime || null,
            },
          }),
        });
      }
    } else {
      console.error('[calcom] contacts upsert failed', await upsertRes.text());
    }
  } catch (err) {
    // Log but do NOT let DB failures cause a non-200 — idempotent upsert handles duplicates
    console.error('[calcom] Supabase error:', err.message);
  }

  // Fire-and-forget Apollo enrichment — runs after response is sent
  context.waitUntil(triggerApolloEnrichment(attendee.email, env));

  return new Response('OK', { status: 200 });
}

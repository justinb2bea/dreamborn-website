/**
 * POST /api/webhooks/calcom
 * Receives Cal.com booking events.
 * Verifies HMAC-SHA256 signature, upserts to contacts/contact_signals,
 * triggers async Apollo enrichment.
 */

// ─── Signature verification ───────────────────────────────────
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

// ─── Main handler ─────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  const signature = request.headers.get('X-Cal-Signature-256') || '';
  const rawBody   = await request.text();

  // Verify webhook signature
  const valid = await verifyCalcomSignature(rawBody, signature, env.CALCOM_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // Only handle BOOKING_CREATED — silently ignore other events
  if (body.triggerEvent !== 'BOOKING_CREATED') {
    return new Response('OK', { status: 200 });
  }

  const attendee = body.payload?.attendees?.[0];
  if (!attendee?.email) {
    return new Response('Bad Request', { status: 400 });
  }

  const email = attendee.email;
  const name  = attendee.name || null;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    // DB not configured — log and return 200 (don't make Cal.com retry)
    console.error('[calcom webhook] Supabase env vars not set');
    return new Response('OK', { status: 200 });
  }

  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Upsert contact (idempotent — email unique constraint)
    const upsertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        email,
        name,
        source: 'calcom',
      }),
    });

    if (upsertRes.ok) {
      const [contact] = await upsertRes.json();

      if (contact?.id) {
        // Insert contact signal — booking event
        await fetch(`${env.SUPABASE_URL}/rest/v1/contact_signals`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({
            contact_id: contact.id,
            signal_type: 'calcom_booking',
            signal_data: {
              title:      body.payload?.title || null,
              start_time: body.payload?.startTime || null,
            },
          }),
        });

        // Fire-and-forget Apollo enrichment
        context.waitUntil(triggerApolloEnrichment(email, contact.id, env));
      }
    } else {
      console.error('[calcom webhook] Supabase upsert failed:', upsertRes.status);
    }
  } catch (err) {
    // Log error, still return 200 — idempotent upsert handles duplicates
    // Don't let DB failures cause Cal.com to retry endlessly
    console.error('[calcom webhook] Error:', err.message);
  }

  return new Response('OK', { status: 200 });
}

// ─── Apollo enrichment (fire-and-forget) ─────────────────────
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
        reveal_personal_emails: false,
        reveal_phone_number: false, // OQ-5: no phone capture
      }),
    });

    if (!res.ok) return;

    const apolloData = await res.json();
    if (!apolloData?.person) return;

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
        signal_data: { source: 'calcom_booking' },
      }),
    });
  } catch {
    // Silent failure
  }
}

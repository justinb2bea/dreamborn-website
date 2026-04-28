/**
 * Apollo.io enrichment helper — shared by finn/chat.js and webhooks/calcom.js.
 * Fire-and-forget: silent failure on any error.
 *
 * Env vars required: APOLLO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export async function triggerApolloEnrichment(email, env) {
  try {
    // Step 1: Hit Apollo Person Match API
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
        reveal_phone_number: false,     // OQ-5: no phone capture
      }),
    });

    if (!res.ok) return; // silent failure

    const apolloData = await res.json();
    if (!apolloData?.person) return;

    // Step 2: PATCH contacts record with enrichment data
    const person = apolloData.person;
    const patchPayload = {
      apollo_enriched: true,
      enrichment_json: person,
    };
    if (person.name)                    patchPayload.name    = person.name;
    if (person.organization?.name)      patchPayload.company = person.organization.name;
    if (person.title)                   patchPayload.role    = person.title;

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
        body: JSON.stringify(patchPayload),
      }
    );

    // Step 3: Fetch contact ID, then insert apollo_enriched signal
    const contactRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/contacts?email=eq.${encodeURIComponent(email)}&select=id`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const contacts = await contactRes.json();
    const contactId = contacts?.[0]?.id;
    if (!contactId) return;

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
        signal_data: {},
      }),
    });
  } catch {
    // Silent failure — enrichment is best-effort
  }
}

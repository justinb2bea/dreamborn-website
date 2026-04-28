/**
 * GET /api/agent-states
 *
 * Returns real-time status of all Dreamborn agents from the agent_state table.
 * Polled every 60 s by client-side agent-status.js on /, /work, and /system.
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export async function onRequestGet({ env }) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/agent_state?client_id=eq.dreamborn&select=agent,status,action,updated_at`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch agent states' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

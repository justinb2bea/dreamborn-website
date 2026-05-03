/**
 * GET /api/agent-states
 * Returns current status of all Dreamborn agents from the agent_state table.
 * Filters by client_id='dreamborn'.
 * Uses service-role key — browser never touches Supabase directly.
 */
export async function onRequestGet({ env }) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Service not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

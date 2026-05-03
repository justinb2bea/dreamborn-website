/**
 * GET /api/finn/transcripts
 * Protected JSON export for Finn transcript mining.
 *
 * Requires:
 *   Authorization: Bearer $FINN_ANALYTICS_TOKEN
 */

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.FINN_ANALYTICS_TOKEN) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.FINN_ANALYTICS_TOKEN}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Transcript storage unavailable' }, { status: 503 });
  }

  const url = new URL(request.url);
  const limit = clampInteger(url.searchParams.get('limit'), 1, 100, 50);
  const sessionId = url.searchParams.get('session_id');
  const email = url.searchParams.get('email');

  const params = new URLSearchParams({
    select: [
      'id',
      'session_id',
      'visitor_email',
      'page_path',
      'referrer',
      'turn_count',
      'last_user_message',
      'reply',
      'messages',
      'metadata',
      'created_at',
    ].join(','),
    order: 'created_at.desc',
    limit: String(limit),
  });

  if (sessionId) params.set('session_id', `eq.${sessionId}`);
  if (email) params.set('visitor_email', `eq.${email.toLowerCase()}`);

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/finn_chat_transcripts?${params}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return Response.json({ error: 'Transcript query failed' }, { status: 502 });
  }

  return Response.json({ transcripts: await res.json() });
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

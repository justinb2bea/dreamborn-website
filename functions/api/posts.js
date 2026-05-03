/**
 * GET /api/posts
 * Paginated post listing for /thinking Load More.
 *
 * Query params:
 *   topic=<uuid>   optional — filter by topic_taxonomy.id
 *   page=<int>     required — 1-indexed (default 1)
 *   limit=<int>    optional — default 12, max 24
 */
export async function onRequestGet({ request, env }) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Service not configured' }, { status: 503 });
  }

  const url    = new URL(request.url);
  const topic  = url.searchParams.get('topic') || null;
  const page   = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit  = Math.min(24, Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10)));
  const offset = (page - 1) * limit;

  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Build filter string
  let filter = 'status=eq.published';
  if (topic) {
    // array contains operator: topic_ids @> ARRAY[topic]
    filter += `&topic_ids=cs.{"${topic}"}`;
  }

  // Get total count
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/content?${filter}&select=count`,
    {
      headers: {
        ...headers,
        Prefer: 'count=exact',
      },
    }
  );

  const contentRange = countRes.headers.get('Content-Range') || '';
  const total = parseInt(contentRange.split('/')[1] || '0', 10);

  // Get page of posts
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/content?${filter}&select=id,title,slug,excerpt,author,topic_ids,published_at&order=published_at.desc&limit=${limit}&offset=${offset}`,
    { headers }
  );

  if (!res.ok) {
    return Response.json({ error: 'Failed to fetch posts' }, { status: 502 });
  }

  const posts = await res.json();

  return Response.json({
    posts,
    page,
    limit,
    total,
    has_more: offset + limit < total,
  });
}

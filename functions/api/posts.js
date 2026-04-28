/**
 * GET /api/posts
 *
 * Paginated post listing for the /thinking Load More button.
 * Returns posts from the content table where status=published,
 * ordered by published_at desc.
 *
 * Query params:
 *   topic=<uuid>   optional — filter by topic_taxonomy.id (array contains)
 *   page=<int>     1-indexed page number (default 1)
 *   limit=<int>    posts per page (default 12, max 24)
 *
 * Output: { posts, page, limit, total, has_more }
 *
 * Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url);
  const topic  = url.searchParams.get('topic') || null;
  const page   = Math.max(1, parseInt(url.searchParams.get('page')  || '1',  10));
  const limit  = Math.min(24, Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10)));
  const offset = (page - 1) * limit;

  const supabaseHeaders = {
    apikey:        env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Build Supabase filter string
  let filter = 'status=eq.published';
  if (topic) filter += `&topic_ids=cs.{"${topic}"}`; // @> array contains operator

  // Fetch total count via Content-Range header
  const countRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/content?${filter}&select=count`,
    {
      headers: {
        ...supabaseHeaders,
        Prefer: 'count=exact',
      },
    }
  );
  const total = parseInt(
    countRes.headers.get('Content-Range')?.split('/')[1] || '0',
    10
  );

  // Fetch the page of posts
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/content?${filter}` +
    `&select=id,title,slug,excerpt,author,topic_ids,published_at` +
    `&order=published_at.desc` +
    `&limit=${limit}&offset=${offset}`,
    { headers: supabaseHeaders }
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

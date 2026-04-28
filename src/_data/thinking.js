/**
 * thinking.js — Eleventy data file
 * Fetch initial 12 published posts (date-desc) + all topic_taxonomy rows.
 * Returns { initial_posts: [], topics: [] } on failure.
 */
module.exports = async function () {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  // Graceful degradation for local dev without Supabase credentials
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[thinking] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning empty data');
    return { initial_posts: [], topics: [] };
  }

  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };

  try {
    const [postsRes, topicsRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/content?status=eq.published&select=id,title,slug,excerpt,author,topic_ids,published_at&order=published_at.desc&limit=12`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/topic_taxonomy?select=*&order=sort_order.asc`,
        { headers }
      ),
    ]);

    if (!postsRes.ok) {
      console.warn(`[thinking] posts fetch failed: ${postsRes.status} ${postsRes.statusText}`);
    }
    if (!topicsRes.ok) {
      console.warn(`[thinking] topics fetch failed: ${topicsRes.status} ${topicsRes.statusText}`);
    }

    const initial_posts = postsRes.ok ? await postsRes.json() : [];
    const topics        = topicsRes.ok ? await topicsRes.json() : [];

    return { initial_posts, topics };
  } catch (err) {
    console.warn('[thinking] fetch error:', err.message);
    return { initial_posts: [], topics: [] };
  }
};

/**
 * Build-time data: initial 12 posts + all topic taxonomy for /thinking page.
 */
module.exports = async function () {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  if (!url || !key) {
    console.warn("[thinking] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning empty data");
    return { initial_posts: [], topics: [] };
  }

  try {
    const [postsRes, topicsRes] = await Promise.all([
      fetch(
        `${url}/rest/v1/content?status=eq.published&select=id,title,slug,excerpt,author,topic_ids,published_at&order=published_at.desc&limit=12`,
        { headers }
      ),
      fetch(
        `${url}/rest/v1/topic_taxonomy?select=*&order=sort_order.asc`,
        { headers }
      ),
    ]);

    const initial_posts = postsRes.ok ? await postsRes.json() : [];
    const topics = topicsRes.ok ? await topicsRes.json() : [];

    return { initial_posts, topics };
  } catch (err) {
    console.warn("[thinking] Fetch error:", err.message);
    return { initial_posts: [], topics: [] };
  }
};

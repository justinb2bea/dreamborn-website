/**
 * Build-time data: 3 most recent published posts for homepage featured strip.
 * Falls back to top 3 from local_posts.js when Supabase is unreachable.
 */
module.exports = async function () {
  const local = require('./local_posts.js');
  const fallback = local.posts.slice(0, 3);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("[featured_posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — using local fallback");
    return fallback;
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/content?status=eq.published&select=id,title,slug,excerpt,author,topic_ids,published_at&order=published_at.desc&limit=3`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    );

    if (!res.ok) {
      console.warn(`[featured_posts] Supabase returned ${res.status} — using local fallback`);
      return fallback;
    }

    const posts = await res.json();
    return posts.length >= 3 ? posts : fallback;
  } catch (err) {
    console.warn("[featured_posts] Fetch error:", err.message, "— using local fallback");
    return fallback;
  }
};

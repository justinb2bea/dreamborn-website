/**
 * featured_posts.js — Eleventy data file
 * Fetch the 3 most recent published posts from Supabase at build time.
 * Returns [] if fewer than 3 published posts exist (featured strip is hidden).
 */
module.exports = async function () {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  // Graceful degradation for local dev without Supabase credentials
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[featured_posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning []');
    return [];
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/content?status=eq.published&select=id,title,slug,excerpt,author,topic_ids,published_at&order=published_at.desc&limit=3`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.warn(`[featured_posts] Supabase fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const posts = await res.json();
    // Only return posts if we have at least 3 — featured strip is hidden otherwise
    return posts.length >= 3 ? posts : [];
  } catch (err) {
    console.warn('[featured_posts] fetch error:', err.message);
    return [];
  }
};

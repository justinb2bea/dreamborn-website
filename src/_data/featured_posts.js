/**
 * Build-time data: 3 most recent published posts for homepage featured strip.
 * Returns [] if fewer than 3 published posts exist.
 */
module.exports = async function () {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("[featured_posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning []");
    return [];
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
      console.warn(`[featured_posts] Supabase returned ${res.status} — returning []`);
      return [];
    }

    const posts = await res.json();
    // Only show strip if at least 3 posts exist
    return posts.length >= 3 ? posts : [];
  } catch (err) {
    console.warn("[featured_posts] Fetch error:", err.message);
    return [];
  }
};

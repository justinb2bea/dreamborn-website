/**
 * posts.js — Eleventy data file
 * Fetch all published posts for Eleventy pagination on /thinking/[slug].
 * Returns [] on failure — no slug pages will be generated if Supabase is unavailable.
 */
module.exports = async function () {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  // Graceful degradation for local dev without Supabase credentials
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning []');
    return [];
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/content?status=eq.published&select=*&order=published_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!res.ok) {
      console.warn(`[posts] Supabase fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    return await res.json();
  } catch (err) {
    console.warn('[posts] fetch error:', err.message);
    return [];
  }
};

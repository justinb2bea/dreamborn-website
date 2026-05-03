/**
 * Build-time data: all published posts for individual slug page generation.
 * Used by Eleventy pagination to create /thinking/[slug]/ pages.
 */
module.exports = async function () {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("[posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning []");
    return [];
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/content?status=eq.published&select=*&order=published_at.desc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    );

    if (!res.ok) {
      console.warn(`[posts] Supabase returned ${res.status} — returning []`);
      return [];
    }

    return await res.json();
  } catch (err) {
    console.warn("[posts] Fetch error:", err.message);
    return [];
  }
};

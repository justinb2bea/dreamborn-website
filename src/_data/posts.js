/**
 * Build-time data: all published posts for individual slug page generation.
 * Used by Eleventy pagination to create /thinking/[slug]/ pages.
 */
module.exports = async function () {
  const local = require('./local_posts.js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("[posts] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning []");
    return local.posts;
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

    const remotePosts = await res.json();
    return mergePosts(local.posts, remotePosts);
  } catch (err) {
    console.warn("[posts] Fetch error:", err.message);
    return local.posts;
  }
};

function mergePosts(localPosts, remotePosts) {
  const bySlug = new Map();
  [...localPosts, ...remotePosts].forEach((post) => {
    if (post && post.slug) bySlug.set(post.slug, normalizePost(post));
  });
  return [...bySlug.values()].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

function normalizePost(post) {
  if (post.author === 'Dreamborn') {
    return { ...post, author: 'Justin King' };
  }
  return post;
}

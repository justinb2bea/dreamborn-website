/**
 * Build-time data: initial 12 posts + all topic taxonomy for /thinking page.
 */
module.exports = async function () {
  const local = require('./local_posts.js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  if (!url || !key) {
    console.warn("[thinking] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — returning empty data");
    return { initial_posts: local.posts.slice(0, 12), topics: local.topics };
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

    const remotePosts = postsRes.ok ? await postsRes.json() : [];
    const remoteTopics = topicsRes.ok ? await topicsRes.json() : [];
    const initial_posts = mergePosts(local.posts, remotePosts).slice(0, 12);
    const topics = mergeTopics(local.topics, remoteTopics);

    return { initial_posts, topics };
  } catch (err) {
    console.warn("[thinking] Fetch error:", err.message);
    return { initial_posts: local.posts.slice(0, 12), topics: local.topics };
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

function mergeTopics(localTopics, remoteTopics) {
  const byId = new Map();
  [...localTopics, ...remoteTopics].forEach((topic) => {
    if (topic && topic.id) byId.set(topic.id, topic);
  });
  return [...byId.values()].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

module.exports = function(eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("public");

  // Format an ISO date string as "Mon d, yyyy" (e.g. "Apr 28, 2026")
  eleventyConfig.addFilter("formatDate", function (dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  // Calculate reading time from body_html.
  // Strips HTML tags, counts words, returns Math.ceil(wordCount / 200) — minimum 1.
  eleventyConfig.addFilter("readingTime", function (html) {
    if (!html) return 1;
    const text = html.replace(/<[^>]+>/g, ' ');
    const words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; });
    return Math.ceil(words.length / 200) || 1;
  });

  // Return up to `limit` posts from the same topic as currentPost, excluding currentPost.
  // Usage in Nunjucks: {% set related = posts | relatedPosts(post, 3) %}
  eleventyConfig.addFilter("relatedPosts", function (allPosts, currentPost, limit) {
    if (!allPosts || !currentPost) return [];
    const n = typeof limit === 'number' ? limit : 3;
    const currentTopics = currentPost.topic_ids || [];
    if (!currentTopics.length) return [];
    return allPosts
      .filter(function (p) {
        if (p.slug === currentPost.slug) return false;
        return (p.topic_ids || []).some(function (t) { return currentTopics.includes(t); });
      })
      .slice(0, n);
  });

  return {
    dir: {
      input:    "src",
      output:   "_site",
      includes: "_includes",
      layouts:  "_layouts",
      data:     "_data",
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};

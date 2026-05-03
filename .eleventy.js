const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // Passthrough copies
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy({ "public/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "public/css": "css" });
  eleventyConfig.addPassthroughCopy({ "public/js": "js" });
  eleventyConfig.addPassthroughCopy({ "public/img": "img" });

  // Watch targets
  eleventyConfig.addWatchTarget("public/css/");
  eleventyConfig.addWatchTarget("public/js/");
  eleventyConfig.addWatchTarget("public/img/");

  // Filters
  eleventyConfig.addFilter("dateFormat", (date, fmt = "MMMM d, yyyy") => {
    if (!date) return "";
    return DateTime.fromISO(date).toFormat(fmt);
  });

  eleventyConfig.addFilter("readingTime", (html) => {
    if (!html) return "1 min read";
    const stripped = html.replace(/<[^>]+>/g, " ");
    const words = stripped.trim().split(/\s+/).length;
    const mins = Math.ceil(words / 200);
    return `${mins} min read`;
  });

  eleventyConfig.addFilter("timeAgo", (dateStr) => {
    if (!dateStr) return "";
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    const d = new Date(dateStr);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  });

  eleventyConfig.addFilter("json", (val) => JSON.stringify(val));

  // Collections: all posts (used for pagination)
  eleventyConfig.addCollection("posts", function(collectionApi) {
    // This collection is populated from src/_data/posts.js at build time
    return [];
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: "/",
  };
};

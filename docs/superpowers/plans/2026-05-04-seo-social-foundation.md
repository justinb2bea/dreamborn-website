# Dreamborn SEO and Social Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete SEO, social sharing, schema, sitemap, robots, feed, manifest, and verification layer to the existing small Dreamborn Eleventy site.

**Architecture:** Keep the implementation static and centralized. Page/post front matter and `src/_data/site.js` feed one reusable `src/_includes/seo.njk` include, while generated Eleventy templates produce crawl/feed files and a single Node test file verifies built output.

**Tech Stack:** Eleventy 2, Nunjucks, Node test runner, Node filesystem/path/assert modules, static assets under `public/img/social/`.

---

## File Structure

- Create: `src/_data/site.js`
  - Owns site-wide metadata defaults, public URL helpers, social image paths, author identity, and official profile links.
- Create: `src/_includes/seo.njk`
  - Owns all `<head>` SEO/social tags and JSON-LD rendering.
- Modify: `src/_layouts/base.njk`
  - Removes inline SEO tags and includes `seo.njk`.
- Modify: page front matter in:
  - `src/index.njk`
  - `src/explainer/index.njk`
  - `src/work/index.njk`
  - `src/system/index.njk`
  - `src/live/index.njk`
  - `src/thinking/index.njk`
  - `src/thinking/post.njk`
  - `src/justin/index.njk`
  - `src/connect/index.njk`
- Create: `src/sitemap.xml.njk`
  - Generates `/sitemap.xml`.
- Create: `src/robots.txt.njk`
  - Generates `/robots.txt`.
- Create: `src/feed.xml.njk`
  - Generates `/feed.xml`.
- Create: `src/feed.json.njk`
  - Generates `/feed.json`.
- Create: `src/manifest.webmanifest.njk`
  - Generates `/manifest.webmanifest`.
- Create: `public/img/social/*.svg`
  - Static 1200x630 social cards. Use SVG assets because they are readable, local, versioned, and require no runtime image generation dependency. Each asset must declare `width="1200"` and `height="630"`.
- Create: `tests/seo-social-foundation.test.mjs`
  - Builds or inspects `_site` and validates SEO/social/schema/feed output.

## Task 1: Add Failing SEO/Social Verification Tests

**Files:**
- Create: `tests/seo-social-foundation.test.mjs`

- [ ] **Step 1: Create the failing test file**

Add this file:

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const siteRoot = join(root, '_site');

function readBuilt(pathname) {
  const file = pathname === '/'
    ? join(siteRoot, 'index.html')
    : join(siteRoot, pathname.replace(/^\/|\/$/g, ''), 'index.html');
  return readFileSync(file, 'utf8');
}

function readPublic(pathname) {
  return readFileSync(join(siteRoot, pathname.replace(/^\//, '')), 'utf8');
}

function metaContent(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`);
  const match = html.match(pattern);
  return match ? match[1] : '';
}

function linkHref(html, rel) {
  const pattern = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]+href=["']([^"']+)["'][^>]*>`);
  const match = html.match(pattern);
  return match ? match[1] : '';
}

function jsonLdBlocks(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  return blocks.map((block) => JSON.parse(block[1]));
}

function localSocialImageExists(imageUrl) {
  if (!imageUrl.startsWith('https://dreamborn.ai/')) return false;
  const pathname = new URL(imageUrl).pathname.replace(/^\//, '');
  return existsSync(join(siteRoot, pathname));
}

const corePages = [
  ['/', 'website'],
  ['/explainer/', 'website'],
  ['/work/', 'website'],
  ['/system/', 'website'],
  ['/live/', 'website'],
  ['/thinking/', 'website'],
  ['/justin/', 'profile'],
  ['/connect/', 'website'],
];

test('core pages emit complete SEO and social metadata', () => {
  for (const [pathname, type] of corePages) {
    const html = readBuilt(pathname);
    assert.match(html, /<title>[^<]+<\/title>/, `${pathname} has title`);
    assert.match(html, /<meta name="description" content="[^"]+">/, `${pathname} has description`);
    assert.equal(linkHref(html, 'canonical'), `https://dreamborn.ai${pathname}`);
    assert.equal(metaContent(html, 'og:type'), type);
    assert.ok(metaContent(html, 'og:title'), `${pathname} has og:title`);
    assert.ok(metaContent(html, 'og:description'), `${pathname} has og:description`);
    assert.ok(metaContent(html, 'twitter:card'), `${pathname} has twitter card`);
    assert.ok(metaContent(html, 'twitter:image'), `${pathname} has twitter image`);
    assert.ok(localSocialImageExists(metaContent(html, 'og:image')), `${pathname} OG image exists locally`);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, `${pathname} has one canonical`);
    assert.equal((html.match(/<title>/g) || []).length, 1, `${pathname} has one title`);
    assert.ok(jsonLdBlocks(html).length >= 1, `${pathname} has JSON-LD`);
  }
});

test('thinking posts emit article metadata and article schema', () => {
  const html = readBuilt('/thinking/the-company-i-built-without-a-payroll/');
  assert.equal(metaContent(html, 'og:type'), 'article');
  assert.ok(metaContent(html, 'article:published_time'));
  assert.ok(metaContent(html, 'article:author'));
  assert.ok(metaContent(html, 'twitter:image'));
  const blocks = jsonLdBlocks(html);
  assert.ok(blocks.some((block) => block['@type'] === 'Article'), 'Article JSON-LD exists');
});

test('sitemap robots and feeds are generated', () => {
  const sitemap = readPublic('/sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/dreamborn\.ai\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/dreamborn\.ai\/thinking\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/dreamborn\.ai\/thinking\/the-company-i-built-without-a-payroll\/<\/loc>/);

  const robots = readPublic('/robots.txt');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/dreamborn\.ai\/sitemap\.xml/);

  const rss = readPublic('/feed.xml');
  assert.match(rss, /<rss version="2\.0"/);
  assert.match(rss, /The company I built without a payroll/);

  const jsonFeed = JSON.parse(readPublic('/feed.json'));
  assert.equal(jsonFeed.version, 'https://jsonfeed.org/version/1.1');
  assert.ok(jsonFeed.items.some((item) => item.url === 'https://dreamborn.ai/thinking/the-company-i-built-without-a-payroll/'));
});
```

- [ ] **Step 2: Run tests and verify they fail before implementation**

Run:

```bash
npm run build
npm test
```

Expected: `npm run build` succeeds, and `npm test` fails because the new metadata, social images, sitemap, robots, feed, and JSON-LD output do not exist yet.

- [ ] **Step 3: Commit the failing test**

Run:

```bash
git add tests/seo-social-foundation.test.mjs
git commit -m "test: cover seo social foundation"
```

## Task 2: Add Site Metadata and Central SEO Include

**Files:**
- Create: `src/_data/site.js`
- Create: `src/_includes/seo.njk`
- Modify: `src/_layouts/base.njk`

- [ ] **Step 1: Add site-wide metadata**

Create `src/_data/site.js`:

```js
const siteUrl = 'https://dreamborn.ai';

module.exports = {
  name: 'Dreamborn',
  title: 'Dreamborn — AI-Native Company in Production',
  description: 'Dreamborn builds AI-native operating systems, agent workflows, and verified work surfaces for companies moving beyond software as usual.',
  url: siteUrl,
  locale: 'en_US',
  themeColor: '#18100f',
  defaultImage: '/img/social/dreamborn-default.svg',
  defaultImageAlt: 'Dreamborn wordmark over an AI-native operating surface.',
  twitterHandle: '@justinking',
  sameAs: [
    'https://twitter.com/justinking',
  ],
  author: {
    name: 'Justin King',
    url: `${siteUrl}/justin/`,
    image: `${siteUrl}/img/authors/JustinKingProfile.jpeg`,
    twitter: '@justinking',
  },
  socialImages: {
    home: '/img/social/dreamborn-default.svg',
    explainer: '/img/social/dreamborn-explainer.svg',
    work: '/img/social/dreamborn-work.svg',
    system: '/img/social/dreamborn-system.svg',
    live: '/img/social/dreamborn-live.svg',
    thinking: '/img/social/dreamborn-thinking.svg',
    article: '/img/social/dreamborn-article.svg',
    justin: '/img/social/dreamborn-justin.svg',
    connect: '/img/social/dreamborn-connect.svg',
  },
};
```

- [ ] **Step 2: Add the SEO include**

Create `src/_includes/seo.njk`:

```njk
{% set pageTitle = seoTitle or title or site.title %}
{% if pageTitle == site.title %}
  {% set fullTitle = pageTitle %}
{% else %}
  {% set fullTitle = pageTitle ~ ' — Dreamborn' %}
{% endif %}
{% set pageDescription = description or site.description %}
{% set socialTitleValue = socialTitle or pageTitle %}
{% set socialDescriptionValue = socialDescription or pageDescription %}
{% set pageType = type or 'website' %}
{% set canonicalUrl = canonical or site.url ~ page.url %}
{% set imagePath = image or site.defaultImage %}
{% set absoluteImage = site.url ~ imagePath %}
{% set socialImageAlt = imageAlt or site.defaultImageAlt %}
{% set robotsValue = robots or 'index,follow' %}

<title>{{ fullTitle }}</title>
<meta name="description" content="{{ pageDescription }}">
<meta name="robots" content="{{ robotsValue }}">
<link rel="canonical" href="{{ canonicalUrl }}">

<meta property="og:type" content="{{ pageType }}">
<meta property="og:site_name" content="{{ site.name }}">
<meta property="og:locale" content="{{ site.locale }}">
<meta property="og:title" content="{{ socialTitleValue }}">
<meta property="og:description" content="{{ socialDescriptionValue }}">
<meta property="og:url" content="{{ canonicalUrl }}">
<meta property="og:image" content="{{ absoluteImage }}">
<meta property="og:image:alt" content="{{ socialImageAlt }}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="{{ site.twitterHandle }}">
<meta name="twitter:creator" content="{{ site.twitterHandle }}">
<meta name="twitter:title" content="{{ socialTitleValue }}">
<meta name="twitter:description" content="{{ socialDescriptionValue }}">
<meta name="twitter:image" content="{{ absoluteImage }}">
<meta name="twitter:image:alt" content="{{ socialImageAlt }}">

{% if pageType == 'article' %}
<meta property="article:published_time" content="{{ published }}">
<meta property="article:modified_time" content="{{ modified or published }}">
<meta property="article:author" content="{{ author or site.author.name }}">
{% if section %}<meta property="article:section" content="{{ section }}">{% endif %}
{% endif %}

<link rel="alternate" type="application/rss+xml" title="Dreamborn Thinking" href="{{ site.url }}/feed.xml">
<link rel="alternate" type="application/feed+json" title="Dreamborn Thinking" href="{{ site.url }}/feed.json">
<link rel="manifest" href="/manifest.webmanifest">

<script type="application/ld+json">
{{ {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": site.name,
  "url": site.url,
  "logo": site.url ~ "/img/social/dreamborn-default.svg",
  "sameAs": site.sameAs
} | json | safe }}
</script>

{% if page.url == '/' %}
<script type="application/ld+json">
{{ {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": site.name,
  "url": site.url,
  "description": site.description
} | json | safe }}
</script>
{% endif %}

{% if pageType == 'profile' %}
<script type="application/ld+json">
{{ {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": site.author.name,
  "url": site.author.url,
  "image": site.author.image,
  "sameAs": site.sameAs,
  "jobTitle": "Head AI Engineer for Agent Clusters",
  "worksFor": {
    "@type": "Organization",
    "name": site.name,
    "url": site.url
  }
} | json | safe }}
</script>
{% endif %}

{% if pageType == 'article' %}
<script type="application/ld+json">
{{ {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": socialTitleValue,
  "description": socialDescriptionValue,
  "image": absoluteImage,
  "datePublished": published,
  "dateModified": modified or published,
  "author": {
    "@type": "Person",
    "name": author or site.author.name,
    "url": site.author.url
  },
  "publisher": {
    "@type": "Organization",
    "name": site.name,
    "url": site.url,
    "logo": {
      "@type": "ImageObject",
      "url": site.url ~ "/img/social/dreamborn-default.svg"
    }
  },
  "mainEntityOfPage": canonicalUrl
} | json | safe }}
</script>
{% endif %}

{% if page.url != '/' %}
<script type="application/ld+json">
{{ {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Dreamborn",
      "item": site.url ~ "/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": pageTitle,
      "item": canonicalUrl
    }
  ]
} | json | safe }}
</script>
{% endif %}
```

- [ ] **Step 3: Replace inline head metadata in base layout**

In `src/_layouts/base.njk`, replace the existing title/description/Open Graph/canonical block with:

```njk
  {% include "seo.njk" %}
```

Keep viewport, charset, stylesheets, and favicon links in the layout.

- [ ] **Step 4: Run build to verify the include compiles**

Run:

```bash
npm run build
```

Expected: Eleventy compiles the layout and every generated page uses the new SEO include.

- [ ] **Step 5: Commit central metadata include**

Run:

```bash
git add src/_data/site.js src/_includes/seo.njk src/_layouts/base.njk
git commit -m "feat: add central seo metadata include"
```

## Task 3: Add Page and Article Metadata

**Files:**
- Modify: `src/index.njk`
- Modify: `src/explainer/index.njk`
- Modify: `src/work/index.njk`
- Modify: `src/system/index.njk`
- Modify: `src/live/index.njk`
- Modify: `src/thinking/index.njk`
- Modify: `src/thinking/post.njk`
- Modify: `src/justin/index.njk`
- Modify: `src/connect/index.njk`

- [ ] **Step 1: Update home front matter**

Set `src/index.njk` front matter to include:

```yaml
title: "What's Your AI Strategy?"
description: "Dreamborn is an AI-native company in production, with agents, receipts, and verified work moving through a live operating system."
socialTitle: "Dreamborn is an AI-native company in production"
socialDescription: "Watch the operating surface behind Dreamborn: agents, receipts, live work, and the strategy that makes it run."
image: "/img/social/dreamborn-default.svg"
imageAlt: "Dreamborn AI-native company operating surface social card."
type: "website"
section: "Company"
```

- [ ] **Step 2: Update explainer front matter**

Set `src/explainer/index.njk` front matter to include:

```yaml
title: "How Dreamborn Works"
description: "How Dreamborn builds AI-native software products with coordinated agents, verified workflows, and 24-hour product cycles."
socialTitle: "How Dreamborn Works"
socialDescription: "A plain-English guide to Dreamborn's AI-native company model, agent workflows, verification, and live operating system."
image: "/img/social/dreamborn-explainer.svg"
imageAlt: "Dreamborn explainer social card showing agent workflows and verified work."
type: "website"
section: "Explainer"
```

- [ ] **Step 3: Update work front matter**

Set `src/work/index.njk` front matter to include:

```yaml
title: "Work"
description: "Dreamborn is an AI-native company in production. These are the working systems already running the company."
socialTitle: "Dreamborn Work"
socialDescription: "See the production systems, agent-built products, and operating proof behind Dreamborn."
image: "/img/social/dreamborn-work.svg"
imageAlt: "Dreamborn work social card showing production systems and verified output."
type: "website"
section: "Work"
```

- [ ] **Step 4: Update system front matter**

Set `src/system/index.njk` front matter to include:

```yaml
title: "System"
description: "How Dreamborn coordinates AI agents, verifies work, records receipts, and keeps work moving in public."
socialTitle: "The Dreamborn System"
socialDescription: "The operating model behind Dreamborn: agent roles, verification, receipts, and human decision gates."
image: "/img/social/dreamborn-system.svg"
imageAlt: "Dreamborn system social card showing verified agent operations."
type: "website"
section: "System"
```

- [ ] **Step 5: Update live front matter**

Set `src/live/index.njk` front matter to include:

```yaml
title: "Live Workroom"
description: "Watch Dreamborn's public operating surface: agent wires, task receipts, verification, and ledger activity."
socialTitle: "Dreamborn Live Workroom"
socialDescription: "A public window into Dreamborn's operating surface, where agent work, receipts, and verification appear when available."
image: "/img/social/dreamborn-live.svg"
imageAlt: "Dreamborn live workroom social card showing public operating activity."
type: "website"
section: "Live"
```

- [ ] **Step 6: Update thinking index front matter**

Set `src/thinking/index.njk` front matter to include:

```yaml
title: "Thinking"
description: "Articles and thinking from Dreamborn on AI-native systems, agent workflows, verified work, and the future of operating companies."
socialTitle: "Dreamborn Thinking"
socialDescription: "Dispatches from inside an AI-native company: agents, operating systems, verified work, and the future of company building."
image: "/img/social/dreamborn-thinking.svg"
imageAlt: "Dreamborn Thinking social card for articles on AI-native systems."
type: "website"
section: "Thinking"
```

- [ ] **Step 7: Update post computed metadata**

In `src/thinking/post.njk`, extend `eleventyComputed`:

```yaml
eleventyComputed:
  title: "{{ post.title }}"
  description: "{{ post.excerpt }}"
  socialTitle: "{{ post.title }}"
  socialDescription: "{{ post.excerpt }}"
  image: "{{ post.social_image or site.socialImages.article }}"
  imageAlt: "{{ post.social_image_alt or 'Dreamborn Thinking article social card.' }}"
  type: "article"
  published: "{{ post.published_at }}"
  modified: "{{ post.updated_at or post.published_at }}"
  author: "{{ post.author }}"
  section: "{{ post.topic_label or 'Thinking' }}"
```

- [ ] **Step 8: Update Justin front matter**

Set `src/justin/index.njk` front matter to include:

```yaml
title: "Justin King"
description: "Justin King is Dreamborn's Head AI Engineer for Agent Clusters and a speaker on the transition from B2B e-commerce leadership to AI-native operating systems."
socialTitle: "Justin King — Dreamborn"
socialDescription: "Justin King builds and explains agent clusters, verified work, and the operating model behind AI-native companies."
image: "/img/social/dreamborn-justin.svg"
imageAlt: "Justin King Dreamborn profile social card."
type: "profile"
section: "Justin"
```

- [ ] **Step 9: Update connect front matter**

Set `src/connect/index.njk` front matter to include:

```yaml
title: "Ask Finn"
description: "Enter Dreamborn's AI strategy room. Ask Finn, pressure-test your operating model, or book a call with Justin."
socialTitle: "Ask Finn at Dreamborn"
socialDescription: "Bring your AI strategy to Dreamborn. Ask Finn, pressure-test the operating model, or book a call."
image: "/img/social/dreamborn-connect.svg"
imageAlt: "Dreamborn Ask Finn social card for AI strategy conversations."
type: "website"
section: "Connect"
```

- [ ] **Step 10: Build and commit page metadata**

Run:

```bash
npm run build
git add src/index.njk src/explainer/index.njk src/work/index.njk src/system/index.njk src/live/index.njk src/thinking/index.njk src/thinking/post.njk src/justin/index.njk src/connect/index.njk
git commit -m "feat: add page social metadata"
```

Expected: build succeeds and generated pages contain page-specific metadata.

## Task 4: Add Static Social Card Assets

**Files:**
- Create: `public/img/social/dreamborn-default.svg`
- Create: `public/img/social/dreamborn-explainer.svg`
- Create: `public/img/social/dreamborn-work.svg`
- Create: `public/img/social/dreamborn-system.svg`
- Create: `public/img/social/dreamborn-live.svg`
- Create: `public/img/social/dreamborn-thinking.svg`
- Create: `public/img/social/dreamborn-article.svg`
- Create: `public/img/social/dreamborn-justin.svg`
- Create: `public/img/social/dreamborn-connect.svg`

- [ ] **Step 1: Create the directory**

Run:

```bash
mkdir -p public/img/social
```

- [ ] **Step 2: Create the default social card SVG**

Create `public/img/social/dreamborn-default.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">Dreamborn</title>
  <desc id="desc">Dreamborn AI-native company in production.</desc>
  <rect width="1200" height="630" fill="#18100f"/>
  <rect x="64" y="64" width="1072" height="502" rx="28" fill="#f8f0e6"/>
  <circle cx="980" cy="154" r="46" fill="#cc3f2f"/>
  <path d="M118 430 C260 340 348 440 482 352 S746 252 918 346 1050 388 1092 330" fill="none" stroke="#cc3f2f" stroke-width="8"/>
  <text x="118" y="184" fill="#18100f" font-family="Georgia, serif" font-size="78" font-weight="700">Dreamborn</text>
  <text x="122" y="268" fill="#3a2a24" font-family="Arial, sans-serif" font-size="34">An AI-native company in production.</text>
  <text x="122" y="512" fill="#7b4a3f" font-family="Arial, sans-serif" font-size="26">agents · verified work · operating receipts</text>
</svg>
```

- [ ] **Step 3: Generate the remaining social cards with exact values**

Run this Node command to generate the remaining eight SVG files with the same structure and exact text values:

```bash
node --input-type=module <<'NODE'
import { writeFileSync } from 'node:fs';

const cards = [
  ['dreamborn-explainer.svg', 'How Dreamborn Works', 'Agent workflows, verification, and the AI-native company model.', 'explainer'],
  ['dreamborn-work.svg', 'Dreamborn Work', 'Production systems and agent-built operating proof.', 'work'],
  ['dreamborn-system.svg', 'Dreamborn System', 'The coordination layer behind verified agent work.', 'system'],
  ['dreamborn-live.svg', 'Live Workroom', 'A public operating surface for work in motion.', 'live'],
  ['dreamborn-thinking.svg', 'Dreamborn Thinking', 'Dispatches from inside an AI-native company.', 'thinking'],
  ['dreamborn-article.svg', 'Dreamborn Dispatch', 'Articles on agents, receipts, and AI-native operating systems.', 'article'],
  ['dreamborn-justin.svg', 'Justin King', 'Head AI Engineer for Agent Clusters at Dreamborn.', 'profile'],
  ['dreamborn-connect.svg', 'Ask Finn', 'Bring your AI strategy to Dreamborn.', 'connect'],
];

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function card(title, description, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <rect width="1200" height="630" fill="#18100f"/>
  <rect x="64" y="64" width="1072" height="502" rx="28" fill="#f8f0e6"/>
  <circle cx="980" cy="154" r="46" fill="#cc3f2f"/>
  <path d="M118 430 C260 340 348 440 482 352 S746 252 918 346 1050 388 1092 330" fill="none" stroke="#cc3f2f" stroke-width="8"/>
  <text x="118" y="184" fill="#18100f" font-family="Georgia, serif" font-size="78" font-weight="700">${escapeXml(title)}</text>
  <text x="122" y="268" fill="#3a2a24" font-family="Arial, sans-serif" font-size="34">${escapeXml(description)}</text>
  <text x="122" y="512" fill="#7b4a3f" font-family="Arial, sans-serif" font-size="26">dreamborn.ai · ${escapeXml(accent)}</text>
</svg>
`;
}

for (const [filename, title, description, accent] of cards) {
  writeFileSync(`public/img/social/${filename}`, card(title, description, accent));
}
NODE
```

Expected: each generated file declares `width="1200"` and `height="630"`.

- [ ] **Step 4: Verify assets are copied by Eleventy**

Run:

```bash
npm run build
test -f _site/img/social/dreamborn-default.svg
test -f _site/img/social/dreamborn-connect.svg
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit social card assets**

Run:

```bash
git add public/img/social
git commit -m "feat: add dreamborn social cards"
```

## Task 5: Add Sitemap, Robots, Feeds, and Manifest

**Files:**
- Create: `src/sitemap.xml.njk`
- Create: `src/robots.txt.njk`
- Create: `src/feed.xml.njk`
- Create: `src/feed.json.njk`
- Create: `src/manifest.webmanifest.njk`

- [ ] **Step 1: Add sitemap template**

Create `src/sitemap.xml.njk`:

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{% for url in ['/', '/explainer/', '/thinking/', '/live/', '/work/', '/system/', '/justin/', '/connect/'] %}
  <url>
    <loc>{{ site.url }}{{ url }}</loc>
  </url>
{% endfor %}
{% for post in posts %}
  <url>
    <loc>{{ site.url }}/thinking/{{ post.slug }}/</loc>
    {% if post.published_at %}<lastmod>{{ post.updated_at or post.published_at }}</lastmod>{% endif %}
  </url>
{% endfor %}
</urlset>
```

- [ ] **Step 2: Add robots template**

Create `src/robots.txt.njk`:

```txt
---
permalink: /robots.txt
eleventyExcludeFromCollections: true
---
User-agent: *
Allow: /

Sitemap: {{ site.url }}/sitemap.xml
```

- [ ] **Step 3: Add RSS feed template**

Create `src/feed.xml.njk`:

```njk
---
permalink: /feed.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Dreamborn Thinking</title>
    <link>{{ site.url }}/thinking/</link>
    <atom:link href="{{ site.url }}/feed.xml" rel="self" type="application/rss+xml" />
    <description>{{ site.description }}</description>
    <language>en-us</language>
    {% for post in posts %}
    <item>
      <title>{{ post.title }}</title>
      <link>{{ site.url }}/thinking/{{ post.slug }}/</link>
      <guid>{{ site.url }}/thinking/{{ post.slug }}/</guid>
      {% if post.published_at %}<pubDate>{{ post.published_at }}</pubDate>{% endif %}
      {% if post.excerpt %}<description>{{ post.excerpt }}</description>{% endif %}
    </item>
    {% endfor %}
  </channel>
</rss>
```

- [ ] **Step 4: Add JSON feed template**

Create `src/feed.json.njk`:

```njk
---
permalink: /feed.json
eleventyExcludeFromCollections: true
---
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Dreamborn Thinking",
  "home_page_url": "{{ site.url }}/thinking/",
  "feed_url": "{{ site.url }}/feed.json",
  "description": {{ site.description | json }},
  "authors": [
    {
      "name": {{ site.author.name | json }},
      "url": {{ site.author.url | json }}
    }
  ],
  "items": [
    {% for post in posts %}
    {
      "id": "{{ site.url }}/thinking/{{ post.slug }}/",
      "url": "{{ site.url }}/thinking/{{ post.slug }}/",
      "title": {{ post.title | json }},
      "summary": {{ post.excerpt | json }},
      "content_html": {{ post.body_html | json }},
      "date_published": {{ post.published_at | json }},
      "author": {
        "name": {{ post.author | json }},
        "url": {{ site.author.url | json }}
      }
    }{% if not loop.last %},{% endif %}
    {% endfor %}
  ]
}
```

- [ ] **Step 5: Add web manifest template**

Create `src/manifest.webmanifest.njk`:

```json
---
permalink: /manifest.webmanifest
eleventyExcludeFromCollections: true
---
{
  "name": "Dreamborn",
  "short_name": "Dreamborn",
  "description": {{ site.description | json }},
  "start_url": "/",
  "display": "standalone",
  "background_color": "#18100f",
  "theme_color": "{{ site.themeColor }}",
  "icons": [
    {
      "src": "/img/social/dreamborn-default.svg",
      "sizes": "1200x630",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 6: Build and inspect generated files**

Run:

```bash
npm run build
test -f _site/sitemap.xml
test -f _site/robots.txt
test -f _site/feed.xml
test -f _site/feed.json
test -f _site/manifest.webmanifest
node -e "JSON.parse(require('fs').readFileSync('_site/feed.json','utf8')); JSON.parse(require('fs').readFileSync('_site/manifest.webmanifest','utf8'))"
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit generated-file templates**

Run:

```bash
git add src/sitemap.xml.njk src/robots.txt.njk src/feed.xml.njk src/feed.json.njk src/manifest.webmanifest.njk
git commit -m "feat: add sitemap robots and feeds"
```

## Task 6: Pass Verification and Tighten Output

**Files:**
- Modify: `src/_includes/seo.njk`
- Modify: `tests/seo-social-foundation.test.mjs`
- Modify: the page/front matter file named by a failing assertion when the assertion identifies missing metadata.

- [ ] **Step 1: Run focused verification**

Run:

```bash
npm run build
node --test tests/seo-social-foundation.test.mjs
```

Expected: failures identify exact missing or malformed metadata fields.

- [ ] **Step 2: Fix any Nunjucks compatibility issue with the central include**

If `seo.njk` fails because of filter/operator support, replace the failing expression with these basic `set` and `if` statements:

```njk
{% set pageTitle = seoTitle or title or site.title %}
{% if pageTitle == site.title %}
  {% set fullTitle = pageTitle %}
{% else %}
  {% set fullTitle = pageTitle ~ ' — Dreamborn' %}
{% endif %}
{% set imagePath = image or site.defaultImage %}
{% set absoluteImage = site.url ~ imagePath %}
```

Expected: the include uses only root-relative social images from front matter and site defaults.

- [ ] **Step 3: Fix HTML escaping issues in feeds or JSON-LD**

If generated JSON fails to parse, wrap the affected values with `| json | safe`. For example:

```njk
"description": {{ site.description | json | safe }}
```

If XML output contains raw `&`, replace the affected page description text with `and` so RSS and sitemap output remain valid XML.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run build
node --test tests/seo-social-foundation.test.mjs
```

Expected: all tests pass and the Eleventy build succeeds.

- [ ] **Step 5: Commit verification fixes**

Run:

```bash
git add src tests public
git commit -m "test: verify seo social output"
```

## Task 7: Local Smoke and Deployment Readiness

**Files:**
- No expected source changes unless smoke finds a defect.

- [ ] **Step 1: Inspect generated homepage head**

Run:

```bash
npm run build
node -e "const h=require('fs').readFileSync('_site/index.html','utf8'); console.log(h.match(/<head>[\\s\\S]*?<\\/head>/)[0])"
```

Expected: output contains one title, one canonical URL, OG metadata, Twitter metadata, feed links, manifest link, and JSON-LD.

- [ ] **Step 2: Inspect generated article head**

Run:

```bash
node -e "const h=require('fs').readFileSync('_site/thinking/the-company-i-built-without-a-payroll/index.html','utf8'); console.log(h.match(/<head>[\\s\\S]*?<\\/head>/)[0])"
```

Expected: output contains `og:type` as `article`, article published time, article author, and Article JSON-LD.

- [ ] **Step 3: Confirm git status**

Run:

```bash
git status --short
```

Expected: no source changes unless `_site/` or ignored artifacts were produced.

- [ ] **Step 4: Commit any smoke fixes**

If Step 1 or Step 2 found a defect and source files were changed, run:

```bash
git add src tests public
git commit -m "fix: polish seo social metadata"
```

If there were no defects, skip this commit.

- [ ] **Step 5: Prepare deployment command**

Use the previously verified Dreamborn Cloudflare deployment route from project state:

```bash
doppler run --project bezel --config prd -- sh -lc 'unset CF_API_TOKEN CF_ACCOUNT_ID; export CLOUDFLARE_API_TOKEN="$CF_JUSTIN_API_TOKEN"; export CLOUDFLARE_ACCOUNT_ID=9a653209ff2d0e99bf288e138e072636; npx wrangler pages deploy _site --project-name=dreamborn-website --branch=main --commit-dirty=true'
```

Expected: Cloudflare Pages returns a deployment URL. Production smoke should only happen after the user approves deployment.

## Self-Review Notes

- Spec coverage: metadata contract is covered by Tasks 2 and 3; sitemap/robots/feed/manifest by Task 5; social cards by Task 4; schema by Task 2; verification by Tasks 1 and 6; smoke/deploy readiness by Task 7.
- Scope: this remains one focused static-site publishing-layer pass. It does not add a CMS, dynamic image generation, analytics, or new keyword landing pages.
- Risk: SVG social cards are local and versioned, but some social crawlers prefer PNG. This plan accepts SVG for the first foundation pass to avoid adding image-generation dependencies; a future polish pass can replace the SVG files with PNGs while keeping the same filenames referenced by front matter updated to `.png`.

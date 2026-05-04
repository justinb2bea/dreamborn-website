# Dreamborn SEO and Social Foundation Design

## Goal

Make `dreamborn.ai` behave like a complete, serious public website without turning it into a large SEO content program.

The site is intentionally small. The right move is to give every existing public page a clear search, social, and credibility job; centralize metadata generation; add sitemap, robots, feed, schema, and social cards; and verify the built HTML so the foundation does not regress.

## Current Context

Dreamborn is an Eleventy site deployed on Cloudflare Pages. The current layout already emits basic title, description, canonical, and Open Graph tags from page front matter. Existing public pages include:

- `/`
- `/explainer/`
- `/thinking/`
- `/thinking/:slug/`
- `/live/`
- `/work/`
- `/system/`
- `/justin/`
- `/connect/`

The site lacks a complete publishing layer:

- No obvious generated sitemap or robots file.
- No reusable metadata include beyond the base layout head block.
- No Twitter/X card metadata.
- No `og:image` system with default and per-page images.
- No visible structured data layer.
- No RSS or JSON feed for Thinking.
- No build-time tests that inspect generated SEO/social output.

## Strategy

Use a foundation-first pass. Do not create a large set of new landing pages yet. Do not build a CMS. Do not add keyword-farm content.

Instead:

1. Define a site-wide metadata contract.
2. Replace one-off head tags with a reusable SEO include.
3. Add generated crawl and feed files.
4. Add schema JSON-LD for the company, website, founder, and articles.
5. Add polished social card assets and make every page share cleanly.
6. Add static verification tests against generated output.

## Page Jobs

### Home: `/`

Primary job: company proof.

Position Dreamborn as an AI-native company in production. The homepage should be the default brand share target and should carry the strongest Organization/WebSite metadata.

### Explainer: `/explainer/`

Primary job: search and education.

This page should answer what Dreamborn is, how an AI-native company works, how agent workflows differ from SaaS automation, and why verified operating systems matter.

### Work: `/work/`

Primary job: proof.

This page should frame concrete systems Dreamborn has built or operates. Its metadata should emphasize production work, not abstract philosophy.

### System: `/system/`

Primary job: credibility.

This page should explain the agent operating model, verification, receipts, ledger-backed proof, and orchestration layer.

### Live: `/live/`

Primary job: transparency.

This page should be indexable but described carefully as a public operating surface. It should not overpromise constant activity; the existing honesty about unavailable feeds should remain.

### Thinking: `/thinking/` and `/thinking/:slug/`

Primary job: distribution.

The index should act as the thought leadership hub. Individual posts should get Article schema, author metadata, published/modified dates, OG/Twitter cards, feed inclusion, and related internal links.

### Justin: `/justin/`

Primary job: authority.

This page should establish founder identity and connect Justin to Dreamborn. It should carry Person schema and a strong profile share image.

### Connect: `/connect/`

Primary job: conversion.

This page should be the clear handoff for prospects. Metadata should focus on asking Finn, pressure-testing an AI strategy, or booking a call.

## Metadata Contract

Each page can provide the following front matter fields:

- `title`: human page title.
- `description`: canonical meta description.
- `socialTitle`: optional title for OG/Twitter.
- `socialDescription`: optional description for OG/Twitter.
- `seoTitle`: optional exact `<title>` override.
- `canonical`: optional absolute canonical URL override.
- `image`: optional absolute or root-relative social image URL.
- `imageAlt`: social image alt text.
- `type`: `website`, `article`, or `profile`.
- `robots`: optional robots directive, default `index,follow`.
- `published`: article published date.
- `modified`: article modified date.
- `author`: article/person author name.
- `section`: article section or page group.

The site data should provide defaults:

- `site.name`
- `site.title`
- `site.url`
- `site.description`
- `site.locale`
- `site.defaultImage`
- `site.defaultImageAlt`
- `site.twitterHandle`
- `site.author.name`
- `site.author.url`

## SEO Include

Create a reusable include at `src/_includes/seo.njk` and call it from `src/_layouts/base.njk`.

It should emit:

- `<title>`
- meta description
- canonical link
- robots meta
- Open Graph type, title, description, URL, site name, locale, image, image alt, image dimensions
- Twitter card, title, description, image, image alt, creator/site handles
- article published/modified/author tags when `type: article`
- profile tags for the Justin page
- JSON-LD blocks from a shared schema helper/include

The include should use safe defaults so every public page has a complete output even if a field is omitted.

## Generated Files

Add Eleventy-generated public files:

- `/sitemap.xml`: all indexable public pages and published Thinking posts.
- `/robots.txt`: allow public crawl and point to the sitemap.
- `/feed.xml`: RSS feed for Thinking.
- `/feed.json`: JSON Feed for Thinking alongside RSS.
- `/manifest.webmanifest`: lightweight site manifest with name, icons, theme color, and start URL.

## Structured Data

Add JSON-LD:

- `Organization` on all pages, with Dreamborn name, URL, logo, and sameAs links for any official profiles already known in repo data.
- `WebSite` with site name, URL, description, and potential search action only if real site search exists. Do not invent search.
- `Person` on `/justin/`, linked to the author identity used by posts.
- `Article` on Thinking posts with headline, description, image, author, publisher, datePublished, dateModified, mainEntityOfPage.
- `BreadcrumbList` on non-home pages using the current top-level page hierarchy.

## Social Card Assets

Create a small asset set instead of dynamic card generation:

- Default Dreamborn brand card.
- Explainer card.
- Work card.
- System card.
- Live card.
- Justin profile card.
- Thinking index card.
- Default Thinking article card.

Prefer local static assets under `public/img/social/` so social crawlers do not depend on third-party image delivery. Use 1200x630 images. If per-article generated images are not ready, article pages can use the default Thinking article card.

## Internal Linking

Make small copy/link adjustments only where they serve SEO and user orientation:

- Home should link to Explainer, Work, Thinking, Live, and Connect with descriptive anchor text.
- Explainer should link to System and Work.
- Work should link to System, Live, and Connect.
- System should link to Live and Explainer.
- Thinking index should link to Justin and Connect in a restrained way.
- Posts should link back to Thinking, Justin, and one relevant core page selected from Explainer, Work, System, Live, or Connect.

Avoid adding footer link dumps.

## Testing

Add Node tests that build or inspect `_site` after build. Tests should verify:

- Core pages have title, description, canonical, OG title, OG description, OG image, Twitter card, and at least one JSON-LD block.
- Thinking posts emit Article metadata and Article JSON-LD.
- `/sitemap.xml` exists and includes core public pages plus posts.
- `/robots.txt` exists and references the sitemap.
- `/feed.xml` exists and includes published Thinking posts.
- Social images referenced by generated HTML exist locally when root-relative.
- Core pages do not accidentally emit duplicate canonical or title tags.

## Non-Goals

- No CMS.
- No keyword-farm landing page expansion.
- No automated dynamic OG image generator in this pass.
- No paid analytics or ad-tech setup.
- No claim that live operating data is always available.
- No broad visual redesign of the website.

## Rollout

Implementation should be one focused branch:

1. Add site metadata data file and SEO include.
2. Update page/post front matter.
3. Add sitemap, robots, feed, manifest, and schema.
4. Add social card assets.
5. Add tests.
6. Run `npm test` and `npm run build`.
7. Smoke generated output locally.
8. Deploy to Cloudflare Pages only after verification passes.

## Acceptance Criteria

- Every indexable public page has complete SEO, OG, and Twitter metadata.
- Every indexable public page has a canonical URL.
- Every social card uses a valid image.
- Thinking posts have Article schema and feed entries.
- Sitemap and robots are present and accurate.
- JSON-LD validates structurally as parseable JSON.
- Existing page design and live-feed honesty are preserved.
- Verification commands pass before deployment.

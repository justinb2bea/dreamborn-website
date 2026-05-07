import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const siteRoot = join(root, '_site');
const generatedPostsRoot = join(root, 'src', '_data', 'generated_posts');

function readBuilt(pathname) {
  const file = pathname === '/'
    ? join(siteRoot, 'index.html')
    : join(siteRoot, pathname.replace(/^\/|\/$/g, ''), 'index.html');
  return readFileSync(file, 'utf8');
}

function readPublic(pathname) {
  return readFileSync(join(siteRoot, pathname.replace(/^\//, '')), 'utf8');
}

function attrValue(tag, name) {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + '`' + `]+))`, 'i');
  const match = tag.match(pattern);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function metaTags(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => match[0]);
}

function metaContent(html, selector) {
  const tag = metaTags(html).find((candidate) => {
    return attrValue(candidate, 'name') === selector || attrValue(candidate, 'property') === selector;
  });
  return tag ? attrValue(tag, 'content') : '';
}

function linkTags(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
}

function relIncludes(tag, rel) {
  return attrValue(tag, 'rel').split(/\s+/).includes(rel);
}

function linkHref(html, rel) {
  const tag = linkTags(html).find((candidate) => relIncludes(candidate, rel));
  return tag ? attrValue(tag, 'href') : '';
}

function jsonLdBlocks(html) {
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  return blocks
    .filter((block) => attrValue(block[1], 'type') === 'application/ld+json')
    .map((block) => JSON.parse(block[2]));
}

function jsonLdHasType(block, type) {
  if (Array.isArray(block)) {
    return block.some((item) => jsonLdHasType(item, type));
  }

  if (!block || typeof block !== 'object') return false;

  const blockType = block['@type'];
  const types = Array.isArray(blockType) ? blockType : [blockType];
  if (types.includes(type)) return true;

  return jsonLdHasType(block['@graph'], type);
}

function isCloudflareImageUrl(imageUrl) {
  if (!imageUrl.startsWith('https://imagedelivery.net/')) return false;
  const url = new URL(imageUrl);
  return url.pathname.split('/').filter(Boolean).length >= 3 && url.pathname.endsWith('/public');
}

const corePages = [
  ['/', 'website'],
  ['/explainer/', 'website'],
  ['/ai-native/', 'website'],
  ['/work/', 'website'],
  ['/system/', 'website'],
  ['/live/', 'website'],
  ['/thinking/', 'website'],
  ['/connect/', 'website'],
];

test('core pages emit complete SEO and social metadata', () => {
  for (const [pathname, type] of corePages) {
    const html = readBuilt(pathname);
    assert.match(html, /<title\b[^>]*>[^<]+<\/title>/i, `${pathname} has title`);
    assert.ok(metaContent(html, 'description'), `${pathname} has description`);
    assert.equal(linkHref(html, 'canonical'), `https://dreamborn.ai${pathname}`);
    assert.equal(metaContent(html, 'og:type'), type);
    assert.ok(metaContent(html, 'og:title'), `${pathname} has og:title`);
    assert.ok(metaContent(html, 'og:description'), `${pathname} has og:description`);
    assert.ok(metaContent(html, 'twitter:card'), `${pathname} has twitter card`);
    assert.ok(metaContent(html, 'twitter:image'), `${pathname} has twitter image`);
    assert.ok(isCloudflareImageUrl(metaContent(html, 'og:image')), `${pathname} OG image uses Cloudflare Images`);
    assert.ok(isCloudflareImageUrl(metaContent(html, 'twitter:image')), `${pathname} Twitter image uses Cloudflare Images`);
    assert.equal(linkTags(html).filter((tag) => relIncludes(tag, 'canonical')).length, 1, `${pathname} has one canonical`);
    assert.equal((html.match(/<title\b[^>]*>/gi) || []).length, 1, `${pathname} has one title`);
    assert.ok(jsonLdBlocks(html).length >= 1, `${pathname} has JSON-LD`);
  }
});

test('thinking posts emit article metadata and article schema', () => {
  const html = readBuilt('/thinking/the-company-i-built-without-a-payroll/');
  assert.equal(metaContent(html, 'og:type'), 'article');
  assert.ok(metaContent(html, 'article:published_time'));
  assert.equal(metaContent(html, 'article:author'), 'Justin King');
  assert.match(html, /<strong>Justin King<\/strong>/);
  assert.match(html, /\/img\/authors\/JustinKingProfile\.jpeg/);
  assert.ok(isCloudflareImageUrl(metaContent(html, 'og:image')), 'article OG image uses Cloudflare Images');
  assert.ok(isCloudflareImageUrl(metaContent(html, 'twitter:image')), 'article Twitter image uses Cloudflare Images');
  const blocks = jsonLdBlocks(html);
  assert.ok(blocks.some((block) => jsonLdHasType(block, 'Article')), 'Article JSON-LD exists');
});

test('thinking article body lists keep markers inside the prose column', () => {
  const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.detail-body ul,[\s\S]*\.detail-body ol \{[\s\S]*padding-left: 1\.35em;[\s\S]*list-style-position: outside;/);
  assert.match(css, /\.detail-body li \{[\s\S]*padding-left: 0\.35em;/);
  assert.match(css, /\.detail-body li::marker \{[\s\S]*color: var\(--db-lime-500\);/);
});

test('rewritten generated posts use paragraph format without lists', () => {
  const leaveAsWritten = new Set([
    'ai-isnt-a-fast-intern.json',
    'atlas-on-agent-memory.json',
  ]);

  for (const file of readdirSync(generatedPostsRoot).filter((name) => name.endsWith('.json'))) {
    if (leaveAsWritten.has(file)) continue;
    const post = JSON.parse(readFileSync(join(generatedPostsRoot, file), 'utf8'));
    assert.doesNotMatch(post.body_html, /<\/?(?:ol|ul|li)\b/, `${file} has no HTML lists`);
    assert.doesNotMatch(post.body_md, /^\s*(?:\d+\.|[-*])\s/m, `${file} has no markdown lists`);
  }
});

test('sitemap robots and feeds are generated', () => {
  const sitemap = readPublic('/sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/dreamborn\.ai\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/dreamborn\.ai\/ai-native\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/dreamborn\.ai\/thinking\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/dreamborn\.ai\/thinking\/the-company-i-built-without-a-payroll\/<\/loc>/);
  assert.doesNotMatch(sitemap, /https:\/\/dreamborn\.ai\/justin\//);

  const robots = readPublic('/robots.txt');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/dreamborn\.ai\/sitemap\.xml/);

  const redirects = readPublic('/_redirects');
  assert.match(redirects, /\/justin \/ 301/);
  assert.match(redirects, /\/justin\/ \/ 301/);

  const rss = readPublic('/feed.xml');
  assert.match(rss, /<rss version="2\.0"/);
  assert.match(rss, /The company I built without a payroll/);

  const jsonFeed = JSON.parse(readPublic('/feed.json'));
  assert.equal(jsonFeed.version, 'https://jsonfeed.org/version/1.1');
  assert.ok(jsonFeed.items.some((item) => item.url === 'https://dreamborn.ai/thinking/the-company-i-built-without-a-payroll/'));

  const manifest = JSON.parse(readPublic('/manifest.webmanifest'));
  assert.ok(isCloudflareImageUrl(manifest.icons[0].src), 'manifest icon uses Cloudflare Images');
});

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
    assert.match(html, /<title\b[^>]*>[^<]+<\/title>/i, `${pathname} has title`);
    assert.ok(metaContent(html, 'description'), `${pathname} has description`);
    assert.equal(linkHref(html, 'canonical'), `https://dreamborn.ai${pathname}`);
    assert.equal(metaContent(html, 'og:type'), type);
    assert.ok(metaContent(html, 'og:title'), `${pathname} has og:title`);
    assert.ok(metaContent(html, 'og:description'), `${pathname} has og:description`);
    assert.ok(metaContent(html, 'twitter:card'), `${pathname} has twitter card`);
    assert.ok(metaContent(html, 'twitter:image'), `${pathname} has twitter image`);
    assert.ok(localSocialImageExists(metaContent(html, 'og:image')), `${pathname} OG image exists locally`);
    assert.ok(localSocialImageExists(metaContent(html, 'twitter:image')), `${pathname} Twitter image exists locally`);
    assert.equal(linkTags(html).filter((tag) => relIncludes(tag, 'canonical')).length, 1, `${pathname} has one canonical`);
    assert.equal((html.match(/<title\b[^>]*>/gi) || []).length, 1, `${pathname} has one title`);
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
  assert.ok(blocks.some((block) => jsonLdHasType(block, 'Article')), 'Article JSON-LD exists');
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

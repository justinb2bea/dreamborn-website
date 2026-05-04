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

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync(new URL('../src/justin/index.njk', import.meta.url), 'utf8');

test('Justin page carries the speaker profile essentials', () => {
  assert.match(page, /Head AI Engineer/);
  assert.match(page, /Agent Clusters/);
  assert.match(page, /Past/);
  assert.match(page, /Pivot/);
  assert.match(page, /Now/);
  assert.match(page, /Book Justin as a speaker/);
  assert.match(page, /justin-king/);
  assert.match(page, /twitter\.com\/justinking/);
  assert.match(page, /platform\.twitter\.com\/widgets\.js/);
});

test('Dreamborn keeps Justin out of the primary header and links from secondary chrome', () => {
  const nav = readFileSync(new URL('../src/_includes/nav.njk', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('../src/_includes/footer.njk', import.meta.url), 'utf8');
  assert.doesNotMatch(nav, /<li><a href="\/justin\/"/);
  assert.match(nav, /class="nav__secondary-link" href="\/justin\/"/);
  assert.match(footer, /href="\/justin\/"/);
});

test('Dreamborn navigation has an accessible mobile menu toggle', () => {
  const nav = readFileSync(new URL('../src/_includes/nav.njk', import.meta.url), 'utf8');
  const base = readFileSync(new URL('../src/_layouts/base.njk', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../public/js/nav.js', import.meta.url), 'utf8');
  assert.match(nav, /data-nav-toggle/);
  assert.match(nav, /aria-controls="mainNavigationLinks"/);
  assert.match(nav, /data-nav-menu/);
  assert.match(base, /\/js\/nav\.js/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /nav-open/);
});

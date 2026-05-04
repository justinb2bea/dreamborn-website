import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('Dreamborn removes the profile route from public navigation chrome', () => {
  const nav = readFileSync(new URL('../src/_includes/nav.njk', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('../src/_includes/footer.njk', import.meta.url), 'utf8');
  assert.doesNotMatch(nav, /href="\/justin\/"/);
  assert.doesNotMatch(footer, /href="\/justin\/"/);
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

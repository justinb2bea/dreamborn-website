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

test('Dreamborn navigation keeps Connect CTA green across pages', () => {
  const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.nav__cta \{[^}]*color: var\(--db-lime-500\) !important;[^}]*border: 1px solid rgba\(141, 198, 63, 0\.42\)/);
  assert.doesNotMatch(css, /\.nav__cta \{[^}]*color: var\(--color-crimson\)/);
});

test('Dreamborn non-Thinking hero titles share the homepage title scale', () => {
  const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.connect-hero h1,[\s\S]*\.native-hero h1 \{[\s\S]*font-family: var\(--font-editorial-heading\);[\s\S]*font-size: clamp\(32px, 5\.8vw, 64px\);[\s\S]*font-weight: 600;[\s\S]*line-height: 1\.04;/);
  assert.doesNotMatch(css, /\.thinking-header h1,[\s\S]*font-size: clamp\(32px, 5\.8vw, 64px\)/);
});

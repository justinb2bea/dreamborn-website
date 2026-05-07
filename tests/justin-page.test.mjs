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
  assert.match(script, /nav--scrolled/);
});

test('Dreamborn navigation keeps Connect CTA green across pages', () => {
  const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.nav__cta \{[^}]*color: var\(--db-lime-500\) !important;[^}]*border: 1px solid rgba\(141, 198, 63, 0\.42\)[^}]*min-height: 36px;/);
  assert.doesNotMatch(css, /\.nav__cta \{[^}]*color: var\(--color-crimson\)/);
});

test('Dreamborn header dimensions are standardized across page registers', () => {
  const designSystem = readFileSync(new URL('../public/css/dreamborn.css', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');
  assert.match(designSystem, /--nav-height: 64px;/);
  assert.doesNotMatch(designSystem, /\[data-register="forge"\]\s*\{[^}]*--nav-height:/);
  assert.doesNotMatch(css, /\[data-register="forge"\] \.nav__inner/);
  assert.doesNotMatch(css, /\[data-register="forge"\] \.nav__links a/);
  assert.match(css, /\.nav__logo-img \{[\s\S]*width: 156px;/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*\.nav__logo-img \{[\s\S]*width: 136px;/);
});

test('Dreamborn uses dreamborn.css and main.css as the active CSS layers', () => {
  const base = readFileSync(new URL('../src/_layouts/base.njk', import.meta.url), 'utf8');
  assert.match(base, /\/css\/dreamborn\.css/);
  assert.match(base, /\/css\/main\.css/);
  assert.doesNotMatch(base, /\/css\/tokens\.css/);
});

test('Dreamborn light header hover text stays dark', () => {
  const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.nav \{[\s\S]*--nav-link-color: rgba\(26, 26, 26, 0\.62\);[\s\S]*--nav-link-hover-color: #1A1A1A;/);
  assert.match(css, /\[data-register="brand"\] \.nav,[\s\S]*\[data-register="forge"\] \.nav \{[\s\S]*--nav-link-hover-color: #F0EDE9;/);
  assert.match(css, /\.nav__links a:hover,[\s\S]*\.nav__links a\[aria-current="page"\] \{[\s\S]*color: var\(--nav-link-hover-color\);/);
  assert.doesNotMatch(css, /\.nav__links a:hover,\s*\.nav__links a\[aria-current="page"\]\s*\{[^}]*color:\s*#fff/);
  assert.doesNotMatch(css, /\.nav__links a:hover,\s*\.nav__links a\[aria-current="page"\]\s*\{[^}]*color:\s*white/);
});

test('Dreamborn non-Thinking hero titles share the homepage title scale', () => {
  const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');
  assert.match(css, /\.connect-hero h1,[\s\S]*\.native-hero h1 \{[\s\S]*font-family: var\(--font-editorial-heading\);[\s\S]*font-size: clamp\(32px, 5\.8vw, 64px\);[\s\S]*font-weight: 600;[\s\S]*line-height: 1\.04;/);
  assert.doesNotMatch(css, /\.thinking-header h1,[\s\S]*font-size: clamp\(32px, 5\.8vw, 64px\)/);
});

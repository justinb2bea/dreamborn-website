import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const homepage = readFileSync(new URL('../src/index.njk', import.meta.url), 'utf8');
const base = readFileSync(new URL('../src/_layouts/base.njk', import.meta.url), 'utf8');
const connect = readFileSync(new URL('../src/connect/index.njk', import.meta.url), 'utf8');
const operatingSurface = readFileSync(new URL('../public/js/operating-surface.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');

test('homepage removes explanation controls from primary chrome', () => {
  assert.doesNotMatch(homepage, /data-explain-toggle/);
  assert.doesNotMatch(homepage, /data-explain-sticky/);
  assert.doesNotMatch(homepage, /ops-explain-sticky/);
  assert.doesNotMatch(homepage, /What am I looking at\?/);
  assert.doesNotMatch(homepage, /Explain this page/);
  assert.match(homepage, /data-default-text="The Next Era of Software Will Not Be Rented"/);
  assert.match(homepage, /data-explained-text="Companies will build the systems that make them different\."/);
});

test('homepage places Finn in the middle of the page', () => {
  assert.match(homepage, /db-home-finn/);
  assert.match(homepage, /Ask Finn/);
  assert.match(homepage, /Want to pressure-test the thesis\?/);
  assert.match(homepage, /Explain the thesis/);
  assert.match(homepage, /What should we own\?/);
  assert.match(homepage, /How does the agent cluster work\?/);
  assert.doesNotMatch(homepage, /Explain this feed/);
  assert.match(homepage, /Open live room/);
  assert.match(homepage, /Recent work/);
  assert.match(homepage, /data-work-preview="compact"/);
  assert.doesNotMatch(homepage, /ops-panel-label">Verified handoff/);
  assert.match(homepage, /Roles being filled/);
});

test('base layout includes global Finn drawer and script', () => {
  assert.match(base, /include "finn-drawer\.njk"/);
  assert.match(base, /\/js\/finn-global\.js/);
});

test('mobile Finn drawer renders as a distinct sheet', () => {
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.finn-drawer__panel[\s\S]*max-height: min\(72vh, 620px\)/);
  assert.match(css, /\.finn-chat--drawer[\s\S]*#1b1412/);
  assert.match(css, /\.finn-chat--drawer \.message-bubble--finn[\s\S]*rgba\(240, 237, 233, 0\.1\)/);
  assert.match(css, /\.finn-chat--drawer \.finn-chat__messages[\s\S]*min-height: 180px/);
});

test('connect page uses global Finn script without duplicate page-only script', () => {
  assert.match(connect, /connect-chat-shell/);
  assert.doesNotMatch(connect, /\/js\/finn-chat\.js/);
});

test('homepage explanation mode uses a deterioration swap transition', () => {
  assert.match(operatingSurface, /ops-home--swapping/);
  assert.match(operatingSurface, /ops-home--settling/);
  assert.match(css, /ops-text-deteriorate/);
  assert.match(css, /ops-text-materialize/);
  assert.match(css, /steps\(4, end\)/);
  assert.match(operatingSurface, /querySelectorAll\('\[data-explain-toggle\]'\)/);
  assert.match(operatingSurface, /syncExplainToggles/);
});

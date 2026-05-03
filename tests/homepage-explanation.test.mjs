import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const homepage = readFileSync(new URL('../src/index.njk', import.meta.url), 'utf8');
const base = readFileSync(new URL('../src/_layouts/base.njk', import.meta.url), 'utf8');
const connect = readFileSync(new URL('../src/connect/index.njk', import.meta.url), 'utf8');
const operatingSurface = readFileSync(new URL('../public/js/operating-surface.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');

test('homepage exposes explanation mode copy hooks', () => {
  assert.match(homepage, /data-explain-toggle/);
  assert.match(homepage, /What am I looking at\?/);
  assert.match(homepage, /Show the operating surface/);
  assert.match(homepage, /data-default-text="What's your AI strategy\? This is ours\."/);
  assert.match(homepage, /data-explained-text="A company operating through AI agents\."/);
  assert.match(homepage, /data-explanation-note/);
  assert.match(homepage, /data-explain-status/);
  assert.match(homepage, /Back to the company in motion\./);
  assert.match(homepage, /Explain what I&#39;m looking at on the Dreamborn homepage\./);
});

test('homepage repeats interpreter controls strategically', () => {
  assert.match(homepage, /data-explain-sticky/);
  assert.match(homepage, /data-default-text="Explain this page"/);
  assert.match(homepage, /data-explained-text="Show operating surface"/);
  assert.match(homepage, /Explain this feed/);
  assert.match(homepage, /What work is happening here\?/);
  assert.match(homepage, /Explain the proof/);
  assert.match(homepage, /Who are these agents\?/);
  assert.match(homepage, /Translate this/);
  assert.match(homepage, /Explain the live Dreamborn feed in plain English\./);
  assert.match(homepage, /Explain the Dreamborn proof ledger in plain English\./);
});

test('base layout includes global Finn drawer and script', () => {
  assert.match(base, /include "finn-drawer\.njk"/);
  assert.match(base, /\/js\/finn-global\.js/);
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

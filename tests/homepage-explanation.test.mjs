import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const homepage = readFileSync(new URL('../src/index.njk', import.meta.url), 'utf8');
const base = readFileSync(new URL('../src/_layouts/base.njk', import.meta.url), 'utf8');
const connect = readFileSync(new URL('../src/connect/index.njk', import.meta.url), 'utf8');

test('homepage exposes explanation mode copy hooks', () => {
  assert.match(homepage, /data-explain-toggle/);
  assert.match(homepage, /What am I looking at\?/);
  assert.match(homepage, /Show the operating surface/);
  assert.match(homepage, /data-default-text="What's your AI strategy\? This is ours\."/);
  assert.match(homepage, /data-explained-text="A company operating through AI agents\."/);
  assert.match(homepage, /data-explanation-note/);
  assert.match(homepage, /Explain what I&#39;m looking at on the Dreamborn homepage\./);
});

test('base layout includes global Finn drawer and script', () => {
  assert.match(base, /include "finn-drawer\.njk"/);
  assert.match(base, /\/js\/finn-global\.js/);
});

test('connect page uses global Finn script without duplicate page-only script', () => {
  assert.match(connect, /connect-chat-shell/);
  assert.doesNotMatch(connect, /\/js\/finn-chat\.js/);
});

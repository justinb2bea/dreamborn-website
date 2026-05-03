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

test('Dreamborn navigation links to Justin profile', () => {
  const nav = readFileSync(new URL('../src/_includes/nav.njk', import.meta.url), 'utf8');
  assert.match(nav, /href="\/justin\/"/);
});

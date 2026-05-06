import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const explainer = readFileSync(new URL('../src/explainer/index.njk', import.meta.url), 'utf8');
const aiNative = readFileSync(new URL('../src/ai-native/index.njk', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/_includes/nav.njk', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/_includes/footer.njk', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../src/sitemap.xml.njk', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/css/main.css', import.meta.url), 'utf8');

test('header exposes distinct explainer and AI-native routes', () => {
  assert.match(nav, /href="\/explainer\/"[\s\S]*>Explainer<\/a>/);
  assert.match(nav, /href="\/ai-native\/"[\s\S]*>AI-Native<\/a>/);
  assert.match(nav, /page\.url == '\/ai-native\/'/);
});

test('footer includes both explainer and AI-native links', () => {
  assert.match(footer, /href="\/explainer\/"[\s\S]*>Explainer<\/a>/);
  assert.match(footer, /href="\/ai-native\/"[\s\S]*>AI-Native<\/a>/);
});

test('explainer page is the Dreamborn multi-agent cluster explanation', () => {
  assert.match(explainer, /production-ready multi-agent cluster/i);
  assert.match(explainer, /Pipelines are not clusters/);
  assert.match(explainer, /Business Analysis Agents/);
  assert.match(explainer, /Architecture &amp; Review Agents/);
  assert.match(explainer, /Development Agents/);
  assert.match(explainer, /QA &amp; Verification Agents/);
  assert.match(explainer, /Governance Agents/);
  assert.match(explainer, /Publishing &amp; Communication Agents/);
  assert.match(explainer, /Orchestration Agents/);
  assert.match(explainer, /See the system in action/);
  assert.match(explainer, /Talk to Dreamborn/);
});

test('AI-native page preserves the prior explainer content under the new route', () => {
  assert.match(aiNative, /title: "What Is AI-Native\?"/);
  assert.match(aiNative, /What is AI-native\?/);
  assert.match(aiNative, /We Build AI-Native Software in Days, Not Quarters/);
  assert.match(aiNative, /Software Was Built for a Slower World/);
  assert.match(aiNative, /AI Is Not a Feature\. It Is the Operating Model\./);
  assert.match(aiNative, /The Timeline Collapses When Agents Do the Work/);
  assert.match(aiNative, /Watch the Work Move/);
});

test('sitemap source includes AI-native canonical route', () => {
  assert.match(sitemap, /'\/ai-native\/'/);
});

test('explainer typography uses Fraunces display and homepage body copy', () => {
  assert.match(css, /\.cluster-page h1,\s*\n\.cluster-page h2 \{[^}]*font-family: var\(--font-editorial-heading\)/);
  assert.match(css, /\.cluster-page p,\s*\n\.cluster-page li \{[^}]*font-family: var\(--font-body\)/);
});

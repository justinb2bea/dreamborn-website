# Explainer AI-Native Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Dreamborn's explanatory content so `/explainer/` explains the multi-agent cluster and `/ai-native/` explains the AI-native category using the blog series as depth.

**Architecture:** Keep this as an Eleventy static-site change. Add one new page at `src/ai-native/index.njk`, replace the current `src/explainer/index.njk` body with the cluster explainer, update shared nav/footer/sitemap route lists, and extend CSS in `public/css/main.css`.

**Tech Stack:** Eleventy, Nunjucks, static CSS, Node test runner.

---

### Task 1: Route and Content Tests

**Files:**
- Modify: `tests/seo-social-foundation.test.mjs`
- Create: `tests/explainer-ai-native.test.mjs`

- [ ] **Step 1: Write failing tests**

Add tests that require `/ai-native/` in SEO coverage and assert source content for the new page split:

```js
assert.match(nav, /href="\/explainer\/"[\s\S]*>Explainer<\/a>/);
assert.match(nav, /href="\/ai-native\/"[\s\S]*>AI-Native<\/a>/);
assert.match(explainer, /production-ready multi-agent cluster/);
assert.match(aiNative, /normal company with chatbots attached/);
assert.match(aiNative, /what-is-an-ai-native-company/);
```

- [ ] **Step 2: Verify red**

Run: `npm test`

Expected: FAIL because `src/ai-native/index.njk` does not exist and SEO core pages do not include `/ai-native/`.

### Task 2: Static Pages and Navigation

**Files:**
- Replace: `src/explainer/index.njk`
- Create: `src/ai-native/index.njk`
- Modify: `src/_includes/nav.njk`
- Modify: `src/_includes/footer.njk`
- Modify: `src/sitemap.xml.njk`

- [ ] **Step 1: Implement the page split**

Make `/explainer/` the cluster explainer with cluster map, pipeline comparison, role grid, task claiming, scaling, production-readiness, and final CTA.

Make `/ai-native/` the concept hub with a concise definition, six component sections, and cards linking to the 10 Thinking posts.

Update nav to include both `Explainer` and `AI-Native`.

- [ ] **Step 2: Verify green for source tests**

Run: `npm test`

Expected: source tests pass; build-backed SEO tests may still require generated `_site`.

### Task 3: Styling and Build Verification

**Files:**
- Modify: `public/css/main.css`

- [ ] **Step 1: Add focused styles**

Add `.cluster-*` styles for the operational explainer and `.native-*` styles for the AI-native concept hub, using existing Dreamborn variables and responsive breakpoints.

- [ ] **Step 2: Build and test**

Run:

```bash
npm run build
npm test
```

Expected: Eleventy writes `_site`; all Node tests pass.

- [ ] **Step 3: Commit**

Commit only files related to the explainer/AI-native split. Preserve pre-existing dirty homepage changes.

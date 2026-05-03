# Homepage Interpreter Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add prominent and contextual `What am I looking at?` interpreter controls across the Dreamborn homepage.

**Architecture:** Extend the existing homepage explanation state machine instead of adding a second mode. `src/index.njk` owns markup and prompt copy, `public/js/operating-surface.js` synchronizes all page-level explanation toggles, `public/js/finn-global.js` continues to open Finn for section-specific prompts, and `public/css/main.css` owns the visual hierarchy for hero, sticky, and section controls.

**Tech Stack:** Eleventy/Nunjucks, vanilla JavaScript, CSS, Node test runner.

---

## File Structure

- Modify `src/index.njk`: add a sticky homepage explain launcher and one contextual interpreter action to each major section.
- Modify `public/js/operating-surface.js`: support multiple `[data-explain-toggle]` controls and keep all labels/pressed states synchronized.
- Modify `public/css/main.css`: make the hero explain button more prominent, style section interpreter chips, and add a desktop sticky rail / mobile bottom pill.
- Modify `tests/homepage-explanation.test.mjs`: assert the new placements, prompts, and multi-toggle JavaScript contract.

## Task 1: Tests for Interpreter Control Placement

**Files:**
- Modify: `tests/homepage-explanation.test.mjs`

- [ ] **Step 1: Add failing static placement tests**

Add this test after `homepage exposes explanation mode copy hooks`:

```js
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
```

Add these assertions to the existing JavaScript transition test:

```js
assert.match(operatingSurface, /querySelectorAll\('\\[data-explain-toggle\\]'\\)/);
assert.match(operatingSurface, /syncExplainToggles/);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`

Expected: FAIL because `data-explain-sticky`, the section prompts, and `syncExplainToggles` are not implemented yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/homepage-explanation.test.mjs
git commit -m "test: cover homepage interpreter control placement"
```

## Task 2: Homepage Markup for Sticky and Section Controls

**Files:**
- Modify: `src/index.njk`

- [ ] **Step 1: Add a sticky page-level explain launcher**

Inside `<main class="ops-home" data-operating-surface>`, before the hero section, add:

```html
  <button class="ops-explain-sticky"
          type="button"
          data-explain-toggle
          data-explain-sticky
          data-finn-open
          data-finn-prompt="Explain what I&#39;m looking at on the Dreamborn homepage.">
    <span aria-hidden="true">?</span>
    <span data-explain-toggle-label
          data-default-text="Explain this page"
          data-explained-text="Show operating surface">Explain this page</span>
  </button>
```

- [ ] **Step 2: Add contextual control to the live feed header**

Inside `.ops-feed-shell__header`, after `<span class="ops-live-badge" data-live-badge>checking</span>`, add:

```html
        <button class="ops-context-explain"
                type="button"
                data-finn-open
                data-finn-prompt="Explain the live Dreamborn feed in plain English.">
          <span data-explain-text
                data-default-text="Explain this feed"
                data-explained-text="Ask Finn about this feed">Explain this feed</span>
        </button>
```

- [ ] **Step 3: Add contextual control to the work section intro**

Inside `.ops-work-section .ops-section__intro`, after the descriptive paragraph, add:

```html
      <button class="ops-context-explain"
              type="button"
              data-finn-open
              data-finn-prompt="Explain what work is happening on the Dreamborn homepage.">
        <span data-explain-text
              data-default-text="What work is happening here?"
              data-explained-text="Ask Finn about this work">What work is happening here?</span>
      </button>
```

- [ ] **Step 4: Add contextual control to the ledger section copy**

Inside `.ops-ledger-copy`, after the ledger heading, add:

```html
      <button class="ops-context-explain"
              type="button"
              data-finn-open
              data-finn-prompt="Explain the Dreamborn proof ledger in plain English.">
        <span data-explain-text
              data-default-text="Explain the proof"
              data-explained-text="Ask Finn about the proof">Explain the proof</span>
      </button>
```

- [ ] **Step 5: Add contextual control to the agents section intro**

Inside `.ops-agent-section .ops-section__intro`, after the agents heading, add:

```html
      <button class="ops-context-explain"
              type="button"
              data-finn-open
              data-finn-prompt="Explain who the Dreamborn agents are and what they do.">
        <span data-explain-text
              data-default-text="Who are these agents?"
              data-explained-text="Ask Finn about these agents">Who are these agents?</span>
      </button>
```

- [ ] **Step 6: Add contextual control to dispatches**

Inside `.ops-dispatch`, after the intro paragraph and before the `Read` link, add:

```html
    <button class="ops-context-explain"
            type="button"
            data-finn-open
            data-finn-prompt="Translate this Dreamborn dispatch section in plain English.">
      <span data-explain-text
            data-default-text="Translate this"
            data-explained-text="Ask Finn about this dispatch">Translate this</span>
    </button>
```

- [ ] **Step 7: Run static tests**

Run: `npm test`

Expected: FAIL only on the JavaScript assertions for multi-toggle synchronization.

- [ ] **Step 8: Commit markup**

```bash
git add src/index.njk
git commit -m "feat: add homepage interpreter controls"
```

## Task 3: Multi-Toggle State Synchronization

**Files:**
- Modify: `public/js/operating-surface.js`

- [ ] **Step 1: Replace the single toggle reference**

Replace:

```js
  const explainToggle = root.querySelector('[data-explain-toggle]');
```

With:

```js
  const explainToggles = Array.from(root.querySelectorAll('[data-explain-toggle]'));
```

- [ ] **Step 2: Add a synchronization function**

After `applyExplanationMode(active)` and before `bindExplanationToggle()`, add:

```js
  function syncExplainToggles(active) {
    explainToggles.forEach((toggle) => {
      toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
```

- [ ] **Step 3: Call the synchronization function**

In `applyExplanationMode(active)`, replace:

```js
    if (explainToggle) {
      explainToggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
```

With:

```js
    syncExplainToggles(active);
```

- [ ] **Step 4: Bind all explanation toggles**

Replace `bindExplanationToggle()` with:

```js
  function bindExplanationToggle() {
    if (!explainToggles.length) return;
    syncExplainToggles(false);
    explainToggles.forEach((toggle) => {
      toggle.addEventListener('click', function () {
        setExplanationMode(!explanationActive);
      });
    });
  }
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 6: Commit JavaScript**

```bash
git add public/js/operating-surface.js tests/homepage-explanation.test.mjs
git commit -m "feat: sync homepage explanation controls"
```

## Task 4: Visual Hierarchy for Interpreter Controls

**Files:**
- Modify: `public/css/main.css`

- [ ] **Step 1: Strengthen the hero explain button**

Add near the existing homepage action styles:

```css
.ops-actions .ops-ask-link {
  position: relative;
  border-color: rgba(192, 53, 53, 0.72);
  background:
    linear-gradient(135deg, rgba(192, 53, 53, 0.18), rgba(141, 198, 63, 0.08)),
    rgba(17, 13, 10, 0.86);
  box-shadow: 0 0 0 1px rgba(192, 53, 53, 0.18), 0 16px 42px rgba(0, 0, 0, 0.24);
}

.ops-actions .ops-ask-link::before {
  content: "?";
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  margin-right: 8px;
  border: 1px solid rgba(141, 198, 63, 0.42);
  color: var(--ops-green);
  font-family: var(--font-mono);
  font-size: 0.78rem;
}

.ops-actions .ops-ask-link:hover {
  border-color: rgba(141, 198, 63, 0.72);
  transform: translateY(-2px);
}
```

- [ ] **Step 2: Add sticky launcher styles**

Add near the explanation mode styles:

```css
.ops-explain-sticky {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  border: 1px solid rgba(141, 198, 63, 0.34);
  background: rgba(18, 14, 11, 0.92);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: uppercase;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(10px);
  cursor: pointer;
}

.ops-explain-sticky > span:first-child {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid rgba(192, 53, 53, 0.48);
  color: var(--ops-green);
}

.ops-explain-sticky:hover {
  border-color: rgba(192, 53, 53, 0.72);
}
```

- [ ] **Step 3: Add section prompt chip styles**

Add near the section styles:

```css
.ops-context-explain {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 10px;
  border: 1px solid rgba(169, 154, 129, 0.28);
  background: rgba(255, 255, 255, 0.035);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0;
  text-transform: uppercase;
  cursor: pointer;
}

.ops-context-explain::before {
  content: "?";
  color: var(--ops-green);
}

.ops-context-explain:hover {
  color: var(--color-text);
  border-color: rgba(141, 198, 63, 0.38);
  background: rgba(141, 198, 63, 0.055);
}

.ops-feed-shell__header .ops-context-explain {
  margin-top: 0;
}
```

- [ ] **Step 4: Add mobile and reduced-motion handling**

Inside the existing mobile/reduced-motion areas, add:

```css
@media (max-width: 720px) {
  .ops-explain-sticky {
    right: 14px;
    bottom: 14px;
    max-width: calc(100vw - 28px);
  }

  .ops-feed-shell__header {
    gap: 14px;
  }

  .ops-feed-shell__header .ops-context-explain {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ops-actions .ops-ask-link:hover {
    transform: none;
  }
}
```

- [ ] **Step 5: Run build and tests**

Run: `npm test && npm run build`

Expected: PASS. Build may print Supabase env warnings; those are acceptable for this static site build.

- [ ] **Step 6: Commit styles**

```bash
git add public/css/main.css
git commit -m "style: emphasize homepage interpreter controls"
```

## Task 5: Browser Smoke and Final Commit Check

**Files:**
- No expected source edits unless smoke reveals a defect.

- [ ] **Step 1: Confirm local server responds**

Run: `curl -I --max-time 3 http://localhost:8089/`

Expected: HTTP 200.

- [ ] **Step 2: Smoke served assets**

Run:

```bash
curl -s --max-time 3 http://localhost:8089/ | rg "Explain this page|Explain this feed|Who are these agents"
curl -s --max-time 3 http://localhost:8089/css/main.css | rg "ops-explain-sticky|ops-context-explain"
curl -s --max-time 3 http://localhost:8089/js/operating-surface.js | rg "syncExplainToggles|querySelectorAll"
```

Expected: all three commands print matching lines.

- [ ] **Step 3: Final status check**

Run: `git status --short`

Expected: clean worktree.

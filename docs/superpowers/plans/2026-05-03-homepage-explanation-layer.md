# Homepage Explanation Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a homepage `What am I looking at?` transformation and reusable site-wide Finn interpreter drawer.

**Architecture:** Layer client-side explanation state onto the existing homepage operating surface without replacing the live feed. Extract Finn chat behavior into a reusable global drawer included from the base layout, while preserving the `/connect/` page chat behavior and transcript metadata. Keep styling in the existing Dreamborn forge register.

**Tech Stack:** Eleventy/Nunjucks, plain JavaScript, existing `/api/finn/chat`, Node built-in test runner, CSS in `public/css/main.css`.

---

## File Structure

- Modify `src/index.njk`: add data hooks for default/explained copy, replace the secondary hero link with a real explanation button, and add short context slots under proof stats.
- Create `src/_includes/finn-drawer.njk`: reusable Finn drawer markup included by the base layout on all chrome pages.
- Modify `src/_layouts/base.njk`: include the Finn drawer and global Finn script for all pages except pages with `no_chrome`.
- Modify `src/connect/index.njk`: keep the existing page chat, but let it use the same global Finn script instead of loading the page-only script.
- Create `public/js/finn-global.js`: reusable Finn controller for drawer and page chat instances, starter prompts, session id, metadata, and homepage explanation trigger integration.
- Modify `public/js/operating-surface.js`: add homepage explanation-mode state, text swapping, and context note visibility.
- Modify `public/css/main.css`: add explanation-mode transitions and global Finn drawer/launcher styles using existing Dreamborn tokens.
- Create `tests/homepage-explanation.test.mjs`: static regression tests for homepage hooks, drawer include, and script wiring.
- Modify `package.json`: add `test` script for `node --test tests/*.test.mjs`.

## Task 1: Add Static Regression Test for Homepage and Finn Wiring

**Files:**
- Create: `tests/homepage-explanation.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create `tests/homepage-explanation.test.mjs`:

```js
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
```

- [ ] **Step 2: Add the test script**

Modify `package.json` scripts to include:

```json
"test": "node --test tests/*.test.mjs"
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because `tests/homepage-explanation.test.mjs` cannot find `data-explain-toggle`, the Finn drawer include, or `/js/finn-global.js`.

- [ ] **Step 4: Commit the failing test**

```bash
git add package.json tests/homepage-explanation.test.mjs
git commit -m "test: cover homepage explanation wiring"
```

## Task 2: Add Homepage Explanation Hooks

**Files:**
- Modify: `src/index.njk`
- Modify: `public/js/operating-surface.js`

- [ ] **Step 1: Add homepage data hooks and explanation copy**

Modify the homepage hero and section labels so the elements that change have `data-default-text` and `data-explained-text` attributes. The important HTML shape is:

```njk
<p class="ops-kicker"
   data-explain-text
   data-default-text="AI-native company / public operating surface"
   data-explained-text="Alright. Here's what you're looking at.">AI-native company / public operating surface</p>

<h1 id="opsHeroTitle"
    class="ops-hero__title"
    data-explain-text
    data-default-text="What's your AI strategy? This is ours."
    data-explained-text="A company operating through AI agents.">What's your AI strategy? <span>This is ours.</span></h1>

<p class="ops-hero__subhead"
   data-explain-text
   data-default-text="Dreamborn is an AI-native company. Humans set direction. Agents take the work. Nothing moves forward until it&rsquo;s verified."
   data-explained-text="Dreamborn builds real software with agent teams instead of a traditional payroll. The panels on this page are the receipts: work claimed, completed, verified, and handed off.">
  Dreamborn is an AI-native company. Humans set direction. Agents take the work.
  Nothing moves forward until it&rsquo;s verified.
</p>

<button class="btn btn--outline ops-ask-link"
        type="button"
        data-explain-toggle
        data-finn-open
        data-finn-prompt="Explain what I&#39;m looking at on the Dreamborn homepage.">
  What am I looking at?
</button>
```

Add visually hidden or collapsed reverse-label text in the button:

```njk
<span data-explain-toggle-label
      data-default-text="What am I looking at?"
      data-explained-text="Show the operating surface">What am I looking at?</span>
```

For each proof stat, add a contextual note:

```njk
<small class="ops-proof__note" data-explanation-note>What the agent workforce costs to run.</small>
```

Apply equivalent `data-explain-text` hooks to the section labels and headings listed in the design spec.

- [ ] **Step 2: Implement explanation state in `operating-surface.js`**

Add this near the top after the existing DOM refs:

```js
const explainToggle = root.querySelector('[data-explain-toggle]');
const explainTextNodes = Array.from(root.querySelectorAll('[data-explain-text], [data-explain-toggle-label]'));
let explanationActive = false;
```

Add these functions before `bindClicks()`:

```js
function setExplanationMode(active) {
  explanationActive = active;
  root.classList.toggle('ops-home--explained', active);
  root.setAttribute('data-explanation-mode', active ? 'explained' : 'default');

  explainTextNodes.forEach((node) => {
    const text = active ? node.dataset.explainedText : node.dataset.defaultText;
    if (!text) return;
    node.textContent = text;
  });

  if (explainToggle) {
    explainToggle.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  window.dispatchEvent(new CustomEvent('dreamborn:explanation-mode', {
    detail: { active, source: 'homepage' },
  }));
}

function bindExplanationToggle() {
  if (!explainToggle) return;
  explainToggle.setAttribute('aria-pressed', 'false');
  explainToggle.addEventListener('click', function () {
    setExplanationMode(!explanationActive);
  });
}
```

Call `bindExplanationToggle();` before `bindClicks();`.

- [ ] **Step 3: Run the static test**

Run: `npm test`

Expected: still FAIL until the global Finn drawer and script are added.

- [ ] **Step 4: Commit homepage hooks**

```bash
git add src/index.njk public/js/operating-surface.js
git commit -m "feat: add homepage explanation mode hooks"
```

## Task 3: Add Reusable Finn Drawer and Global Script

**Files:**
- Create: `src/_includes/finn-drawer.njk`
- Modify: `src/_layouts/base.njk`
- Modify: `src/connect/index.njk`
- Create: `public/js/finn-global.js`

- [ ] **Step 1: Create the drawer include**

Create `src/_includes/finn-drawer.njk`:

```njk
<aside class="finn-drawer" data-finn-drawer aria-hidden="true" aria-label="Ask Finn">
  <button class="finn-drawer__launcher" type="button" data-finn-open aria-expanded="false">
    <span aria-hidden="true">F</span>
    <span>Ask Finn</span>
  </button>

  <section class="finn-drawer__panel" role="dialog" aria-modal="false" aria-labelledby="finnDrawerTitle">
    <div class="finn-drawer__topline">
      <div>
        <p class="ops-panel-label">Site interpreter</p>
        <h2 id="finnDrawerTitle">Ask Finn.</h2>
      </div>
      <button class="finn-drawer__close" type="button" data-finn-close aria-label="Close Finn">Close</button>
    </div>

    <div class="finn-chat finn-chat--drawer" data-finn-chat role="region" aria-label="Chat with Finn, Dreamborn's AI agent">
      <div class="finn-chat__header">
        <div class="finn-chat__avatar" aria-hidden="true">F</div>
        <div>
          <p class="finn-chat__name">Finn</p>
          <p class="finn-chat__subtitle">Dreamborn AI Agent</p>
        </div>
      </div>

      <div class="finn-chat__messages" data-finn-messages role="log" aria-live="polite" aria-label="Conversation">
        <div class="message-bubble message-bubble--finn" role="article" aria-label="Finn: greeting">
          I can translate what you&rsquo;re looking at, explain how Dreamborn works, or help you pressure-test an AI strategy.
        </div>
        <div class="finn-typing" data-finn-typing aria-hidden="true" aria-label="Finn is typing">
          <span class="finn-typing-dot"></span>
          <span class="finn-typing-dot"></span>
          <span class="finn-typing-dot"></span>
        </div>
      </div>

      <div class="suggested-prompts" data-finn-prompts role="group" aria-label="Suggested messages">
        <button class="prompt-pill" data-finn-prompt="Explain this page in plain English.">Explain this page</button>
        <button class="prompt-pill" data-finn-prompt="Show me how Dreamborn runs.">Show how Dreamborn runs</button>
      </div>

      <p class="finn-error" data-finn-error role="alert">
        Finn is temporarily unavailable. <a href="/connect/">Open the strategy room &rarr;</a>
      </p>

      <div class="finn-chat__input-area">
        <textarea class="finn-chat__input"
                  data-finn-input
                  placeholder="Ask Finn to explain what you&rsquo;re looking at..."
                  aria-label="Message Finn"
                  rows="1"
                  maxlength="2000"></textarea>
        <button class="finn-chat__send" type="button" data-finn-send aria-label="Send message">Send</button>
      </div>
      <p class="finn-chat__subtitle">Chats may be reviewed by Dreamborn to understand demand and route serious inquiries.</p>
    </div>
  </section>
</aside>
```

- [ ] **Step 2: Include drawer and script globally**

Modify `src/_layouts/base.njk` before `</body>`:

```njk
  {% if not no_chrome %}
    {% include "finn-drawer.njk" %}
    <script src="/js/finn-global.js" defer></script>
  {% endif %}
```

- [ ] **Step 3: Stop loading page-only Finn script**

Remove this line from `src/connect/index.njk`:

```njk
<script src="/js/finn-chat.js" defer></script>
```

Keep the connect page markup; `finn-global.js` will support both ID-based page chat and data-attribute drawer chat.

- [ ] **Step 4: Create `public/js/finn-global.js`**

Create a reusable controller that supports a primary page chat when present and the global drawer:

```js
(function () {
  'use strict';

  const SESSION_KEY = 'dreamborn:finn_session_id';
  const drawer = document.querySelector('[data-finn-drawer]');
  const pageChat = document.getElementById('finnMessages') ? createChat({
    root: document,
    messages: document.getElementById('finnMessages'),
    input: document.getElementById('finnInput'),
    send: document.getElementById('finnSendBtn'),
    typing: document.getElementById('finnTyping'),
    prompts: document.getElementById('finnPrompts'),
    error: document.getElementById('finnError'),
  }) : null;
  const drawerChat = drawer ? createChat({
    root: drawer,
    messages: drawer.querySelector('[data-finn-messages]'),
    input: drawer.querySelector('[data-finn-input]'),
    send: drawer.querySelector('[data-finn-send]'),
    typing: drawer.querySelector('[data-finn-typing]'),
    prompts: drawer.querySelector('[data-finn-prompts]'),
    error: drawer.querySelector('[data-finn-error]'),
  }) : null;

  window.finnSessionId = getFinnSessionId();

  document.addEventListener('click', function (event) {
    const openTrigger = event.target.closest('[data-finn-open]');
    if (openTrigger) {
      const prompt = openTrigger.dataset.finnPrompt || '';
      openDrawer(prompt);
      return;
    }

    const closeTrigger = event.target.closest('[data-finn-close]');
    if (closeTrigger) {
      closeDrawer();
    }
  });

  document.querySelectorAll('[data-finn-prompt]').forEach(function (starter) {
    starter.addEventListener('click', function () {
      const text = starter.dataset.finnPrompt;
      if (!text) return;
      const chat = starter.closest('[data-finn-drawer]') ? drawerChat : (pageChat || drawerChat);
      if (chat === drawerChat) openDrawer(text);
      chat?.submit(text, text);
    });
  });

  window.handleFinnKeydown = function (event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    const chat = event.target.closest('[data-finn-drawer]') ? drawerChat : pageChat;
    chat?.sendCurrent();
  };

  window.sendFinnMessage = function () {
    (pageChat || drawerChat)?.sendCurrent();
  };

  window.addEventListener('dreamborn:explanation-mode', function (event) {
    if (!event.detail?.active) return;
    openDrawer('Explain what I\'m looking at on the Dreamborn homepage.');
  });

  function openDrawer(prompt) {
    if (!drawer || !drawerChat) return;
    drawer.classList.add('finn-drawer--open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.querySelectorAll('[data-finn-open]').forEach((button) => button.setAttribute('aria-expanded', 'true'));
    if (prompt && drawerChat.input) drawerChat.input.value = prompt;
    setTimeout(() => drawerChat.input?.focus(), 80);
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('finn-drawer--open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.querySelectorAll('[data-finn-open]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
  }

  function createChat(parts) {
    const messages = [];
    let ready = true;
    let promptsHidden = false;
    let lastStarterPrompt = null;

    parts.input?.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      sendCurrent();
    });
    parts.send?.addEventListener('click', sendCurrent);

    return {
      input: parts.input,
      sendCurrent,
      submit,
    };

    function sendCurrent() {
      const text = (parts.input?.value || '').trim();
      if (!text) return;
      if (parts.input) parts.input.value = '';
      submit(text, lastStarterPrompt);
    }

    async function submit(text, sourcePrompt) {
      if (!ready) return;
      ready = false;
      lastStarterPrompt = sourcePrompt || text;
      if (!promptsHidden && parts.prompts) {
        parts.prompts.classList.add('hidden');
        promptsHidden = true;
      }
      appendBubble('user', text);
      messages.push({ role: 'user', content: text });
      setTyping(true);
      setError(false);
      setDisabled(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(function () { controller.abort(); }, 15_000);

      try {
        const res = await fetch('/api/finn/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            visitor_email: window.finnVisitorEmail || null,
            session_id: window.finnSessionId,
            page_path: window.location.pathname,
            referrer: document.referrer || null,
            source_prompt: lastStarterPrompt,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Finn unavailable');
        const data = await res.json();
        const reply = data.reply || '';
        messages.push({ role: 'assistant', content: reply });
        setTyping(false);
        appendBubble('finn', reply);
      } catch {
        clearTimeout(timeoutId);
        setTyping(false);
        setError(true);
      } finally {
        ready = true;
        setDisabled(false);
        lastStarterPrompt = null;
      }
    }

    function appendBubble(role, text) {
      if (!parts.messages) return;
      if (parts.typing && parts.typing.parentNode === parts.messages) parts.messages.removeChild(parts.typing);
      const div = document.createElement('div');
      div.className = `message-bubble message-bubble--${role}`;
      div.setAttribute('role', 'article');
      div.setAttribute('aria-label', `${role === 'finn' ? 'Finn' : 'You'}: message`);
      div.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
      parts.messages.appendChild(div);
      if (parts.typing) parts.messages.appendChild(parts.typing);
      parts.messages.scrollTop = parts.messages.scrollHeight;
    }

    function setTyping(visible) {
      if (!parts.typing) return;
      parts.typing.classList.toggle('visible', visible);
      parts.typing.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function setError(visible) {
      parts.error?.classList.toggle('visible', visible);
    }

    function setDisabled(disabled) {
      if (parts.send) parts.send.disabled = disabled;
      if (parts.input) parts.input.disabled = disabled;
    }
  }

  function getFinnSessionId() {
    try {
      const existing = window.sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const created = crypto.randomUUID
        ? crypto.randomUUID()
        : `finn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_KEY, created);
      return created;
    } catch {
      return `finn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS for both `homepage-explanation.test.mjs` and any existing Node tests.

- [ ] **Step 6: Commit global Finn drawer**

```bash
git add src/_includes/finn-drawer.njk src/_layouts/base.njk src/connect/index.njk public/js/finn-global.js
git commit -m "feat: add site-wide Finn interpreter"
```

## Task 4: Add Explanation and Finn Drawer Styling

**Files:**
- Modify: `public/css/main.css`

- [ ] **Step 1: Add explanation-mode CSS**

Add CSS near the existing `.ops-home` section:

```css
.ops-home [data-explain-text],
.ops-home [data-explain-toggle-label] {
  transition: opacity var(--transition-base), color var(--transition-base);
}

.ops-home--explained .ops-hero__title {
  max-width: 760px;
}

.ops-proof__note {
  display: block;
  margin-top: var(--space-2);
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-muted);
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: opacity var(--transition-base), max-height var(--transition-base);
}

.ops-home--explained .ops-proof__note {
  opacity: 1;
  max-height: 4rem;
}
```

- [ ] **Step 2: Add global Finn drawer CSS**

Add CSS near the existing Finn Chat styles:

```css
.finn-drawer {
  position: fixed;
  right: var(--space-5);
  bottom: var(--space-5);
  z-index: 120;
  pointer-events: none;
}

.finn-drawer__launcher,
.finn-drawer__panel {
  pointer-events: auto;
}

.finn-drawer__launcher {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border: 1px solid rgba(141, 198, 63, 0.36);
  background: rgba(10, 8, 7, 0.94);
  color: var(--color-status-active);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
}

.finn-drawer__launcher span:first-child {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(141, 198, 63, 0.14);
}

.finn-drawer__panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + var(--space-3));
  width: min(420px, calc(100vw - 32px));
  max-height: min(680px, calc(100vh - 120px));
  opacity: 0;
  transform: translateY(12px);
  visibility: hidden;
  transition: opacity var(--transition-base), transform var(--transition-base), visibility var(--transition-base);
}

.finn-drawer--open .finn-drawer__panel {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.finn-drawer__topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-bottom: 0;
  background: rgba(10, 8, 7, 0.98);
}

.finn-drawer__topline h2 {
  font-size: 24px;
  line-height: 1;
  color: var(--color-text-primary);
}

.finn-drawer__close {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
}

.finn-chat--drawer {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  max-height: calc(min(680px, calc(100vh - 120px)) - 82px);
}

@media (max-width: 640px) {
  .finn-drawer {
    right: var(--space-4);
    left: var(--space-4);
    bottom: var(--space-4);
  }

  .finn-drawer__panel {
    width: 100%;
    right: 0;
  }

  .finn-drawer__launcher {
    width: 100%;
    justify-content: center;
  }
}
```

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: Eleventy build completes with no template or CSS asset errors.

- [ ] **Step 4: Commit CSS**

```bash
git add public/css/main.css
git commit -m "style: polish homepage explanation and Finn drawer"
```

## Task 5: Browser Verification

**Files:**
- No source changes expected unless verification finds an issue.

- [ ] **Step 1: Run full verification commands**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass.

- [ ] **Step 2: Start local server**

Run: `npm run dev -- --port 8089`

Expected: Eleventy serves the site at `http://localhost:8089/`.

- [ ] **Step 3: Manually verify homepage**

Open `http://localhost:8089/` and confirm:

- Default hero shows `What's your AI strategy? This is ours.`
- Button label is `What am I looking at?`.
- Clicking the button changes the hero to `A company operating through AI agents.`
- Proof notes appear under the stats.
- Button label changes to `Show the operating surface`.
- Finn drawer opens with `Explain what I'm looking at on the Dreamborn homepage.` in the input.
- Clicking `Show the operating surface` restores the original homepage copy.

- [ ] **Step 4: Manually verify site-wide Finn**

Open `http://localhost:8089/work/` and confirm:

- Finn launcher is visible.
- Clicking Finn opens the drawer.
- `Explain this page` fills/sends a page-aware prompt without leaving `/work/`.

- [ ] **Step 5: Manually verify `/connect/`**

Open `http://localhost:8089/connect/` and confirm:

- Existing Connect page chat still renders.
- Prompt pills submit into the page chat.
- The global drawer does not break the Connect page layout.

- [ ] **Step 6: Commit verification fixes if needed**

If source changes were needed:

```bash
git add src public package.json tests
git commit -m "fix: verify homepage explanation flow"
```

If no changes were needed, do not create an empty commit.

## Self-Review

Spec coverage:

- Homepage in-place transform: Task 2 and Task 4.
- Finn everywhere: Task 3 and Task 5.
- No separate translated homepage: all tasks modify current homepage only.
- Existing live operating surface preserved: Task 2 layers data hooks without removing feed rendering.
- Accessibility/resilience: Task 2 uses a button and preserves default HTML; Task 3 keeps `/connect/`; Task 5 browser-checks keyboard-visible controls manually.
- Analytics metadata: Task 3 preserves `session_id`, `page_path`, `referrer`, and `source_prompt` in `/api/finn/chat` payload.

Placeholder scan: no TBD/TODO/fill-in placeholders are intentionally left in the plan.

Type consistency: `data-explain-toggle`, `data-explain-text`, `data-explain-toggle-label`, `data-finn-open`, `data-finn-prompt`, and the `dreamborn:explanation-mode` event are named consistently across tasks.

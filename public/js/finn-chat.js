/**
 * finn-chat.js — Finn chat interface for /connect page
 * Manages conversation state, sends messages to /api/finn/chat,
 * handles UI transitions and error states.
 *
 * Browser holds full conversation history (stateless Worker).
 * Conversation persists in memory for the browser session only.
 */
(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  window.finnMessages = []; // Array<{ role: 'user'|'assistant', content: string }>
  window.finnVisitorEmail = null;
  window.finnSessionId = getFinnSessionId();
  let finnReady = true;
  let promptsHidden = false;
  let lastStarterPrompt = null;

  // ─── DOM refs ────────────────────────────────────────────────
  const messagesEl   = document.getElementById('finnMessages');
  const inputEl      = document.getElementById('finnInput');
  const sendBtn      = document.getElementById('finnSendBtn');
  const typingEl     = document.getElementById('finnTyping');
  const promptsEl    = document.getElementById('finnPrompts');
  const errorEl      = document.getElementById('finnError');

  // ─── Prompt starters ────────────────────────────────────────
  document.querySelectorAll('[data-finn-prompt]').forEach(function (starter) {
    starter.addEventListener('click', function () {
      const text = starter.dataset.finnPrompt;
      if (!text) return;
      lastStarterPrompt = text;

      const chat = document.querySelector('.connect-chat-shell');
      if (chat) {
        chat.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      submitMessage(text);
    });
  });

  // ─── Send on Enter (not Shift+Enter) ─────────────────────────
  window.handleFinnKeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendFinnMessage();
    }
  };

  // ─── Public send handler ─────────────────────────────────────
  window.sendFinnMessage = function () {
    const text = (inputEl ? inputEl.value : '').trim();
    if (!text) return;
    if (inputEl) inputEl.value = '';
    submitMessage(text);
  };

  // ─── Core submit ─────────────────────────────────────────────
  async function submitMessage(text) {
    if (!finnReady) return;
    finnReady = false;

    // Hide prompts on first message
    if (!promptsHidden && promptsEl) {
      promptsEl.classList.add('hidden');
      promptsHidden = true;
    }

    // Render user bubble
    appendBubble('user', text);

    // Add to history
    window.finnMessages.push({ role: 'user', content: text });

    // Show typing indicator
    setTyping(true);
    setError(false);
    setSendDisabled(true);

    // Browser-side abort after 15s
    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, 15_000);

    try {
      const res = await fetch('/api/finn/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: window.finnMessages,
          visitor_email: window.finnVisitorEmail,
          session_id: window.finnSessionId,
          page_path: window.location.pathname,
          referrer: document.referrer || null,
          source_prompt: lastStarterPrompt,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // 429 or 502 — show error state
        setTyping(false);
        setError(true);
        finnReady = true;
        setSendDisabled(false);
        return;
      }

      const data = await res.json();
      const reply = data.reply || '';

      // Add assistant reply to history
      window.finnMessages.push({ role: 'assistant', content: reply });

      // Hide typing, render reply
      setTyping(false);
      appendBubble('finn', reply);
      lastStarterPrompt = null;

    } catch (err) {
      clearTimeout(timeoutId);
      setTyping(false);
      setError(true); // AbortError or network error
    } finally {
      finnReady = true;
      setSendDisabled(false);
      lastStarterPrompt = null;
    }
  }

  // ─── UI helpers ──────────────────────────────────────────────
  function appendBubble(role, text) {
    if (!messagesEl) return;

    // Remove typing indicator from DOM flow before appending
    if (typingEl && typingEl.parentNode === messagesEl) {
      messagesEl.removeChild(typingEl);
    }

    const div = document.createElement('div');
    div.className = `message-bubble message-bubble--${role}`;
    div.setAttribute('role', 'article');
    div.setAttribute('aria-label', `${role === 'finn' ? 'Finn' : 'You'}: message`);

    // Render newlines as <br>
    div.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');

    messagesEl.appendChild(div);

    // Re-append typing indicator at bottom
    if (typingEl) {
      messagesEl.appendChild(typingEl);
    }

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setTyping(visible) {
    if (!typingEl) return;
    if (visible) {
      typingEl.classList.add('visible');
      typingEl.setAttribute('aria-hidden', 'false');
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    } else {
      typingEl.classList.remove('visible');
      typingEl.setAttribute('aria-hidden', 'true');
    }
  }

  function setError(visible) {
    if (!errorEl) return;
    if (visible) {
      errorEl.classList.add('visible');
    } else {
      errorEl.classList.remove('visible');
    }
  }

  function setSendDisabled(disabled) {
    if (sendBtn) sendBtn.disabled = disabled;
    if (inputEl) inputEl.disabled = disabled;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getFinnSessionId() {
    const key = 'dreamborn:finn_session_id';
    try {
      const existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
      const created = crypto.randomUUID
        ? crypto.randomUUID()
        : `finn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(key, created);
      return created;
    } catch {
      return `finn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }
})();

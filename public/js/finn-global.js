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
    if (starter.hasAttribute('data-finn-open')) return;
    starter.addEventListener('click', function () {
      const text = starter.dataset.finnPrompt;
      if (!text) return;
      const chat = starter.closest('[data-finn-drawer]') ? drawerChat : (pageChat || drawerChat);
      if (chat === drawerChat) openDrawer('');
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

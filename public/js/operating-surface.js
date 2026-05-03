(function () {
  'use strict';

  const root = document.querySelector('[data-operating-surface]');
  if (!root) return;

  const feedList = root.querySelector('[data-feed-list]');
  const cardsRoot = root.querySelector('[data-work-cards]');
  const ledgerRoot = root.querySelector('[data-ledger]');
  const agentGrid = root.querySelector('[data-agent-grid]');
  const personaPanel = root.querySelector('[data-persona-panel]');
  const systemState = root.querySelector('[data-system-state]');
  const liveBadge = root.querySelector('[data-live-badge]');
  const activeAgents = root.querySelector('[data-proof-active-agents]');
  const workflows = root.querySelector('[data-proof-workflows]');
  const explainToggle = root.querySelector('[data-explain-toggle]');
  const explainStatus = root.querySelector('[data-explain-status]');
  const explainTextNodes = Array.from(root.querySelectorAll('[data-explain-text], [data-explain-toggle-label]'));

  const POLL_MS = 30_000;
  let lastUpdatedAt = null;
  let explanationActive = false;
  let reassemblyTimer = null;
  let swapTimer = null;
  let settleTimer = null;

  async function refresh() {
    try {
      const res = await fetch('/api/operating-surface', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Feed unavailable');
      render(data);
    } catch (error) {
      renderUnavailable(error.message);
    }
  }

  function render(data) {
    lastUpdatedAt = new Date(data.updated_at);
    renderStatus(data);
    renderFeed(data.feed || []);
    renderCards(data.cards || []);
    renderLedger(data.ledger || []);
    renderAgents(data.agents || []);
    updateLiveAge();
  }

  function renderStatus(data) {
    const state = data.system_state || {};
    if (systemState) {
      systemState.textContent = `System state: ${state.label || 'live feed connected'}`;
    }
    if (activeAgents) activeAgents.textContent = String(state.working || 0);
    if (workflows) workflows.textContent = hasAnyUnavailable(data.source_status) ? 'partial' : 'live';
  }

  function renderFeed(feed) {
    if (!feedList) return;
    if (!feed.length) {
      feedList.innerHTML = '<div class="ops-feed__empty">No public feed entries returned yet.</div>';
      return;
    }

    feedList.innerHTML = feed.map((item) => `
      <button class="ops-feed-row ops-feed-row--${escapeAttr(item.kind || 'event')}" type="button" data-open-card="${escapeAttr(item.card_id || '')}" ${item.card_id ? '' : 'disabled'}>
        <time datetime="${escapeAttr(item.timestamp)}">${formatClock(item.timestamp)}</time>
        <span class="ops-feed-row__agent">${escapeHtml(item.agent || 'System')}</span>
        <span class="ops-feed-row__body">
          ${escapeHtml(item.action || 'recorded')}
          <strong>${escapeHtml(quoteObject(item.object || 'work item'))}</strong>
          <span aria-hidden="true">→</span>
          ${escapeHtml(item.result || 'logged')}
        </span>
      </button>
    `).join('');
  }

  function renderCards(cards) {
    if (!cardsRoot) return;
    if (!cards.length) {
      cardsRoot.innerHTML = `
        <article class="ops-work-card ops-work-card--empty">
          <p class="ops-card-title">No public work cards returned</p>
          <p class="ops-card-preview">The live source returned no task, inbox, or ledger records for public display.</p>
        </article>
      `;
      return;
    }

    cardsRoot.innerHTML = cards.map((card) => `
      <article class="ops-work-card ops-work-card--${escapeAttr(card.status_kind || 'queued')}" id="${escapeAttr(card.id)}" data-card-id="${escapeAttr(card.id)}">
        <div class="ops-work-card__topline">
          <span class="ops-card-eyebrow">${escapeHtml(card.eyebrow || card.kind || 'Work')}</span>
          <span class="ops-card-status">${escapeHtml(card.status || 'Recorded')}</span>
        </div>
        <h3 class="ops-card-title">${escapeHtml(card.title || 'Recorded work')}</h3>
        <dl class="ops-card-meta">
          ${(card.meta || []).map(([label, value]) => `
            <div>
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>
          `).join('')}
        </dl>
        <p class="ops-card-preview">${escapeHtml(card.preview || '')}</p>
        ${card.full_output ? `
          <details class="ops-card-output">
            <summary>View full output</summary>
            <pre>${escapeHtml(card.full_output)}</pre>
          </details>
        ` : ''}
      </article>
    `).join('');
  }

  function renderLedger(rows) {
    if (!ledgerRoot) return;
    if (!rows.length) {
      ledgerRoot.innerHTML = '<div class="ops-ledger__empty">No public ledger rows returned yet.</div>';
      return;
    }

    ledgerRoot.innerHTML = rows.map((row) => `
      <div class="ops-ledger-row">
        <time datetime="${escapeAttr(row.timestamp)}">${formatClock(row.timestamp)}</time>
        <code>${escapeHtml(row.ref || 'none')}</code>
        <span>${escapeHtml(row.actor || 'System')}</span>
        <span>${escapeHtml(row.event || 'recorded')}</span>
        <strong>${escapeHtml(row.result || 'logged')}</strong>
      </div>
    `).join('');
  }

  function renderAgents(agents) {
    if (!agentGrid) return;
    agentGrid.innerHTML = agents.map((agent) => `
      <button class="ops-agent-card ops-agent-card--${escapeAttr(agent.status || 'idle')}" type="button"
        data-agent-persona="${escapeAttr(agent.id)}"
        data-agent-name="${escapeAttr(agent.name || agent.id)}"
        data-agent-role="${escapeAttr(agent.role || 'Agent')}"
        data-agent-status="${escapeAttr(agent.status || 'idle')}"
        data-agent-action="${escapeAttr(agent.error || agent.action || 'Waiting for work')}"
        data-agent-persona-copy="${escapeAttr(agent.persona || '')}">
        <div>
          <h3>${escapeHtml(agent.name || agent.id)}</h3>
          <p>${escapeHtml(agent.role || 'Agent')}</p>
        </div>
        <span>${escapeHtml(agent.status || 'idle')}</span>
        <small>${escapeHtml(agent.error || agent.action || 'Waiting for work')}</small>
      </button>
    `).join('');
  }

  function renderUnavailable(message) {
    if (liveBadge) liveBadge.textContent = 'unavailable';
    if (systemState) systemState.textContent = `System state: ${message}`;
    if (feedList) feedList.innerHTML = '<div class="ops-feed__empty">Live operating feed unavailable.</div>';
  }

  function setExplanationMode(active) {
    explanationActive = active;
    root.classList.remove('ops-home--reassembling', 'ops-home--settling');
    root.classList.add('ops-home--swapping');
    if (explainStatus) explainStatus.classList.remove('ops-explain-status--visible');
    if (reassemblyTimer) window.clearTimeout(reassemblyTimer);
    if (swapTimer) window.clearTimeout(swapTimer);
    if (settleTimer) window.clearTimeout(settleTimer);

    swapTimer = window.setTimeout(() => {
      applyExplanationMode(active);
      root.classList.remove('ops-home--swapping');
      root.classList.add('ops-home--settling');
      settleTimer = window.setTimeout(() => {
        root.classList.remove('ops-home--settling');
      }, 380);
    }, 260);
  }

  function applyExplanationMode(active) {
    root.classList.toggle('ops-home--explained', active);
    root.setAttribute('data-explanation-mode', active ? 'explained' : 'default');

    explainTextNodes.forEach((node) => {
      const html = active ? node.dataset.explainedHtml : node.dataset.defaultHtml;
      const text = active ? node.dataset.explainedText : node.dataset.defaultText;
      if (html) {
        node.innerHTML = html;
      } else if (text) {
        node.textContent = text;
      }
    });

    if (explainToggle) {
      explainToggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    if (active && window.matchMedia('(max-width: 640px)').matches) {
      root.scrollIntoView({ block: 'start' });
    }

    if (!active) {
      root.classList.add('ops-home--reassembling');
      if (explainStatus) explainStatus.classList.add('ops-explain-status--visible');
      reassemblyTimer = window.setTimeout(() => {
        root.classList.remove('ops-home--reassembling');
        if (explainStatus) explainStatus.classList.remove('ops-explain-status--visible');
      }, 1800);
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

  function bindClicks() {
    document.addEventListener('click', function (event) {
      const trigger = event.target.closest('[data-open-card]');
      if (!trigger) return;
      const id = trigger.getAttribute('data-open-card');
      if (!id) return;
      const card = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ops-work-card--selected');
      setTimeout(() => card.classList.remove('ops-work-card--selected'), 1600);
    });

    document.addEventListener('click', function (event) {
      const trigger = event.target.closest('[data-agent-persona]');
      if (!trigger || !personaPanel) return;
      personaPanel.hidden = false;
      personaPanel.innerHTML = `
        <div class="ops-persona-panel__topline">
          <span>${escapeHtml(trigger.dataset.agentRole || 'Agent')}</span>
          <span>${escapeHtml(trigger.dataset.agentStatus || 'idle')}</span>
        </div>
        <h3>${escapeHtml(trigger.dataset.agentName || 'Agent')}</h3>
        <p>${escapeHtml(trigger.dataset.agentPersonaCopy || 'Persona summary not available.')}</p>
        <small>${escapeHtml(trigger.dataset.agentAction || 'Waiting for work')}</small>
      `;
      personaPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.querySelectorAll('.ops-agent-card--selected').forEach((card) => card.classList.remove('ops-agent-card--selected'));
      trigger.classList.add('ops-agent-card--selected');
    });
  }

  function updateLiveAge() {
    if (!liveBadge || !lastUpdatedAt) return;
    const seconds = Math.max(0, Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000));
    liveBadge.textContent = seconds < 2 ? 'live - just updated' : `live - updated ${seconds}s ago`;
  }

  function hasAnyUnavailable(status) {
    return Object.values(status || {}).some((value) => String(value).startsWith('unavailable'));
  }

  function quoteObject(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.length > 42 ? `"${text.slice(0, 41)}…"` : `"${text}"`;
  }

  function formatClock(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--:--:--';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  bindExplanationToggle();
  bindClicks();
  refresh();
  setInterval(refresh, POLL_MS);
  setInterval(updateLiveAge, 1000);
})();

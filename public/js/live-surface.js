(function () {
  'use strict';

  const root = document.querySelector('[data-live-room]');
  if (!root) return;

  const POLL_MS = 20_000;
  const feedRoot = root.querySelector('[data-live-feed]');
  const cardsRoot = root.querySelector('[data-live-cards]');
  const ledgerRoot = root.querySelector('[data-live-ledger]');
  const inspector = root.querySelector('[data-live-inspector]');
  const liveBadge = root.querySelector('[data-live-badge]');
  const liveUpdated = root.querySelector('[data-live-updated]');
  const systemState = root.querySelector('[data-system-state]');
  const workingMetric = root.querySelector('[data-metric-working]');
  const idleMetric = root.querySelector('[data-metric-idle]');
  const verificationMetric = root.querySelector('[data-metric-verification]');
  const feedCount = root.querySelector('[data-feed-count]');
  const cardCount = root.querySelector('[data-card-count]');
  const ledgerCount = root.querySelector('[data-ledger-count]');

  let currentData = null;
  let selectedId = null;
  let lastUpdatedAt = null;

  async function refresh() {
    try {
      const res = await fetch('/api/operating-surface', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Operating feed unavailable');
      currentData = data;
      lastUpdatedAt = new Date(data.updated_at);
      render(data);
    } catch (error) {
      renderUnavailable(error.message);
    }
  }

  function render(data) {
    const feed = data.feed || [];
    const cards = data.cards || [];
    const ledger = data.ledger || [];
    const state = data.system_state || {};

    if (!selectedId && cards[0]) selectedId = cards[0].id;

    if (systemState) systemState.textContent = state.label || 'live feed connected';
    if (workingMetric) workingMetric.textContent = String(state.working || 0);
    if (idleMetric) idleMetric.textContent = String(state.idle || 0);
    if (verificationMetric) verificationMetric.textContent = String(state.awaiting_verification || 0);
    if (feedCount) feedCount.textContent = `${feed.length} events`;
    if (cardCount) cardCount.textContent = `${cards.length} receipts`;
    if (ledgerCount) ledgerCount.textContent = `${ledger.length} rows`;

    renderFeed(feed);
    renderCards(cards);
    renderLedger(ledger);
    renderInspector(findSelected());
    updateLiveAge();
  }

  function renderFeed(feed) {
    if (!feedRoot) return;
    if (!feed.length) {
      feedRoot.innerHTML = '<div class="ops-feed__empty">No public feed entries returned yet.</div>';
      return;
    }

    feedRoot.innerHTML = `
      <div class="live-wire__signal" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      ${feed.map((item, index) => {
      const cardId = item.card_id || '';
      const selected = cardId && cardId === selectedId;
      return `
        <button class="live-wire-row live-wire-row--${escapeAttr(item.kind || 'event')} ${selected ? 'is-selected' : ''}" type="button" data-select-id="${escapeAttr(cardId)}" ${cardId ? '' : 'disabled'}>
          <span class="live-wire-row__pulse" aria-hidden="true"></span>
          <span class="live-wire-row__index">${String(index + 1).padStart(2, '0')}</span>
          <time datetime="${escapeAttr(item.timestamp)}">${formatClock(item.timestamp)}</time>
          <strong>${escapeHtml(item.agent || 'System')}</strong>
          <span>${escapeHtml(item.action || 'recorded')} ${escapeHtml(quoteObject(item.object || 'work item'))}</span>
          <em>${escapeHtml(item.result || 'logged')}</em>
        </button>
      `;
      }).join('')}
    `;
  }

  function renderCards(cards) {
    if (!cardsRoot) return;
    if (!cards.length) {
      cardsRoot.innerHTML = '<div class="ops-feed__empty">No public receipt cards returned yet.</div>';
      return;
    }

    cardsRoot.innerHTML = cards.map((card) => {
      const meta = Object.fromEntries(card.meta || []);
      return `
        <button class="live-receipt ${card.id === selectedId ? 'is-selected' : ''}" type="button" data-select-id="${escapeAttr(card.id)}">
          <span class="live-receipt__top">
            <span>${escapeHtml(card.eyebrow || card.kind || 'Work')}</span>
            <strong>${escapeHtml(card.status || 'Recorded')}</strong>
          </span>
          <span class="live-receipt__title">${escapeHtml(card.title || 'Recorded work')}</span>
          <span class="live-receipt__meta">
            <span>${escapeHtml(meta.Cost || 'cost unavailable')}</span>
            <span>${escapeHtml(meta.Duration || 'duration unavailable')}</span>
          </span>
        </button>
      `;
    }).join('');
  }

  function renderLedger(rows) {
    if (!ledgerRoot) return;
    if (!rows.length) {
      ledgerRoot.innerHTML = '<div class="ops-ledger__empty">No public ledger rows returned yet.</div>';
      return;
    }

    ledgerRoot.innerHTML = rows.map((row) => `
      <div class="live-ledger-row">
        <time datetime="${escapeAttr(row.timestamp)}">${formatClock(row.timestamp)}</time>
        <code>${escapeHtml(row.ref || 'none')}</code>
        <span>${escapeHtml(row.actor || 'System')}</span>
        <span>${escapeHtml(row.event || 'recorded')}</span>
        <strong>${escapeHtml(row.result || 'logged')}</strong>
      </div>
    `).join('');
  }

  function renderInspector(card) {
    if (!inspector) return;
    if (!card) {
      inspector.innerHTML = '<p>Select a wire event or receipt to inspect the work record.</p>';
      return;
    }

    inspector.innerHTML = `
      <div class="live-inspector__topline">
        <span>${escapeHtml(card.eyebrow || card.kind || 'Work')}</span>
        <strong>${escapeHtml(card.status || 'Recorded')}</strong>
      </div>
      <h3>${escapeHtml(card.title || 'Recorded work')}</h3>
      <dl>
        ${(card.meta || []).map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join('')}
      </dl>
      <p>${escapeHtml(card.preview || '')}</p>
      ${card.full_output ? `<pre>${escapeHtml(card.full_output)}</pre>` : ''}
    `;
  }

  function findSelected() {
    const cards = currentData ? currentData.cards || [] : [];
    return cards.find((card) => card.id === selectedId) || cards[0] || null;
  }

  function renderUnavailable(message) {
    if (liveBadge) liveBadge.textContent = 'unavailable';
    if (liveUpdated) liveUpdated.textContent = message;
    if (systemState) systemState.textContent = 'feed unavailable';
    if (feedRoot) feedRoot.innerHTML = '<div class="ops-feed__empty">Live operating feed unavailable.</div>';
    if (cardsRoot) cardsRoot.innerHTML = '<div class="ops-feed__empty">Receipt cards unavailable.</div>';
    if (ledgerRoot) ledgerRoot.innerHTML = '<div class="ops-ledger__empty">Ledger unavailable.</div>';
  }

  function bindClicks() {
    root.addEventListener('click', function (event) {
      const trigger = event.target.closest('[data-select-id]');
      if (!trigger || trigger.disabled) return;
      const id = trigger.getAttribute('data-select-id');
      if (!id) return;
      selectedId = id;
      if (currentData) render(currentData);
    });
  }

  function updateLiveAge() {
    if (!liveBadge || !liveUpdated || !lastUpdatedAt) return;
    const seconds = Math.max(0, Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000));
    liveBadge.textContent = seconds < 2 ? 'live' : `live - ${seconds}s`;
    liveUpdated.textContent = seconds < 2 ? 'just updated' : `updated ${seconds}s ago`;
  }

  function quoteObject(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.length > 52 ? `"${text.slice(0, 51)}..."` : `"${text}"`;
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

  bindClicks();
  refresh();
  setInterval(refresh, POLL_MS);
  setInterval(updateLiveAge, 1000);
})();

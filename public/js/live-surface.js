(function () {
  'use strict';

  const root = document.querySelector('[data-live-room]');
  if (!root) return;

  const POLL_MS = 20_000;
  const feedRoot = root.querySelector('[data-live-feed]');
  const cardsRoot = root.querySelector('[data-live-cards]');
  const ledgerRoot = root.querySelector('[data-live-ledger]');
  const inspector = root.querySelector('[data-live-inspector]');
  const agentsRoot = root.querySelector('[data-live-agents]');
  const fleetStage = root.querySelector('[data-fleet-stage]');
  const fleetBench = root.querySelector('[data-fleet-bench]');
  const fleetLiveLabel = root.querySelector('[data-fleet-live-label]');
  const networkRoot = root.querySelector('[data-live-network]');
  const liveBadge = root.querySelector('[data-live-badge]');
  const liveUpdated = root.querySelector('[data-live-updated]');
  const systemState = root.querySelector('[data-system-state]');
  const workingMetric = root.querySelector('[data-metric-working]');
  const idleMetric = root.querySelector('[data-metric-idle]');
  const verificationMetric = root.querySelector('[data-metric-verification]');
  const feedCount = root.querySelector('[data-feed-count]');
  const cardCount = root.querySelector('[data-card-count]');
  const ledgerCount = root.querySelector('[data-ledger-count]');
  const agentCount = root.querySelector('[data-agent-count]');

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
    const agents = data.agents || [];
    const state = data.system_state || {};

    if (!selectedId && cards[0]) selectedId = cards[0].id;

    if (systemState) systemState.textContent = state.label || 'live feed connected';
    if (workingMetric) workingMetric.textContent = String(state.working || 0);
    if (idleMetric) idleMetric.textContent = String(state.idle || 0);
    if (verificationMetric) verificationMetric.textContent = String(state.awaiting_verification || 0);
    if (feedCount) feedCount.textContent = `${feed.length} events`;
    if (cardCount) cardCount.textContent = `${cards.length} receipts`;
    if (ledgerCount) ledgerCount.textContent = `${ledger.length} rows`;
    if (agentCount) agentCount.textContent = `${agents.length} agents`;

    renderAgents(agents);
    renderNetwork(agents);
    renderFeed(feed);
    renderCards(cards);
    renderLedger(ledger);
    renderInspector(findSelected());
    updateLiveAge();
  }

  function renderAgents(agents) {
    if (!agentsRoot || !fleetStage || !fleetBench) return;
    if (!agents.length) {
      fleetStage.innerHTML = '<div class="ops-feed__empty">No public agent states returned yet.</div>';
      fleetBench.innerHTML = '';
      return;
    }

    const live = agents
      .filter((agent) => ['working', 'blocked', 'verification'].includes(normalizeStatus(agent.status)))
      .sort((a, b) => agentRank(a) - agentRank(b));
    const idle = agents
      .filter((agent) => !['working', 'blocked', 'verification'].includes(normalizeStatus(agent.status)))
      .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));

    if (fleetLiveLabel) {
      fleetLiveLabel.textContent = live.length ? `Live now - ${live.length} active` : 'Live now - 0 active';
    }

    fleetStage.innerHTML = live.length ? live.map((agent) => {
      const status = normalizeStatus(agent.status);
      const taskCardId = findCardIdByTask(agent.task_id);
      const role = roleLabel(agent);
      const fill = status === 'blocked' ? 100 : status === 'verification' ? 76 : 55;
      const taskText = cleanAction(agent.action) || (status === 'blocked' ? 'Blocked' : status === 'verification' ? 'Awaiting verification' : 'Working...');
      return `
        <button class="fleet-scard fleet-scard--${escapeAttr(status)}" type="button"
          data-agent-id="${escapeAttr(agent.id || '')}"
          data-agent-task-card="${escapeAttr(taskCardId || '')}"
          ${taskCardId ? '' : 'disabled'}>
          <div class="fleet-scard__header">
            <div class="fleet-scard__avatar" style="--fleet-color:${escapeAttr(roleColor(role))}">${escapeHtml(initial(agent.name || agent.id || 'A'))}</div>
            <div>
              <div class="fleet-scard__name">${escapeHtml(agent.name || agent.id || 'Agent')}</div>
              <div class="fleet-scard__role">${escapeHtml(role)}</div>
            </div>
          </div>
          <div class="fleet-scard__bar">
            <div class="fleet-scard__fill fleet-scard__fill--${escapeAttr(status)}" style="width:${fill}%"></div>
          </div>
          <div class="fleet-scard__task">${escapeHtml(taskText)}</div>
          <div class="fleet-scard__elapsed">
            <span>${escapeHtml(agent.task_id ? String(agent.task_id).slice(0, 16) : status)}</span>
            <span>${escapeHtml(timeAgo(agent.updated_at))}</span>
          </div>
        </button>
      `;
    }).join('') : '<div class="ops-feed__empty">All agents idle.</div>';

    fleetBench.innerHTML = idle.map((agent) => {
      const taskCardId = findCardIdByTask(agent.task_id);
      const role = roleLabel(agent);
      return `
        <button class="fleet-chip" type="button"
          data-agent-id="${escapeAttr(agent.id || '')}"
          data-agent-task-card="${escapeAttr(taskCardId || '')}"
          ${taskCardId ? '' : 'disabled'}>
          <span class="fleet-chip__dot" style="--fleet-color:${escapeAttr(roleColor(role))}" aria-hidden="true"></span>
          <span class="fleet-chip__name">${escapeHtml(agent.name || agent.id || 'Agent')}</span>
        </button>
      `;
    }).join('');
  }

  function renderNetwork(agents) {
    if (!networkRoot) return;
    const live = (agents || [])
      .filter((agent) => ['working', 'blocked', 'verification'].includes(normalizeStatus(agent.status)))
      .slice(0, 5);
    const nodes = live.length ? live : (agents || []).slice(0, 5);
    if (!nodes.length) {
      networkRoot.innerHTML = '<div class="ops-feed__empty">No public network nodes returned yet.</div>';
      return;
    }

    networkRoot.innerHTML = `
      <div class="wire-map" style="--wire-count:${nodes.length}">
        <svg class="wire-map__svg" viewBox="0 0 360 230" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="wireGlow">
              <feGaussianBlur stdDeviation="2.4" result="blur"></feGaussianBlur>
              <feMerge>
                <feMergeNode in="blur"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
              </feMerge>
            </filter>
          </defs>
          ${nodes.map((agent, index) => {
            const y = wireY(index, nodes.length);
            return `
              <path class="wire-map__line wire-map__line--${escapeAttr(normalizeStatus(agent.status))}" d="M54 ${y} C135 ${y}, 166 115, 250 115"></path>
              <circle class="wire-map__packet" r="4">
                <animateMotion dur="${3.4 + index * 0.38}s" repeatCount="indefinite" begin="${index * 0.42}s" path="M54 ${y} C135 ${y}, 166 115, 250 115"></animateMotion>
              </circle>
            `;
          }).join('')}
        </svg>
        <div class="wire-map__engine">
          <strong>Engine</strong>
          <span>Consensus</span>
        </div>
        ${nodes.map((agent, index) => `
          <div class="wire-map__node wire-map__node--${escapeAttr(normalizeStatus(agent.status))}" style="--node-y:${wireY(index, nodes.length)}px">
            <strong>${escapeHtml(agent.name || agent.id || 'Agent')}</strong>
            <span>${escapeHtml(cleanAction(agent.action) || normalizeStatus(agent.status))}</span>
          </div>
        `).join('')}
      </div>
    `;
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

  function findCardIdByTask(taskId) {
    if (!taskId || !currentData) return '';
    const needle = String(taskId);
    const cards = currentData.cards || [];
    const match = cards.find((card) => {
      if (String(card.id || '').includes(needle)) return true;
      return (card.meta || []).some(([label, value]) => /task id/i.test(label) && String(value) === needle);
    });
    return match ? match.id : '';
  }

  function normalizeStatus(status) {
    const value = String(status || 'idle').toLowerCase();
    if (['working', 'running', 'active', 'claimed'].includes(value)) return 'working';
    if (['blocked', 'error', 'failed'].includes(value)) return 'blocked';
    if (['review', 'pending', 'verifying', 'awaiting_verification'].includes(value)) return 'verification';
    return 'idle';
  }

  function agentRank(agent) {
    const status = normalizeStatus(agent.status);
    if (status === 'working') return 0;
    if (status === 'verification') return 1;
    if (status === 'blocked') return 2;
    return 3;
  }

  function cleanAction(action) {
    return String(action || '')
      .replace(/^(claimed|working on|completed):?\s*/i, '')
      .slice(0, 88);
  }

  function roleLabel(agent) {
    const raw = String((agent.roles && agent.roles[0]) || agent.role || 'other').toLowerCase();
    if (raw.includes('develop')) return 'dev';
    if (raw.includes('architect') || raw.includes('platform')) return 'platform';
    if (raw.includes('project') || raw.includes('supervisor') || raw.includes('ops')) return 'ops';
    if (raw.includes('market')) return 'marketing';
    if (raw.includes('visual') || raw.includes('graphic') || raw.includes('design')) return 'design';
    if (raw.includes('business') || raw.includes('planner') || raw === 'ba') return 'planning';
    if (raw.includes('crm') || raw.includes('sales')) return 'crm';
    return raw.split(/[ /]/)[0] || 'other';
  }

  function roleColor(role) {
    const colors = {
      ops: '#C9963A',
      platform: '#6A9A2C',
      dev: '#3D9BE9',
      design: '#9B6FC2',
      planning: '#C9963A',
      crm: '#3DAA8C',
      marketing: '#BE5A9B',
      other: '#6B5F54'
    };
    return colors[role] || colors.other;
  }

  function initial(name) {
    const text = String(name || 'A').trim();
    return text ? text[0].toUpperCase() : 'A';
  }

  function timeAgo(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function wireY(index, count) {
    if (count <= 1) return 115;
    const min = 38;
    const max = 194;
    return Math.round(min + (index * (max - min)) / (count - 1));
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

    root.addEventListener('click', function (event) {
      const trigger = event.target.closest('[data-agent-task-card]');
      if (!trigger || trigger.disabled) return;
      const id = trigger.getAttribute('data-agent-task-card');
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

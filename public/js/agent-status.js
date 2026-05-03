/**
 * agent-status.js — shared module
 * Polls /api/agent-states every 60s and updates all [data-agent] cards.
 * Used on: / (homepage), /work, /system
 */
(function () {
  'use strict';

  const POLL_MS = 60_000;

  async function refreshAgentStates() {
    let data;
    try {
      const res = await fetch('/api/agent-states');
      if (!res.ok) return; // silent failure — retain stale state
      data = await res.json();
    } catch {
      return; // network error — silent
    }

    if (!Array.isArray(data)) return;

    data.forEach(function (agentState) {
      const card = document.querySelector(`[data-agent="${agentState.agent}"]`);
      if (!card) return;

      const prevStatus = card.dataset.status;
      const newStatus = agentState.status || 'offline';

      // Update data attribute
      card.dataset.status = newStatus;

      // Update status dot (with fade transition on status change)
      const dot = card.querySelector('.status-dot');
      if (dot && prevStatus !== newStatus) {
        dot.style.transition = 'opacity 100ms ease';
        dot.style.opacity = '0';
        setTimeout(function () {
          dot.className = `status-dot status-dot--${newStatus}`;
          dot.style.opacity = '1';
        }, 100);
      }

      // Update status label
      const label = card.querySelector('.status-label');
      if (label) {
        label.textContent = newStatus.toUpperCase();
        label.className = `status-label status-label--${newStatus}`;
        label.setAttribute('aria-label', `Status: ${newStatus}`);
      }

      // Update action text
      const actionEl = card.querySelector('.agent-action');
      if (actionEl) {
        const newAction = buildActionText(agentState);
        if (actionEl.textContent !== newAction) {
          actionEl.style.transition = 'opacity 300ms ease';
          actionEl.style.opacity = '0.6';
          actionEl.textContent = newAction;
          requestAnimationFrame(function () {
            actionEl.style.opacity = '1';
          });
        }
      }

      // Update time ago
      const timeEl = card.querySelector('.agent-time');
      if (timeEl && agentState.updated_at) {
        timeEl.textContent = formatTimeAgo(new Date(agentState.updated_at));
        timeEl.setAttribute('datetime', agentState.updated_at);
      }
    });
  }

  function buildActionText(agentState) {
    const action = agentState.action || '';
    switch (agentState.status) {
      case 'active':  return action ? `Working on: ${action}` : 'Active';
      case 'idle':    return action ? `↩ ${action}` : 'Waiting for work';
      case 'offline': return action ? `↩ ${action}` : '';
      default:        return '';
    }
  }

  function formatTimeAgo(date) {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60)   return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  // Start polling
  setInterval(refreshAgentStates, POLL_MS);
  refreshAgentStates();
})();

/**
 * agent-status.js — shared live status polling module
 * Used on: /, /work, /system
 *
 * Polls /api/agent-states every 60s.
 * Updates [data-agent] cards: status dot, status label, action text, time-ago.
 * Silent failure on fetch error — retains stale state until next successful poll.
 */

(function () {
  'use strict';

  const POLL_MS = 60_000;

  /**
   * Build the action text for an agent card.
   * active  → "Working on: [action]" or "Active"
   * idle    → "↩ [action]" or "Waiting for work"
   * offline → "↩ [action]" or ""
   * unknown → ""
   */
  function buildActionText(agentState) {
    const action = agentState.action || '';
    switch (agentState.status) {
      case 'active':  return action ? 'Working on: ' + action : 'Active';
      case 'idle':    return action ? '\u21A9 ' + action : 'Waiting for work';
      case 'offline': return action ? '\u21A9 ' + action : '';
      default:        return '';
    }
  }

  /**
   * Format a Date as a relative time string.
   * < 60s  → "Just now"
   * < 1h   → "N min ago"
   * else   → "HH:MM"
   */
  function formatTimeAgo(date) {
    var diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60)   return 'Just now';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + ' min ago';
    var h = date.getHours().toString().padStart(2, '0');
    var m = date.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  /**
   * Fetch /api/agent-states and update all matching [data-agent] cards.
   */
  async function refreshAgentStates() {
    var data;
    try {
      var res = await fetch('/api/agent-states');
      if (!res.ok) return; // silent failure — retain stale state
      data = await res.json();
    } catch (e) {
      return; // network failure — retain stale state
    }

    if (!Array.isArray(data)) return;

    data.forEach(function (agentState) {
      var card = document.querySelector('[data-agent="' + agentState.agent + '"]');
      if (!card) return;

      var prevStatus = card.dataset.status;
      var newStatus  = agentState.status || 'offline';

      // Only update DOM if something changed
      card.dataset.status = newStatus;

      // Update status dot (with brief fade if status changed)
      var dot = card.querySelector('.status-dot');
      if (dot) {
        if (prevStatus !== newStatus) {
          dot.style.transition = 'opacity 100ms ease';
          dot.style.opacity = '0';
          setTimeout(function () {
            dot.className = 'status-dot status-dot--' + newStatus;
            dot.style.opacity = '1';
          }, 100);
        } else {
          dot.className = 'status-dot status-dot--' + newStatus;
        }
      }

      // Update status label
      var label = card.querySelector('.status-label');
      if (label) {
        label.textContent = newStatus.toUpperCase();
        label.className = 'status-label status-label--' + newStatus;
      }

      // Update action text (with opacity fade if text changed)
      var actionEl = card.querySelector('.agent-action');
      if (actionEl) {
        var newAction = buildActionText(agentState);
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
      var timeEl = card.querySelector('.agent-time');
      if (timeEl && agentState.updated_at) {
        timeEl.textContent = formatTimeAgo(new Date(agentState.updated_at));
        timeEl.setAttribute('datetime', agentState.updated_at);
      }
    });
  }

  // Start polling
  setInterval(refreshAgentStates, POLL_MS);
  refreshAgentStates();
})();

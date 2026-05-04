/**
 * finn-visitor.js — Homepage hero personalisation
 * Fetches /api/finn/visitor once on page load.
 * Swaps .hero-subhead text if audience is not unknown.
 */
(function () {
  'use strict';

  const SUBHEADS = {
    // TODO: Supply final copy for each audience variant.
    business:   '[TODO: Dreamborn to supply business-audience subhead copy]',
    developer:  '[TODO: Dreamborn to supply developer-audience subhead copy — reference to the stack is appropriate here]',
    enterprise: '[TODO: Dreamborn to supply enterprise-audience subhead copy]',
  };

  async function classifyVisitor() {
    try {
      const res = await fetch('/api/finn/visitor');
      if (!res.ok) return; // silent failure — default subhead remains

      const data = await res.json();
      const { audience, subhead } = data;

      if (!subhead && !SUBHEADS[audience]) return; // unknown audience — no swap

      const el = document.getElementById('heroSubhead');
      if (!el) return;

      const copy = subhead || SUBHEADS[audience];
      if (!copy) return;

      // Fade swap
      el.style.transition = 'opacity 300ms ease';
      el.style.opacity = '0.7';
      el.textContent = copy;
      el.style.opacity = '1';
    } catch {
      // Network error — default subhead remains
    }
  }

  classifyVisitor();
})();

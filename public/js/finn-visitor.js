/**
 * finn-visitor.js — visitor personalisation for the homepage hero
 * Fetches /api/finn/visitor once on page load.
 * If `subhead` is non-null, swaps .hero-subhead text with a 300ms opacity transition.
 * Silent failure on any error — default server-rendered subhead is retained.
 */

(function () {
  'use strict';

  async function personaliseHero() {
    var data;
    try {
      var res = await fetch('/api/finn/visitor');
      if (!res.ok) return; // silent failure
      data = await res.json();
    } catch (e) {
      return; // network failure — retain default subhead
    }

    if (!data || !data.subhead) return; // null or missing — retain default

    var subheadEl = document.querySelector('.hero-subhead');
    if (!subheadEl) return;

    // Fade out, swap text, fade in
    subheadEl.style.transition = 'opacity 300ms ease';
    subheadEl.style.opacity = '0';

    setTimeout(function () {
      subheadEl.textContent = data.subhead;
      subheadEl.style.opacity = '1';
    }, 300);
  }

  // Run once on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', personaliseHero);
  } else {
    personaliseHero();
  }
})();

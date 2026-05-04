(function () {
  'use strict';

  const nav = document.querySelector('[data-nav-menu]');
  const toggle = document.querySelector('[data-nav-toggle]');
  if (!nav || !toggle) return;

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', function (event) {
    if (!toggle.contains(event.target) && !nav.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.matchMedia('(min-width: 721px)').matches) setOpen(false);
  });

  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  }
})();

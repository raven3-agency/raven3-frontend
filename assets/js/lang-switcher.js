/* Raven3 — Language Switcher active-state detector
   Reads the current URL, marks the correct option as active.
   Works for both the topbar (.--bar) and overlay (.--nav) instances.
   No framework dependency. Runs once on DOMContentLoaded. */
(function () {
  'use strict';

  function init() {
    var switchers = document.querySelectorAll('.r3-lang-switcher');
    if (!switchers.length) return;

    var isEN = window.location.pathname.indexOf('/en/') === 0;
    var lang  = isEN ? 'en' : 'es';

    switchers.forEach(function (sw) {
      sw.classList.remove('r3-lang--es', 'r3-lang--en');
      sw.classList.add('r3-lang--' + lang);

      sw.querySelectorAll('.r3-lang-option').forEach(function (a) {
        if (a.getAttribute('hreflang') === lang) {
          a.setAttribute('aria-current', 'page');
        } else {
          a.removeAttribute('aria-current');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

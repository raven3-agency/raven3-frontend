(function () {
  'use strict';

  /* ── Inject #blueprint-grid + #scanner-line into <body> ── */
  function injectShell() {
    if (!document.getElementById('blueprint-grid')) {
      var grid = document.createElement('div');
      grid.id = 'blueprint-grid';
      grid.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(grid, document.body.firstChild);
    }

    if (!document.getElementById('scanner-line')) {
      var scanner = document.createElement('div');
      scanner.id = 'scanner-line';
      scanner.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(scanner, document.body.firstChild);
    }
  }

  /* ── Inject topbar SYS NOMINAL indicator ── */
  function injectTopbarStatus() {
    var inner = document.querySelector('.topbar__inner');
    if (!inner || inner.querySelector('.topbar-sys')) return;

    var cta = inner.querySelector('.cta-desktop');
    var indicator = document.createElement('div');
    indicator.className = 'topbar-sys';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.innerHTML = '<span class="topbar-sys-dot"></span>SYS NOMINAL';

    if (cta) {
      inner.insertBefore(indicator, cta);
    } else {
      inner.appendChild(indicator);
    }
  }

  /* ── Inject hero brackets + coords (hero pages only) ── */
  function injectHeroExtras() {
    var hero = document.querySelector('header.hero');
    if (!hero) return;

    if (!hero.querySelector('.hero-bracket')) {
      ['tl', 'tr', 'bl', 'br'].forEach(function (pos) {
        var b = document.createElement('div');
        b.className = 'hero-bracket hero-bracket--' + pos;
        b.setAttribute('aria-hidden', 'true');
        b.style.opacity = '0';
        hero.appendChild(b);
      });

      /* Animate brackets in after a short delay */
      setTimeout(function () {
        hero.querySelectorAll('.hero-bracket').forEach(function (b, i) {
          setTimeout(function () {
            b.style.transition = 'opacity 0.6s ease';
            b.style.opacity = '1';
          }, 400 + i * 80);
        });
      }, 200);
    }

    if (!hero.querySelector('.hero-coords')) {
      var coords = document.createElement('div');
      coords.className = 'hero-coords';
      coords.setAttribute('aria-hidden', 'true');
      coords.innerHTML =
        '<span class="coord-row">LAT -34.6037°</span>' +
        '<span class="coord-row">LONG -58.3816°</span>' +
        '<span class="coord-status"><span class="coord-dot"></span>SIGNAL NOMINAL</span>';
      coords.style.opacity = '0';
      coords.style.transform = 'translateX(12px)';
      hero.appendChild(coords);

      setTimeout(function () {
        coords.style.transition = 'opacity 0.8s ease 0.6s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s';
        coords.style.opacity = '1';
        coords.style.transform = 'translateX(0)';
      }, 100);
    }
  }

  /* ── Scroll reveal (IntersectionObserver) ── */
  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.riv, .riv-left, .riv-scale').forEach(function (el) {
        el.classList.add('riv--visible');
      });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('riv--visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.riv, .riv-left, .riv-scale').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ── Section divider line draw animation ── */
  function initDividerLines() {
    var lines = document.querySelectorAll('.section-divider__line');
    if (!lines.length) return;

    var lineObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
          entry.target.style.transform = 'scaleX(1)';
          lineObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    lines.forEach(function (line) { lineObserver.observe(line); });
  }

  /* ── Blueprint grid subtle parallax on scroll ── */
  function initGridParallax() {
    var grid = document.getElementById('blueprint-grid');
    if (!grid) return;

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var offset = (window.scrollY * 0.15).toFixed(1);
          grid.style.backgroundPosition = '0 ' + offset + 'px, 0 ' + offset + 'px';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── Run everything on DOMContentLoaded ── */
  function init() {
    injectShell();
    injectTopbarStatus();
    injectHeroExtras();
    initReveal();
    initDividerLines();
    initGridParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

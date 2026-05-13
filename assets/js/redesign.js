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

  /* ── Premium mobile nav drawer ── */
  function buildDrawer() {
    var nav = document.querySelector('.topbar__nav');
    var linksHTML = '';
    var idx = 0;

    if (nav) {
      Array.from(nav.children).forEach(function (child) {
        if (child.tagName === 'A' && child.classList.contains('topbar__link')) {
          idx++;
          var d = (0.06 + idx * 0.055).toFixed(2);
          linksHTML += '<a class="r3-drawer__link" style="--d:' + d + 's" href="' + (child.getAttribute('href') || '#') + '">'
            + '<span class="r3-drawer__num">' + String(idx).padStart(2, '0') + '</span>'
            + '<span class="r3-drawer__label">' + child.textContent.trim() + '</span>'
            + '<span class="r3-drawer__arrow" aria-hidden="true">→</span>'
            + '</a>';
        } else if (child.classList.contains('topbar__dropdown')) {
          idx++;
          var parentA = child.querySelector('.topbar__link--parent');
          var href = parentA ? parentA.getAttribute('href') : '#';
          var label = parentA ? parentA.textContent.trim() : 'Servicios';
          var d = (0.06 + idx * 0.055).toFixed(2);
          linksHTML += '<a class="r3-drawer__link" style="--d:' + d + 's" href="' + href + '">'
            + '<span class="r3-drawer__num">' + String(idx).padStart(2, '0') + '</span>'
            + '<span class="r3-drawer__label">' + label + '</span>'
            + '</a>';
          Array.from(child.querySelectorAll('.topbar__sub-link')).forEach(function (sub, si) {
            idx++;
            var ds = (0.06 + idx * 0.055).toFixed(2);
            var subNum = sub.querySelector('.topbar__sub-num');
            var subText = subNum ? subNum.nextSibling ? subNum.nextSibling.textContent.trim() : sub.textContent.replace(/\d+/, '').trim() : sub.textContent.trim();
            linksHTML += '<a class="r3-drawer__sub-item" style="--d:' + ds + 's" href="' + (sub.getAttribute('href') || '#') + '">'
              + subText
              + '</a>';
          });
        }
      });
    }

    var div = document.createElement('div');
    div.id = 'r3-drawer';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.setAttribute('aria-label', 'Menú de navegación');
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML =
      '<div class="r3-drawer__overlay" aria-hidden="true"></div>'
      + '<div class="r3-drawer__panel">'
      +   '<div class="r3-drawer__corner r3-drawer__corner--tl" aria-hidden="true"></div>'
      +   '<div class="r3-drawer__corner r3-drawer__corner--tr" aria-hidden="true"></div>'
      +   '<div class="r3-drawer__corner r3-drawer__corner--bl" aria-hidden="true"></div>'
      +   '<div class="r3-drawer__corner r3-drawer__corner--br" aria-hidden="true"></div>'
      +   '<div class="r3-drawer__scan" aria-hidden="true"></div>'
      +   '<div class="r3-drawer__header">'
      +     '<div class="r3-drawer__sys">RAVEN3 // NAV</div>'
      +     '<button class="r3-drawer__close" aria-label="Cerrar menú">✕</button>'
      +   '</div>'
      +   '<nav class="r3-drawer__nav" aria-label="Navegación principal">' + linksHTML + '</nav>'
      +   '<div class="r3-drawer__cta"><a href="/#contacto">Hablemos →</a></div>'
      +   '<div class="r3-drawer__footer">'
      +     '<div class="r3-drawer__footer-label">CONTACTO // ARG</div>'
      +     '<div class="r3-drawer__footer-contact">'
      +       '<a href="mailto:hola@raven3.com.ar">hola@raven3.com.ar</a><br>'
      +       '<a href="https://wa.me/5491134568899" target="_blank" rel="noopener">+54 9 11 3456-8899</a>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    return div;
  }

  function initPremiumDrawer() {
    if (document.getElementById('r3-drawer')) return;
    var toggle = document.querySelector('.nav-toggle');
    if (!toggle) return;

    var drawer = buildDrawer();
    document.body.appendChild(drawer);

    var overlay  = drawer.querySelector('.r3-drawer__overlay');
    var closeBtn = drawer.querySelector('.r3-drawer__close');

    function openDrawer() {
      drawer.classList.add('open');
      drawer.removeAttribute('aria-hidden');
      toggle.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    /* Capture phase runs before ui.js bubble listener — prevents double-toggle */
    toggle.addEventListener('click', function (e) {
      if (window.innerWidth > 820) return;
      e.stopImmediatePropagation();
      drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    }, true);

    overlay.addEventListener('click', closeDrawer);
    closeBtn.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.r3-drawer__link, .r3-drawer__sub-item').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
  }

  /* ── Run everything on DOMContentLoaded ── */
  function init() {
    injectShell();
    injectTopbarStatus();
    injectHeroExtras();
    initReveal();
    initDividerLines();
    initGridParallax();
    initPremiumDrawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

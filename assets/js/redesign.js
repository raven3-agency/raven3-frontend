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

  /* ── Premium WhatsApp float ── */
  function injectPremiumWhatsApp() {
    if (document.getElementById('waFloat')) return;

    /* Grab href from existing .wasap anchor */
    var wasapAnchor = document.querySelector('.wasap a');
    var href = wasapAnchor
      ? wasapAnchor.getAttribute('href')
      : 'https://api.whatsapp.com/send?l=es&text=Hola%20Raven3!&phone=5491134568899';

    /* WhatsApp icon path (official) */
    var WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

    var now = (function () {
      var d = new Date();
      return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    })();

    var wrap = document.createElement('div');
    wrap.className = 'wa-float';
    wrap.id = 'waFloat';
    wrap.setAttribute('aria-label', 'WhatsApp Raven3');

    wrap.innerHTML =
      /* ── panel ── */
      '<div class="wa-panel" id="waPanel" role="complementary" aria-label="Contacto WhatsApp">'

      /* header */
      + '<div class="wa-panel__head">'
      +   '<div class="wa-avatar" aria-hidden="true">R3</div>'
      +   '<div class="wa-panel__meta">'
      +     '<span class="wa-panel__name">Raven3</span>'
      +     '<span class="wa-panel__status">En línea ahora</span>'
      +   '</div>'
      +   '<button class="wa-close" id="waClose" aria-label="Cerrar">✕</button>'
      + '</div>'

      /* chat */
      + '<div class="wa-panel__chat">'
      +   '<div class="wa-timestamp">' + now + '</div>'
      +   '<div class="wa-bubble">'
      +     '<p>¡Hola! 👋 ¿En qué podemos ayudarte hoy?</p>'
      +     '<div class="wa-bubble__meta">'
      +       '<span class="wa-bubble__time">' + now + '</span>'
      +       '<span class="wa-bubble__checks">✓✓</span>'
      +     '</div>'
      +   '</div>'
      + '</div>'

      /* CTA */
      + '<a class="wa-panel__cta" id="waCtaLink" href="' + href + '" target="_blank" rel="noopener" aria-label="Abrir WhatsApp">'
      +   '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="' + WA_PATH + '"/></svg>'
      +   'Iniciar conversación'
      + '</a>'
      + '</div>'

      /* ── trigger ── */
      + '<button class="wa-trigger" id="waTrigger" aria-label="WhatsApp — contactar Raven3" aria-expanded="false">'
      +   '<div class="wa-ring wa-ring--1" aria-hidden="true"></div>'
      +   '<div class="wa-ring wa-ring--2" aria-hidden="true"></div>'
      +   '<svg class="wa-icon wa-icon--wa" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="' + WA_PATH + '"/></svg>'
      +   '<svg class="wa-icon wa-icon--x" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none" stroke="rgba(232,244,248,0.7)" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      +   '<span class="wa-badge" id="waBadge" aria-hidden="true">1</span>'
      + '</button>';

    document.body.appendChild(wrap);

    var panel   = document.getElementById('waPanel');
    var trigger = document.getElementById('waTrigger');
    var closeBtn = document.getElementById('waClose');
    var badge   = document.getElementById('waBadge');

    var panelClosing = false;

    function openPanel() {
      if (panelClosing) return;
      panel.classList.remove('is-closing');
      panel.classList.add('is-open');
      wrap.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function closePanel() {
      if (!panel.classList.contains('is-open') || panelClosing) return;
      panelClosing = true;
      panel.classList.add('is-closing');
      trigger.setAttribute('aria-expanded', 'false');
      setTimeout(function () {
        panel.classList.remove('is-open');
        panel.classList.remove('is-closing');
        wrap.classList.remove('is-open');
        panelClosing = false;
      }, 260);
    }

    trigger.addEventListener('click', function () {
      wrap.classList.contains('is-open') ? closePanel() : openPanel();
    });

    closeBtn.addEventListener('click', closePanel);

    /* Close when clicking outside */
    document.addEventListener('click', function (e) {
      if (wrap.classList.contains('is-open') && !wrap.contains(e.target)) {
        closePanel();
      }
    });

    /* Show badge after delay */
    setTimeout(function () {
      if (!wrap.classList.contains('is-open')) {
        badge.classList.add('is-visible');
      }
    }, 3800);

    /* Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wrap.classList.contains('is-open')) closePanel();
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
    injectPremiumWhatsApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

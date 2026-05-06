/**
 * ui.js — Raven3
 * Custom cursor, header scroll state, mobile nav,
 * smooth anchor scrolling, scroll progress bar.
 */

export function initUI() {
  initProgressBar();
  initHeaderScroll();
  initMobileNav();
  initSmoothScrollLinks();
  initCustomCursor();
}

/* ── Progress bar ────────────────────────────────────── */
function initProgressBar() {
  const bar = document.getElementById('progress');
  if (!bar) return;

  const update = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    bar.style.height = `${(window.scrollY / total) * 100}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Header scroll state ────────────────────────────── */
function initHeaderScroll() {
  const header = document.querySelector('.topbar');
  if (!header) return;

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Mobile nav ─────────────────────────────────────── */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.topbar__nav');
  if (!toggle || !nav) return;

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('active');
    nav.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.contains('open');
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.classList.toggle('active');
    nav.classList.toggle('open');
    document.body.style.overflow = isOpen ? '' : 'hidden';
  });

  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) close();
  });
}

/* ── Smooth anchor scroll ───────────────────────────── */
function initSmoothScrollLinks() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();

    const header = document.querySelector('.topbar');
    const offset = (header ? header.offsetHeight : 72) + 12;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({ top, behavior: 'smooth' });
  });
}

/* ── Custom cursor ──────────────────────────────────── */
function initCustomCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursor-dot');
  if (!cursor || !dot) return;

  let cx = -100, cy = -100;
  let lx = -100, ly = -100;

  const onMove = e => {
    cx = e.clientX;
    cy = e.clientY;
    dot.style.transform = `translate(${cx - 3}px, ${cy - 3}px)`;
  };

  document.addEventListener('mousemove', onMove, { passive: true });

  // Show cursor once mouse moves
  let shown = false;
  const show = () => {
    if (shown) return;
    shown = true;
    cursor.style.opacity = '0.85';
    dot.style.opacity    = '1';
  };
  document.addEventListener('mousemove', show, { once: true });

  // Lerp follow for the ring
  let rafId;
  const tick = () => {
    rafId = requestAnimationFrame(tick);
    lx += (cx - lx) * 0.13;
    ly += (cy - ly) * 0.13;
    cursor.style.transform = `translate(${lx - 20}px, ${ly - 20}px)`;
  };
  tick();

  // Hover state
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .dif-item, .metrica-card, .card, .client-flip-card')) {
      cursor.classList.add('hover');
    } else {
      cursor.classList.remove('hover');
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    dot.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '0.85';
    dot.style.opacity = '1';
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else tick();
  });
}

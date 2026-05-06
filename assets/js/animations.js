/**
 * animations.js — Raven3
 * GSAP + ScrollTrigger for all section animations.
 * GSAP is loaded as a synchronous global script before this module runs.
 */

export function initAnimations() {
  if (typeof gsap === 'undefined') {
    console.warn('[Raven3] GSAP not available — skipping animations');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Counters always run (just instantly for reduced motion)
  scheduleCounters(reduced);

  if (reduced) return;

  animateHero();
  animateStatement();
  animateServices();
  animateDiferenciales();
  animateProceso();
  animateMetricas();
  animateClients();
  animateReviews();
  animateCTA();
  animateRavenStrip();
  animateSectionHeaders();
}

/* ── Hero entrance (on load) ─────────────────────────── */
function animateHero() {
  const inner = document.querySelector('.hero__inner');
  if (!inner) return;

  const tl = gsap.timeline({ delay: 0.15 });

  tl.from(inner.querySelector('.eyebrow'), {
      y: 22, opacity: 0, duration: 0.55, ease: 'power2.out',
    })
    .from(inner.querySelector('h1'), {
      y: 52, opacity: 0, duration: 0.85, ease: 'power3.out',
    }, '-=0.25')
    .from(inner.querySelector('.kicker'), {
      y: 28, opacity: 0, duration: 0.65, ease: 'power2.out',
    }, '-=0.5')
    .from(inner.querySelectorAll('.cta-row .btn'), {
      y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out',
    }, '-=0.38')
    .from('.hero-trust', {
      opacity: 0, duration: 0.45,
    }, '-=0.2')
    .from('.hero-scroll-hint', {
      opacity: 0, y: 8, duration: 0.4,
    }, '-=0.15');
}

/* ── Statement ───────────────────────────────────────── */
function animateStatement() {
  const section = document.querySelector('.statement');
  if (!section) return;

  const st = { trigger: section, start: 'top 78%', once: true };

  gsap.from('.statement__text', {
    y: 54, opacity: 0, duration: 0.95, ease: 'power3.out',
    scrollTrigger: st,
  });

  gsap.to('.statement__line', {
    scaleX: 1, duration: 1.3, ease: 'power3.inOut',
    scrollTrigger: { ...st, start: 'top 72%' },
  });

  gsap.from('.statement__sub', {
    y: 26, opacity: 0, duration: 0.7, delay: 0.55, ease: 'power2.out',
    scrollTrigger: { ...st, start: 'top 70%' },
  });
}

/* ── Services cards stagger ──────────────────────────── */
function animateServices() {
  const cards = document.querySelectorAll('#servicios .card');
  if (!cards.length) return;

  gsap.from(cards, {
    y: 60, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: {
      trigger: '#servicios .grid',
      start: 'top 82%',
      once: true,
    },
  });
}

/* ── Diferenciales alternate slide ───────────────────── */
function animateDiferenciales() {
  document.querySelectorAll('.dif-item').forEach((item, i) => {
    gsap.from(item, {
      x: i % 2 === 0 ? -44 : 44,
      opacity: 0,
      duration: 0.72,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        once: true,
      },
    });
  });
}

/* ── Process timeline ────────────────────────────────── */
function animateProceso() {
  const track = document.querySelector('.proceso-track');
  if (!track) return;

  // Animate the fill line drawing across
  gsap.to('.proceso-line__fill', {
    scaleX: 1,
    duration: 1.1,
    ease: 'power2.inOut',
    scrollTrigger: {
      trigger: track,
      start: 'top 72%',
      once: true,
    },
  });

  // Stagger each step into view
  gsap.from('.proceso-step', {
    y: 34, opacity: 0, duration: 0.6, stagger: 0.11, ease: 'power3.out',
    scrollTrigger: {
      trigger: track,
      start: 'top 80%',
      once: true,
    },
  });
}

/* ── Metrics cards + counters ────────────────────────── */
function animateMetricas() {
  gsap.from('.metrica-card', {
    y: 32, opacity: 0, duration: 0.6, stagger: 0.09, ease: 'power3.out',
    scrollTrigger: {
      trigger: '.metricas-grid',
      start: 'top 82%',
      once: true,
    },
  });
}

function scheduleCounters(instant) {
  document.querySelectorAll('.counter[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';

    if (instant) {
      el.textContent = target + suffix;
      return;
    }

    const obj = { val: 0 };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 2.2,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(obj.val) + suffix;
          },
        });
      },
    });
  });
}

/* ── Client flip cards ───────────────────────────────── */
function animateClients() {
  gsap.from('.client-flip-card', {
    y: 44, opacity: 0, duration: 0.72, stagger: 0.1, ease: 'power3.out',
    scrollTrigger: {
      trigger: '.clients-grid',
      start: 'top 82%',
      once: true,
    },
  });
}

/* ── Reviews ─────────────────────────────────────────── */
function animateReviews() {
  gsap.from('.reviews-card', {
    y: 32, opacity: 0, duration: 0.8, ease: 'power3.out',
    scrollTrigger: {
      trigger: '.reviews-home',
      start: 'top 80%',
      once: true,
    },
  });
}

/* ── CTA / contact ───────────────────────────────────── */
function animateCTA() {
  gsap.from('.contact-intro', {
    y: 40, opacity: 0, duration: 0.85, ease: 'power3.out',
    scrollTrigger: {
      trigger: '#contacto',
      start: 'top 78%',
      once: true,
    },
  });

  gsap.from('.r3-form', {
    y: 28, opacity: 0, duration: 0.7, delay: 0.2, ease: 'power2.out',
    scrollTrigger: {
      trigger: '#contacto',
      start: 'top 74%',
      once: true,
    },
  });
}

/* ── Raven strip parallax ────────────────────────────── */
function animateRavenStrip() {
  const container = document.querySelector('.raven-strip');
  if (!container) return;

  const speeds = [2, 1.4, 2.6, 1.2, 2.1, 1.6, 2.8, 1.3, 2.2, 1.7, 2.4, 1.1];

  container.querySelectorAll('div').forEach((el, i) => {
    const spd = (speeds[i] || 1.5) - 1.9;
    gsap.to(el, {
      y: spd * 70,
      ease: 'none',
      scrollTrigger: {
        trigger: container.closest('section'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

/* ── Generic section header reveals ─────────────────── */
function animateSectionHeaders() {
  document.querySelectorAll('.section-header .eyebrow, .section-header .section-title').forEach(el => {
    gsap.from(el, {
      y: 20, opacity: 0, duration: 0.6, ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true,
      },
    });
  });

  // Standalone section titles (outside .section-header)
  document.querySelectorAll('section > .container > .section-title').forEach(el => {
    gsap.from(el, {
      y: 20, opacity: 0, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

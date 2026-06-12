/* ═══════════════════════════════════════════════════════════════
   BOQUERÓN — main.js
   Animations: GSAP + ScrollTrigger, Swiper, cursor, interactions
   Version: 1.0
═══════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────
// 1. GSAP PLUGIN REGISTRATION
// ─────────────────────────────────────────
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// ─────────────────────────────────────────
// 2. GLOBAL STATE
// ─────────────────────────────────────────
const state = {
  isTouch: window.matchMedia('(pointer: coarse)').matches,
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  mouseX: 0,
  mouseY: 0,
  cursorX: 0,
  cursorY: 0,
};

// ─────────────────────────────────────────
// 3. UTILITY: SPLIT TEXT INTO WORD SPANS
// ─────────────────────────────────────────
function splitTextToWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words
    .map(w => `<span class="word"><span class="word-inner">${w}</span></span>`)
    .join(' ');
}

// ─────────────────────────────────────────
// 4. UTILITY: SMOOTH SCROLL TO ANCHOR
// ─────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      // Close mobile menu if open
      closeMobileMenu();

      gsap.to(window, {
        duration: 1.2,
        scrollTo: { y: target, offsetY: 60 },
        ease: 'power3.inOut',
      });
    });
  });
}

// ─────────────────────────────────────────
// 5. CUSTOM CURSOR (desktop only)
// ─────────────────────────────────────────
function initCursor() {
  if (state.isTouch) return;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  // Instantly track dot
  window.addEventListener('mousemove', e => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;

    gsap.to(dot, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.04,
      ease: 'none',
    });
  });

  // Lag-following ring via ticker
  gsap.ticker.add(() => {
    state.cursorX += (state.mouseX - state.cursorX) * 0.13;
    state.cursorY += (state.mouseY - state.cursorY) * 0.13;
    gsap.set(ring, { x: state.cursorX, y: state.cursorY });
  });

  // Hover states
  const hoverTargets = 'a, button, [role="button"], .swiper-slide, .menu-tab, .insta-tile';
  document.querySelectorAll(hoverTargets).forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('is-hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('is-hovering'));
  });

  // Hide on leave window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });
}

// ─────────────────────────────────────────
// 6. PRELOADER
// ─────────────────────────────────────────
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const chars = document.querySelectorAll('.pl-char');
  const bar = document.getElementById('preloader-bar');
  const tagline = document.querySelector('.preloader-tagline');

  if (!preloader) {
    document.body.classList.remove('is-loading');
    initPage();
    return;
  }

  const duration = state.prefersReducedMotion ? 0.01 : 1;

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.to(preloader, {
        opacity: 0,
        duration: state.prefersReducedMotion ? 0.01 : 0.7,
        ease: 'power2.inOut',
        onComplete: () => {
          preloader.style.display = 'none';
          document.body.classList.remove('is-loading');
          initPage();
        },
      });
    },
  });

  tl.to(chars, {
      y: 0,
      opacity: 1,
      duration: state.prefersReducedMotion ? 0.01 : 0.75,
      stagger: 0.07,
      ease: 'power3.out',
    })
    .to(bar, {
      scaleX: 1,
      duration: state.prefersReducedMotion ? 0.01 : 1.1,
      ease: 'power2.inOut',
    }, '-=0.4')
    .to(tagline, {
      opacity: 1,
      duration: state.prefersReducedMotion ? 0.01 : 0.6,
      ease: 'power2.out',
    }, '-=0.5')
    .to({}, { duration: state.prefersReducedMotion ? 0.01 : 1.2 });
}

// ─────────────────────────────────────────
// 7. INIT PAGE (called after preloader)
// ─────────────────────────────────────────
function initPage() {
  initHeroEntrance();
  initScrollAnimations();
  initManifesto();
  initNavScroll();
  initMenuTabs();
  initWineAccordion();
  initReviewsSwiper();
  initMobileMenu();
  initSmoothScroll();
  initWhatsappSticky();
  if (!state.isTouch) {
    initMagneticButtons();
  }
  initFeaturedScroll();
}

// ─────────────────────────────────────────
// 8. HERO ENTRANCE ANIMATION
// ─────────────────────────────────────────
function initHeroEntrance() {
  const titleInner = document.querySelector('.hero-title-inner');
  const eyebrow = document.querySelector('.hero-eyebrow');
  const subtitle = document.querySelector('.hero-subtitle');
  const description = document.querySelector('.hero-description');
  const ctas = document.querySelector('.hero-ctas');
  const scrollIndicator = document.querySelector('.hero-scroll-indicator');

  if (!titleInner) return;

  const tl = gsap.timeline({ delay: 0.1 });

  tl.to(eyebrow, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    })
    .to(titleInner, {
      y: '0%',
      duration: 1.1,
      ease: 'power3.out',
    }, '-=0.5')
    .to(subtitle, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
    }, '-=0.6')
    .to(description, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.5')
    .to(ctas, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.5');

  if (scrollIndicator) {
    tl.to(scrollIndicator, {
      opacity: 1,
      duration: 0.6,
      ease: 'power2.out',
    }, '-=0.2');
  }

  // Parallax on hero background blobs on scroll
  gsap.to('.hero-blob-1', {
    y: '20%',
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.5,
    },
  });

  gsap.to('.hero-blob-2', {
    y: '-15%',
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 2,
    },
  });

  gsap.to('.hero-content', {
    y: '18%',
    opacity: 0.3,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
    },
  });
}

// ─────────────────────────────────────────
// 9. MANIFESTO TEXT WORD REVEAL
// ─────────────────────────────────────────
function initManifesto() {
  const lines = document.querySelectorAll('[data-manifesto]');
  if (!lines.length) return;

  lines.forEach(line => splitTextToWords(line));

  const allWordInners = document.querySelectorAll('[data-manifesto] .word-inner');

  gsap.from(allWordInners, {
    y: '105%',
    opacity: 0,
    duration: state.prefersReducedMotion ? 0 : 0.85,
    stagger: {
      each: 0.055,
      ease: 'none',
    },
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#manifesto',
      start: 'top 72%',
      toggleActions: 'play none none none',
    },
  });

  // Fade in divider & label separately
  gsap.from('.manifesto-label', {
    opacity: 0,
    y: 24,
    duration: 0.7,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#manifesto',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  gsap.from('.manifesto-divider', {
    opacity: 0,
    scaleX: 0,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.manifesto-divider',
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

// ─────────────────────────────────────────
// 10. GENERIC SECTION SCROLL REVEALS
// ─────────────────────────────────────────
function initScrollAnimations() {
  // Generic [data-reveal] elements
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: state.prefersReducedMotion ? 0 : 0.95,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 86%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Section headers (slight stagger between label → title → subtitle)
  document.querySelectorAll('.section-header').forEach(header => {
    const children = [...header.children];
    gsap.from(children, {
      opacity: 0,
      y: 36,
      duration: state.prefersReducedMotion ? 0 : 0.85,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: header,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Atmosphere features stagger
  ScrollTrigger.batch('.atmosphere-feature', {
    onEnter: batch => {
      gsap.from(batch, {
        opacity: 0,
        y: 50,
        duration: state.prefersReducedMotion ? 0 : 0.85,
        stagger: 0.15,
        ease: 'power3.out',
      });
    },
    start: 'top 88%',
    once: true,
  });

  // Instagram tiles stagger
  ScrollTrigger.batch('.insta-tile', {
    onEnter: batch => {
      gsap.from(batch, {
        opacity: 0,
        scale: 0.95,
        duration: state.prefersReducedMotion ? 0 : 0.6,
        stagger: 0.06,
        ease: 'power3.out',
      });
    },
    start: 'top 88%',
    once: true,
  });

  // Menu items stagger when panel becomes visible (handled on tab switch)
  revealMenuItems(document.querySelector('.menu-panel.active'));

  // Reservations section text reveal
  const resLabel  = document.querySelector('.reservations-label');
  const resTitle  = document.querySelector('.reservations-title');
  const resNote   = document.querySelector('.reservations-note');
  const resBtn    = document.querySelector('.reservations-sedes');

  if (resTitle) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#reservas',
        start: 'top 72%',
        toggleActions: 'play none none none',
      },
    });

    tl.to(resLabel, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .to(resTitle, {
        opacity: 1,
        y: 0,
        duration: state.prefersReducedMotion ? 0 : 1.0,
        ease: 'power3.out',
      }, '-=0.3')
      .to(resBtn,   { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.5')
      .to(resNote,  { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4');
  }

  // Sede cards stagger (opacity/transform start state is set via CSS)
  ScrollTrigger.batch('.sede-card', {
    onEnter: batch => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: state.prefersReducedMotion ? 0 : 0.9,
        stagger: 0.18,
        ease: 'power3.out',
      });
    },
    start: 'top 85%',
    once: true,
  });

  // Footer brand reveal
  gsap.from('.footer-brand', {
    opacity: 0,
    y: 32,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#footer',
      start: 'top 88%',
      toggleActions: 'play none none none',
    },
  });
}

// Helper: animate menu items in a panel
function revealMenuItems(panel) {
  if (!panel) return;
  const items = panel.querySelectorAll('.menu-item:not(.menu-item--category)');
  gsap.from(items, {
    opacity: 0,
    x: -16,
    duration: state.prefersReducedMotion ? 0 : 0.5,
    stagger: 0.05,
    ease: 'power2.out',
    clearProps: 'all',
  });
}

// ─────────────────────────────────────────
// 11. NAVIGATION SCROLL BEHAVIOR
// ─────────────────────────────────────────
function initNavScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  ScrollTrigger.create({
    start: 'top -60px',
    onEnter: () => header.classList.add('is-scrolled'),
    onLeaveBack: () => header.classList.remove('is-scrolled'),
  });
}

// ─────────────────────────────────────────
// 12. MOBILE MENU
// ─────────────────────────────────────────
let menuOpen = false;

function openMobileMenu() {
  menuOpen = true;
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const body = document.body;

  hamburger.classList.add('is-active');
  hamburger.setAttribute('aria-expanded', 'true');
  mobileMenu.classList.add('is-open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  body.classList.add('menu-open');
}

function closeMobileMenu() {
  menuOpen = false;
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const body = document.body;

  hamburger.classList.remove('is-active');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileMenu.classList.remove('is-open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  body.classList.remove('menu-open');
}

function initMobileMenu() {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    menuOpen ? closeMobileMenu() : openMobileMenu();
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuOpen) closeMobileMenu();
  });

  // Close on backdrop click (outside nav)
  mobileMenu.addEventListener('click', e => {
    if (e.target === mobileMenu) closeMobileMenu();
  });
}

// ─────────────────────────────────────────
// 13. MENU TABS
// ─────────────────────────────────────────
function initMenuTabs() {
  const tabs = document.querySelectorAll('.menu-tab');
  const panels = document.querySelectorAll('.menu-panel');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const panelId = `panel-${tab.dataset.panel}`;
      const targetPanel = document.getElementById(panelId);
      if (!targetPanel) return;

      // Deactivate all
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panels.forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });

      // Activate selected
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      targetPanel.classList.add('active');
      targetPanel.hidden = false;

      // Animate new panel items
      revealMenuItems(targetPanel);
    });
  });
}

// ─────────────────────────────────────────
// 14. WINE BODEGA ACCORDION
// ─────────────────────────────────────────
function initWineAccordion() {
  const btns = document.querySelectorAll('.wine-bodega-btn');
  if (!btns.length) return;

  btns.forEach(btn => {
    const panelId = btn.getAttribute('aria-controls');
    const panel   = document.getElementById(panelId);
    if (!panel) return;

    // Abrir todos al cargar (sin animación)
    btn.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    panel.style.height = 'auto';

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        // Cerrar
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(() => {
          panel.style.height = '0';
        });
        btn.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
      } else {
        // Abrir
        panel.style.height = '0';
        btn.setAttribute('aria-expanded', 'true');
        panel.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
          const h = panel.scrollHeight;
          panel.style.height = h + 'px';
          panel.addEventListener('transitionend', () => {
            if (btn.getAttribute('aria-expanded') === 'true') {
              panel.style.height = 'auto';
            }
          }, { once: true });
        });
      }
    });
  });
}

// ─────────────────────────────────────────
// 15. REVIEWS SWIPER
// ─────────────────────────────────────────
function initReviewsSwiper() {
  if (!document.querySelector('.reviews-swiper')) return;

  new Swiper('.reviews-swiper', {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    autoplay: {
      delay: 5000,
      pauseOnMouseEnter: true,
      disableOnInteraction: false,
    },
    pagination: {
      el: '.reviews-pagination',
      clickable: true,
    },
    breakpoints: {
      640: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 28,
      },
    },
  });
}

// ─────────────────────────────────────────
// 16. MAGNETIC BUTTONS
// ─────────────────────────────────────────
function initMagneticButtons() {
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.32;
      const dy = (e.clientY - cy) * 0.32;

      gsap.to(btn, {
        x: dx,
        y: dy,
        duration: 0.45,
        ease: 'power2.out',
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: 'elastic.out(1, 0.5)',
      });
    });
  });
}

// ─────────────────────────────────────────
// 15. FEATURED SECTION — SCROLL-DRIVEN HORIZONTAL SLIDE
// ─────────────────────────────────────────
function initFeaturedScroll() {
  const section = document.querySelector('.section-featured');
  const track   = document.querySelector('.cards-track');
  const fill    = document.querySelector('.cards-progress-fill');
  const counter = document.querySelector('.cards-progress-count');

  if (!section || !track) return;

  const cards = track.querySelectorAll('.featured-card');

  // ≤768 px: mobile uses native overflow-x scroll — no GSAP pin needed
  if (window.innerWidth <= 768) {
    gsap.set(cards, { opacity: 1, clearProps: 'y' });
    return;
  }

  // Cards are always fully visible in this section — no fade-in stagger
  gsap.set(cards, { opacity: 1, y: 0 });

  // Update progress bar + card counter on every scroll tick
  const onUpdate = self => {
    if (fill) {
      gsap.set(fill, { scaleX: self.progress, transformOrigin: 'left center' });
    }
    if (counter && cards.length) {
      const idx = Math.min(
        Math.floor(self.progress * cards.length),
        cards.length - 1
      );
      counter.textContent =
        `${String(idx + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    }
  };

  // Pin the section and scrub the track horizontally
  gsap.to(track, {
    x: () => -(track.scrollWidth - section.offsetWidth),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${track.scrollWidth - section.offsetWidth}`,
      pin: true,
      scrub: 1.2,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate,
    },
  });
}

// ─────────────────────────────────────────
// 16. WHATSAPP STICKY BUTTON VISIBILITY
// ─────────────────────────────────────────
function initWhatsappSticky() {
  const sticky = document.getElementById('whatsapp-sticky');
  if (!sticky) return;

  ScrollTrigger.create({
    start: 'top -200px',
    onEnter: () => sticky.classList.add('is-visible'),
    onLeaveBack: () => sticky.classList.remove('is-visible'),
  });
}

// ─────────────────────────────────────────
// 17. FEATURED CARD HOVER TILT (desktop)
// ─────────────────────────────────────────
function initCardTilt() {
  if (state.isTouch) return;

  document.querySelectorAll('.featured-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;

      gsap.to(card, {
        rotateY: x,
        rotateX: y,
        transformPerspective: 800,
        duration: 0.5,
        ease: 'power2.out',
      });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.7,
        ease: 'elastic.out(1, 0.5)',
      });
    });
  });
}

// ─────────────────────────────────────────
// 18. RESIZE HANDLER
// ─────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 200);
});

// ─────────────────────────────────────────
// 19. BOOT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initPreloader();

  // Card tilt registered now (cards already in DOM)
  // Called again after page init to ensure targets exist
  if (!state.isTouch) {
    // Small delay to ensure Swiper slides are rendered
    setTimeout(initCardTilt, 800);
  }
});

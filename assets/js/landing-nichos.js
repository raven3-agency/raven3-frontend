/* ================================================================
   RAVEN3 — Landing Pages Nichos — JS
================================================================ */

(function () {
  /* ── FAQ Toggle ── */
  document.querySelectorAll('.ln-faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.ln-faq-item');
      const answer = item.querySelector('.ln-faq-a');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.ln-faq-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.ln-faq-a').style.maxHeight = '0';
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ── Scroll Reveal ── */
  const rivEls = document.querySelectorAll('.ln-riv');
  if (rivEls.length) {
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    rivEls.forEach(el => obs.observe(el));
  }

  /* ── Form Handler ── */
  const form = document.getElementById('ln-contactForm');
  const status = document.getElementById('ln-formStatus');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      status.textContent = 'Enviando…';
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          status.textContent = 'Mensaje enviado ✓';
          form.reset();
        } else {
          status.textContent = 'Ocurrió un error. Intentá nuevamente.';
        }
      } catch {
        status.textContent = 'Error de conexión. Intentá nuevamente.';
      }
    });
  }

  /* ── Year stamp ── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Custom Cursor ── */
  const ring = document.getElementById('cursor');
  const dot  = document.getElementById('cursor-dot');
  if (ring && dot) {
    let cx = -100, cy = -100, lx = -100, ly = -100;

    document.addEventListener('mousemove', e => {
      cx = e.clientX; cy = e.clientY;
      dot.style.transform = `translate(${cx - 3}px,${cy - 3}px)`;
      ring.style.opacity = '0.85';
      dot.style.opacity  = '1';
    }, { passive: true });

    document.addEventListener('mouseleave', () => { ring.style.opacity = dot.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { ring.style.opacity = '0.85'; dot.style.opacity = '1'; });

    document.addEventListener('mouseover', e => {
      ring.classList.toggle('hover', !!e.target.closest('a, button, [role="button"]'));
    }, { passive: true });

    (function tick() {
      requestAnimationFrame(tick);
      lx += (cx - lx) * 0.13;
      ly += (cy - ly) * 0.13;
      ring.style.transform = `translate(${lx - 20}px,${ly - 20}px)`;
    })();
  }

  /* ── Mobile nav toggle ── */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      })
    );
  }
})();

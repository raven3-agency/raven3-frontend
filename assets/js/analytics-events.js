// GA4 conversion events (contact clicks, email, WhatsApp, form submit).
// Loaded with `defer`; uses delegation so it works no matter when elements render.
(function () {
  function track(name, method) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', name, {
      method: method,
      page_path: window.location.pathname,
    });
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('a[href*="#formulario"]')) {
      track('contact_request', 'presupuesto_click');
    }
    if (target.closest('a[href^="mailto"]')) {
      track('email_click', 'email_directo');
    }
    if (target.closest('#waTrigger')) {
      track('whatsapp_click', 'whatsapp');
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form instanceof Element && form.id === 'contactForm') {
      track('form_submission', 'formulario_contacto');
    }
  });
})();

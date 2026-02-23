// clientes.js — lightbox + filtros (counter + CTA) + refresh locomotive
(() => {
  const grid = document.getElementById("clientsGrid");
  const cards = Array.from(document.querySelectorAll(".client-card"));
  const chips = Array.from(document.querySelectorAll(".chip[data-filter]"));

  // UI extras
  const resultsCount = document.getElementById("resultsCount");
  const emptyState = document.getElementById("emptyState");
  const ctaPrimary = document.getElementById("ctaPrimary");

  // Lightbox
  const lb = document.getElementById("lightbox");
  const lbImg = lb?.querySelector(".lightbox__img");
  const lbClose = lb?.querySelector(".lightbox__close");

  const pluralize = (n, singular, plural) => (n === 1 ? singular : plural);

  function openLightbox(src, alt) {
    if (!lb || !lbImg) return;
    lbImg.src = src;
    lbImg.alt = alt || "Imagen de proyecto";
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lb || !lbImg) return;
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    lbImg.src = "";
    document.documentElement.style.overflow = "";
  }

  // Bind lightbox (delegación)
  if (grid) {
    grid.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-lightbox]");
      if (!trigger) return;

      const src = trigger.getAttribute("data-lightbox");
      const img = trigger.querySelector("img") || trigger.closest(".client-card")?.querySelector("img");

      openLightbox(src, img?.alt);
    });
  }

  lbClose?.addEventListener("click", closeLightbox);
  lb?.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  // Filtering + counter + CTA + locomotive refresh
  function applyFilter(filter) {
    let visible = 0;

    cards.forEach((card) => {
      const type = card.dataset.type;
      const show = filter === "all" || type === filter;

      // Usamos hidden para no romper grid y mantener accesibilidad
      card.hidden = !show;
      if (show) visible++;
    });

    // Counter
    if (resultsCount) {
      const label = pluralize(visible, "proyecto", "proyectos");
      resultsCount.textContent = `Mostrando ${visible} ${label}`;
    }

    // Empty state
    if (emptyState) {
      emptyState.hidden = visible !== 0;
    }

    // Chips UI + a11y
    chips.forEach((chip) => {
      const isActive = chip.dataset.filter === filter;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // CTA dinámico
    if (ctaPrimary) {
      ctaPrimary.textContent = filter === "tienda" ? "Quiero mi tienda" : "Quiero mi web";
    }

    // Refresh locomotive
    if (window.scroll && typeof window.scroll.update === "function") {
      window.scroll.update();
    }
  }

  // Bind filters
  if (chips.length) {
    chips.forEach((chip) => {
      chip.addEventListener("click", () => applyFilter(chip.dataset.filter));
    });

    // Init (respeta el chip activo en HTML)
    const active = document.querySelector(".chip.is-active[data-filter]");
    applyFilter(active?.dataset.filter || "all");
  }
})();
// clientes.js — filtros + lightbox + refresh locomotive
(function () {
  const grid = document.getElementById("clientsGrid");
  const chips = Array.from(document.querySelectorAll(".chip"));
  const cards = Array.from(document.querySelectorAll(".client-card"));

  // Lightbox
  const lb = document.getElementById("lightbox");
  const lbImg = lb?.querySelector(".lightbox__img");
  const lbClose = lb?.querySelector(".lightbox__close");

  function openLightbox(src, alt) {
    if (!lb || !lbImg) return;
    lbImg.src = src;
    lbImg.alt = alt || "Imagen de cliente";
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

  // Bind thumbs
  if (grid) {
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lightbox]");
      if (!btn) return;
      const src = btn.getAttribute("data-lightbox");
      const img = btn.querySelector("img");
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

  // Filtering
  function setActiveChip(active) {
    chips.forEach((c) => c.classList.toggle("is-active", c === active));
  }

  function applyFilter(type) {
    cards.forEach((card) => {
      const t = card.getAttribute("data-type");
      const show = type === "all" || t === type;
      card.style.display = show ? "" : "none";
    });

    // Si Locomotive está inicializado en main.js como window.scroll:
    // refrescamos para recalcular alturas
    if (window.scroll && typeof window.scroll.update === "function") {
      window.scroll.update();
    }
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      setActiveChip(chip);
      applyFilter(chip.dataset.filter);
    });
  });

  // Default
  applyFilter("all");
})();

(() => {
  const grid = document.getElementById("clientsGrid");
  const chips = document.querySelectorAll(".chip[data-filter]");
  const resultsCount = document.getElementById("resultsCount");
  const emptyState = document.getElementById("emptyState");

  if (!grid || chips.length === 0) return;

  const cards = Array.from(grid.querySelectorAll(".client-card"));

  const pluralize = (n, singular, plural) => (n === 1 ? singular : plural);

  function applyFilter(filter) {
    let visible = 0;

    cards.forEach((card) => {
      const type = card.dataset.type;
      const show = filter === "all" || type === filter;

      // Mostrar/ocultar (evita “huecos” si estás usando CSS grid)
      card.hidden = !show;

      if (show) visible++;
    });

    // Texto contador
    if (resultsCount) {
      const total = cards.length;
      const label = pluralize(visible, "proyecto", "proyectos");

      // Opción A: simple
      resultsCount.textContent =
        filter === "all"
          ? `Mostrando ${visible} ${label}`
          : `Mostrando ${visible} ${label} (${filter})`;

      // Opción B: más “pro”
      // resultsCount.textContent = `Mostrando ${visible} de ${total} ${pluralize(total, "proyecto", "proyectos")}`;
    }

    // Empty state
    if (emptyState) {
      emptyState.hidden = visible !== 0;
    }

    // Chip UI + a11y
    chips.forEach((chip) => {
      const isActive = chip.dataset.filter === filter;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  // Bind
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      applyFilter(chip.dataset.filter);
    });
  });

  // Init (usa el que venga activo en el HTML, sino "all")
  const active = document.querySelector(".chip.is-active[data-filter]");
  applyFilter(active?.dataset.filter || "all");
})();
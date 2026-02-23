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

let scroll;
let listenersBound = false;

function buildRavenStrip() {
  const ravenStrip = document.getElementById("ravenStrip");
  if (!ravenStrip) return;

  if (ravenStrip.dataset.built === "1") return;
  ravenStrip.dataset.built = "1";

  const speeds = [2, 1.4, 2.6, 1.2, 2.1, 1.6, 2.8, 1.3, 2.2, 1.7, 2.4, 1.1];

  const ravenSVG = () => `
   <svg viewBox="0 0 128 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <path d="M3 36c16-6 27-9 51-9 20 0 32 2 52 9-7-9-15-15-23-19 7-4 14-6 21-6-12-3-23-2-33 1-6-2-12-3-18-3-9 0-18 2-27 6-6 3-12 8-20 21 0 0 6 2 10 0 6-3 9-7 17-9-6 6-10 12-12 18 7-3 15-6 25-7-11 7-17 12-20 17 13-6 30-11 55-11 12 0 23 2 33 5-16 7-35 10-58 9C32 58 15 51 3 36Z"
      fill="#101317" stroke="rgba(55,226,213,.45)" stroke-width="1.25"/>
  </svg>`;

  speeds.forEach((speed) => {
    const div = document.createElement("div");
    div.setAttribute("data-scroll", "");
    div.setAttribute("data-scroll-speed", String(speed));
    div.innerHTML = ravenSVG();
    ravenStrip.appendChild(div);
  });
}

function bindGlobalScrollLinks() {
  if (listenersBound) return;
  listenersBound = true;

  document.addEventListener("click", (e) => {
    const anchor = e.target.closest('a[href^="#"]');

    const targetBtn = e.target.closest("[data-target]");

    let targetEl = null;

    if (anchor) {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      targetEl = document.querySelector(href);
      if (!targetEl) return;

      e.preventDefault();
    } else if (targetBtn) {
      const id = targetBtn.dataset.target;
      if (!id) return;

      targetEl = document.getElementById(id);
      if (!targetEl) return;

      e.preventDefault();
    } else {
      return;
    }

    if (!scroll || typeof scroll.scrollTo !== "function") return;

    scroll.scrollTo(targetEl, {
      duration: 900,
      offset: -80,
      disableLerp: true,
    });
  });
}

function scrollToHashOnLoad() {
  const hash = window.location.hash;
  if (!hash) return;

  const target = document.querySelector(hash);
  if (!target || !scroll) return;

  setTimeout(() => {
    scroll.scrollTo(target, { duration: 0, offset: -80 });
  }, 150);
}

async function init() {
  const container = document.querySelector("[data-scroll-container]");
  if (!container || !window.LocomotiveScroll) return;

  if (scroll && typeof scroll.destroy === "function") {
    scroll.destroy();
  }

  scroll = new LocomotiveScroll({
    el: container,
    smooth: true,
    lerp: 0.08,
    smartphone: { smooth: true },
    tablet: { smooth: true },
  });

  const progressEl = document.getElementById("progress");
  if (progressEl) {
    scroll.on("scroll", (args) => {
      const limitY = args?.limit?.y || 1;
      const y = args?.scroll?.y || 0;
      const h = (y / limitY) * 100;
      progressEl.style.height = `${Math.min(100, Math.max(0, h))}vh`;
    });
  }

  buildRavenStrip();
  bindGlobalScrollLinks();

  scroll.update();

  scrollToHashOnLoad();
}

window.addEventListener("load", init);


// Reviews: Leer más / Ver menos (HOME)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".review-toggle");
  if (!btn) return;

  const card = btn.closest(".quote");
  if (!card) return;

  card.classList.toggle("expanded");
  btn.textContent = card.classList.contains("expanded") ? "Ver menos" : "Leer más";

  // Si Locomotive está disponible, refrescá layout
  if (window.scroll && typeof window.scroll.update === "function") {
    window.scroll.update();
  }
});
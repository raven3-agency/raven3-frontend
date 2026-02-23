function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}

async function init() {
  await ensureLocomotive();

  const container = document.querySelector("[data-scroll-container]");
  if (!container) return;

  const scroll = new LocomotiveScroll({
    el: container,
    smooth: true,
    lerp: 0.08,
    smartphone: { smooth: true },
    tablet: { smooth: true },
  });

  const progressEl = document.getElementById("progress");
  if (progressEl) {
    scroll.on("scroll", (args) => {
      const h = (args.scroll.y / (args.limit.y || 1)) * 100;
      progressEl.style.height = `${Math.min(100, Math.max(0, h))}vh`;
    });
  }

  const ravenStrip = document.getElementById("ravenStrip");
  if (ravenStrip) {
    const speeds = [2, 1.4, 2.6, 1.2, 2.1, 1.6, 2.8, 1.3, 2.2, 1.7, 2.4, 1.1];

    const ravenSVG = () => `
      <svg viewBox="0 0 128 64" fill="none" xmlns="http:
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

  scroll.update();
}

window.addEventListener("load", init);

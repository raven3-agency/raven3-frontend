import PhotoSwipeLightbox from "https://unpkg.com/photoswipe@5/dist/photoswipe-lightbox.esm.js";

async function getImageSize(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () =>
      resolve({ w: im.naturalWidth || 1200, h: im.naturalHeight || 800 });
    im.onerror = () => resolve({ w: 1200, h: 800 });
    im.src = src;
  });
}

const sizeCache = new Map();

const proxy = document.createElement("div");
proxy.id = "pswpSingleProxy";
proxy.style.display = "none";
document.body.appendChild(proxy);

const lightbox = new PhotoSwipeLightbox({
  gallery: "#pswpSingleProxy",
  children: "a",
  pswpModule: () =>
    import("https://unpkg.com/photoswipe@5/dist/photoswipe.esm.js"),
  showHideAnimationType: "fade",
  bgOpacity: 0.78,
  wheelToZoom: true,
  arrowKeys: false,
});

lightbox.init();

document.addEventListener(
  "pointerdown",
  async (e) => {
    const trigger = e.target.closest("[data-lightbox]");
    if (!trigger) return;

    e.preventDefault();

    const src = trigger.getAttribute("data-lightbox");
    if (!src) return;

    let validatedSrc;
    try {
      const url = new URL(src, location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") return;
      validatedSrc = url.href;
    } catch {
      return;
    }

    if (!sizeCache.has(validatedSrc)) sizeCache.set(validatedSrc, getImageSize(validatedSrc));
    const { w, h } = await sizeCache.get(validatedSrc);

    proxy.replaceChildren();
    const a = document.createElement("a");
    a.href = validatedSrc;
    a.dataset.pswpWidth = String(w);
    a.dataset.pswpHeight = String(h);
    proxy.appendChild(a);

    lightbox.loadAndOpen(0);
  },
  { capture: true },
);

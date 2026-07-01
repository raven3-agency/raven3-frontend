import Swiper from "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.mjs";

function initReviewsSwiper() {
  const swiperEl = document.querySelector(".reviews-swiper");
  const scope = document.querySelector(".reviews-quotes"); // 👈 mejor scope
  if (!swiperEl || !scope) return;

  const swiper = new Swiper(swiperEl, {
    loop: true,
    speed: 650,
    spaceBetween: 14,

    slidesPerView: 1,
    breakpoints: {
      680: { slidesPerView: 2 },
      980: { slidesPerView: 3 },
    },

    autoplay: {
      delay: 3800,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },

    // ✅ CLAVE: que Swiper no “mate” los clicks
    preventClicks: false,
    preventClicksPropagation: false,
    touchStartPreventDefault: false,

    navigation: false,
    pagination: false,
    grabCursor: true,
    autoHeight: false,

    // El wrapper usa role="list" en el HTML; Swiper por defecto pone
    // role="group" en cada slide, lo que rompe la relación list/listitem.
    a11y: { slideRole: "listitem" },
  });

  // ✅ Toggle Leer más / Leer menos
  scope.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".review-toggle");
    if (!btn) return;

    // Evita que Swiper lo interprete como click de slide
    ev.preventDefault();
    ev.stopPropagation();

    const card = btn.closest(".quote");
    if (!card) return;

    const expanded = card.classList.toggle("expanded");
    btn.textContent = expanded ? "Leer menos" : "Leer más";
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");

    requestAnimationFrame(() => swiper.update());
  });
}

document.addEventListener("DOMContentLoaded", initReviewsSwiper);
// Optional: small fade-in to make it feel like a “clean” landing.
// You can remove this file entirely if you want static HTML only.

window.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".page");
  requestAnimationFrame(() => page.classList.add("is-ready"));
});

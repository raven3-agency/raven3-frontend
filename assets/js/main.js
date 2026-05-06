/**
 * main.js — Raven3 entry point
 * Orchestrates: raven strip build, reviews expand/collapse,
 * year stamp, UI interactions, and GSAP animations.
 */

import { initUI }         from './ui.js';
import { initAnimations } from './animations.js';

/* ── DOMContentLoaded setup ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});

/* ── Reviews: expand / collapse ────────────────────────
   Single delegated listener — no dependency on scroll lib. */
document.addEventListener('click', e => {
  const btn = e.target.closest('.review-toggle');
  if (!btn) return;

  const card = btn.closest('.quote');
  if (!card) return;

  card.classList.toggle('expanded');
  btn.setAttribute('aria-expanded', card.classList.contains('expanded'));
  btn.textContent = card.classList.contains('expanded') ? 'Ver menos' : 'Leer más';
});

/* ── Raven strip ────────────────────────────────────────
   Builds the decorative SVG raven grid; GSAP parallax
   is applied in animations.js via data-parallax-speed. */
function buildRavenStrip() {
  const strip = document.getElementById('ravenStrip');
  if (!strip || strip.dataset.built === '1') return;
  strip.dataset.built = '1';

  const speeds = [2, 1.4, 2.6, 1.2, 2.1, 1.6, 2.8, 1.3, 2.2, 1.7, 2.4, 1.1];

  const svg = () => `
  <svg viewBox="0 0 128 64" fill="none" xmlns="http://www.w3.org/2000/svg"
       aria-hidden="true" focusable="false">
    <path d="M3 36c16-6 27-9 51-9 20 0 32 2 52 9-7-9-15-15-23-19 7-4 14-6
             21-6-12-3-23-2-33 1-6-2-12-3-18-3-9 0-18 2-27 6-6 3-12 8-20
             21 0 0 6 2 10 0 6-3 9-7 17-9-6 6-10 12-12 18 7-3 15-6 25-7-11
             7-17 12-20 17 13-6 30-11 55-11 12 0 23 2 33 5-16 7-35 10-58
             9C32 58 15 51 3 36Z"
      fill="#101317" stroke="rgba(0,229,200,.38)" stroke-width="1.2"/>
  </svg>`;

  speeds.forEach(speed => {
    const div = document.createElement('div');
    div.dataset.parallaxSpeed = speed;
    div.innerHTML = svg();
    strip.appendChild(div);
  });
}

/* ── Init ───────────────────────────────────────────── */
window.addEventListener('load', () => {
  buildRavenStrip();
  initUI();
  initAnimations();
});

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: true });

const topHud = document.querySelector(".hud--top");
const bottomHud = document.querySelector(".hud--bottom");

// === Page 2 settings ===
// Opción A: redirigir a otro HTML
const PAGE_2_URL = "./page2.html";

// Opción B: si querés “cargar” contenido inline (SPA), avisame y te lo dejo armado.

const CFG = {
  dprCap: 2,

  // ---- Ondas (más visibles) ----
  ringLineWidth: 1.2,        // antes 0.8
  ringAlpha: 0.34,           // antes 0.22
  ringSpacing: 9,            // un poco más densas
  ringSpeed: 95,             // igual
  ringFadeWidth: 520,        // más ancho => se ven más lejos
  ringInnerBoost: 0.28,      // boost en anillos cercanos al centro (0..1)

  // ---- Timing ----
  introHoldMs: 1200,
  ringsOnlyMs: 4600,         // ESFERAS MÁS TARDE (antes 3400)
  convertDurationMs: 2600,   // transición un poco más larga

  // ---- Esferas ----
  sphereCount: 6,
  sphereMinR: 12,
  sphereMaxR: 34,
  spherePopStaggerMs: 260,   // un poco más espaciadas
  sphereOrbitR: 48,
  sphereOrbitJitter: 22,
  sphereFloatAmp: 6,
  sphereFloatSpeed: 0.55,

  // ---- Reveal: de local a global ----
  bgStart: "#000000",
  bgReveal: "#ffffff",
  revealStartMs: 3200,        // arranca más tarde también
  revealBlobMaxR: 280,
  revealSoftEdge: 0.55,

  // Global whiteout (cuando las esferas ya están)
  globalRevealStartAfterConvert: 0.55, // cuando convertT supera esto, empieza el whiteout global
  globalRevealDurationMs: 1400,        // cuánto tarda en quedar todo blanco
  redirectDelayMs: 250,                // espera corta antes de cambiar a page2

  totalLoopMs: null // ya no loop; ahora termina en page2
};

let W = 0, H = 0, DPR = 1;
let safe = { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 };
let spheres = [];
let redirected = false;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const rand = (min, max) => min + Math.random() * (max - min);

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, CFG.dprCap);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  computeSafeRect();
  initSpheres();
}

function computeSafeRect() {
  const topH = topHud ? Math.ceil(topHud.getBoundingClientRect().height) : 0;
  const botH = bottomHud ? Math.ceil(bottomHud.getBoundingClientRect().height) : 0;
  const pad = 16;

  safe.x = 0;
  safe.y = topH + pad;
  safe.w = W;

  const rawH = H - topH - botH - pad * 2;
  safe.h = Math.max(140, rawH);

  if (rawH < 140) safe.y = Math.floor((H - safe.h) * 0.5);

  safe.cx = safe.x + safe.w * 0.5;
  safe.cy = safe.y + safe.h * 0.5;
}

function initSpheres() {
  spheres = [];
  for (let i = 0; i < CFG.sphereCount; i++) {
    const a = (i / CFG.sphereCount) * Math.PI * 2 + rand(-0.25, 0.25);
    const or = CFG.sphereOrbitR + rand(-CFG.sphereOrbitJitter, CFG.sphereOrbitJitter);

    spheres.push({
      x: safe.cx + Math.cos(a) * or,
      y: safe.cy + Math.sin(a) * or,
      r: rand(CFG.sphereMinR, CFG.sphereMaxR),
      z: rand(-0.6, 0.8),
      seed: Math.random() * 1000,
      bornAt: i * CFG.spherePopStaggerMs
    });
  }
}

window.addEventListener("resize", resize);
resize();

/* ---------- Reveal helpers ---------- */
function drawBackgroundBase() {
  ctx.fillStyle = CFG.bgStart;
  ctx.fillRect(0, 0, W, H);
}

function drawLocalizedReveal(tMs) {
  const revealT = clamp((tMs - CFG.revealStartMs) / (CFG.convertDurationMs * 1.1), 0, 1);
  const pr = smoothstep(revealT);
  if (pr <= 0) return;

  const edge = clamp(CFG.revealSoftEdge, 0.05, 0.95);

  for (const s of spheres) {
    const localT = clamp((tMs - CFG.revealStartMs - s.bornAt) / (CFG.convertDurationMs * 0.85), 0, 1);
    const lt = smoothstep(localT);
    const blobR = lt * CFG.revealBlobMaxR;
    if (!Number.isFinite(blobR) || blobR <= 2) continue;

    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, blobR);
    g.addColorStop(0.0, CFG.bgReveal);
    g.addColorStop(edge, CFG.bgReveal);
    g.addColorStop(1.0, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, blobR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGlobalWhiteout(convertT, tMs, ringsOnlyEnd) {
  // Empieza cuando convertT supera el umbral y progresa hasta 1
  const startAt = ringsOnlyEnd + CFG.convertDurationMs * CFG.globalRevealStartAfterConvert;
  const gt = clamp((tMs - startAt) / CFG.globalRevealDurationMs, 0, 1);
  const g = smoothstep(gt);
  if (g <= 0) return { g, done: false };

  // Overlay blanco con alpha creciente (pantalla completa)
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(255,255,255,${g})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Marcar estado para CSS (texto negro sobre blanco si querés)
  if (g > 0.85) document.body.classList.add("is-white");

  const done = g >= 0.999;
  return { g, done };
}

/* ---------- Ripples ---------- */
function drawRipples(tMs, convertT) {
  const fadeGlobal = 1 - smoothstep(convertT) * 0.55;

  const maxR = Math.min(safe.w, safe.h) * 0.49;
  if (!Number.isFinite(maxR) || maxR <= 1) return;

  const spacing = CFG.ringSpacing;
  if (!Number.isFinite(spacing) || spacing <= 0) return;

  ctx.save();
  ctx.lineWidth = CFG.ringLineWidth;

  const t = tMs * 0.001;
  const phase = ((t * CFG.ringSpeed) % spacing + spacing) % spacing;

  for (let r = phase; r < maxR; r += spacing) {
    if (!Number.isFinite(r) || r <= 0) continue;

    // Más visibles: fadeWidth más grande y boost interior
    const baseFade = clamp(1 - (r / (CFG.ringFadeWidth + 1)), 0, 1);
    const innerBoost = lerp(1 + CFG.ringInnerBoost, 1, clamp(r / 220, 0, 1));
    const a = CFG.ringAlpha * baseFade * innerBoost * fadeGlobal;

    if (a <= 0.01) continue;

    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(safe.cx, safe.cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/* ---------- Spheres ---------- */
function drawSphere(x, y, r, shade, alpha) {
  if (!Number.isFinite(r) || r <= 0) return;

  const hlx = x - r * 0.35;
  const hly = y - r * 0.35;

  const g = ctx.createRadialGradient(hlx, hly, Math.max(0.1, r * 0.1), x, y, r);
  const baseA = clamp(alpha, 0, 1);

  g.addColorStop(0.0, `rgba(255,255,255,${0.95 * baseA})`);
  g.addColorStop(0.35, `rgba(255,255,255,${0.55 * baseA})`);
  g.addColorStop(1.0, `rgba(255,255,255,${(0.25 + 0.35 * shade) * baseA})`);

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpheres(tMs, convertT) {
  const ct = smoothstep(convertT);
  if (ct <= 0) return;

  const time = tMs * 0.001;

  for (const s of spheres) {
    const bornT = clamp((tMs - (CFG.introHoldMs + CFG.ringsOnlyMs) - s.bornAt) / CFG.convertDurationMs, 0, 1);
    const appear = smoothstep(bornT);
    if (appear <= 0) continue;

    const float = Math.sin(time * (CFG.sphereFloatSpeed + s.z * 0.12) + s.seed) * CFG.sphereFloatAmp;
    const depthScale = 1 + s.z * 0.12;
    const rr = s.r * depthScale * lerp(0.78, 1.0, appear);

    const pull = (1 - appear) * 18;
    const vx = (s.x - safe.cx);
    const vy = (s.y - safe.cy);
    const len = Math.max(1, Math.hypot(vx, vy));

    const x = s.x - (vx / len) * pull;
    const y = s.y - (vy / len) * pull + float;

    const shade = clamp(0.45 + s.z * 0.35, 0.1, 0.9);
    const alpha = 0.92 * appear * ct;

    drawSphere(x, y, rr, shade, alpha);
  }
}

/* ---------- Navigation to Page 2 ---------- */
function goToPage2() {
  if (redirected) return;
  redirected = true;

  // Pequeño delay para que el blanco “se asiente”
  setTimeout(() => {
    window.location.href = PAGE_2_URL;
  }, CFG.redirectDelayMs);
}

/* ---------- Main loop ---------- */
let start = performance.now();

function frame(now) {
  const t = now - start;

  const ringsOnlyEnd = CFG.introHoldMs + CFG.ringsOnlyMs;
  const convertT = clamp((t - ringsOnlyEnd) / CFG.convertDurationMs, 0, 1);

  // 1) black base
  drawBackgroundBase();

  // 2) localized reveal (primero)
  drawLocalizedReveal(t);

  // 3) ripples
  drawRipples(t, convertT);

  // 4) spheres later
  if (t >= ringsOnlyEnd - 100) {
    drawSpheres(t, convertT);
  }

  // 5) global whiteout and redirect when done
  const { done } = drawGlobalWhiteout(convertT, t, ringsOnlyEnd);
  if (done) {
    goToPage2();
    return; // stop anim loop after redirect trigger
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

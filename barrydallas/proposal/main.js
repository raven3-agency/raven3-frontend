// main.js
// - Visuals ALWAYS ON: rings -> spheres + reveal always progressing
// - Enter button ONLY triggers the loader overlay + fade + redirect

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d", { alpha: true });
let mouse = { x: null, y: null };
const enterBtn = document.getElementById("enterBtn");
const interstitial = document.getElementById("interstitial");
const loaderBar = document.getElementById("loaderBar");
const fade = document.getElementById("fade");

let W = 0,
  H = 0,
  DPR = 1;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

/* ========= Visual scene state ========= */
let t0 = performance.now();

// Visual phases run automatically:
// 0 = rings-only
// 1 = rings->spheres + reveal
// 2 = mostly revealed / stable
let phase = 0;
let phaseStart = performance.now();

const rings = [];
const spheres = [];

// Ring look: thinner + more numerous
const RING_SPAWN_RATE = 34;
const MAX_RINGS = 900;
const RING_LINE_MIN = 0.25;
const RING_LINE_MAX = 0.95;
const RING_FADE_SPEED = 0.0042;
const RING_EXPAND_SPEED = 0.95;

// Spheres
const MAX_SPHERES = 520;

// Reveal from black->white
let reveal = 0; // 0 black, 1 white

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function spawnRing() {
  const cx = W * rand(0.1, 0.9);
  const cy = H * rand(0.15, 0.85);

  rings.push({
    x: cx,
    y: cy,
    r: rand(6, 22),
    vr: rand(0.7, 1.25) * RING_EXPAND_SPEED,
    a: rand(0.08, 0.2),
    w: rand(RING_LINE_MIN, RING_LINE_MAX),
    life: 0,
    seed: Math.random() * 1000,
  });

  if (rings.length > MAX_RINGS) rings.shift();
}

function spawnSphereFromRing(r) {
  if (spheres.length >= MAX_SPHERES) return;

  const z = rand(0.18, 1.0);
  spheres.push({
    x: r.x + rand(-8, 8),
    y: r.y + rand(-8, 8),
    z,
    baseR: rand(10, 46) * (1.05 - z),
    vx: rand(-0.07, 0.07),
    vy: rand(-0.04, 0.05),
    born: performance.now(),
    lx: rand(-0.9, -0.2),
    ly: rand(-0.9, -0.2),
  });

  if (spheres.length > MAX_SPHERES) spheres.shift();
}

/* ========= Drawing ========= */

function drawBackground() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  if (reveal > 0) {
    const alpha = clamp01(reveal) * 0.98;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const g = ctx.createRadialGradient(
      W * 0.5,
      H * 0.5,
      0,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.65
    );
    g.addColorStop(0, "rgba(0,0,0,0.10)");
    g.addColorStop(1, "rgba(0,0,0,0.20)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawRings(now) {
  ctx.save();
  ctx.lineCap = "round";

  for (const r of rings) {
    const wobble = Math.sin(now * 0.002 + r.seed) * 0.6;
    const rr = r.r + wobble;

    ctx.globalAlpha = clamp01(r.a);

    const thickMod = 0.7 + 0.3 * Math.sin(r.seed + r.life * 0.18);
    ctx.lineWidth = Math.max(0.25, r.w * thickMod);

    const ringColor =
      reveal < 0.35 ? "rgba(255,255,255,1)" : "rgba(0,0,0,0.45)";
    ctx.strokeStyle = ringColor;

    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(0.1, rr), 0, Math.PI * 2);
    ctx.stroke();

    // faint secondary ring (more lines, more delicate "rain" read)
    ctx.globalAlpha = clamp01(r.a * 0.55);
    ctx.lineWidth = Math.max(0.2, ctx.lineWidth * 0.7);
    ctx.beginPath();
    ctx.arc(r.x, r.y, Math.max(0.1, rr + 4.5), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSphere(s) {
  const bgIsWhite = reveal > 0.55;

  const r = s.baseR;
  const x = s.x;
  const y = s.y;

  const gx = x + s.lx * r * 0.35;
  const gy = y + s.ly * r * 0.35;

  const grad = ctx.createRadialGradient(gx, gy, r * 0.1, x, y, r);

  if (!bgIsWhite) {
    grad.addColorStop(0, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.55, "rgba(210,210,210,0.55)");
    grad.addColorStop(1, "rgba(110,110,110,0.18)");
  } else {
    grad.addColorStop(0, "rgba(0,0,0,0.35)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.16)");
    grad.addColorStop(1, "rgba(0,0,0,0.06)");
  }

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = bgIsWhite ? 0.22 : 0.28;
  ctx.strokeStyle = bgIsWhite ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(0.5, r * 0.03);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.985, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawSpheres() {
  for (const s of spheres) drawSphere(s);
}

/* ========= Auto-running visual timeline ========= */

function update(now) {
  const dt = Math.min(32, now - t0);
  t0 = now;

  // Spawn rings always
  if (Math.random() < 0.45) spawnRing();
  if (Math.random() < 0.12) spawnRing();

  // Auto-progress from phase 0 to 1 after a short intro
  if (phase === 0 && now - phaseStart > 800) {
    phase = 1;
  }

  // Update rings
  for (const r of rings) {
    r.life += dt * 0.02;
    r.r += r.vr * (dt * 0.06);
    r.a -= RING_FADE_SPEED * (dt * 0.9);

    // Convert rings into spheres automatically (not tied to button)
    if (phase >= 1 && r.a > 0.05 && Math.random() < 0.16) {
      spawnSphereFromRing(r);
    }
  }

  // Remove dead rings
  for (let i = rings.length - 1; i >= 0; i--) {
    if (rings[i].a <= 0.002 || rings[i].r > Math.max(W, H) * 0.9)
      rings.splice(i, 1);
  }

  // Update spheres drift
  for (const s of spheres) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    if (mouse.x !== null) {
      const dx = s.x - mouse.x;
      const dy = s.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

      const radius = 10; // radio de influencia
      if (dist < radius) {
        const force = (1 - dist / radius) * 0.35;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
      }
    }

    // amortiguación suave
    s.vx *= 0.985;
    s.vy *= 0.985;
  }

  // Reveal always follows sphere build-up (auto)
  if (phase >= 1) {
    // target based on how many spheres exist, but with a slow curve so it "earns" the white
    const raw = clamp01(spheres.length / MAX_SPHERES);

    // Make it slower: curve compresses early progress (raw^2.2 slows initial brightening a lot)
    const target = Math.pow(raw, 2.2);

    // Much slower follow speed (antes 0.02)
    const REVEAL_FOLLOW = 0.0035;

    reveal += (target - reveal) * REVEAL_FOLLOW * (dt / 16);

    // Optional: never fully reach pure white quickly; cap a bit so it stays alive
    // reveal = Math.min(reveal, 0.97);

    if (reveal > 0.92 && spheres.length > MAX_SPHERES * 0.85) {
      phase = 2;
    }
  }

  // Render
  drawBackground();
  drawRings(now);
  drawSpheres();

  requestAnimationFrame(update);
}
requestAnimationFrame(update);

/* ========= Button behavior: ONLY loading overlay + fade + redirect ========= */

function setLoader(p) {
  loaderBar.style.width = `${Math.round(clamp01(p) * 100)}%`;
}

function runLoadingAndGo() {
  // Show overlay
  interstitial.classList.add("show");
  interstitial.setAttribute("aria-hidden", "false");

  // Hide button (optional, but cleaner)
  enterBtn.style.opacity = "0";
  enterBtn.style.pointerEvents = "none";

  // Pure time-based loader (no coupling to visuals)
  const DURATION = 1400; // ms
  const start = performance.now();

  const tick = () => {
    const p = clamp01((performance.now() - start) / DURATION);
    setLoader(p);

    if (p >= 1) {
      fade.classList.add("on");
      window.setTimeout(() => {
        window.location.href = "./page2.html";
      }, 720);
      return;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

enterBtn.addEventListener("click", runLoadingAndGo);

window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") runLoadingAndGo();
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // explosión suave de nuevas rings + spheres
  for (let i = 0; i < 14; i++) {
    rings.push({
      x: x + rand(-40, 40),
      y: y + rand(-40, 40),
      r: rand(6, 16),
      vr: rand(0.6, 1.1),
      a: rand(0.12, 0.25),
      w: rand(RING_LINE_MIN, RING_LINE_MAX),
      life: 0,
      seed: Math.random() * 1000,
    });
  }

  for (let i = 0; i < 6; i++) {
    spheres.push({
      x,
      y,
      z: rand(0.2, 0.9),
      baseR: rand(14, 38),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.25, 0.25),
      born: performance.now(),
      lx: rand(-1, 1),
      ly: rand(-1, 1),
    });
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

canvas.addEventListener("mouseleave", () => {
  mouse.x = null;
  mouse.y = null;
});

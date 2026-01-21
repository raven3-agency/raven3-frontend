/* Barry Dallas — Landing rings -> spheres -> white page transition
   Pure canvas + DOM (no libs), tuned for Win11 laptop performance.
*/

const canvas = document.getElementById("rings");
const ctx = canvas.getContext("2d", { alpha: true });

const spheresLayer = document.getElementById("spheres");
const wipe = document.getElementById("wipe");
const landing = document.getElementById("landing");
const page2 = document.getElementById("page2");
const skipBtn = document.getElementById("skip");

let w = 0, h = 0, dpr = 1;
let cx = 0, cy = 0;

const rings = []; // expanding circles
let lastT = 0;

const settings = {
  ringCountPerDrop: 18,
  ringSpacing: 12,
  ringSpeed: 210,

  ringLineBase: 0.6,     // un poco más visible sin engrosar demasiado
  ringLineMax: 2.0,      // primer anillo “impacto”

  ringAlpha: 0.42,       // sube bastante la visibilidad (antes 0.32)
  ringFadeRate: 0.18,    // se apagan más lento (antes 0.22)

  dropIntervalMs: 720,
  introDurationMs: 8200,
  morphDurationMs: 2200,
  wipeDelayMs: 1050,
};

let startedAt = performance.now();
let nextDropAt = startedAt + 500;
let phase = "rings"; // rings -> morph -> wipe -> page2

function resize(){
  dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  w = Math.floor(window.innerWidth);
  h = Math.floor(window.innerHeight);
  cx = w * 0.5;
  cy = h * 0.52;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize, { passive: true });
resize();

function spawnDrop(){
  // one "drop" creates a cluster of rings with staggered radii
  const now = performance.now();
  for (let i = 0; i < settings.ringCountPerDrop; i++){
    rings.push({
      born: now + i * 25,
      r: i * settings.ringSpacing,
      alpha: settings.ringAlpha * (1 - i / (settings.ringCountPerDrop + 3)),
      // fade style: inner delicate -> slightly stronger outer (Barry asked either delicate or fading)
      lw: settings.ringLineBase + (settings.ringLineMax - settings.ringLineBase) * (i / settings.ringCountPerDrop) * 0.55,
    });
  }
}

function draw(dt){
  ctx.clearRect(0, 0, w, h);

  // subtle vignette to keep center readable behind title
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w,h)*0.55);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // rings
  for (let i = rings.length - 1; i >= 0; i--){
    const ring = rings[i];
    // wait for born time
    if (performance.now() < ring.born) continue;

    ring.r += settings.ringSpeed * dt;
    ring.alpha -= settings.ringFadeRate * dt;

    if (ring.alpha <= 0 || ring.r > Math.max(w, h) * 1.3){
      rings.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, ring.alpha)})`;
    ctx.lineWidth = ring.lw;
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function tick(t){
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
  lastT = t;

  // drop cadence during rings/morph (less during morph)
  if ((phase === "rings" || phase === "morph") && t >= nextDropAt){
    spawnDrop();
    nextDropAt = t + (phase === "rings" ? settings.dropIntervalMs : settings.dropIntervalMs * 1.25);
  }

  draw(dt);

  // phase logic
  const elapsed = t - startedAt;

  if (phase === "rings" && elapsed >= settings.introDurationMs){
    phase = "morph";
    beginMorph();
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

/* MORPH: rings -> spheres (perception shift) */
function beginMorph(){
  // show spheres layer
  spheresLayer.style.opacity = "1";

  // generate a field of spheres that reads like "3D" from the rings
  const count = 120; // enough to feel like conversion, not too heavy
  const radiusMax = Math.min(w, h) * 0.42;

  spheresLayer.innerHTML = "";
  for (let i = 0; i < count; i++){
    const el = document.createElement("div");
    el.className = "sphere";

    const ang = Math.random() * Math.PI * 2;
    const rr = Math.pow(Math.random(), 0.55) * radiusMax; // bias outward a bit
    const x = cx + Math.cos(ang) * rr;
    const y = cy + Math.sin(ang) * rr;

    // pseudo depth: closer to center = deeper z, outer = closer
    const z = (1 - rr / radiusMax) * 240 - 40; // px

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    // stagger
    const delay = Math.random() * 550;
    el.style.transitionDelay = `${delay}ms`;

    spheresLayer.appendChild(el);

    // animate in
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = `translate3d(-50%, -50%, ${z}px) scale(${0.6 + Math.random() * 1.1})`;
    });
  }

  // after morph settles, start wipe
  setTimeout(() => {
    phase = "wipe";
    beginWipeToPage2();
  }, settings.morphDurationMs + settings.wipeDelayMs);
}

/* Wipe: black erased to white, then show Page 2 */
function beginWipeToPage2(){
  wipe.classList.add("on");

  // fade out title/author gently as white takes over
  document.getElementById("title").style.transition = "opacity 800ms ease";
  document.getElementById("author").style.transition = "opacity 800ms ease";
  document.getElementById("title").style.opacity = "0";
  document.getElementById("author").style.opacity = "0";

  // complete transition
  setTimeout(() => {
    landing.style.display = "none";
    document.body.style.overflow = "auto";
    document.body.style.background = "#fff";

    page2.hidden = false;
    page2.scrollIntoView({ behavior: "auto", block: "start" });

    // stop drawing (optional: leave requestAnimationFrame running is OK; but we can hard-stop by removing canvas)
    phase = "page2";
  }, 1250);
}

/* Skip intro */
skipBtn.addEventListener("click", () => {
  // jump directly to page 2
  landing.style.display = "none";
  document.body.style.overflow = "auto";
  document.body.style.background = "#fff";
  page2.hidden = false;
  phase = "page2";
}, { passive: true });

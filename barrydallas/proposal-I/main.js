import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("bg");
const progressBar = document.getElementById("progressBar");
const skipBtn = document.getElementById("skipBtn");
const page2 = document.getElementById("page2");
const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

/**
 * Scene setup
 */
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050507, 0.06);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(0, 0.2, 10);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Subtle lighting (mostly for the hero drop)
 */
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffffff, 0.7);
key.position.set(2, 4, 6);
scene.add(key);

/**
 * Rain field (points)
 */
const RAIN_COUNT = 2400;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_COUNT * 3);
const rainVel = new Float32Array(RAIN_COUNT);

const bounds = {
  x: 14,
  yTop: 14,
  yBottom: -14,
  z: 10,
};

for (let i = 0; i < RAIN_COUNT; i++) {
  const ix = i * 3;
  rainPos[ix + 0] = (Math.random() * 2 - 1) * bounds.x;
  rainPos[ix + 1] = bounds.yTop * Math.random();
  rainPos[ix + 2] = (Math.random() * 2 - 1) * bounds.z;
  rainVel[i] = 0.03 + Math.random() * 0.12;
}
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
function makeDropSpriteTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  // Core (más sólido)
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.05, size * 0.10, 0, Math.PI * 2);
  ctx.fill();

  // Halo (suave)
  const halo = ctx.createRadialGradient(cx, cy - size * 0.05, size * 0.02, cx, cy - size * 0.05, size * 0.22);
  halo.addColorStop(0, "rgba(255,255,255,0.55)");
  halo.addColorStop(1, "rgba(255,255,255,0.0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.05, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Tail (más visible)
  const tailGrad = ctx.createLinearGradient(cx, cy, cx, cy + size * 0.35);
  tailGrad.addColorStop(0, "rgba(255,255,255,0.55)");
  tailGrad.addColorStop(1, "rgba(255,255,255,0.0)");
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.055, cy + size * 0.02);
  ctx.quadraticCurveTo(cx, cy + size * 0.25, cx + size * 0.055, cy + size * 0.02);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
const dropSprite = makeDropSpriteTexture(128);

const rainMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.10,
  map: dropSprite,
  transparent: true,
  opacity: 1.0,
  depthWrite: false,
  blending: THREE.NormalBlending,  // <- clave
});
const rain = new THREE.Points(rainGeo, rainMat);
scene.add(rain);

/**
 * Hero raindrop (scroll-driven)
 * We model it as a sphere that scales in Y to feel like a drop stretching.
 */
const dropGroup = new THREE.Group();
scene.add(dropGroup);

function createDropGeometry(radius = 0.28, wSeg = 64, hSeg = 64) {
  const geo = new THREE.SphereGeometry(radius, wSeg, hSeg);
  const pos = geo.attributes.position;

  // Deform: make it "tear drop"
  // - keep top round
  // - taper bottom into a point
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Normalize y in [-radius..radius] -> [0..1] where 0=bottom, 1=top
    const yn = (y + radius) / (2 * radius);

    // Taper near the bottom (stronger as yn -> 0)
    const taper = Math.pow(yn, 0.85); // 0..1 (bottom small)
    const nx = x * (0.35 + 0.65 * taper);
    const nz = z * (0.35 + 0.65 * taper);

    // Pull bottom down slightly to make a point (only near bottom)
    const pull = 1 - yn; // 1 at bottom
    const ny = y - pull * pull * radius * 0.55;

    pos.setXYZ(i, nx, ny, nz);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const dropGeo = createDropGeometry(0.28, 64, 64);
const dropMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.15,
  metalness: 0.0,
  transparent: true,
  opacity: 0.92,
  envMapIntensity: 0.4,
});
const drop = new THREE.Mesh(dropGeo, dropMat);
dropGroup.add(drop);
drop.rotation.x = Math.PI;
dropGroup.position.set(0, 1.9, 3.2);
drop.scale.set(1, 1.0, 1);

/**
 * "Ground" plane (invisible) to define the hit point visually.
 */
const groundY = -3.2;

/**
 * Scroll logic
 * We convert wheel/touch scroll into a 0..1 progress.
 */
let progress = 0; // 0..1
let unlocked = false;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function setProgress(p) {
  progress = clamp01(p);
  progressBar.style.width = `${Math.round(progress * 100)}%`;
  progressBar.parentElement?.setAttribute(
    "aria-valuenow",
    `${Math.round(progress * 100)}`
  );

  // Drop falls from yStart to groundY
  const yStart = 2.2;
  const y = yStart + (groundY - yStart) * progress;

  const stretch = 1.0 + Math.pow(progress, 1.5) * 1.55;
  const squash = 1 / Math.sqrt(stretch);

  // keep a bit more width so the tip doesn't disappear
  drop.scale.set(0.98 * squash, stretch, 0.98 * squash);

  // Slight wobble/rotation for life
  dropGroup.rotation.z = Math.sin(progress * Math.PI) * 0.08;
  dropGroup.rotation.x = Math.cos(progress * Math.PI) * 0.06;

  // Position with compensation so stretching doesn't "pull" the top too much
  dropGroup.position.y = y;
  drop.position.y = 0.12 * (stretch - 1);

  if (!unlocked && progress >= 0.999) unlockPage2();
}

function unlockPage2() {
  unlocked = true;

  // Micro "impact" flash
  rainMat.opacity = 0.7;
  setTimeout(() => (rainMat.opacity = 0.45), 140);

  // Show page 2 overlay
  page2.classList.add("show");
  page2.setAttribute("aria-hidden", "false");

  // Prevent the landing from stealing scroll while overlay is open
  document.body.style.overflow = "hidden";
}

/**
 * Close overlay on Escape
 */
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && unlocked) {
    page2.classList.remove("show");
    page2.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
});

/**
 * Skip button: jump to unlock
 */
skipBtn.addEventListener("click", () => setProgress(1));

/**
 * Wheel scroll -> progress
 */
let wheelAccum = 0;
window.addEventListener(
  "wheel",
  (e) => {
    if (unlocked) return;

    // normalize: trackpads produce small deltas; wheels large
    wheelAccum += e.deltaY * 0.0006;
    setProgress(progress + wheelAccum);
    wheelAccum *= 0.25; // decay
  },
  { passive: true }
);

/**
 * Touch scroll -> progress
 */
let touchStartY = null;
window.addEventListener(
  "touchstart",
  (e) => {
    if (unlocked) return;
    touchStartY = e.touches?.[0]?.clientY ?? null;
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (e) => {
    if (unlocked) return;
    if (touchStartY == null) return;
    const y = e.touches?.[0]?.clientY ?? touchStartY;
    const dy = touchStartY - y; // swipe up => positive
    touchStartY = y;
    setProgress(progress + dy * 0.0022);
  },
  { passive: true }
);

/**
 * Resize
 */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

/**
 * Animation loop
 */
const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  // Rain update
  const pos = rainGeo.attributes.position.array;
  for (let i = 0; i < RAIN_COUNT; i++) {
    const ix = i * 3;
    pos[ix + 1] -= rainVel[i] * (0.6 + Math.sin(t * 0.4) * 0.04);

    // Slight drift
    pos[ix + 0] += Math.sin(t * 0.35 + i) * 0.0006;
    pos[ix + 2] += Math.cos(t * 0.28 + i) * 0.0005;

    if (pos[ix + 1] < bounds.yBottom) {
      pos[ix + 1] = bounds.yTop;
      pos[ix + 0] = (Math.random() * 2 - 1) * bounds.x;
      pos[ix + 2] = (Math.random() * 2 - 1) * bounds.z;
    }
  }
  rainGeo.attributes.position.needsUpdate = true;

  // Camera subtle breathing
  camera.position.x = Math.sin(t * 0.12) * 0.15;
  camera.position.y = 0.2 + Math.cos(t * 0.1) * 0.08;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
setProgress(0);
animate();

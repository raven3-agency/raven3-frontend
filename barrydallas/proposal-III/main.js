import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Fullscreen plane
const geom = new THREE.PlaneGeometry(2, 2);

// Up to N origins (centers)
const MAX = 8;
const origins = new Array(MAX)
  .fill(0)
  .map(() => new THREE.Vector3(0.5, 0.5, -9999));
// x,y in 0..1 (UV), z = startTime (seconds). if z is -9999 => inactive

// Start with a center origin
let timeStart = performance.now() / 1000;
origins[0].set(0.5, 0.5, 0.0);

// Shader: concentric waves -> thin white rings (1–2px) on black
const mat = new THREE.ShaderMaterial({
  // IMPORTANT: enables fwidth() on WebGL1 contexts in three.js
  extensions: { derivatives: true },

  uniforms: {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uOrigins: { value: origins },
    uMax: { value: MAX },
    uGlobalFade: { value: 0.0 },

    // ring look controls
    uLinePx: { value: 1.5 }, // 1.0..2.0 (real pixel-ish thickness)
    uRingGain: { value: 3.0 }, // visibility/contrast of rings
    uFreq: { value: 55.0 }, // ring density (higher = more rings)
    uSpeed: { value: 0.22 }, // expansion speed
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    precision highp float;

    varying vec2 vUv;

    uniform float uTime;
    uniform vec2  uRes;
    uniform vec3  uOrigins[${MAX}];
    uniform int   uMax;
    uniform float uGlobalFade;

    uniform float uLinePx;
    uniform float uRingGain;
    uniform float uFreq;
    uniform float uSpeed;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    void main(){
      // aspect-correct so circles remain circles
      vec2 p = vUv - 0.5;
      p.x *= uRes.x / uRes.y;
      vec2 uvc = p + 0.5;

      float field = 0.0;

      for (int i = 0; i < ${MAX}; i++){
        vec3 o = uOrigins[i];
        if (o.z < -1000.0) continue;

        float t0 = o.z;
        float t  = max(0.0, uTime - t0);

        // origin with aspect correction
        vec2 op = vec2(o.x, o.y) - 0.5;
        op.x *= uRes.x / uRes.y;
        vec2 oc = op + 0.5;

        float d = distance(uvc, oc);

        // tunables
        float speed = uSpeed;
        float freq  = uFreq;
        float decay = 1.35;
        float life  = exp(-t * 0.25);

        float r = d - speed * t;
        float phase = r * freq;

        // Pixel-thin ring line using screen-space derivatives
        // Use cos-based distance to ring peaks (phase near 2πk)
        float aa = fwidth(phase);                 // phase change per pixel
        float w  = max(aa * uLinePx, 0.0006);     // thickness (1–2px stable)

        // abs(1 - cos) is ~0 at ring centers, increases away from them
        float rings = 1.0 - smoothstep(0.0, w, abs(1.0 - cos(phase)));
        rings *= uRingGain;

        // envelope around wavefront (keep your style but ensure visibility)
        float envelope = exp(-abs(r) * 7.5);

        float contrib = rings * envelope * life / (1.0 + d * decay);
        field += contrib;
      }

      // Increase slightly so the rings read clearly on black
      float v = field * 2.6;
      v = clamp(v, 0.0, 1.0);

      // optional global fade (dark -> light)
      v = mix(v * 0.65, v, uGlobalFade);

      // subtle grain
      float g = (hash(gl_FragCoord.xy) - 0.5) * 0.03;
      v = clamp(v + g, 0.0, 1.0);

      gl_FragColor = vec4(vec3(v), 1.0);
    }
  `,
});

const mesh = new THREE.Mesh(geom, mat);
scene.add(mesh);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  mat.uniforms.uRes.value.set(w, h);
}
window.addEventListener("resize", resize);
resize();

// Add origins on click (and unlock on center click)
let nextIdx = 1;
const fadeEl = document.getElementById("fade");

function unlockToPage2() {
  enterPage2WithInterstitial(() => {
    fadeEl?.classList.add("on");
    setTimeout(() => {
      window.location.href = "./page2.html";
    }, 720);
  });
}

function addOriginAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = 1.0 - (clientY - rect.top) / rect.height;
  const now = mat.uniforms.uTime.value;

  origins[nextIdx].set(x, y, now);
  nextIdx = (nextIdx + 1) % MAX;
  if (nextIdx === 0) nextIdx = 1; // keep center reserved
  mat.uniforms.uOrigins.value = origins;
}

function handleTap(clientX, clientY) {
  if (enteringPage2) return;

  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = 1.0 - (clientY - rect.top) / rect.height;

  const dx = x - 0.5;
  const dy = y - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.06) {
    unlockToPage2();
    return;
  }

  addOriginAt(clientX, clientY);
}

window.addEventListener(
  "pointerdown",
  (e) => {
    if (e.target && e.target.closest && e.target.closest("#enterBtn, #interstitial")) return;
    handleTap(e.clientX, e.clientY);
  },
  { passive: true }
);

// Animate
function tick() {
  const t = performance.now() / 1000;
  mat.uniforms.uTime.value = t - timeStart;

  // Optional: slowly increase global fade to “reveal light”
  mat.uniforms.uGlobalFade.value = Math.min(1.0, (t - timeStart) / 8.0);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// ==============================
// Interstitial (loader) before Page 2
// ==============================
const INTERSTITIAL_MS = 10000;

const interstitial = document.getElementById("interstitial");
const loaderBar = document.getElementById("loaderBar");
let enteringPage2 = false;

function enterPage2WithInterstitial(onDone) {
  if (enteringPage2) return;
  enteringPage2 = true;

  interstitial?.classList.add("show");

  if (loaderBar) loaderBar.style.width = "0%";
  const start = performance.now();

  const anim = (tt) => {
    const p = Math.min(1, (tt - start) / INTERSTITIAL_MS);
    if (loaderBar) loaderBar.style.width = `${Math.round(p * 100)}%`;
    if (p < 1) requestAnimationFrame(anim);
  };
  requestAnimationFrame(anim);

  setTimeout(() => {
    interstitial?.classList.remove("show");
    setTimeout(() => {
      if (typeof onDone === "function") onDone();
    }, 250);
  }, INTERSTITIAL_MS);
}

interstitial?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (!enteringPage2) return;

  interstitial.classList.remove("show");
  fadeEl?.classList.add("on");
  setTimeout(() => {
    window.location.href = "./page2.html";
  }, 720);
});

const enterBtn = document.getElementById("enterBtn");
enterBtn?.addEventListener("click", () => {
  unlockToPage2();
});

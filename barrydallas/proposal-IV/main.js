import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const stage = document.getElementById("stage");
const wipe = document.getElementById("wipe");

// ---------- Config ----------
const RIPPLE_MAX = 24;          // cantidad máxima de ondas vivas
const RIPPLE_LIFE = 5.2;        // segundos
const DROP_INTERVAL = 0.55;     // cada cuánto cae una gota (fase 2)
const DROP_JITTER = 0.14;       // aleatoriedad alrededor del centro (0..1 en UV)
const INTRO_DELAY = 0.6;        // primer gota
const PHASE2_START = 1.6;       // empiezan gotas sucesivas
const PHASE3_START = 5.0;       // gota final (wipe)
const GO_PAGE2_AFTER = 900;     // ms después de wipe

// ---------- Three basics ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
stage.appendChild(renderer.domElement);

// Ortho camera for full-screen plane
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
camera.position.z = 1;

const geometry = new THREE.PlaneGeometry(2, 2);

// ---------- Ripple storage ----------
/**
 * Cada ripple:
 *  - center: vec2 (UV 0..1)
 *  - t0: start time
 *  - amp: amplitud
 */
const ripples = [];
let rippleCursor = 0;

function pushRipple(centerUV, t0, amp = 1.0) {
  const r = { center: centerUV, t0, amp };
  if (ripples.length < RIPPLE_MAX) {
    ripples.push(r);
  } else {
    // reemplazo circular
    ripples[rippleCursor] = r;
    rippleCursor = (rippleCursor + 1) % RIPPLE_MAX;
  }
}

// ---------- Shader ----------
const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },

  // arrays fijos en shader
  uRippleCount: { value: 0 },
  uCenters: { value: Array.from({ length: RIPPLE_MAX }, () => new THREE.Vector2(0.5, 0.5)) },
  uT0: { value: new Float32Array(RIPPLE_MAX) },
  uAmp: { value: new Float32Array(RIPPLE_MAX) },

  // look
  uBg: { value: new THREE.Color(0x000000) },
  uLine: { value: new THREE.Color(0xffffff) },
};

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uRes;

  uniform int uRippleCount;
  uniform vec2 uCenters[${RIPPLE_MAX}];
  uniform float uT0[${RIPPLE_MAX}];
  uniform float uAmp[${RIPPLE_MAX}];

  uniform vec3 uBg;
  uniform vec3 uLine;

  // parámetros de estilo
  float ring(float d, float t, float amp) {
    // velocidad y frecuencia
    float speed = 0.26;
    float freq  = 34.0;

    // radio de la onda creciendo
    float r = t * speed;

    // banda alrededor del frente
    float band = abs(d - r);

    // grosor del anillo (disminuye con el tiempo)
    float thickness = mix(0.0048, 0.0011, clamp(t / 4.8, 0.0, 1.0));

    // intensidad base
    float wave = exp(-band * (1.15 / thickness));

    // modulación senoidal para un look más “acuático”
    float osc = 0.5 + 0.5 * sin((d - r) * freq);

    // fade por vida
    float life = 1.0 - smoothstep(0.0, ${RIPPLE_LIFE}, t);
    // amortiguación radial
    float damp = exp(-d * 1.35);

    return wave * osc * life * damp * amp;
  }

  void main() {
    vec2 uv = vUv;

    // aspect-correct distance (para que los círculos sean círculos)
    vec2 p = uv - vec2(0.5);
    p.x *= uRes.x / uRes.y;

    float accum = 0.0;

    for (int i = 0; i < ${RIPPLE_MAX}; i++) {
      if (i >= uRippleCount) break;

      vec2 c = uCenters[i] - vec2(0.5);
      c.x *= uRes.x / uRes.y;

      float d = length(p - c);
      float t = max(0.0, uTime - uT0[i]);

      accum += ring(d, t, uAmp[i]);
    }

    // Curva para que se vean bien sobre negro
    float intensity = clamp(accum, 0.0, 1.0);
    intensity = pow(intensity, 0.62);

    vec3 col = mix(uBg, uLine, intensity);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
});
const quad = new THREE.Mesh(geometry, material);
scene.add(quad);

// ---------- Timeline control ----------
let start = performance.now() / 1000;
let lastDrop = -999;
let phase3Triggered = false;

function updateUniformArrays() {
  uniforms.uRippleCount.value = ripples.length;

  for (let i = 0; i < ripples.length; i++) {
    uniforms.uCenters.value[i].set(ripples[i].center.x, ripples[i].center.y);
    uniforms.uT0.value[i] = ripples[i].t0;
    uniforms.uAmp.value[i] = ripples[i].amp;
  }
}

function randAroundCenter() {
  // alrededor del centro en UV (0.5,0.5)
  const jx = (Math.random() * 2 - 1) * DROP_JITTER;
  const jy = (Math.random() * 2 - 1) * DROP_JITTER;
  return { x: 0.5 + jx, y: 0.5 + jy };
}

function triggerWipeAndGoPage2() {
  wipe.classList.add("is-on");
  window.setTimeout(() => {
    window.location.href = "./page2.html";
  }, GO_PAGE2_AFTER);
}

// ---------- Render loop ----------
function animate() {
  const now = performance.now() / 1000;
  const t = now - start;

  uniforms.uTime.value = t;

  // Phase 1: primera gota al centro
  if (t >= INTRO_DELAY && ripples.length === 0) {
    pushRipple({ x: 0.5, y: 0.5 }, t, 1.1);
  }

  // Phase 2: gotas sucesivas
  if (t >= PHASE2_START && t < PHASE3_START) {
    if (t - lastDrop >= DROP_INTERVAL) {
      lastDrop = t;
      const c = randAroundCenter();
      pushRipple(c, t, 0.85 + Math.random() * 0.35);
    }
  }

  // Phase 3: gota final + wipe
  if (t >= PHASE3_START && !phase3Triggered) {
    phase3Triggered = true;

    // una gota final potente en el centro para “llenar” la pantalla
    pushRipple({ x: 0.5, y: 0.5 }, t, 2.2);

    // el wipe a blanco ocurre poco después, para que se vea el frente expandirse
    window.setTimeout(triggerWipeAndGoPage2, 850);
  }

  updateUniformArrays();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---------- Resize ----------
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

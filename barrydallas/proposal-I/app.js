// app.js (ES module)
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const TITLE = "From Darkness into Light";
const AUTHOR = "Barry"; // change to the author name you want

window.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Core setup (DOM-safe)
  // -------------------------
  let canvas = document.getElementById("c");

  // If the canvas isn't in the DOM, create it to avoid null errors
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "c";
    document.body.appendChild(canvas);
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    250
  );
  camera.position.set(0, 0.9, 7.25);
  camera.lookAt(0, 0, 0);

  // Subtle camera drift to keep it alive but minimal
  let camT = 0;

  // -------------------------
  // Text overlay helpers (safe)
  // -------------------------
  const line1 = document.getElementById("line1");
  const line2 = document.getElementById("line2");
  const phaseEl = document.getElementById("phase");

  function setLines(a, b) {
    if (line1) line1.textContent = a || "";
    if (line2) line2.textContent = b || "";
  }

  function showLine(el, show) {
    if (!el) return;
    el.classList.toggle("show", !!show);
  }

  // -------------------------
  // Visual language
  // -------------------------
  const additiveWhite = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  function makeRingMesh() {
    const geo = new THREE.RingGeometry(0.98, 1.0, 128);
    const mat = additiveWhite.clone();
    mat.opacity = 0.0;
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; // lie on XZ plane
    return m;
  }

  function makeSphereMesh() {
    const geo = new THREE.SphereGeometry(1, 48, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const m = new THREE.Mesh(geo, mat);
    return m;
  }

  // Groups for easy show/hide
  const wavesGroup = new THREE.Group();
  const spheresGroup = new THREE.Group();
  scene.add(wavesGroup);
  scene.add(spheresGroup);

  // A single “drop” point (tiny glow) that seeds the waves
  const drop = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0], 3)
    ),
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.06,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  drop.position.y = 0.0;
  scene.add(drop);

  // Soft ambient “fog” (kept subtle; we brighten via clearColor instead)
  scene.fog = new THREE.FogExp2(0x000000, 0.06);

  // -------------------------
  // Phase system (state machine)
  // -------------------------
  const PHASES = [
    "BLACK_TITLE",
    "BLACK_TITLE_AUTHOR",
    "WAVES_2D_ERASE",
    "SPHERES_3D_ERASE",
    "WHITE_AUTHOR_TITLE",
    "RESET_TO_BLACK",
  ];

  let phaseIndex = 0;
  let phaseTime = 0;

  // Timing (seconds)
  const D = {
    blackTitle: 2.2,
    blackTitleAuthor: 2.4,
    waves: 9.0,
    spheres: 9.0,
    whiteHold: 2.6,
    reset: 1.2,
  };

  // Background “erasure” control: 0 = black, 1 = white
  let erase = 0;

  // Wave/sphere instances
  const MAX_WAVES = 42;
  const MAX_SPHERES = 30;

  let waves = [];
  let spheres = [];

  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }
  }

  function spawnWaves() {
    clearGroup(wavesGroup);
    waves = [];
    for (let i = 0; i < MAX_WAVES; i++) {
      const ring = makeRingMesh();
      ring.scale.setScalar(0.001);
      ring.position.set(0, 0, 0);
      ring.userData.birth = i * 0.12;
      ring.userData.life = 4.8;
      wavesGroup.add(ring);
      waves.push(ring);
    }
  }

  function spawnSpheres() {
    clearGroup(spheresGroup);
    spheres = [];
    for (let i = 0; i < MAX_SPHERES; i++) {
      const s = makeSphereMesh();
      s.scale.setScalar(0.001);
      s.position.set(0, 0, 0);
      s.userData.birth = i * 0.16;
      s.userData.life = 5.8;
      spheresGroup.add(s);
      spheres.push(s);
    }
  }

  function setPhase(idx) {
    // Wrap safely
    phaseIndex = ((idx % PHASES.length) + PHASES.length) % PHASES.length;
    phaseTime = 0;

    const name = PHASES[phaseIndex];
    if (phaseEl) phaseEl.textContent = name;

    // Defaults
    drop.material.opacity = 0;
    wavesGroup.visible = false;
    spheresGroup.visible = false;

    showLine(line1, false);
    showLine(line2, false);

    if (name === "BLACK_TITLE") {
      setLines(TITLE, "");
      showLine(line1, true);
    }

    if (name === "BLACK_TITLE_AUTHOR") {
      setLines(TITLE, `by ${AUTHOR}`);
      showLine(line1, true);
      showLine(line2, true);
    }

    if (name === "WAVES_2D_ERASE") {
      setLines("", "");
      spawnWaves();
      wavesGroup.visible = true;
      drop.material.opacity = 0.55;
      drop.position.set(0, 0, 0);
    }

    if (name === "SPHERES_3D_ERASE") {
      setLines("", "");
      spawnSpheres();
      spheresGroup.visible = true;
    }

    if (name === "WHITE_AUTHOR_TITLE") {
      setLines(`by ${AUTHOR}`, TITLE);
      showLine(line1, true);
      showLine(line2, true);
    }

    if (name === "RESET_TO_BLACK") {
      setLines("", "");
    }
  }

  // Start
  setPhase(0);

  // Skip button (safe)
  const skipBtn = document.getElementById("skip");
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      setPhase(phaseIndex + 1);
    });
  }

  // -------------------------
  // Animation helpers
  // -------------------------
  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function applyEraseToBackground() {
    const e = smoothstep(0.02, 0.98, erase);

    document.body.classList.toggle("white", e > 0.82);

    const c = new THREE.Color().setRGB(e, e, e);
    renderer.setClearColor(c, 1);

    scene.fog.color.copy(c);
  }

  function updateWaves(tLocal, dt) {
    // Use dt so timing doesn't depend on FPS
    erase = clamp01(erase + dt / D.waves);

    const p =
      smoothstep(0.0, 0.5, tLocal) * (1 - smoothstep(1.2, 2.0, tLocal));
    drop.material.opacity = 0.25 + 0.45 * p;

    for (const ring of waves) {
      const age = tLocal - ring.userData.birth;
      const life = ring.userData.life;

      if (age < 0) {
        ring.material.opacity = 0;
        ring.scale.setScalar(0.001);
        continue;
      }

      const u = clamp01(age / life);

      const s = 0.12 + u * 8.2;
      ring.scale.setScalar(s);

      const o = smoothstep(0.0, 0.10, u) * (1 - smoothstep(0.72, 1.0, u));
      ring.material.opacity = 0.10 + 0.35 * o;

      ring.rotation.z = ring.userData.birth * 0.06;
    }
  }

  function updateSpheres(tLocal, dt) {
    erase = clamp01(erase + dt / D.spheres);

    drop.material.opacity = 0;

    for (const s of spheres) {
      const age = tLocal - s.userData.birth;
      const life = s.userData.life;

      if (age < 0) {
        s.material.opacity = 0;
        s.scale.setScalar(0.001);
        continue;
      }

      const u = clamp01(age / life);

      const scale = 0.2 + u * 10.5;
      s.scale.setScalar(scale);

      const o = smoothstep(0.0, 0.12, u) * (1 - smoothstep(0.65, 1.0, u));
      s.material.opacity = 0.06 + 0.28 * o;

      s.rotation.y = s.userData.birth * 0.08 + u * 0.35;
      s.rotation.x = s.userData.birth * 0.05 + u * 0.22;
    }
  }

  // -------------------------
  // Main loop
  // -------------------------
  let last = performance.now();

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    phaseTime += dt;

    camT += dt;
    camera.position.x = Math.sin(camT * 0.18) * 0.08;
    camera.position.y = 0.9 + Math.sin(camT * 0.12) * 0.05;
    camera.lookAt(0, 0, 0);

    const name = PHASES[phaseIndex];

    if (name === "BLACK_TITLE") {
      erase = 0;
      applyEraseToBackground();
      if (phaseTime > D.blackTitle) setPhase(phaseIndex + 1);
    }

    if (name === "BLACK_TITLE_AUTHOR") {
      erase = 0;
      applyEraseToBackground();
      if (phaseTime > D.blackTitleAuthor) setPhase(phaseIndex + 1);
    }

    if (name === "WAVES_2D_ERASE") {
      updateWaves(phaseTime, dt);
      applyEraseToBackground();
      if (phaseTime > D.waves) setPhase(phaseIndex + 1);
    }

    if (name === "SPHERES_3D_ERASE") {
      updateSpheres(phaseTime, dt);
      applyEraseToBackground();
      if (phaseTime > D.spheres) setPhase(phaseIndex + 1);
    }

    if (name === "WHITE_AUTHOR_TITLE") {
      erase = 1;
      applyEraseToBackground();
      if (phaseTime > D.whiteHold) setPhase(phaseIndex + 1);
    }

    if (name === "RESET_TO_BLACK") {
      const u = clamp01(phaseTime / D.reset);
      erase = 1 - smoothstep(0.0, 1.0, u);
      applyEraseToBackground();

      wavesGroup.visible = false;
      spheresGroup.visible = false;
      drop.material.opacity = 0;

      if (phaseTime > D.reset) setPhase(0);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // -------------------------
  // Resize
  // -------------------------
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
});

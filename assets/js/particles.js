import * as THREE from "/assets/vendor/three/three.module.js";
let started = false;

function start() {
  if (started) return;
  started = true;

  const canvas = document.getElementById("particles");
  if (!canvas) {
    console.warn('Falta <canvas id="particles"> en el <body>.');
    return;
  }

  const isSmallScreen = window.innerWidth < 1024;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const count = isSmallScreen ? 3000 : 9000;
  const maxPixelRatio = isSmallScreen ? 1 : 2;

  function makeCircleTexture(size = 64) {
    const c = document.createElement("canvas");
    c.width = c.height = size;

    const ctx = c.getContext("2d");
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0.0, "rgba(55,226,213,1)");
    g.addColorStop(0.7, "rgba(55,226,213,0.6)");
    g.addColorStop(1.0, "rgba(55,226,213,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  let mouseX = 0,
    mouseY = 0;
  let halfX = window.innerWidth / 2;
  let halfY = window.innerHeight / 2;

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    5,
    2000,
  );
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x37e2d5, 0.0008);

  const size = 2000;
  const vertices = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() * size + Math.random() * size) / 2 - size / 2;
    const y = (Math.random() * size + Math.random() * size) / 2 - size / 2;
    const z = (Math.random() * size + Math.random() * size) / 2 - size / 2;

    const idx = i * 3;
    vertices[idx] = x;
    vertices[idx + 1] = y;
    vertices[idx + 2] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );

  const material = new THREE.PointsMaterial({
    size: 2.2,
    map: makeCircleTexture(64),
    color: 0x37e2d5,
    transparent: true,
    alphaTest: 0.1,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isSmallScreen,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);

  function onResize() {
    halfX = window.innerWidth / 2;
    halfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onPointerMove(e) {
    mouseX = e.clientX - halfX;
    mouseY = e.clientY - halfY;
  }

  window.addEventListener("resize", onResize);

  if (prefersReducedMotion) {
    // Sin movimiento: un solo frame estático, sin loop de render ni listeners de mouse.
    renderer.render(scene, camera);
    return;
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });

  let rafId = null;

  function render() {
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);

    scene.rotation.x += 0.001;
    scene.rotation.y += 0.002;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(render);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (rafId === null) {
      render();
    }
  });

  render();
}

// Arranca en tiempo ocioso: es decorativo, no debe competir por el hilo
// principal con el pintado del LCP (setup de WebGL + 3-9k vértices es pesado).
function scheduleStart() {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    setTimeout(start, 200);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleStart);
} else {
  scheduleStart();
}

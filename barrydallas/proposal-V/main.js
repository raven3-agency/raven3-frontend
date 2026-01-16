(() => {
  // =========================
  // Utilities
  // =========================
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const now = () => performance.now();

  function rafUntil(fn) {
    let running = true;
    function loop() {
      if (!running) return;
      fn();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    return () => (running = false);
  }

  // =========================
  // DOM
  // =========================
  const titleEl  = document.getElementById("title");
  const authorEl = document.getElementById("author");
  const rippleCanvas = document.getElementById("ripple");
  const webglCanvas  = document.getElementById("webgl");
  const body = document.body;

  // Make canvases pixel-perfect
  function fitCanvas(canvas) {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    return { w, h, dpr };
  }

  // =========================
  // 2D Ripple "Erase" Layer
  // =========================
  const rctx = rippleCanvas.getContext("2d", { alpha: true });
  let rippleSize = fitCanvas(rippleCanvas);

  function rippleClearBlack() {
    // Black overlay that will be erased to reveal "white beneath"
    rctx.globalCompositeOperation = "source-over";
    rctx.fillStyle = "#000";
    rctx.fillRect(0, 0, rippleCanvas.width, rippleCanvas.height);
  }

  // A single raindrop that becomes many concentric waves (non-looping)
  const ripple = {
    active: false,
    t0: 0,
    duration: 8200, // ms
    center: { x: 0, y: 0 },
    maxR: 0,
  };

  function startRipple() {
    rippleSize = fitCanvas(rippleCanvas);
    ripple.center.x = rippleCanvas.width * 0.5;
    ripple.center.y = rippleCanvas.height * 0.5;
    ripple.maxR = Math.hypot(rippleCanvas.width, rippleCanvas.height) * 0.62;

    rippleClearBlack();

    ripple.active = true;
    ripple.t0 = now();
  }

  function drawRippleFrame() {
    if (!ripple.active) return;

    const t = clamp((now() - ripple.t0) / ripple.duration, 0, 1);
    const e = easeInOutCubic(t);

    // Each frame: black overlay remains, then we erase rings progressively.
    rippleClearBlack();

    // Erase strategy: destination-out removes black.
    rctx.globalCompositeOperation = "destination-out";

    // Core raindrop: a soft disc that grows
    const baseR = lerp(2, ripple.maxR, e);
    const softness = lerp(18, 70, e);

    // Draw a soft filled disc by stacking alpha gradients
    // (kept black/white conceptually; alpha is used as "eraser")
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const tt = i / (steps - 1);
      const rr = baseR - tt * softness;
      if (rr <= 0) continue;
      rctx.globalAlpha = lerp(0.22, 0.06, tt);
      rctx.beginPath();
      rctx.arc(ripple.center.x, ripple.center.y, rr, 0, Math.PI * 2);
      rctx.fill();
    }

    // Concentric waves: multiple thin rings (many, delicate)
    // Rings spread outward with slight fading; density increases over time.
    const ringCount = Math.floor(lerp(10, 90, e));
    const ringSpacing = lerp(26, 14, e);

    for (let i = 0; i < ringCount; i++) {
      const r = baseR - i * ringSpacing;
      if (r <= 0) break;

      // Fade: inner rings stronger, outer rings softer
      const fade = clamp(1 - i / ringCount, 0, 1);
      rctx.globalAlpha = 0.16 * fade;

      rctx.lineWidth = lerp(6, 1.5, fade);
      rctx.beginPath();
      rctx.arc(ripple.center.x, ripple.center.y, r, 0, Math.PI * 2);
      rctx.stroke();
    }

    // Reset alpha & comp
    rctx.globalAlpha = 1;
    rctx.globalCompositeOperation = "source-over";

    if (t >= 1) {
      ripple.active = false;
      // Final: clear the overlay entirely => screen becomes white (under-layer)
      rctx.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height);
    }
  }

  // =========================
  // 3D Spheres Layer (Three.js)
  // =========================
  let renderer, scene, camera;
  let spheres = [];
  let threeReady = false;

  const three = {
    active: false,
    t0: 0,
    duration: 5200,
    // expand parameter that will push spheres outward / grow
    expand: 0,
  };

  function initThree() {
    renderer = new THREE.WebGLRenderer({
      canvas: webglCanvas,
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 18);

    // Black/white only: use MeshBasicMaterial (no shading)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // We create "concentric plans into 3D spheres":
    // a set of spheres distributed on rings, then they expand and multiply subtly.
    const baseRings = 18;
    const perRing = 22;

    spheres = [];
    for (let ring = 1; ring <= baseRings; ring++) {
      const ringRadius = ring * 0.55;
      for (let j = 0; j < perRing; j++) {
        const a = (j / perRing) * Math.PI * 2;
        const x = Math.cos(a) * ringRadius;
        const y = Math.sin(a) * ringRadius;

        // Slight z variation for depth
        const z = (Math.sin(a * 3) * 0.6) - ring * 0.03;

        const geo = new THREE.SphereGeometry(0.06, 10, 10);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);

        // Store original position for expansion
        m.userData = {
          ox: x,
          oy: y,
          oz: z,
          ring,
          phase: Math.random() * Math.PI * 2,
        };

        scene.add(m);
        spheres.push(m);
      }
    }

    threeReady = true;
  }

  function resizeThree() {
    if (!renderer || !camera) return;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function startThree() {
    if (!threeReady) initThree();

    three.active = true;
    three.t0 = now();
    three.expand = 0;

    // Bring webgl layer behind ripple at first; then we crossfade in
    webglCanvas.style.opacity = "0";
    webglCanvas.classList.remove("fade-out");
    webglCanvas.classList.add("fade-in");

    // Ensure it renders right away
    renderer.render(scene, camera);
  }

  function drawThreeFrame() {
    if (!three.active) {
      if (threeReady) renderer.render(scene, camera);
      return;
    }

    const t = clamp((now() - three.t0) / three.duration, 0, 1);
    const e = easeInOutCubic(t);

    // Expansion: spheres move outward and grow slightly, filling the viewport
    // Keep it subtle: no colors, just geometry in motion.
    const expand = lerp(0, 12.5, e);
    const grow   = lerp(1.0, 5.2, e);

    // As we near the end, we "white-out" by transitioning scene bg to white
    // to represent: "erase the black background until it's white/blank"
    const bgMix = clamp((e - 0.55) / 0.45, 0, 1);
    const bg = lerp(0x00, 0xff, bgMix); // grayscale
    scene.background = new THREE.Color(`rgb(${bg},${bg},${bg})`);

    // Also we can slightly increase sphere density impression by scaling
    for (const s of spheres) {
      const { ox, oy, oz, ring, phase } = s.userData;
      const k = 1 + expand * 0.06 * ring;

      // Outward drift + gentle breathing
      const breath = 1 + 0.08 * Math.sin(phase + e * Math.PI * 2);
      s.position.x = ox * k * breath;
      s.position.y = oy * k * breath;
      s.position.z = oz - e * 1.8;

      const scale = grow * lerp(0.55, 1.0, ring / 18);
      s.scale.setScalar(scale);
    }

    renderer.render(scene, camera);

    // Make WebGL visible progressively; timed to feel like "conversion"
    webglCanvas.style.opacity = String(clamp((e - 0.12) / 0.35, 0, 1));

    if (t >= 1) {
      three.active = false;
    }
  }

  // =========================
  // Timeline Orchestration
  // =========================
  // This is the core: we literally "give life" to the written sequence.
  // Non-looping.
  async function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function show(el) { el.style.opacity = "1"; }
  function hide(el) { el.style.opacity = "0"; }

  async function runExperience() {
    // Ensure rendering layers are in consistent state
    body.classList.remove("is-white");
    titleEl.style.opacity = "0";
    authorEl.style.opacity = "0";

    // Canvas baseline: ripple overlay black initially.
    fitCanvas(rippleCanvas);
    rippleClearBlack();

    // Setup Three but keep invisible until needed
    initThree();
    webglCanvas.style.opacity = "0";
    scene.background = new THREE.Color(0x000000);
    renderer.render(scene, camera);

    // 1) Start black: show title then add author (sequential)
    show(titleEl);
    await wait(2400);
    show(authorEl);
    await wait(2600);

    // Slight hold, then fade both out gently
    hide(authorEl);
    await wait(800);
    hide(titleEl);
    await wait(1000);

    // 2) One raindrop becomes many concentric waves erasing black
    // Make sure ripple canvas is on top and visible
    rippleCanvas.style.opacity = "1";
    webglCanvas.style.opacity = "0";
    startRipple();

    // Let ripple play mostly; during the last ~25% start the 3D “conversion”
    const rippleStart = now();
    const rippleHandOffAt = ripple.duration * 0.72;

    // Poll until handoff moment
    while (now() - rippleStart < rippleHandOffAt) {
      await wait(80);
    }

    // 3) Convert 2D plans into 3D spheres (crossfade)
    startThree();

    // Crossfade ripple out as spheres come in
    rippleCanvas.classList.add("fade-out");
    rippleCanvas.style.opacity = "0";

    // Wait remaining ripple time + some overlap
    await wait(2400);

    // At this point, 3D should be whitening out.
    // When background becomes fully white, mark UI invert.
    body.classList.add("is-white");

    // Give a small breath before final text
    await wait(900);

    // 4) Adds author then title (on white)
    show(authorEl);
    await wait(2200);
    hide(authorEl);
    await wait(900);
    show(titleEl);
    await wait(2400);
    hide(titleEl);

    // 5) Fade to black and stop (no loop)
    // We fade the WebGL canvas out to black by returning scene to black and lowering opacity
    scene.background = new THREE.Color(0x000000);
    renderer.render(scene, camera);
    body.classList.remove("is-white");

    // Fade everything out to black
    webglCanvas.classList.add("fade-out");
    webglCanvas.style.opacity = "0";
    rippleCanvas.style.opacity = "0";

    // Final hold on black
    await wait(1400);
  }

  // =========================
  // Render Loop
  // =========================
  function frame() {
    drawRippleFrame();
    drawThreeFrame();
  }

  // Start
  window.addEventListener("resize", () => {
    rippleSize = fitCanvas(rippleCanvas);
    if (ripple.active) ripple.maxR = Math.hypot(rippleCanvas.width, rippleCanvas.height) * 0.62;
    resizeThree();
  });

  // Run continuous render loop (lightweight) but experience is non-looping.
  rafUntil(frame);
  runExperience();
})();

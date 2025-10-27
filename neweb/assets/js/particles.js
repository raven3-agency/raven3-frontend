// assets/js/particles.js
(() => {
  function start() {
    // Asegurarnos de que Three.js está cargado
    const THREE_ = window.THREE;
    if (!THREE_) return setTimeout(start, 50);

    // Asegurarnos de que existe el canvas
    const canvas = document.getElementById("particles");
    if (!canvas) {
      console.warn('Falta <canvas id="particles"> en el <body>.');
      return;
    }

    // --- helpers ---
    function makeCircleTexture(size = 64) {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      const r = size / 2;
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      // Borde suave hacia afuera (alfa)
      g.addColorStop(0.0, "rgba(55,226,213,1)");
      g.addColorStop(0.7, "rgba(55,226,213,0.6)");
      g.addColorStop(1.0, "rgba(55,226,213,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();

      const tex = new THREE_.CanvasTexture(c);
      tex.minFilter = THREE_.LinearFilter;
      tex.magFilter = THREE_.LinearFilter;
      tex.needsUpdate = true;
      return tex;
    }
    // --- Vars ---
    let camera, scene, renderer, material;
    let mouseX = 0,
      mouseY = 0;
    let halfX = window.innerWidth / 2;
    let halfY = window.innerHeight / 2;

    // --- Cámara ---
    camera = new THREE_.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      5,
      2000
    );
    camera.position.z = 500;

    // --- Escena + Niebla ---
    scene = new THREE_.Scene();
    // Cambiá el color si querés: 0x0000ff (azul demo) o 0x0e0f13 (oscuro Raven3)
        scene.fog = new THREE_.FogExp2(0x37e2d5, 0.0008);

    // --- Geometría de partículas ---
    const size = 2000;
    const count = 20000;
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

    const geometry = new THREE_.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE_.Float32BufferAttribute(vertices, 3)
    );
    // --- Material ---
    const circleTex = makeCircleTexture(64);
    material = new THREE_.PointsMaterial({
      size: 2.2,
      map: circleTex,
      color: 0x37e2d5,
      transparent: true,
      alphaTest: 0.1,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE_.AdditiveBlending,
      sizeAttenuation: false,
    });

    const particles = new THREE_.Points(geometry, material);
    scene.add(particles);

    // --- Renderer ---
    renderer = new THREE_.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // --- Eventos ---
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
    document.addEventListener("pointermove", onPointerMove, { passive: true });

    // --- Loop ---
    function render() {
      // seguimiento suave al mouse
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      // ligera rotación para dar “vida”
      scene.rotation.x += 0.001;
      scene.rotation.y += 0.002;

      renderer.render(scene, camera);
      requestAnimationFrame(render);
    }
    render();
  }

  // Ejecutar cuando el documento esté listo
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    start();
  } else {
    window.addEventListener("load", start);
  }
})();

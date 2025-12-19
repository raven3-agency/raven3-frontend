import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("space");
const bar = document.getElementById("bar");
const skip = document.getElementById("skip");
const page2 = document.getElementById("page2");

let progress = 0;
let unlocked = false;

// Scene
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050507, 0.15);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 12;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

// Light
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// Concentric wave spheres
const waves = [];
const waveMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.25
});

for (let i = 0; i < 6; i++) {
  const geo = new THREE.SphereGeometry(1 + i * 0.4, 64, 64);
  const mesh = new THREE.Mesh(geo, waveMat.clone());
  mesh.scale.setScalar(0.01);
  scene.add(mesh);
  waves.push(mesh);
}

// Scroll interaction
function setProgress(p) {
  progress = Math.max(0, Math.min(1, p));
  bar.style.width = `${progress * 100}%`;

  waves.forEach((w, i) => {
    const t = Math.max(0, progress - i * 0.08);
    w.scale.setScalar(t * 8);
    w.material.opacity = Math.min(0.35, t * 0.4);
  });

  camera.position.z = 12 - progress * 4;

  if (progress > 0.98 && !unlocked) unlock();
}

function unlock() {
  unlocked = true;
  page2.classList.add("show");
}

skip.onclick = () => setProgress(1);

addEventListener("wheel", e => {
  if (unlocked) return;
  setProgress(progress + e.deltaY * 0.0006);
});

// Animate
function animate() {
  waves.forEach((w, i) => {
    w.rotation.y += 0.0005 + i * 0.0003;
    w.rotation.x += 0.0002;
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

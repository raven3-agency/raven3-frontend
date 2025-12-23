// main.js (ES module) — Black canvas + deformable white grid + multi-balls + waves + drag + collisions + minimal audio
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/**
 * Features:
 * - Fixed black canvas, white deformable grid floor.
 * - 3 balls: different sizes + masses + colors.
 * - Hover to grab any resting ball; mouse moves it over floor.
 * - Click to drop the grabbed ball; heavy fall + impact dents.
 * - Waves propagate across the grid (2D wave equation on a lattice).
 * - Lateral drag: moving balls create directional shear dents + friction.
 * - Ball-ball collisions: sphere-sphere impulses.
 * - Minimal physical audio (WebAudio) on impacts/collisions.
 */

// -------------------------
// Canvas / Renderer / Scene
// -------------------------
const canvas = document.getElementById("c") || document.getElementById("space");
if (!canvas) throw new Error("Canvas not found. Use <canvas id='c'></canvas> or <canvas id='space'></canvas>.");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 7, 10);
camera.lookAt(0, 0, 0);

// -------------------------
// Raycasting
// -------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// -------------------------
// Helpers
// -------------------------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const clamp01 = (x) => clamp(x, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;

// -------------------------
// World / Floor params
// -------------------------
const FLOOR_SIZE = 14;   // world units
const HALF = FLOOR_SIZE / 2;

// Grid resolution (visual + wave sim). Keep modest for performance.
const GRID_DIVS = 60;    // squares per side
const N = GRID_DIVS + 1; // points per side
const DX = FLOOR_SIZE / GRID_DIVS;

// -------------------------
// Physics tuning
// -------------------------
const GRAVITY = 42;             // heavy feel
const AIR_DAMP = 0.996;         // mild air damping
const GROUND_FRICTION = 0.94;   // lateral friction when resting
const REST_EPS_Y = 0.45;        // settle threshold (vertical)
const HOVER_HEIGHT = 0.85;      // ball height above floor while grabbed
const FLOOR_RESTITUTION = 0.06; // very low bounce on floor

// Ball-ball collision tuning
const COLLISION_RESTITUTION = 0.22;
const COLLISION_DAMP = 0.98;
const COLLISION_ITER = 3;       // iterations for stability

// -------------------------
// Wave simulation (2D wave equation discrete)
// -------------------------
// We simulate a height field yWave(i,j) that propagates.
// We'll combine it with dents + dragged deformation.
const wave = new Float32Array(N * N);
const wavePrev = new Float32Array(N * N);
const waveVel = new Float32Array(N * N);

// Wave parameters
const WAVE_C = 4.2;         // ✅ más estable
const WAVE_DAMP = 0.965;    // ✅ más disipación
const WAVE_INPUT_GAIN = 0.35; // ✅ menos energía inyectada
const WAVE_MAX = 1.35;      // ✅ clamp anti-explosión (altura máxima)

// Wave injection: add to velocity
function waveKickWorld(x, z, strength, radiusWorld) {
  // map world x,z [-HALF, HALF] to grid indices [0..N-1]
  const gx = (x + HALF) / FLOOR_SIZE * GRID_DIVS;
  const gz = (z + HALF) / FLOOR_SIZE * GRID_DIVS;

  const r = radiusWorld / DX;
  const r2 = r * r;

  const ix0 = Math.floor(gx - r - 1);
  const ix1 = Math.ceil(gx + r + 1);
  const iz0 = Math.floor(gz - r - 1);
  const iz1 = Math.ceil(gz + r + 1);

  for (let iz = iz0; iz <= iz1; iz++) {
    if (iz < 0 || iz >= N) continue;
    for (let ix = ix0; ix <= ix1; ix++) {
      if (ix < 0 || ix >= N) continue;

      const dxg = ix - gx;
      const dzg = iz - gz;
      const d2 = dxg * dxg + dzg * dzg;
      if (d2 > r2) continue;

      const fall = Math.exp(-d2 / (2 * r2));
      const idx = iz * N + ix;
      waveVel[idx] += strength * fall;
    }
  }
}

// Wave step
function stepWaves(dt) {
  // CFL-ish safety: subdivide dt to keep stable integration
  // Smaller substeps when dt spikes.
  const maxStep = 1 / 120; // ~8.3ms
  const steps = Math.ceil(dt / maxStep);
  const h = dt / steps;

  const c2 = WAVE_C * WAVE_C;

  for (let s = 0; s < steps; s++) {
    // update velocity from laplacian
    for (let z = 1; z < N - 1; z++) {
      for (let x = 1; x < N - 1; x++) {
        const i = z * N + x;

        const y = wave[i];
        const lap =
          wave[i - 1] + wave[i + 1] + wave[i - N] + wave[i + N] - 4 * y;

        waveVel[i] += c2 * lap * h;
      }
    }

    // integrate position + damp vel strongly
    for (let i = 0; i < wave.length; i++) {
      waveVel[i] *= WAVE_DAMP;

      wave[i] += waveVel[i] * h;

      // clamp safety: prevents runaway growth
      if (wave[i] > WAVE_MAX) wave[i] = WAVE_MAX;
      else if (wave[i] < -WAVE_MAX) wave[i] = -WAVE_MAX;
    }
  }
}

function waveHeightAtWorld(x, z) {
  // bilinear sample from wave field
  const fx = (x + HALF) / FLOOR_SIZE * GRID_DIVS;
  const fz = (z + HALF) / FLOOR_SIZE * GRID_DIVS;

  const x0 = clamp(Math.floor(fx), 0, N - 1);
  const z0 = clamp(Math.floor(fz), 0, N - 1);
  const x1 = clamp(x0 + 1, 0, N - 1);
  const z1 = clamp(z0 + 1, 0, N - 1);

  const tx = clamp01(fx - x0);
  const tz = clamp01(fz - z0);

  const a = wave[z0 * N + x0];
  const b = wave[z0 * N + x1];
  const c = wave[z1 * N + x0];
  const d = wave[z1 * N + x1];

  const ab = lerp(a, b, tx);
  const cd = lerp(c, d, tx);
  return lerp(ab, cd, tz);
}

// -------------------------
// Dents system (Gaussian depressions)
// -------------------------
const dents = [];
function addDent(x, z, amp, radius, life = 1.2) {
  dents.push({ x, z, amp, radius, life, t: 0 });
}
function dentsHeightAt(x, z) {
  let y = 0;
  for (const d of dents) {
    const dx = x - d.x;
    const dz = z - d.z;
    const r2 = d.radius * d.radius;
    const fall = Math.exp(-(dx * dx + dz * dz) / (2 * r2));
    const k = 1 - Math.min(1, d.t / d.life);
    y += -d.amp * fall * (0.35 + 0.65 * k);
  }
  return y;
}

// Total heightfield = dents + waves
function heightAt(x, z) {
  return dentsHeightAt(x, z) + waveHeightAtWorld(x, z);
}

// -------------------------
// Deformable grid (LineSegments) that samples heightAt(x,z)
// -------------------------
const ptsPerLine = GRID_DIVS + 1;
const linesCount = GRID_DIVS + 1;
const totalPoints = 2 * linesCount * ptsPerLine;

const positions = new Float32Array(totalPoints * 3);
const baseXZ = new Float32Array(totalPoints * 2);

// Fill geometry points: X-lines then Z-lines
let p = 0;
let b = 0;

for (let i = 0; i < linesCount; i++) {
  const z = lerp(-HALF, HALF, i / GRID_DIVS);
  for (let j = 0; j < ptsPerLine; j++) {
    const x = lerp(-HALF, HALF, j / GRID_DIVS);

    positions[p++] = x;
    positions[p++] = 0;
    positions[p++] = z;

    baseXZ[b++] = x;
    baseXZ[b++] = z;
  }
}

for (let i = 0; i < linesCount; i++) {
  const x = lerp(-HALF, HALF, i / GRID_DIVS);
  for (let j = 0; j < ptsPerLine; j++) {
    const z = lerp(-HALF, HALF, j / GRID_DIVS);

    positions[p++] = x;
    positions[p++] = 0;
    positions[p++] = z;

    baseXZ[b++] = x;
    baseXZ[b++] = z;
  }
}

const segments = [];
let offset = 0;

// X-lines
for (let i = 0; i < linesCount; i++) {
  for (let j = 0; j < ptsPerLine - 1; j++) segments.push(offset + j, offset + j + 1);
  offset += ptsPerLine;
}
// Z-lines
for (let i = 0; i < linesCount; i++) {
  for (let j = 0; j < ptsPerLine - 1; j++) segments.push(offset + j, offset + j + 1);
  offset += ptsPerLine;
}

const gridGeo = new THREE.BufferGeometry();
gridGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
gridGeo.setIndex(segments);

const gridMat = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.85,
});

const grid = new THREE.LineSegments(gridGeo, gridMat);
scene.add(grid);

// Invisible plane for mouse targeting (flat)
const floorPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
  new THREE.MeshBasicMaterial({ visible: false })
);
floorPlane.rotation.x = -Math.PI / 2;
scene.add(floorPlane);

// -------------------------
// Audio (minimal physical cues)
// -------------------------
let audioCtx = null;
let masterGain = null;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioCtx.destination);
}

function playThump(intensity = 0.4, type = "floor") {
  if (!audioCtx) return;

  const t0 = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  const osc = audioCtx.createOscillator();
  const filt = audioCtx.createBiquadFilter();

  // Low thump
  const baseFreq = type === "floor" ? 70 : 110;
  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t0 + 0.08);

  filt.type = "lowpass";
  filt.frequency.setValueAtTime(420, t0);

  const g = clamp01(intensity) * 0.9;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.25 * g, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

  osc.connect(filt);
  filt.connect(gain);
  gain.connect(masterGain);

  osc.start(t0);
  osc.stop(t0 + 0.14);
}

// Unlock audio on first user gesture
window.addEventListener("pointerdown", () => {
  ensureAudio();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}, { once: true });

// -------------------------
// Balls: different sizes + masses + colors
// -------------------------
function createBall({ color, radius, mass }) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshBasicMaterial({ color })
  );
  scene.add(mesh);

  return {
    mesh,
    r: radius,
    m: mass,
    invM: 1 / mass,

    grabbed: false,
    falling: false,

    vel: new THREE.Vector3(0, 0, 0), // includes vertical
    prevPos: new THREE.Vector3(0, 0, 0),

    // for mouse control
    mouseTarget: new THREE.Vector3(0, 0, 0),
  };
}

// You asked: different masses and sizes per color
const balls = [
  createBall({ color: 0xffffff, radius: 0.50, mass: 14.0 }), // White: heavy
  createBall({ color: 0xff4d4d, radius: 0.38, mass: 7.5 }),  // Red: medium
  createBall({ color: 0x4da6ff, radius: 0.62, mass: 20.0 }), // Blue: heaviest & biggest
];

// Initial positions (high drops)
balls[0].mesh.position.set(0, 8.0, 0);
balls[1].mesh.position.set(-2.2, 12.0, -1.2);
balls[2].mesh.position.set(2.2, 16.0, 1.2);
for (const b of balls) b.prevPos.copy(b.mesh.position);

// One active ball can be grabbed at a time
let activeBall = balls[0];
activeBall.grabbed = true;

// -------------------------
// Interaction: mouse floor target + grabbing by hovering
// -------------------------
function clampToFloorBounds(v) {
  v.x = clamp(v.x, -HALF, HALF);
  v.z = clamp(v.z, -HALF, HALF);
}

function updateMouseNDC(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  mouse.x = x * 2 - 1;
  mouse.y = -(y * 2 - 1);
}

function raycastFloor() {
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(floorPlane, false);
  if (!hits.length) return null;
  const pt = hits[0].point.clone();
  clampToFloorBounds(pt);
  return pt;
}

function pickBallUnderMouse() {
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(balls.map((b) => b.mesh), false);
  if (!hits.length) return null;
  const obj = hits[0].object;
  return balls.find((b) => b.mesh === obj) || null;
}

window.addEventListener("pointermove", (e) => {
  updateMouseNDC(e);

  const pt = raycastFloor();
  if (pt && activeBall?.grabbed) {
    activeBall.mouseTarget.copy(pt);
    return;
  }

  // If nothing grabbed, allow "hover pickup" of any resting ball
  const picked = pickBallUnderMouse();
  if (picked && !picked.falling && !picked.grabbed) {
    activeBall = picked;
    activeBall.grabbed = true;
    activeBall.vel.set(0, 0, 0);

    const pt2 = raycastFloor();
    if (pt2) activeBall.mouseTarget.copy(pt2);
  }
});

window.addEventListener("pointerdown", (e) => {
  updateMouseNDC(e);

  // Drop active ball
  if (activeBall && activeBall.grabbed) {
    activeBall.grabbed = false;
    activeBall.falling = true;
    // keep current xz; drop from current y
    activeBall.vel.y = 0;
  }
});

// -------------------------
// Core simulation
// -------------------------

// Directional drag dent for lateral motion
function addDragDent(x, z, vx, vz, strengthBase, radius, life) {
  const speed = Math.sqrt(vx * vx + vz * vz);
  if (speed < 0.001) return;

  // place a short trail behind movement direction
  const nx = vx / speed;
  const nz = vz / speed;

  // two dents: one at center (press) + one slightly behind (shear)
  addDent(x, z, strengthBase, radius, life);
  addDent(x - nx * 0.55, z - nz * 0.55, strengthBase * 0.72, radius * 1.05, life);
}

// Floor contact resolution for a ball
function resolveFloor(ball, dt) {
  const m = ball.mesh;
  const r = ball.r;

  const yFloor = heightAt(m.position.x, m.position.z);
  const yContact = yFloor + r;

  if (m.position.y <= yContact) {
    // snap to surface
    m.position.y = yContact;

    // impact / bounce
    if (ball.vel.y < 0) {
      const impact = Math.min(5.0, Math.abs(ball.vel.y));

      // Big dent based on mass + impact
      const amp = 0.10 + (impact * 0.06) * (ball.m / 10);
      const rad = 1.25 + (impact * 0.22) * (0.7 + ball.r);
      const life = 1.9 + (impact * 0.25);

      addDent(m.position.x, m.position.z, amp, rad, life);

      // Wave kick
      waveKickWorld(m.position.x, m.position.z, impact * 0.18 * WAVE_INPUT_GAIN, 1.9 + ball.r);

      // Sound
      playThump(clamp01(impact / 4.0) * (0.7 + ball.m / 30), "floor");
    }

    // very low restitution
    ball.vel.y = -ball.vel.y * FLOOR_RESTITUTION;

    // settle
    if (Math.abs(ball.vel.y) < REST_EPS_Y) {
      ball.vel.y = 0;
      ball.falling = false;
    }

    // apply lateral friction when on ground
    ball.vel.x *= GROUND_FRICTION;
    ball.vel.z *= GROUND_FRICTION;

    return true;
  }

  return false;
}

// Sphere-sphere collisions
function resolveBallBallCollisions() {
  for (let iter = 0; iter < COLLISION_ITER; iter++) {
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const A = balls[i];
        const B = balls[j];

        // If one is grabbed, treat it as infinite mass for collision response (but still push the other)
        const invMA = A.grabbed ? 0 : A.invM;
        const invMB = B.grabbed ? 0 : B.invM;

        // both grabbed shouldn't happen, but guard
        if (invMA === 0 && invMB === 0) continue;

        const pa = A.mesh.position;
        const pb = B.mesh.position;

        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const dz = pb.z - pa.z;

        const dist2 = dx * dx + dy * dy + dz * dz;
        const rSum = A.r + B.r;

        if (dist2 >= rSum * rSum) continue;

        const dist = Math.max(0.0001, Math.sqrt(dist2));
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        // Positional correction
        const penetration = rSum - dist;
        const totalInvM = invMA + invMB;

        const corr = penetration / Math.max(0.0001, totalInvM);
        if (invMA > 0) {
          pa.x -= nx * corr * invMA;
          pa.y -= ny * corr * invMA;
          pa.z -= nz * corr * invMA;
        }
        if (invMB > 0) {
          pb.x += nx * corr * invMB;
          pb.y += ny * corr * invMB;
          pb.z += nz * corr * invMB;
        }

        // Velocity impulse
        const rvx = B.vel.x - A.vel.x;
        const rvy = B.vel.y - A.vel.y;
        const rvz = B.vel.z - A.vel.z;

        const relVelN = rvx * nx + rvy * ny + rvz * nz;
        if (relVelN > 0) continue;

        const e = COLLISION_RESTITUTION;
        const jImpulse = -(1 + e) * relVelN / Math.max(0.0001, totalInvM);

        if (invMA > 0) {
          A.vel.x -= nx * jImpulse * invMA;
          A.vel.y -= ny * jImpulse * invMA;
          A.vel.z -= nz * jImpulse * invMA;
        }
        if (invMB > 0) {
          B.vel.x += nx * jImpulse * invMB;
          B.vel.y += ny * jImpulse * invMB;
          B.vel.z += nz * jImpulse * invMB;
        }

        // Damping
        A.vel.multiplyScalar(COLLISION_DAMP);
        B.vel.multiplyScalar(COLLISION_DAMP);

        // Wave + sound on collision intensity
        const intensity = clamp01(Math.abs(relVelN) / 6);
        if (intensity > 0.08) {
          const cx = (pa.x + pb.x) * 0.5;
          const cz = (pa.z + pb.z) * 0.5;
          waveKickWorld(cx, cz, intensity * 2.1 * WAVE_INPUT_GAIN, 1.4 + rSum);
          playThump(intensity * 0.7, "collision");
        }
      }
    }
  }
}

// -------------------------
// Main loop
// -------------------------
let last = performance.now();

function tick(now) {
  const dt = Math.min(0.02, (now - last) / 1000); // cap dt for stability
  last = now;

  // Decay dents
  for (let i = dents.length - 1; i >= 0; i--) {
    dents[i].t += dt;
    if (dents[i].t >= dents[i].life) dents.splice(i, 1);
  }

  // Step waves
  stepWaves(dt);

  // Update balls
  for (const b of balls) {
    const m = b.mesh;

    // Store prev for lateral motion
    b.prevPos.copy(m.position);

    if (b.grabbed) {
      // Follow mouse target at hover height over floor
      const pt = b.mouseTarget;
      const yFloor = heightAt(pt.x, pt.z);

      m.position.x = pt.x;
      m.position.z = pt.z;
      m.position.y = yFloor + b.r + HOVER_HEIGHT;

      b.falling = false;
      b.vel.set(0, 0, 0);

      // press + mild wave
      addDent(pt.x, pt.z, 0.045 + 0.012 * b.r, 1.1 + b.r, 0.14);
      waveKickWorld(pt.x, pt.z, 0.45 * WAVE_INPUT_GAIN, 1.3 + b.r);
      continue;
    }

    // Physics integration
    b.vel.y -= GRAVITY * dt * (0.85 + b.m / 40); // heavier mass: slightly stronger effective pull
    b.vel.multiplyScalar(AIR_DAMP);

    m.position.x += b.vel.x * dt;
    m.position.y += b.vel.y * dt;
    m.position.z += b.vel.z * dt;

    // Clamp within floor bounds in XZ (optional; keeps piece framed)
    m.position.x = clamp(m.position.x, -HALF, HALF);
    m.position.z = clamp(m.position.z, -HALF, HALF);

    // Floor resolve
    const onFloor = resolveFloor(b, dt);

    // Lateral drag (when moving on/near floor)
    const vx = (m.position.x - b.prevPos.x) / Math.max(1e-6, dt);
    const vz = (m.position.z - b.prevPos.z) / Math.max(1e-6, dt);
    const speed = Math.sqrt(vx * vx + vz * vz);

    if (onFloor && speed > 0.02) {
      // stronger drag with mass
      const dragAmp = (0.02 + speed * 0.004) * (0.7 + b.m / 20);
      addDragDent(m.position.x, m.position.z, vx, vz, dragAmp, 1.05 + b.r, 0.22);

      // generate traveling ripples when sliding
    waveKickWorld(m.position.x, m.position.z, speed * 0.018 * WAVE_INPUT_GAIN, 1.4 + b.r);
    }

    // If not falling and vertical is settled but still above contact (numerical), keep it stable
    if (!b.falling) {
      const yFloor = heightAt(m.position.x, m.position.z);
      const yContact = yFloor + b.r;
      if (m.position.y < yContact) m.position.y = yContact;
    }
  }

  // Ball-ball collisions
  resolveBallBallCollisions();

  // Update grid vertices
  const posAttr = gridGeo.getAttribute("position");
  for (let i = 0; i < totalPoints; i++) {
    const x = baseXZ[i * 2 + 0];
    const z = baseXZ[i * 2 + 1];
    posAttr.array[i * 3 + 1] = heightAt(x, z);
  }
  posAttr.needsUpdate = true;

  // Camera subtle sway
  const t = now * 0.00022;
  camera.position.x = Math.sin(t) * 0.35;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// -------------------------
// Resize
// -------------------------
window.addEventListener("resize", () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

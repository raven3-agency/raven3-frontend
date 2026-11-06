// Motor del plano 3D. No sabe de reservas: recibe canchas con su kit, edificios y un layout en
// metros (predio + posición y rotación de cada elemento). Tiene un modo edición para mover,
// rotar y estirar el predio. Renderiza solo cuando algo cambia para no gastar batería.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLORES = { libre: 0x00e5c8, ocupada: 0xff8a3d, bloqueada: 0x8a96a3 };
const EDIFICIO = { ancho: 10, largo: 20 };
const MARGEN_BASE = 1.2; // Vereda de hormigón alrededor de cada cancha.
const PASO_DRAG = 0.5; // Metros.
const PASO_GIRO = 5; // Grados.
const ANCHO_PLAZA = 2.5;
const LARGO_PLAZA = 5;
const CALLE_MINIMA = { ancho: 3, largo: 6 };
const LARGO_TILE_CALLE = 6; // Metros que ocupa un tramo de la textura de la calle.
const ANCHO_MINIMO_PREDIO = 20;
const MAX_ARBOLES = 260;
const ETIQUETA_COMPLETA_PX_M = 9; // Por debajo de esta escala las etiquetas muestran solo el nombre.
const ETIQUETA_MINIMA_PX_M = 6; // Y por debajo de esta, solo el número.

export function soportaWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

const suave = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const ajustar = (v, paso) => Math.round(v / paso) * paso;

const normalizarGrados = (g) => ((g % 360) + 360) % 360;

// Rectángulo que ocupa un elemento rotado, alineado a los ejes del predio.
function semiEjes(it) {
  const r = THREE.MathUtils.degToRad(it.rot);
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { hx: (c * it.ancho + s * it.largo) / 2, hz: (s * it.ancho + c * it.largo) / 2 };
}

function esquinas(it) {
  const r = THREE.MathUtils.degToRad(it.rot);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => {
    const lx = (a * it.ancho) / 2;
    const lz = (b * it.largo) / 2;
    return [it.x + lx * c - lz * s, it.z + lx * s + lz * c];
  });
}

// Eje separador entre dos rectángulos rotados.
function seSuperponen(a, b) {
  const pa = esquinas(a);
  const pb = esquinas(b);
  for (const poli of [pa, pb]) {
    for (let i = 0; i < 2; i++) {
      const eje = [poli[i + 1][0] - poli[i][0], poli[i + 1][1] - poli[i][1]];
      const proy = (p) => p.map(([x, z]) => x * eje[0] + z * eje[1]);
      const ya = proy(pa);
      const yb = proy(pb);
      if (Math.max(...ya) <= Math.min(...yb) || Math.max(...yb) <= Math.min(...ya)) return false;
    }
  }
  return true;
}

function marco(ancho, largo, grosor, y) {
  const forma = new THREE.Shape();
  forma.moveTo(-ancho / 2, -largo / 2);
  forma.lineTo(ancho / 2, -largo / 2);
  forma.lineTo(ancho / 2, largo / 2);
  forma.lineTo(-ancho / 2, largo / 2);
  forma.closePath();
  const a = ancho / 2 - grosor;
  const l = largo / 2 - grosor;
  const hueco = new THREE.Path();
  hueco.moveTo(-a, -l);
  hueco.lineTo(-a, l);
  hueco.lineTo(a, l);
  hueco.lineTo(a, -l);
  hueco.closePath();
  forma.holes.push(hueco);
  const g = new THREE.ShapeGeometry(forma);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

function crearEdificio() {
  const { ancho, largo } = EDIFICIO;
  const g = new THREE.Group();
  const muro = new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.85 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x20303a, roughness: 0.15, metalness: 0.5, emissive: 0xffc98a, emissiveIntensity: 0 });
  const techo = new THREE.MeshStandardMaterial({ color: 0x5b6672, roughness: 0.7 });

  const add = (w, h, d, x, y, z, m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
  };

  const w = ancho * 0.9;
  const l = largo * 0.62;
  add(w, 3.6, l, 0, 1.8, -largo * 0.1, muro);
  add(w + 0.04, 2.3, l * 0.72, 0, 1.45, -largo * 0.1, oscuro);
  add(w + 1.2, 0.3, l + 1.6, 0, 3.75, -largo * 0.1, techo);

  // Galería con mesas.
  add(w, 0.15, largo * 0.22, 0, 0.08, largo * 0.34, new THREE.MeshStandardMaterial({ color: 0x8c7760, roughness: 0.9 }));
  for (const z of [0.26, 0.42]) {
    for (const x of [-2.4, 2.4]) add(0.9, 0.75, 0.9, x, 0.5, largo * z, techo);
  }
  g.userData.ventanas = oscuro;
  return g;
}

// Mancha de luz sobre el solado alrededor de una cancha prendida.
function texturaDerrame() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,244,222,1)');
  g.addColorStop(0.6, 'rgba(255,240,214,.5)');
  g.addColorStop(1, 'rgba(255,236,206,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// Tramo de calle: bordes continuos y línea central punteada. Se repite a lo largo.
function texturaCalle(renderer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  pintarAsfalto(x, 256, 256);
  x.fillStyle = '#e8ebee';
  x.fillRect(10, 0, 5, 256);
  x.fillRect(241, 0, 5, 256);
  x.fillRect(125, 64, 6, 128);
  return texturaRepetida(c, renderer);
}

// Una plaza: líneas a los lados, tope al frente y un auto pintado. Se repite a lo ancho.
function texturaPlaza(renderer) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const x = c.getContext('2d');
  pintarAsfalto(x, 128, 256);
  x.fillStyle = '#e8ebee';
  x.fillRect(0, 0, 3, 256);
  x.fillRect(125, 0, 3, 256);
  x.fillRect(0, 0, 128, 6);

  x.fillStyle = 'rgba(232,235,238,.32)';
  x.beginPath();
  x.roundRect(36, 44, 56, 150, 16);
  x.fill();
  x.fillStyle = '#3a4046';
  x.beginPath();
  x.roundRect(44, 72, 40, 26, 6);
  x.roundRect(44, 150, 40, 18, 6);
  x.fill();
  return texturaRepetida(c, renderer);
}

function pintarAsfalto(x, w, h) {
  x.fillStyle = '#3a4046';
  x.fillRect(0, 0, w, h);
  let semilla = 11;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = azar() > 0.5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.08)';
    x.fillRect(azar() * w, azar() * h, 2, 2);
  }
}

function texturaRepetida(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function crearArboles() {
  const copaMat = new THREE.MeshStandardMaterial({ color: 0x3f6b4c, roughness: 1, flatShading: true });
  const troncoMat = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 });
  const copas = new THREE.InstancedMesh(new THREE.ConeGeometry(1.7, 5, 7), copaMat, MAX_ARBOLES);
  const troncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 6), troncoMat, MAX_ARBOLES);
  copas.castShadow = true;
  // Cambian de lugar al estirar el predio y la esfera de culling quedaría vieja.
  copas.frustumCulled = troncos.frustumCulled = false;
  const grupo = new THREE.Group();
  grupo.add(copas, troncos);

  const m = new THREE.Matrix4();
  return {
    grupo,
    ubicar({ x0, x1, z0, z1 }) {
      const puntos = [];
      for (let x = x0 + 2; x <= x1 - 2; x += 7) {
        puntos.push([x + (Math.abs(x * 13) % 2), z0 - 3], [x - (Math.abs(x * 7) % 2), z1 + 3]);
      }
      for (let z = z0 + 4; z <= z1 - 4; z += 7) {
        puntos.push([x0 - 3, z], [x1 + 3, z + (Math.abs(z * 5) % 2)]);
      }
      const n = Math.min(puntos.length, MAX_ARBOLES);
      for (let i = 0; i < n; i++) {
        const [x, z] = puntos[i];
        const s = 0.85 + Math.abs(Math.sin(x * 3.1 + z)) * 0.5;
        m.makeScale(s, s, s).setPosition(x, 3.6 * s, z);
        copas.setMatrixAt(i, m);
        m.makeScale(s, s, s).setPosition(x, 0.8 * s, z);
        troncos.setMatrixAt(i, m);
      }
      copas.count = troncos.count = n;
      copas.instanceMatrix.needsUpdate = troncos.instanceMatrix.needsUpdate = true;
    },
  };
}

export function createVenue(host, { canchas, edificios, obras, kits, layout, onSelect, onEditSelect, onEditCambio, onLayout, onAviso }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const capa = document.createElement('div');
  capa.className = 'v3-labels';
  host.appendChild(capa);

  const capaEdicion = document.createElement('div');
  capaEdicion.className = 'v3-handles';
  capaEdicion.hidden = true;
  host.appendChild(capaEdicion);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0x000000, 200, 500);

  const camera = new THREE.PerspectiveCamera(30, 1, 2, 3000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.4;
  controls.minDistance = 22;
  controls.zoomToCursor = true;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x54606a, 1);
  const sol = new THREE.DirectionalLight(0xffffff, 2);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  scene.add(hemi, sol, sol.target);

  // Estado del layout: una copia propia, se entrega clonada en cada cambio.
  const predio = { ...layout.predio };

  const pasto = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ color: 0x5c7a56, roughness: 1 }));
  pasto.rotation.x = -Math.PI / 2;
  pasto.position.y = -0.04;
  pasto.receiveShadow = true;

  const solado = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xa8acad, roughness: 0.95 }));
  solado.rotation.x = -Math.PI / 2;
  solado.position.y = -0.02;
  solado.receiveShadow = true;

  const arboles = crearArboles();

  const grilla = new THREE.GridHelper(800, 160, 0x00e5c8, 0x00e5c8);
  grilla.material.transparent = true;
  grilla.material.opacity = 0.22;
  grilla.material.depthWrite = false;
  grilla.position.y = 0.03;
  grilla.visible = false;

  scene.add(pasto, solado, arboles.grupo, grilla);

  // Elementos del plano: canchas y edificios se mueven igual.
  const items = new Map();
  const pickables = [];
  const derrameMapa = texturaDerrame();
  const elegidoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.9 });
  const ventanas = [];

  function completarItem(it, grupo, altoPick, posicion) {
    Object.assign(it, posicion);
    it.grupo = grupo;
    it.elegido = new THREE.Mesh(marco(it.ancho + 0.8, it.largo + 0.8, 0.14, 0.012), elegidoMat);
    it.elegido.visible = false;
    grupo.add(it.elegido);

    const pick = new THREE.Mesh(new THREE.BoxGeometry(it.ancho, altoPick, it.largo), new THREE.MeshBasicMaterial());
    pick.visible = false;
    pick.position.y = altoPick / 2;
    pick.userData.id = it.id;
    grupo.add(pick);
    pickables.push(pick);
    it.pick = pick;

    items.set(it.id, it);
    scene.add(grupo);
  }

  const compartidos = {};

  function crearCancha(cancha, posicion) {
    const kit = kits[cancha.kit];
    compartidos[cancha.kit] ??= {
      kit: kit.crearCompartido(renderer),
      base: new THREE.BoxGeometry(kit.unidad.ancho + MARGEN_BASE, 0.1, kit.unidad.largo + MARGEN_BASE),
      estado: marco(kit.unidad.ancho + 1.1, kit.unidad.largo + 1.1, 0.34, 0.012),
      derrame: new THREE.PlaneGeometry(kit.unidad.ancho * 2.1, kit.unidad.largo * 1.65).rotateX(-Math.PI / 2),
    };
    const comp = compartidos[cancha.kit];
    const u = kit.crearUnidad(comp.kit, cancha);

    const base = new THREE.Mesh(comp.base, baseMat);
    base.position.y = -0.06;
    base.receiveShadow = true;

    u.estadoMat = new THREE.MeshBasicMaterial({ color: COLORES.libre, toneMapped: false });
    const anillo = new THREE.Mesh(comp.estado, u.estadoMat);

    u.derrame = new THREE.Mesh(
      comp.derrame,
      new THREE.MeshBasicMaterial({ map: derrameMapa, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    u.derrame.position.y = -0.05;
    u.derrame.visible = false;
    u.grupo.add(base, u.derrame, anillo);

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'v3-label';
    b.dataset.status = 'libre';
    b.innerHTML = '<span class="v3-label-name"><span class="v3-label-deporte"></span><span class="v3-label-num"></span></span><span class="v3-label-sub"></span>';
    b.addEventListener('click', () => onSelect(cancha.id));
    capa.appendChild(b);
    u.label = b;

    Object.assign(u, {
      id: cancha.id,
      tipo: 'cancha',
      modulo: cancha.modulo,
      nombre: cancha.etiqueta,
      ancho: kit.unidad.ancho + MARGEN_BASE,
      largo: kit.unidad.largo + MARGEN_BASE,
      altoEtiqueta: kit.unidad.altoEtiqueta,
      escala: kit.unidad.largo / 20,
    });
    completarItem(u, u.grupo, 4.2, posicion);
    rotularCancha(u, cancha);
  }

  function rotularCancha(u, cancha) {
    u.nombre = cancha.etiqueta;
    u.label.querySelector('.v3-label-deporte').textContent = cancha.deporte;
    u.label.querySelector('.v3-label-num').textContent = cancha.numero;
  }

  function quitarItem(it) {
    scene.remove(it.grupo);
    pickables.splice(pickables.indexOf(it.pick), 1);
    it.elegido.geometry.dispose();
    it.pick.geometry.dispose();
    it.pick.material.dispose();
    if (it.obra) {
      it.obra.material.map.dispose();
      it.obra.material.dispose();
    } else if (it.tipo === 'edificio') {
      ventanas.splice(ventanas.indexOf(it.grupo.userData.ventanas), 1);
      for (const p of it.partes) {
        p.geometry.dispose();
        p.material.dispose();
      }
    } else {
      for (const m of [it.pisoMaterial, it.lamparaMaterial, it.focoMaterial, it.estadoMat, it.derrame.material]) m.dispose();
    }
    it.label.remove();
    if (hoverId === it.id) hoverId = null;
    if (seleccion === it) seleccionar(null);
    items.delete(it.id);
  }

  // Calles y estacionamientos: un plano escalado con una textura que se repite.
  const planoObra = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const texturasObra = { calle: texturaCalle(renderer), estacionamiento: texturaPlaza(renderer) };
  let obrasCreadas = 0;

  function crearObra(obra, posicion) {
    const mapa = texturasObra[obra.tipo].clone();
    mapa.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.95 });
    const mesh = new THREE.Mesh(planoObra, material);
    // Una altura apenas distinta para cada una: así dos calles se cruzan sin parpadear.
    mesh.position.y = -0.035 + (obrasCreadas++ % 8) * 0.002;
    mesh.receiveShadow = true;

    const grupo = new THREE.Group();
    grupo.add(mesh);

    const s = document.createElement('span');
    s.className = `v3-label v3-label--static v3-label--${obra.tipo}`;
    capa.appendChild(s);

    const it = { id: obra.id, tipo: obra.tipo, nombre: obra.nombre, altoEtiqueta: 0.6, escala: 1, label: s, ancho: posicion.ancho, largo: posicion.largo, obra: { mesh, material } };
    completarItem(it, grupo, 0.3, posicion);
    ajustarObra(it);
  }

  function rotularObra(it) {
    const plazas = Math.round(it.ancho / ANCHO_PLAZA);
    it.label.textContent = it.tipo === 'calle' ? it.nombre : `P · ${plazas} ${plazas === 1 ? 'lugar' : 'lugares'}`;
  }

  // Lleva escala, textura y marcos al tamaño actual de la obra.
  function ajustarObra(it) {
    const { mesh, material } = it.obra;
    mesh.scale.set(it.ancho, 1, it.largo);
    if (it.tipo === 'calle') material.map.repeat.set(1, it.largo / LARGO_TILE_CALLE);
    else material.map.repeat.set(Math.round(it.ancho / ANCHO_PLAZA), 1);
    it.obra.medida = `${it.ancho}x${it.largo}`;

    it.elegido.geometry.dispose();
    it.elegido.geometry = marco(it.ancho + 0.8, it.largo + 0.8, 0.14, 0.012);
    it.pick.geometry.dispose();
    it.pick.geometry = new THREE.BoxGeometry(it.ancho, 0.3, it.largo);
    rotularObra(it);
  }

  for (const cancha of canchas) crearCancha(cancha, layout.items[cancha.id]);
  for (const obra of obras) crearObra(obra, layout.items[obra.id]);

  function crearEdificioItem(e, posicion) {
    const g = crearEdificio();
    ventanas.push(g.userData.ventanas);
    const partes = [...g.children];
    const s = document.createElement('span');
    s.className = 'v3-label v3-label--static';
    s.textContent = e.nombre;
    capa.appendChild(s);
    completarItem(
      { id: e.id, tipo: 'edificio', nombre: e.nombre, ancho: EDIFICIO.ancho + 1.2, largo: EDIFICIO.largo + 1, altoEtiqueta: 6, escala: 1, label: s, partes },
      g,
      4.2,
      posicion,
    );
  }

  for (const e of edificios) crearEdificioItem(e, layout.items[e.id]);

  const aplicarTransform = (it) => {
    it.grupo.position.set(it.x, 0.06, it.z);
    it.grupo.rotation.y = -THREE.MathUtils.degToRad(it.rot);
    if (it.obra && it.obra.medida !== `${it.ancho}x${it.largo}`) ajustarObra(it);
  };
  items.forEach(aplicarTransform);

  const radioPredio = () => Math.hypot(predio.x1 - predio.x0, predio.z1 - predio.z0) / 2 + 3;
  const centroPredio = () => new THREE.Vector3((predio.x0 + predio.x1) / 2, 0, (predio.z0 + predio.z1) / 2);

  // Sol, terreno y árboles dependen del tamaño del predio.
  let horaActual = 12 * 60;

  function colocarSol() {
    const h = horaActual / 60;
    const r = radioPredio();
    const c = centroPredio();
    // Arco de este a oeste; de noche queda fija la luna.
    const a = (Math.min(h, 19.5) - 6.5) / 13;
    const ang = THREE.MathUtils.lerp(0.25, Math.PI - 0.22, Math.min(1, Math.max(0, a)));
    const dist = r * 2.8;
    sol.position.set(c.x + Math.cos(ang) * dist, Math.sin(ang) * dist * 0.9 + r * 0.5, c.z + r * 1.2);
    sol.target.position.copy(c);
  }

  function actualizarPredio() {
    const w = predio.x1 - predio.x0;
    const l = predio.z1 - predio.z0;
    const c = centroPredio();
    solado.scale.set(w, l, 1);
    solado.position.set(c.x, -0.02, c.z);
    arboles.ubicar(predio);

    const r = radioPredio();
    const sc = sol.shadow.camera;
    Object.assign(sc, { left: -r - 6, right: r + 6, top: r + 6, bottom: -r - 6, near: 10, far: r * 6.5 });
    sc.updateProjectionMatrix();
    colocarSol();

    scene.fog.near = r * 3.4;
    scene.fog.far = r * 8;
    controls.maxDistance = r * 4.8;
    invalidar();
  }

  // Handles de edición. Son botones del DOM: tienen buen tamaño táctil y captura de puntero.
  const HANDLES_PREDIO = [
    { id: 'n', dz: -1, nombre: 'norte' },
    { id: 's', dz: 1, nombre: 'sur' },
    { id: 'o', dx: -1, nombre: 'oeste' },
    { id: 'e', dx: 1, nombre: 'este' },
    { id: 'no', dx: -1, dz: -1 },
    { id: 'ne', dx: 1, dz: -1 },
    { id: 'so', dx: -1, dz: 1 },
    { id: 'se', dx: 1, dz: 1 },
  ];

  function crearHandle(clase, titulo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `v3-handle ${clase}`;
    b.tabIndex = -1; // Con teclado se usan los campos del panel.
    b.title = titulo;
    capaEdicion.appendChild(b);
    return b;
  }

  for (const h of HANDLES_PREDIO) {
    const esquina = h.dx && h.dz;
    h.el = crearHandle(esquina ? 'v3-handle--esquina' : 'v3-handle--borde', esquina ? 'Estirar esquina del predio' : `Estirar borde ${h.nombre}`);
    h.el.addEventListener('pointerdown', (e) => arrastrarDesdeHandle(e, moverBorde(h), terminarPredio));
  }

  const handleGiro = crearHandle('v3-handle--giro', 'Rotar');
  handleGiro.textContent = '↻';
  handleGiro.addEventListener('pointerdown', (e) => {
    if (seleccion) arrastrarDesdeHandle(e, girarSeleccion, terminarItem);
  });

  const handleLargo = crearHandle('v3-handle--largo', 'Alargar');
  handleLargo.textContent = '↔';
  handleLargo.hidden = true;
  handleLargo.addEventListener('pointerdown', (e) => {
    if (!seleccion?.obra) return;
    const fijo = extremoFijo(seleccion);
    arrastrarDesdeHandle(e, (ev) => estirarSeleccion(ev, fijo), terminarItem);
  });

  // La calle se alarga por su largo; el estacionamiento suma plazas a lo ancho.
  const medidaEstirable = (it) => (it.tipo === 'calle' ? 'largo' : 'ancho');

  function ejeEstirable(it) {
    const r = THREE.MathUtils.degToRad(it.rot);
    return it.tipo === 'calle' ? { x: Math.sin(r), z: -Math.cos(r) } : { x: Math.cos(r), z: Math.sin(r) };
  }

  function extremoFijo(it) {
    const eje = ejeEstirable(it);
    const m = it[medidaEstirable(it)] / 2;
    return { x: it.x - eje.x * m, z: it.z - eje.z * m };
  }

  function posicionHandle(h) {
    const x = h.dx ? (h.dx < 0 ? predio.x0 : predio.x1) : (predio.x0 + predio.x1) / 2;
    const z = h.dz ? (h.dz < 0 ? predio.z0 : predio.z1) : (predio.z0 + predio.z1) / 2;
    return pv2.set(x, 0, z);
  }

  // Render bajo demanda.
  let raf = 0;
  let ancho = 0;
  let alto = 0;
  let tween = null;
  let vistaInicial = null;
  const pv = new THREE.Vector3();
  const pv2 = new THREE.Vector3();

  function invalidar() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function ubicar(el, posicion, anclaY) {
    pv.copy(posicion).project(camera);
    const visible = pv.z < 1;
    el.style.visibility = visible ? '' : 'hidden';
    if (visible) {
      el.style.transform = `translate(-50%,${anclaY}) translate(${((pv.x + 1) / 2) * ancho}px,${((1 - pv.y) / 2) * alto}px)`;
    }
  }

  const ancla = new THREE.Vector3();
  function frame(now) {
    raf = 0;
    if (!ancho || !alto) return;

    if (tween) {
      const t = Math.min(1, (now - tween.inicio) / tween.duracion);
      const e = easeInOut(t);
      camera.position.lerpVectors(tween.pos0, tween.pos1, e);
      controls.target.lerpVectors(tween.tgt0, tween.tgt1, e);
      if (t === 1) tween = null;
    }

    const movio = controls.update();
    renderer.render(scene, camera);

    const distancia = camera.position.distanceTo(controls.target);
    const pxPorMetro = alto / (2 * distancia * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    capa.classList.toggle('is-lejos', pxPorMetro < ETIQUETA_COMPLETA_PX_M);
    capa.classList.toggle('is-muy-lejos', pxPorMetro < ETIQUETA_MINIMA_PX_M);

    items.forEach((it) => ubicar(it.label, ancla.set(it.x, it.altoEtiqueta, it.z), '-100%'));

    if (edicion) {
      for (const h of HANDLES_PREDIO) ubicar(h.el, posicionHandle(h), '-50%');
      if (seleccion) {
        const r = THREE.MathUtils.degToRad(seleccion.rot);
        const d = seleccion.largo / 2 + 5;
        ubicar(handleGiro, ancla.set(seleccion.x - Math.sin(r) * d, 0, seleccion.z + Math.cos(r) * d), '-50%');
        if (seleccion.obra) {
          const eje = ejeEstirable(seleccion);
          const m = seleccion[medidaEstirable(seleccion)] / 2 + 3;
          ubicar(handleLargo, ancla.set(seleccion.x + eje.x * m, 0, seleccion.z + eje.z * m), '-50%');
        }
      }
    }
    if (movio || tween) invalidar();
  }

  function distanciaPara(radio) {
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    return (radio / Math.sin(Math.min(vfov, hfov) / 2)) * (camera.aspect > 1.2 ? 0.7 : 0.85);
  }

  const objetivoSobre = (centro, radio) => ({
    pos: centro.clone().add(new THREE.Vector3(0.42, 0.72, 1).normalize().multiplyScalar(distanciaPara(radio))),
    tgt: centro.clone(),
  });

  const objetivoPlanta = () => {
    const c = centroPredio();
    return { pos: c.clone().add(new THREE.Vector3(0, distanciaPara(radioPredio()) * 1.08, 0.01)), tgt: c };
  };

  function objetivoItems(ids) {
    if (!ids.length) return objetivoSobre(centroPredio(), radioPredio()); // Deporte sin canchas.
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const id of ids) {
      const it = items.get(id);
      const { hx, hz } = semiEjes(it);
      x0 = Math.min(x0, it.x - hx);
      x1 = Math.max(x1, it.x + hx);
      z0 = Math.min(z0, it.z - hz);
      z1 = Math.max(z1, it.z + hz);
    }
    return objetivoSobre(new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0) / 2 + 8);
  }

  function volar({ pos, tgt }, animar = true) {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animar || quieto) {
      tween = null;
      camera.position.copy(pos);
      controls.target.copy(tgt);
    } else {
      tween = { inicio: performance.now(), duracion: 750, pos0: camera.position.clone(), tgt0: controls.target.clone(), pos1: pos, tgt1: tgt };
    }
    invalidar();
  }

  controls.addEventListener('change', invalidar);
  controls.addEventListener('start', () => {
    tween = null;
  });

  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    ancho = width;
    alto = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (vistaInicial) {
      volar(vistaInicial(), false);
      vistaInicial = null;
    }
    // Sin esto el canvas queda en blanco un cuadro durante el redimensionado.
    frame(performance.now());
  });
  ro.observe(host);

  // Puntero.
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const puntoSuelo = new THREE.Vector3();

  function apuntar(e) {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(puntero, camera);
  }

  function itemBajo(e, soloCanchas) {
    apuntar(e);
    for (const hit of raycaster.intersectObjects(pickables, false)) {
      const it = items.get(hit.object.userData.id);
      if (!soloCanchas || it.tipo === 'cancha') return it;
    }
    return null;
  }

  function enSuelo(e) {
    apuntar(e);
    return raycaster.ray.intersectPlane(suelo, puntoSuelo);
  }

  // Validaciones del layout.
  function dentroDelPredio(it) {
    const { hx, hz } = semiEjes(it);
    return it.x - hx >= predio.x0 && it.x + hx <= predio.x1 && it.z - hz >= predio.z0 && it.z + hz <= predio.z1;
  }

  function encerrar(it) {
    const { hx, hz } = semiEjes(it);
    if (hx * 2 <= predio.x1 - predio.x0) it.x = Math.min(predio.x1 - hx, Math.max(predio.x0 + hx, it.x));
    if (hz * 2 <= predio.z1 - predio.z0) it.z = Math.min(predio.z1 - hz, Math.max(predio.z0 + hz, it.z));
  }

  function chocaCon(it) {
    for (const otro of items.values()) {
      if (otro === it) continue;
      if (it.tipo === 'calle' && otro.tipo === 'calle') continue; // Las calles se cruzan.
      if (seSuperponen(it, otro)) return otro;
    }
    return null;
  }

  function problema(it) {
    if (!dentroDelPredio(it)) return `${it.nombre} no entra dentro del predio.`;
    const otro = chocaCon(it);
    return otro ? `${it.nombre} se superpone con ${otro.nombre}.` : null;
  }

  function marcarValidez(it) {
    elegidoMat.color.setHex(problema(it) ? 0xff4d4d : 0xffffff);
  }

  const posicionDe = (it) => ({ x: it.x, z: it.z, rot: it.rot, ...(it.obra ? { ancho: it.ancho, largo: it.largo } : {}) });

  const copiaLayout = () => {
    const salida = { predio: { ...predio }, items: {} };
    items.forEach((it) => {
      salida.items[it.id] = posicionDe(it);
    });
    return salida;
  };

  // Selección de edición.
  let edicion = false;
  let seleccion = null;
  let origenDrag = null;

  function seleccionar(it) {
    seleccion = it;
    items.forEach((x) => (x.elegido.visible = edicion && x === it));
    handleGiro.hidden = !edicion || !it;
    handleLargo.hidden = !edicion || !it?.obra;
    elegidoMat.color.setHex(0xffffff);
    invalidar();
  }

  function moverSeleccion(e, desfase) {
    const p = enSuelo(e);
    if (!p) return;
    seleccion.x = ajustar(p.x + desfase.x, PASO_DRAG);
    seleccion.z = ajustar(p.z + desfase.z, PASO_DRAG);
    encerrar(seleccion);
    aplicarTransform(seleccion);
    marcarValidez(seleccion);
    onEditCambio?.(seleccion.id);
    invalidar();
  }

  function girarSeleccion(e) {
    const p = enSuelo(e);
    if (!p) return;
    const angulo = THREE.MathUtils.radToDeg(Math.atan2(-(p.x - seleccion.x), p.z - seleccion.z));
    seleccion.rot = normalizarGrados(ajustar(angulo, PASO_GIRO));
    aplicarTransform(seleccion);
    marcarValidez(seleccion);
    onEditCambio?.(seleccion.id);
    invalidar();
  }

  function estirarSeleccion(e, fijo) {
    const p = enSuelo(e);
    if (!p) return;
    const it = seleccion;
    const eje = ejeEstirable(it);
    const pedido = (p.x - fijo.x) * eje.x + (p.z - fijo.z) * eje.z;
    const medida = medidaEstirable(it);
    const paso = it.tipo === 'calle' ? PASO_DRAG : ANCHO_PLAZA;
    const minimo = it.tipo === 'calle' ? CALLE_MINIMA.largo : ANCHO_PLAZA;
    it[medida] = Math.max(minimo, ajustar(pedido, paso));
    it.x = fijo.x + (eje.x * it[medida]) / 2;
    it.z = fijo.z + (eje.z * it[medida]) / 2;
    aplicarTransform(it);
    marcarValidez(it);
    onEditCambio?.(it.id);
    invalidar();
  }

  function terminarItem() {
    const it = seleccion;
    encerrar(it); // Al rotar cerca del borde se corre lo justo para entrar.
    aplicarTransform(it);
    const error = problema(it);
    const cambio = Object.keys(origenDrag).some((k) => it[k] !== origenDrag[k]);
    if (error) {
      Object.assign(it, origenDrag);
      aplicarTransform(it);
      onAviso?.(`${error} Volvió a su lugar.`);
    }
    elegidoMat.color.setHex(0xffffff);
    onEditCambio?.(it.id);
    if (!error && cambio) onLayout(copiaLayout());
    invalidar();
  }

  // El predio nunca puede dejar afuera a un elemento.
  function limitesPredio() {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    items.forEach((it) => {
      const { hx, hz } = semiEjes(it);
      x0 = Math.min(x0, it.x - hx);
      x1 = Math.max(x1, it.x + hx);
      z0 = Math.min(z0, it.z - hz);
      z1 = Math.max(z1, it.z + hz);
    });
    return { x0, x1, z0, z1 };
  }

  const moverBorde = (h) => (e) => {
    const p = enSuelo(e);
    if (!p) return;
    const lim = limitesPredio();
    if (h.dx < 0) predio.x0 = Math.min(ajustar(p.x, PASO_DRAG), lim.x0, predio.x1 - ANCHO_MINIMO_PREDIO);
    if (h.dx > 0) predio.x1 = Math.max(ajustar(p.x, PASO_DRAG), lim.x1, predio.x0 + ANCHO_MINIMO_PREDIO);
    if (h.dz < 0) predio.z0 = Math.min(ajustar(p.z, PASO_DRAG), lim.z0, predio.z1 - ANCHO_MINIMO_PREDIO);
    if (h.dz > 0) predio.z1 = Math.max(ajustar(p.z, PASO_DRAG), lim.z1, predio.z0 + ANCHO_MINIMO_PREDIO);
    actualizarPredio();
    actualizarEtiquetasPredio();
    onEditCambio?.(seleccion?.id ?? null);
  };

  function terminarPredio() {
    onLayout(copiaLayout());
  }

  function actualizarEtiquetasPredio() {
    const texto = (v) => `${Number(v.toFixed(1))} m`;
    for (const h of HANDLES_PREDIO) {
      if (h.dx && h.dz) continue;
      h.el.textContent = texto(h.dz ? predio.x1 - predio.x0 : predio.z1 - predio.z0);
    }
  }

  function arrastrarDesdeHandle(e, alMover, alSoltar) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    controls.enabled = false;
    origenDrag = seleccion ? posicionDe(seleccion) : null;
    const mover = (ev) => alMover(ev);
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      controls.enabled = true;
      alSoltar();
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  // Se registra en captura para frenar a OrbitControls antes de que empiece a girar la cámara.
  let abajo = null;
  let hoverId = null;
  let arrastre = null;

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      abajo = { x: e.clientX, y: e.clientY };
      if (!edicion || !e.isPrimary || e.button !== 0) return;
      const it = itemBajo(e, false);
      if (!it) return;
      const p = enSuelo(e);
      if (!p) return;
      controls.enabled = false;
      seleccionar(it);
      onEditSelect?.(it.id);
      origenDrag = posicionDe(it);
      arrastre = { desfase: { x: it.x - p.x, z: it.z - p.z }, movido: false };
      canvas.setPointerCapture(e.pointerId);
    },
    { capture: true },
  );

  canvas.addEventListener('pointermove', (e) => {
    if (arrastre) {
      if (abajo && Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) < 4 && !arrastre.movido) return;
      arrastre.movido = true;
      moverSeleccion(e, arrastre.desfase);
      return;
    }
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const it = itemBajo(e, !edicion);
    const id = it?.id ?? null;
    if (id === hoverId) return;
    if (hoverId) items.get(hoverId).label.classList.remove('is-hover');
    hoverId = id;
    if (it) it.label.classList.add('is-hover');
    canvas.style.cursor = !it ? '' : edicion ? 'move' : 'pointer';
  });

  function alSoltarCanvas(e) {
    const toque = abajo && Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) < 6;
    abajo = null;
    if (arrastre) {
      const { movido } = arrastre;
      arrastre = null;
      controls.enabled = true;
      if (movido) terminarItem();
      return;
    }
    if (!toque) return;
    if (edicion) {
      seleccionar(null);
      onEditSelect?.(null);
    } else {
      onSelect(itemBajo(e, true)?.id ?? null);
    }
  }
  canvas.addEventListener('pointerup', alSoltarCanvas);
  canvas.addEventListener('pointercancel', () => {
    abajo = null;
    if (arrastre) {
      arrastre = null;
      controls.enabled = true;
      Object.assign(seleccion, origenDrag);
      aplicarTransform(seleccion);
      elegidoMat.color.setHex(0xffffff);
      invalidar();
    }
  });

  // Luces.
  let noche = 0;

  function aplicarLuces(u) {
    const prendida = u.ocupada && noche > 0.02;
    u.pisoMaterial.emissiveIntensity = prendida ? noche * 0.85 : 0;
    u.lamparaMaterial.emissiveIntensity = prendida ? noche * 7 : 0;
    u.focoMaterial.opacity = prendida ? noche * 0.6 : 0;
    u.focos.forEach((f) => (f.visible = prendida));
    u.derrame.visible = prendida;
    u.derrame.material.opacity = prendida ? noche * 0.3 : 0;
    u.jugadores.material.emissiveIntensity = noche * 0.65;
  }

  const canchasItems = () => [...items.values()].filter((it) => it.tipo === 'cancha');

  const dia = {
    cielo: new THREE.Color(0xc4d6df),
    hemiCielo: new THREE.Color(0xffffff),
    hemiSuelo: new THREE.Color(0x54606a),
    sol: new THREE.Color(0xfff4e2),
  };
  const ocaso = { cielo: new THREE.Color(0xe9b48c), sol: new THREE.Color(0xffa666) };
  const nocturno = {
    cielo: new THREE.Color(0x0a1220),
    hemiCielo: new THREE.Color(0x5a78a6),
    hemiSuelo: new THREE.Color(0x1a2433),
    sol: new THREE.Color(0x8ea8d8),
  };
  const c1 = new THREE.Color();

  function setHora(min) {
    horaActual = min;
    const h = min / 60;
    noche = suave(18.6, 20, h);
    const dorada = suave(16.8, 18.6, h) * (1 - suave(18.8, 19.8, h));

    c1.copy(dia.cielo).lerp(ocaso.cielo, dorada).lerp(nocturno.cielo, noche);
    scene.background.copy(c1);
    scene.fog.color.copy(c1);

    sol.color.copy(dia.sol).lerp(ocaso.sol, dorada).lerp(nocturno.sol, noche);
    sol.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.5, 1.9, dorada), 0.6, noche);
    hemi.color.copy(dia.hemiCielo).lerp(nocturno.hemiCielo, noche);
    hemi.groundColor.copy(dia.hemiSuelo).lerp(nocturno.hemiSuelo, noche);
    hemi.intensity = THREE.MathUtils.lerp(1.25, 1.7, noche);
    ventanas.forEach((v) => (v.emissiveIntensity = noche * 1.1));

    colocarSol();
    canchasItems().forEach(aplicarLuces);
    invalidar();
  }

  actualizarPredio();
  actualizarEtiquetasPredio();
  setHora(horaActual);

  return {
    setEstados(estados) {
      for (const [id, e] of Object.entries(estados)) {
        const u = items.get(id);
        if (!u) continue;
        u.estadoMat.color.setHex(COLORES[e.status]);
        u.ocupada = e.status === 'ocupada';
        u.jugadores.visible = u.ocupada;
        u.label.dataset.status = e.status;
        u.label.querySelector('.v3-label-sub').textContent = e.sub;
        u.label.setAttribute('aria-label', `${e.nombre}: ${e.textoLargo}`);
        aplicarLuces(u);
      }
      invalidar();
    },

    setHora,

    setSeleccion(id) {
      canchasItems().forEach((u) => {
        const activa = u.id === id;
        u.elegido.visible = edicion ? u === seleccion : activa;
        u.label.classList.toggle('is-selected', activa);
        u.label.setAttribute('aria-pressed', String(activa));
      });
      invalidar();
    },

    // Las etiquetas del deporte activo van completas; las demás, solo con el nombre.
    setActivo(moduloId) {
      canchasItems().forEach((u) => u.label.classList.toggle('is-otro', u.modulo !== moduloId));
      invalidar();
    },

    enfocar(id) {
      const it = items.get(id);
      if (!it) return;
      const dir = camera.position.clone().sub(controls.target).setY(0);
      if (dir.lengthSq() < 1) dir.set(0.4, 0, 1);
      dir.normalize().multiplyScalar(30 * it.escala).setY(36 * it.escala);
      volar({ pos: new THREE.Vector3(it.x, 0, it.z).add(dir), tgt: new THREE.Vector3(it.x, 0, it.z) });
    },

    // Encuadra un grupo de elementos. Antes del primer render deja pendiente el encuadre.
    encuadrar(ids) {
      if (!ancho) vistaInicial = () => objetivoItems(ids);
      else volar(objetivoItems(ids));
    },

    vistaGeneral: () => volar(objetivoSobre(centroPredio(), radioPredio())),
    vistaPlanta: () => volar(objetivoPlanta()),

    setEdicion(activa) {
      edicion = activa;
      capaEdicion.hidden = !activa;
      capa.classList.toggle('is-edicion', activa);
      grilla.visible = activa;
      seleccionar(null);
      if (!activa) canvas.style.cursor = '';
      if (activa) volar(objetivoPlanta());
    },

    seleccionarItem(id) {
      seleccionar(id ? items.get(id) : null);
    },

    datosItem(id) {
      const it = items.get(id);
      return it && { id: it.id, nombre: it.nombre, tipo: it.tipo, x: it.x, z: it.z, rot: it.rot, ancho: it.ancho, largo: it.largo };
    },

    // Busca el lugar libre más cercano a un grupo de canchas. Deja 2 m de aire alrededor.
    lugarPara(kitId, idsCerca) {
      const { ancho: w, largo: l } = kits[kitId].unidad;
      return this.lugarLibre(w + MARGEN_BASE + 2, l + MARGEN_BASE + 2, idsCerca);
    },

    lugarEdificio() {
      return this.lugarLibre(EDIFICIO.ancho + 3.2, EDIFICIO.largo + 3);
    },

    lugarLibre(ancho, largo, idsCerca = []) {
      const prueba = { ancho, largo, x: 0, z: 0, rot: 0 };
      const cerca = idsCerca.map((id) => items.get(id)).filter(Boolean);
      const centro = cerca.length
        ? { x: cerca.reduce((s, c) => s + c.x, 0) / cerca.length, z: cerca.reduce((s, c) => s + c.z, 0) / cerca.length }
        : centroPredio();

      const candidatos = [];
      for (let x = predio.x0 + 2; x < predio.x1; x += 2) {
        for (let z = predio.z0 + 2; z < predio.z1; z += 2) {
          candidatos.push({ x, z, d: Math.hypot(x - centro.x, z - centro.z) });
        }
      }
      candidatos.sort((a, b) => a.d - b.d);

      for (const c of candidatos) {
        for (const rot of [0, 90]) {
          Object.assign(prueba, { x: c.x, z: c.z, rot });
          if (dentroDelPredio(prueba) && !chocaCon(prueba)) return { x: c.x, z: c.z, rot };
        }
      }
      return null;
    },

    getLayout: copiaLayout,

    listaItems: () => [...items.values()].map((it) => ({ id: it.id, nombre: it.nombre })),

    getPredio: () => ({ ...predio }),

    // Cambio puntual desde el panel o el teclado. Devuelve false si no es válido.
    cambiarItem(id, cambios) {
      const it = items.get(id);
      const antes = posicionDe(it);
      Object.assign(it, cambios);
      if (cambios.rot !== undefined) {
        it.rot = normalizarGrados(it.rot);
        encerrar(it);
      }
      const error = problema(it);
      if (error) {
        Object.assign(it, antes);
        onAviso?.(error);
        return false;
      }
      aplicarTransform(it);
      onLayout(copiaLayout());
      invalidar();
      return true;
    },

    // Cambia ancho o largo desde el panel, hacia el borde este y el sur. Respeta lo construido.
    cambiarTamanoPredio({ ancho: w, largo: l }) {
      const lim = limitesPredio();
      if (w !== undefined) predio.x1 = Math.max(predio.x0 + Math.max(w, ANCHO_MINIMO_PREDIO), lim.x1);
      if (l !== undefined) predio.z1 = Math.max(predio.z0 + Math.max(l, ANCHO_MINIMO_PREDIO), lim.z1);
      actualizarPredio();
      actualizarEtiquetasPredio();
      onLayout(copiaLayout());
      volar(objetivoPlanta()); // Si creció, una parte podría quedar fuera de la pantalla.
    },

    // Reemplaza canchas y layout: alta o baja de canchas, deshacer, restablecer u otra pestaña.
    sincronizar(lista, nuevasObras, nuevosEdificios, nuevo) {
      const vigentes = new Set([...lista, ...nuevasObras, ...nuevosEdificios].map((c) => c.id));
      for (const it of [...items.values()]) {
        if (!vigentes.has(it.id)) quitarItem(it);
      }
      for (const e of nuevosEdificios) {
        const it = items.get(e.id);
        if (!it) crearEdificioItem(e, nuevo.items[e.id]);
        else if (it.nombre !== e.nombre) {
          it.nombre = e.nombre;
          it.label.textContent = e.nombre;
        }
      }
      for (const c of lista) {
        if (items.has(c.id)) rotularCancha(items.get(c.id), c);
        else crearCancha(c, nuevo.items[c.id]);
      }
      for (const o of nuevasObras) {
        if (items.has(o.id)) items.get(o.id).nombre = o.nombre;
        else crearObra(o, nuevo.items[o.id]);
      }
      Object.assign(predio, nuevo.predio);
      items.forEach((it) => {
        Object.assign(it, nuevo.items[it.id]);
        aplicarTransform(it);
        if (it.obra) rotularObra(it);
      });
      actualizarPredio();
      actualizarEtiquetasPredio();
    },
  };
}

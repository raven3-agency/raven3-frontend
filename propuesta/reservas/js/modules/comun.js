// Piezas que comparten los kits de cada deporte: helpers de geometría, texturas de malla y
// brillo, torres de iluminación, jugadores y el armado de una unidad.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function caja(lista, w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  lista.push(g);
}

// Plano vertical con UV en metros, para que el tejido de la malla no se estire.
export function panel(lista, w, h, x, y, z, rotY = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  lista.push(g);
}

export function fusionar(lista) {
  const g = mergeGeometries(lista);
  lista.forEach((p) => p.dispose());
  return g;
}

export function geometriaPiso(ancho, largo) {
  const g = new THREE.PlaneGeometry(ancho, largo);
  g.rotateX(-Math.PI / 2);
  return g;
}

// Lienzo para pintar el piso en metros, con el origen en el centro de la cancha.
export function lienzoPiso(ancho, largo, color, grano) {
  const c = document.createElement('canvas');
  c.width = 1024;
  const m = c.width / ancho;
  c.height = Math.round(largo * m);
  const x = c.getContext('2d');

  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);

  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26000; i++) {
    x.fillStyle = azar() > 0.5 ? grano[0] : grano[1];
    x.fillRect(azar() * c.width, azar() * c.height, 2, 3);
  }

  x.translate(c.width / 2, c.height / 2);
  x.scale(m, m);
  return { canvas: c, x };
}

export function texturaDeLienzo(canvas, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function texturaMalla() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#fff';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(64, 64);
  x.moveTo(64, 0);
  x.lineTo(0, 64);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  return t;
}

function texturaBrillo() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,245,220,.55)');
  g.addColorStop(1, 'rgba(255,240,210,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function materialesBase() {
  return {
    malla: new THREE.MeshStandardMaterial({ color: 0x18202a, alphaMap: texturaMalla(), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.7 }),
    acero: new THREE.MeshStandardMaterial({ color: 0x1b222b, roughness: 0.55, metalness: 0.45 }),
    blanco: new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.6 }),
    figuras: new THREE.MeshStandardMaterial({ color: 0xf6efe4, roughness: 0.7, emissive: 0xf6efe4, emissiveIntensity: 0 }),
    brillo: texturaBrillo(),
  };
}

// Torres a ambos lados de la cancha, con el brazo hacia adentro. Devuelve dónde van los focos.
export function crearTorres(acero, lampara, semiAncho, posicionesZ, alto) {
  const focos = [];
  for (const z of posicionesZ) {
    for (const lado of [-1, 1]) {
      const x = lado * (semiAncho + 0.75);
      caja(acero, 0.12, alto, 0.12, x, alto / 2, z);
      caja(acero, 0.9, 0.06, 0.06, x - lado * 0.45, alto, z);
      caja(lampara, 0.6, 0.12, 0.34, x - lado * 0.82, alto - 0.06, z);
      focos.push([x - lado * 0.82, alto - 0.1, z]);
    }
  }
  return focos;
}

export function crearFiguras(posiciones) {
  const figuras = [];
  for (const [x, z] of posiciones) {
    const cuerpo = new THREE.CapsuleGeometry(0.23, 0.8, 3, 8);
    cuerpo.translate(x, 0.75, z);
    const cabeza = new THREE.SphereGeometry(0.14, 10, 8);
    cabeza.translate(x, 1.5, z);
    figuras.push(cuerpo.toNonIndexed(), cabeza.toNonIndexed());
  }
  return fusionar(figuras);
}

export function crearUnidadBase({ geo, mat, focos, escalaFoco }, mapaPiso) {
  const grupo = new THREE.Group();

  // Piso y lámpara se clonan: cada cancha prende sus luces por separado.
  const pisoMaterial = new THREE.MeshStandardMaterial({
    map: mapaPiso,
    emissiveMap: mapaPiso,
    emissive: 0xffffff,
    emissiveIntensity: 0,
    roughness: 0.92,
  });
  const lamparaMaterial = new THREE.MeshStandardMaterial({ color: 0x30363d, emissive: 0xfff1d0, emissiveIntensity: 0 });

  const piso = new THREE.Mesh(geo.piso, pisoMaterial);
  piso.receiveShadow = true;

  const acero = new THREE.Mesh(geo.acero, mat.acero);
  acero.castShadow = true;

  const malla = new THREE.Mesh(geo.malla, mat.malla);
  malla.renderOrder = 1;

  const jugadores = new THREE.Mesh(geo.figuras, mat.figuras);
  jugadores.castShadow = true;
  jugadores.visible = false;

  grupo.add(piso, acero, malla, jugadores, new THREE.Mesh(geo.blanco, mat.blanco), new THREE.Mesh(geo.lampara, lamparaMaterial));

  if (geo.vidrio) {
    const vidrio = new THREE.Mesh(geo.vidrio, mat.vidrio);
    vidrio.renderOrder = 2;
    grupo.add(vidrio);
  }

  const focoMaterial = new THREE.SpriteMaterial({
    map: mat.brillo,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
  });
  const sprites = focos.map(([x, y, z]) => {
    const s = new THREE.Sprite(focoMaterial);
    s.position.set(x, y, z);
    s.scale.setScalar(escalaFoco);
    s.visible = false;
    grupo.add(s);
    return s;
  });

  return { grupo, pisoMaterial, lamparaMaterial, jugadores, focos: sprites, focoMaterial };
}

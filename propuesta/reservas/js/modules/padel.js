// Cancha de pádel reglamentaria: 20 x 10 m, red al centro y líneas de saque a 6,95 m de la red.
// Fondo de cristal de 3 m + malla hasta 4 m; laterales con cristal escalonado y malla central.

import * as THREE from 'three';
import { caja, crearFiguras, crearTorres, crearUnidadBase, fusionar, geometriaPiso, lienzoPiso, materialesBase, panel, texturaDeLienzo } from './comun.js';

const ANCHO = 10;
const LARGO = 20;

function pintarPiso(renderer) {
  const { canvas, x } = lienzoPiso(ANCHO, LARGO, '#1d6fc4', ['rgba(255,255,255,.035)', 'rgba(0,20,60,.06)']);
  x.fillStyle = '#f4f7fa';
  const g = 0.07;
  for (const s of [-1, 1]) x.fillRect(-ANCHO / 2, s * 6.95 - g / 2, ANCHO, g);
  x.fillRect(-g / 2, -7.15, g, 14.3);
  return texturaDeLienzo(canvas, renderer);
}

export const padelKit = {
  unidad: { ancho: ANCHO, largo: LARGO, altoEtiqueta: 5.4 },

  crearCompartido(renderer) {
    const vidrio = [];
    const malla = [];
    const acero = [];
    const blanco = [];
    const lampara = [];

    const mx = ANCHO / 2;
    const mz = LARGO / 2;

    // Fondos: 5 paños de cristal de 2 m con malla arriba.
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) caja(vidrio, 1.96, 3, 0.03, -4 + i * 2, 1.5, s * mz);
      panel(malla, ANCHO, 1, 0, 3.5, s * mz);
    }

    // Laterales: cristal alto, cristal escalonado y malla central.
    for (const lado of [-1, 1]) {
      const x = lado * mx;
      for (const s of [-1, 1]) {
        caja(vidrio, 0.03, 3, 1.96, x, 1.5, s * 9);
        caja(vidrio, 0.03, 2, 1.96, x, 1, s * 7);
        panel(malla, 2, 1, x, 3.5, s * 9, Math.PI / 2);
        panel(malla, 2, 2, x, 3, s * 7, Math.PI / 2);
      }
      panel(malla, 12, 3, x, 1.5, 0, Math.PI / 2);
    }

    // Estructura cada 2 m.
    for (let i = 0; i <= 5; i++) {
      for (const s of [-1, 1]) caja(acero, 0.08, 4, 0.08, -mx + i * 2, 2, s * mz);
    }
    for (let i = 1; i < 10; i++) {
      for (const lado of [-1, 1]) caja(acero, 0.08, i <= 2 || i >= 8 ? 4 : 3, 0.08, lado * mx, i <= 2 || i >= 8 ? 2 : 1.5, -mz + i * 2);
    }
    for (const s of [-1, 1]) {
      caja(acero, ANCHO + 0.08, 0.07, 0.07, 0, 4, s * mz);
      caja(acero, ANCHO + 0.08, 0.05, 0.05, 0, 3, s * mz);
    }
    for (const lado of [-1, 1]) {
      caja(acero, 0.07, 0.07, 12, lado * mx, 3, 0);
      for (const s of [-1, 1]) caja(acero, 0.07, 0.07, 4, lado * mx, 4, s * 8);
    }

    // Red.
    panel(malla, ANCHO, 0.86, 0, 0.45, 0);
    caja(blanco, ANCHO, 0.05, 0.03, 0, 0.9, 0);
    for (const lado of [-1, 1]) caja(acero, 0.07, 1.05, 0.07, lado * (mx + 0.04), 0.52, 0);

    const focos = crearTorres(acero, lampara, mx, [-5.5, 5.5], 6.5);

    return {
      focos,
      escalaFoco: 3.2,
      geo: {
        piso: geometriaPiso(ANCHO, LARGO),
        vidrio: fusionar(vidrio),
        malla: fusionar(malla),
        acero: fusionar(acero),
        blanco: fusionar(blanco),
        lampara: fusionar(lampara),
        figuras: crearFiguras([[-2.4, -7.6], [2.3, -4.9], [-2.2, 5.1], [2.5, 7.9]]),
      },
      mat: {
        ...materialesBase(),
        piso: pintarPiso(renderer),
        vidrio: new THREE.MeshStandardMaterial({ color: 0xbfe8ea, transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0.1, depthWrite: false }),
      },
    };
  },

  crearUnidad: (compartido) => crearUnidadBase(compartido, compartido.mat.piso),
};

// Cancha de fútbol 5 de césped sintético: predio de 25 x 42 m, campo de 23 x 40 m, arcos de
// 3 x 2 m, y alambrado perimetral de 4 m.

import { caja, crearFiguras, crearTorres, crearUnidadBase, fusionar, geometriaPiso, lienzoPiso, materialesBase, panel, texturaDeLienzo } from './comun.js';

const ANCHO = 25;
const LARGO = 42;
const CAMPO = { ancho: 23, largo: 40 };
const ARCO = { ancho: 3, alto: 2, fondo: 0.9 };

function pintarPiso(renderer) {
  const { canvas, x } = lienzoPiso(ANCHO, LARGO, '#2f8a3f', ['rgba(255,255,255,.03)', 'rgba(0,40,10,.07)']);
  const { ancho, largo } = CAMPO;

  // Franjas de corte, como un césped real.
  x.fillStyle = 'rgba(255,255,255,.045)';
  for (let i = 0; i < 8; i += 2) x.fillRect(-ancho / 2, -largo / 2 + i * 5, ancho, 5);

  x.strokeStyle = '#f4f7fa';
  x.fillStyle = '#f4f7fa';
  x.lineWidth = 0.1;
  x.strokeRect(-ancho / 2, -largo / 2, ancho, largo);

  x.beginPath();
  x.moveTo(-ancho / 2, 0);
  x.lineTo(ancho / 2, 0);
  x.stroke();

  x.beginPath();
  x.arc(0, 0, 3, 0, Math.PI * 2);
  x.stroke();

  for (const s of [-1, 1]) {
    // Área de arco y punto penal.
    x.beginPath();
    x.arc(0, (s * largo) / 2, 6, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2 : Math.PI);
    x.stroke();
    x.beginPath();
    x.arc(0, s * (largo / 2 - 6), 0.12, 0, Math.PI * 2);
    x.fill();
  }
  x.beginPath();
  x.arc(0, 0, 0.12, 0, Math.PI * 2);
  x.fill();

  return texturaDeLienzo(canvas, renderer);
}

export const futbolKit = {
  unidad: { ancho: ANCHO, largo: LARGO, altoEtiqueta: 6.2 },

  crearCompartido(renderer) {
    const malla = [];
    const acero = [];
    const blanco = [];
    const lampara = [];

    const mx = ANCHO / 2;
    const mz = LARGO / 2;
    const alto = 4;

    for (const s of [-1, 1]) panel(malla, ANCHO, alto, 0, alto / 2, s * mz);
    for (const lado of [-1, 1]) panel(malla, LARGO, alto, lado * mx, alto / 2, 0, Math.PI / 2);

    // Postes cada 5 m y caño superior.
    for (let x = -mx; x <= mx; x += 5) {
      for (const s of [-1, 1]) caja(acero, 0.1, alto, 0.1, x, alto / 2, s * mz);
    }
    for (let z = -mz + 5; z < mz; z += 5) {
      for (const lado of [-1, 1]) caja(acero, 0.1, alto, 0.1, lado * mx, alto / 2, z);
    }
    for (const s of [-1, 1]) {
      caja(acero, ANCHO + 0.1, 0.07, 0.07, 0, alto, s * mz);
      caja(acero, 0.07, 0.07, LARGO + 0.1, s * mx, alto, 0);
    }

    // Arcos con su red.
    const zArco = CAMPO.largo / 2;
    for (const s of [-1, 1]) {
      for (const lado of [-1, 1]) {
        caja(blanco, 0.1, ARCO.alto, 0.1, (lado * ARCO.ancho) / 2, ARCO.alto / 2, s * zArco);
        panel(malla, ARCO.fondo, ARCO.alto, (lado * ARCO.ancho) / 2, ARCO.alto / 2, s * (zArco + ARCO.fondo / 2), Math.PI / 2);
      }
      caja(blanco, ARCO.ancho + 0.1, 0.1, 0.1, 0, ARCO.alto, s * zArco);
      panel(malla, ARCO.ancho, ARCO.alto, 0, ARCO.alto / 2, s * (zArco + ARCO.fondo));
    }

    const focos = crearTorres(acero, lampara, mx, [-13, 13], 10);

    const equipo = (s) => [[0, s * 19], [-6, s * 11], [6, s * 12], [-3, s * 4], [4, s * 3]];

    return {
      focos,
      escalaFoco: 4.5,
      geo: {
        piso: geometriaPiso(ANCHO, LARGO),
        malla: fusionar(malla),
        acero: fusionar(acero),
        blanco: fusionar(blanco),
        lampara: fusionar(lampara),
        figuras: crearFiguras([...equipo(-1), ...equipo(1)]),
      },
      mat: { ...materialesBase(), piso: pintarPiso(renderer) },
    };
  },

  crearUnidad: (compartido) => crearUnidadBase(compartido, compartido.mat.piso),
};

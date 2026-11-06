// Cancha de tenis reglamentaria: 23,77 x 10,97 m (8,23 m en singles), cuadros de saque a 6,40 m
// de la red, dentro de un predio de 36,6 x 18,3 m. Superficie por cancha: polvo de ladrillo o rápida.

import { caja, crearFiguras, crearTorres, crearUnidadBase, fusionar, geometriaPiso, lienzoPiso, materialesBase, panel, texturaDeLienzo } from './comun.js';

const ANCHO = 18.3;
const LARGO = 36.6;
const JUEGO = { largo: 23.77, dobles: 10.97, singles: 8.23, saque: 6.4 };

const SUPERFICIES = {
  polvo: { exterior: '#b4552f', interior: '#b4552f', grano: ['rgba(255,220,190,.05)', 'rgba(70,20,0,.07)'], linea: '#f7f2ea' },
  rapida: { exterior: '#2f7d5b', interior: '#2c6db0', grano: ['rgba(255,255,255,.025)', 'rgba(0,30,40,.05)'], linea: '#f4f7fa' },
};

function pintarPiso(renderer, superficie) {
  const s = SUPERFICIES[superficie];
  const { canvas, x } = lienzoPiso(ANCHO, LARGO, s.exterior, s.grano);
  const { largo, dobles, singles, saque } = JUEGO;

  x.fillStyle = s.interior;
  x.fillRect(-dobles / 2, -largo / 2, dobles, largo);

  x.strokeStyle = s.linea;
  x.lineWidth = 0.07;
  x.strokeRect(-dobles / 2, -largo / 2, dobles, largo);
  x.strokeRect(-singles / 2, -largo / 2, singles, largo);

  x.beginPath();
  x.moveTo(-singles / 2, -saque);
  x.lineTo(singles / 2, -saque);
  x.moveTo(-singles / 2, saque);
  x.lineTo(singles / 2, saque);
  x.moveTo(0, -saque);
  x.lineTo(0, saque);
  for (const k of [-1, 1]) {
    x.moveTo(0, (k * largo) / 2);
    x.lineTo(0, k * (largo / 2 - 0.15));
  }
  x.stroke();

  return texturaDeLienzo(canvas, renderer);
}

export const tenisKit = {
  unidad: { ancho: ANCHO, largo: LARGO, altoEtiqueta: 5.6 },

  crearCompartido(renderer) {
    const malla = [];
    const acero = [];
    const blanco = [];
    const lampara = [];

    const mx = ANCHO / 2;
    const mz = LARGO / 2;
    const alto = 3.5;

    for (const s of [-1, 1]) panel(malla, ANCHO, alto, 0, alto / 2, s * mz);
    for (const lado of [-1, 1]) panel(malla, LARGO, alto, lado * mx, alto / 2, 0, Math.PI / 2);

    const pasoX = ANCHO / 5;
    const pasoZ = LARGO / 10;
    for (let i = 0; i <= 5; i++) {
      for (const s of [-1, 1]) caja(acero, 0.08, alto, 0.08, -mx + i * pasoX, alto / 2, s * mz);
    }
    for (let i = 1; i < 10; i++) {
      for (const lado of [-1, 1]) caja(acero, 0.08, alto, 0.08, lado * mx, alto / 2, -mz + i * pasoZ);
    }
    for (const s of [-1, 1]) {
      caja(acero, ANCHO + 0.08, 0.06, 0.06, 0, alto, s * mz);
      caja(acero, 0.06, 0.06, LARGO + 0.08, s * mx, alto, 0);
    }

    // Red de 0,914 m al centro y parantes por fuera de los dobles.
    const anchoRed = JUEGO.dobles + 1.8;
    panel(malla, anchoRed, 0.9, 0, 0.46, 0);
    caja(blanco, anchoRed, 0.06, 0.03, 0, 0.93, 0);
    for (const lado of [-1, 1]) caja(acero, 0.08, 1.07, 0.08, (lado * anchoRed) / 2, 0.53, 0);

    const focos = crearTorres(acero, lampara, mx, [-10, 10], 8);

    return {
      focos,
      escalaFoco: 3.8,
      geo: {
        piso: geometriaPiso(ANCHO, LARGO),
        malla: fusionar(malla),
        acero: fusionar(acero),
        blanco: fusionar(blanco),
        lampara: fusionar(lampara),
        figuras: crearFiguras([[-1.6, -12.4], [2.2, 10.6]]),
      },
      mat: {
        ...materialesBase(),
        pisos: { polvo: pintarPiso(renderer, 'polvo'), rapida: pintarPiso(renderer, 'rapida') },
      },
    };
  },

  crearUnidad: (compartido, cancha) => crearUnidadBase(compartido, compartido.mat.pisos[cancha.superficie]),
};

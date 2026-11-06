// Registro de kits 3D por deporte. Un kit nuevo implementa la misma forma que padelKit:
//   unidad: { ancho, largo, altoEtiqueta }   medidas en metros
//   crearCompartido(renderer)                geometrías y materiales que reutilizan las canchas
//   crearUnidad(compartido, cancha)          -> ver crearUnidadBase en comun.js
// Después se referencia desde `kit` en el módulo de js/config.js.

import { padelKit } from './padel.js';
import { futbolKit } from './futbol.js';
import { tenisKit } from './tenis.js';

export const KITS = { padel: padelKit, futbol: futbolKit, tenis: tenisKit };

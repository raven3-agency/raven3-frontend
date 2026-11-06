// Configuración de la empresa. Para sumar un cliente alcanza con otra definición como esta;
// para sumar un deporte, un módulo acá y su kit 3D en js/modules/ (ver js/modules/index.js).

export const TENANT = {
  id: 'demo-padel',
  name: 'Club Demo',
  demo: true, // Genera reservas de ejemplo y muestra "Restablecer demo".
  horario: { abre: 8 * 60, cierra: 24 * 60 },
  paso: 30, // Minutos entre turnos posibles.

  // Plano inicial, en metros. Después cada empresa lo edita desde "Editar plano".
  predio: { x0: -92, x1: 70, z0: -48, z1: 58 },
  edificios: [
    { id: 'e1', nombre: 'Recepción', pos: { x: -35, z: -5, rot: 0 } },
    { id: 'e2', nombre: 'Vestuarios', pos: { x: 46, z: 33, rot: 90 } },
  ],

  modulos: [
    {
      id: 'padel',
      kit: 'padel',
      nombre: 'Pádel',
      unidad: 'Cancha',
      duraciones: [60, 90, 120],
      duracionDefault: 90,
      // Precio por hora en ARS. Valores de ejemplo.
      tarifa: { valle: 24000, pico: 34000, picoDesde: 18 * 60, finDeSemanaPico: true, senaPct: 0.3 },
      tiposCancha: [{ tipo: 'Cristal' }, { tipo: 'Panorámica' }],
      canchasIniciales: [
        { id: 'c1', nombre: 'Cancha 1', tipo: 'Panorámica', pos: { x: -80, z: -32, rot: 0 } },
        { id: 'c2', nombre: 'Cancha 2', tipo: 'Panorámica', pos: { x: -65, z: -32, rot: 0 } },
        { id: 'c3', nombre: 'Cancha 3', tipo: 'Cristal', pos: { x: -50, z: -32, rot: 0 } },
        { id: 'c4', nombre: 'Cancha 4', tipo: 'Cristal', pos: { x: -35, z: -32, rot: 0 } },
        { id: 'c5', nombre: 'Cancha 5', tipo: 'Cristal', pos: { x: -80, z: -5, rot: 0 } },
        { id: 'c6', nombre: 'Cancha 6', tipo: 'Cristal', pos: { x: -65, z: -5, rot: 0 } },
        { id: 'c7', nombre: 'Cancha 7', tipo: 'Cristal', pos: { x: -50, z: -5, rot: 0 } },
      ],
      demoBloqueo: { cancha: 'c6', motivo: 'Mantenimiento de alfombra' },
    },
    {
      id: 'futbol',
      kit: 'futbol',
      nombre: 'Fútbol',
      unidad: 'Cancha',
      duraciones: [60, 90, 120],
      duracionDefault: 60,
      tarifa: { valle: 60000, pico: 85000, picoDesde: 18 * 60, finDeSemanaPico: true, senaPct: 0.3 },
      tiposCancha: [{ tipo: 'Fútbol 5 · Sintético' }],
      canchasIniciales: [
        { id: 'f1', nombre: 'Cancha 1', tipo: 'Fútbol 5 · Sintético', pos: { x: -10, z: -17, rot: 0 } },
        { id: 'f2', nombre: 'Cancha 2', tipo: 'Fútbol 5 · Sintético', pos: { x: 21, z: -17, rot: 0 } },
        { id: 'f3', nombre: 'Cancha 3', tipo: 'Fútbol 5 · Sintético', pos: { x: 52, z: -17, rot: 0 } },
      ],
      demoBloqueo: { cancha: 'f2', motivo: 'Cepillado del césped' },
    },
    {
      id: 'tenis',
      kit: 'tenis',
      nombre: 'Tenis',
      unidad: 'Cancha',
      duraciones: [60, 90, 120],
      duracionDefault: 60,
      tarifa: { valle: 18000, pico: 26000, picoDesde: 18 * 60, finDeSemanaPico: true, senaPct: 0.3 },
      tiposCancha: [
        { tipo: 'Polvo de ladrillo', superficie: 'polvo' },
        { tipo: 'Rápida', superficie: 'rapida' },
      ],
      canchasIniciales: [
        { id: 't1', nombre: 'Cancha 1', tipo: 'Polvo de ladrillo', superficie: 'polvo', pos: { x: -78, z: 33, rot: 0 } },
        { id: 't2', nombre: 'Cancha 2', tipo: 'Polvo de ladrillo', superficie: 'polvo', pos: { x: -54, z: 33, rot: 0 } },
        { id: 't3', nombre: 'Cancha 3', tipo: 'Polvo de ladrillo', superficie: 'polvo', pos: { x: -30, z: 33, rot: 0 } },
        { id: 't4', nombre: 'Cancha 4', tipo: 'Rápida', superficie: 'rapida', pos: { x: -6, z: 33, rot: 0 } },
        { id: 't5', nombre: 'Cancha 5', tipo: 'Rápida', superficie: 'rapida', pos: { x: 18, z: 33, rot: 0 } },
      ],
      demoBloqueo: { cancha: 't3', motivo: 'Riego y pasada de rastra' },
    },
  ],
};

// Calles y estacionamientos del plano, en metros. El tamaño se guarda en el layout.
export const OBRAS = {
  calle: { nombre: 'Calle', ancho: 6, largo: 30, anchoMinimo: 3, largoMinimo: 6 },
  estacionamiento: { nombre: 'Estacionamiento', anchoPlaza: 2.5, largoPlaza: 5, plazas: 10 },
};

export function layoutInicial(tenant) {
  const items = {};
  for (const e of tenant.edificios) items[e.id] = { ...e.pos };
  for (const m of tenant.modulos) for (const c of m.canchasIniciales) items[c.id] = { ...c.pos };
  return { predio: { ...tenant.predio }, items };
}

// Las canchas viven en el store, porque cada empresa las agrega y quita desde el plano.
export const edificiosIniciales = (tenant) => tenant.edificios.map(({ pos, ...e }) => e);

export function canchasIniciales(tenant) {
  const canchas = {};
  for (const m of tenant.modulos) canchas[m.id] = m.canchasIniciales.map(({ pos, ...c }) => c);
  return canchas;
}

export const TIPOS = {
  reserva: 'Reserva',
  fijo: 'Turno fijo',
  clase: 'Clase',
  bloqueo: 'Bloqueo',
};

export const PAGOS = {
  pendiente: 'Pendiente',
  sena: 'Con seña',
  pagado: 'Pagado',
};

// Suma por media hora para que un turno que cruza el inicio del horario pico se cobre bien.
export function calcularPrecio(modulo, fecha, inicio, duracion) {
  const { valle, pico, picoDesde, finDeSemanaPico } = modulo.tarifa;
  const [y, m, d] = fecha.split('-').map(Number);
  const dia = new Date(y, m - 1, d).getDay();
  const finde = finDeSemanaPico && (dia === 0 || dia === 6);
  let total = 0;
  for (let t = inicio; t < inicio + duracion; t += 30) {
    total += ((finde || t >= picoDesde ? pico : valle) / 60) * 30;
  }
  return Math.round(total);
}

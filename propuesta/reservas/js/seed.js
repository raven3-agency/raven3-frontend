// Reservas de ejemplo para la demo. Son deterministas por fecha y cancha, así que dos
// visitas el mismo día ven lo mismo. Nombres y teléfonos son inventados.

import { calcularPrecio } from './config.js';
import { addDays, parseISO, todayISO, uid } from './utils.js';

const NOMBRES = ['Lucía', 'Martín', 'Sofía', 'Nicolás', 'Camila', 'Tomás', 'Valentina', 'Joaquín', 'Julieta', 'Federico', 'Agustina', 'Santiago', 'Florencia', 'Matías', 'Carolina', 'Ignacio'];
const APELLIDOS = ['Ferreyra', 'Acosta', 'Ibarra', 'Quiroga', 'Sosa', 'Benítez', 'Molina', 'Vega', 'Luna', 'Rojas', 'Paz', 'Herrera'];

function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const elegir = (r, lista) => lista[Math.floor(r() * lista.length)];

function probabilidad(inicio, finde) {
  if (inicio >= 18 * 60) return 0.9;
  if (inicio >= 15 * 60) return finde ? 0.8 : 0.5;
  if (inicio >= 12 * 60) return finde ? 0.75 : 0.4;
  return finde ? 0.6 : 0.3;
}

export function generarReservas(tenant, modulo, desde, hasta) {
  const hoy = todayISO();
  const reservas = [];
  const otras = modulo.duraciones.filter((d) => d !== modulo.duracionDefault);
  // Los turnos de una hora arrancan en punto; los de 90 minutos se corren de a media hora.
  const salto = modulo.duracionDefault % 60 ? 30 : 60;

  for (let fecha = desde; fecha <= hasta; fecha = addDays(fecha, 1)) {
    const dia = parseISO(fecha).getDay();
    const finde = dia === 0 || dia === 6;

    for (const cancha of modulo.canchas) {
      const r = rng(`${fecha}:${cancha.id}`);
      const inicioAzar = r() < 0.5 ? 0 : 30;
      let t = tenant.horario.abre + (salto === 30 ? inicioAzar : 0);

      // Mantenimiento semanal, para mostrar un bloqueo.
      if (cancha.id === modulo.demoBloqueo?.cancha && dia === parseISO(hoy).getDay()) {
        reservas.push(base(modulo, cancha, fecha, tenant.horario.abre, 180, { tipo: 'bloqueo', cliente: '', telefono: '', notas: modulo.demoBloqueo.motivo, precio: 0, pago: 'pendiente', sena: 0 }));
        t = tenant.horario.abre + 180;
      }

      while (t + 60 <= tenant.horario.cierra) {
        const duracion = r() < 0.75 ? modulo.duracionDefault : r() < 0.6 ? otras[0] : otras[1];
        if (t + duracion > tenant.horario.cierra) break;

        if (r() < probabilidad(t, finde)) {
          const precio = calcularPrecio(modulo, fecha, t, duracion);
          const nombre = `${elegir(r, NOMBRES)} ${elegir(r, APELLIDOS)}`;
          const tipo = !finde && t === 19 * 60 + 30 ? 'fijo' : !finde && t < 11 * 60 && r() < 0.25 ? 'clase' : r() < 0.12 ? 'fijo' : 'reserva';
          const pasada = fecha < hoy;
          const pago = pasada ? 'pagado' : r() < 0.35 ? 'pagado' : r() < 0.6 ? 'sena' : 'pendiente';
          const sena = pago === 'sena' ? Math.round((precio * modulo.tarifa.senaPct) / 1000) * 1000 : 0;
          reservas.push(base(modulo, cancha, fecha, t, duracion, {
            tipo,
            cliente: nombre,
            telefono: `11 5555-${String(1000 + Math.floor(r() * 8999))}`,
            notas: '',
            precio,
            pago,
            sena,
          }));
          t += duracion;
        } else {
          t += salto;
        }
      }
    }
  }
  return reservas;
}

function base(modulo, cancha, fecha, inicio, duracion, resto) {
  return { id: uid(), modulo: modulo.id, cancha: cancha.id, fecha, inicio, duracion, estado: 'confirmada', ...resto };
}

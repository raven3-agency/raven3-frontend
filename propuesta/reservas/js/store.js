// Capa de datos. Hoy persiste en localStorage; es el único archivo que hay que reemplazar
// para pasar a una API. El resto de la app solo usa los métodos que devuelve createStore.

import { canchasIniciales, edificiosIniciales, layoutInicial } from './config.js';
import { addDays, todayISO, uid } from './utils.js';

const DIAS_PASADOS = 7;
const DIAS_FUTUROS = 14;

export function createStore(tenant, generar) {
  const key = `raven3.reservas.${tenant.id}.v1`;
  const listeners = new Set();
  let persistente = true;
  let data = cargar() ?? vacio();

  function vacio() {
    return { reservas: [], generado: {}, layout: layoutInicial(tenant), canchas: canchasIniciales(tenant), obras: [], edificios: edificiosIniciales(tenant) };
  }

  // Versiones anteriores guardaban una sola fecha, de cuando solo existía pádel.
  function migrar(d) {
    const { generadoHasta, ...resto } = d;
    return {
      ...resto,
      generado: d.generado ?? (generadoHasta ? { padel: generadoHasta } : {}),
      layout: d.layout ?? layoutInicial(tenant),
      canchas: d.canchas ?? canchasIniciales(tenant),
      obras: d.obras ?? [],
      edificios: d.edificios ?? edificiosIniciales(tenant),
    };
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(key);
      return raw ? migrar(JSON.parse(raw)) : null;
    } catch {
      persistente = false;
      return null;
    }
  }

  function guardar() {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      persistente = false;
    }
  }

  function emitir() {
    listeners.forEach((fn) => fn());
  }

  function commit() {
    guardar();
    emitir();
  }

  // Mantiene viva la demo: si alguien la abre semanas después, agrega los días que faltan.
  function completarDemo() {
    if (!tenant.demo) return;
    const hoy = todayISO();
    const hasta = addDays(hoy, DIAS_FUTUROS);
    const minimo = addDays(hoy, -DIAS_PASADOS);
    for (const modulo of tenant.modulos) {
      const hecho = data.generado[modulo.id];
      if (hecho && hecho >= hasta) continue;
      const previo = hecho ? addDays(hecho, 1) : null;
      const desde = previo && previo > minimo ? previo : minimo;
      const canchas = data.canchas[modulo.id].filter((c) => !c.baja);
      data.reservas.push(...generar({ ...modulo, canchas }, desde, hasta));
      data.generado[modulo.id] = hasta;
    }
    guardar();
  }

  completarDemo();

  // Sincroniza pestañas abiertas del mismo navegador.
  window.addEventListener('storage', (e) => {
    if (e.key !== key || !e.newValue) return;
    try {
      data = migrar(JSON.parse(e.newValue));
      emitir();
    } catch {
      /* Valor ajeno o corrupto: se ignora y sigue el estado en memoria. */
    }
  });

  const activas = (moduloId) => data.reservas.filter((r) => r.modulo === moduloId && r.estado !== 'cancelada');

  return {
    get persistente() {
      return persistente;
    },

    get layout() {
      return data.layout;
    },

    get canchas() {
      return data.canchas;
    },

    get obras() {
      return data.obras;
    },

    get edificios() {
      return data.edificios;
    },

    guardarLayout(layout) {
      data.layout = layout;
      commit();
    },

    // Cambia canchas, plano y reservas de una sola vez, para no dejar estados intermedios.
    guardarPlano({ canchas = data.canchas, obras = data.obras, edificios = data.edificios, layout, cancelar = [], reactivar = [] }) {
      data.canchas = canchas;
      data.obras = obras;
      data.edificios = edificios;
      data.layout = layout;
      const aCancelar = new Set(cancelar);
      const aReactivar = new Set(reactivar);
      for (const r of data.reservas) {
        if (aCancelar.has(r.id)) r.estado = 'cancelada';
        if (aReactivar.has(r.id)) r.estado = 'confirmada';
      }
      commit();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    todas: (moduloId) => data.reservas.filter((r) => r.modulo === moduloId),

    delDia: (moduloId, fecha) =>
      activas(moduloId)
        .filter((r) => r.fecha === fecha)
        .sort((a, b) => a.inicio - b.inicio),

    porId: (id) => data.reservas.find((r) => r.id === id),

    // Devuelve la reserva que pisa ese horario, o undefined si está libre.
    conflicto(moduloId, { cancha, fecha, inicio, duracion }, ignorarId) {
      return activas(moduloId).find(
        (r) =>
          r.id !== ignorarId &&
          r.cancha === cancha &&
          r.fecha === fecha &&
          r.inicio < inicio + duracion &&
          inicio < r.inicio + r.duracion,
      );
    },

    crear(reservas) {
      const nuevas = reservas.map((r) => ({ estado: 'confirmada', ...r, id: uid() }));
      data.reservas.push(...nuevas);
      commit();
      return nuevas;
    },

    actualizar(id, cambios) {
      const r = data.reservas.find((x) => x.id === id);
      if (!r) return;
      Object.assign(r, cambios);
      commit();
    },

    restablecer() {
      data = vacio();
      completarDemo();
      commit();
    },
  };
}

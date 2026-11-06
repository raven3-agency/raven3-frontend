// Interfaz del sistema: estado de pantalla, vistas y formulario de reservas.

import { TENANT, TIPOS, PAGOS, OBRAS, calcularPrecio, canchasIniciales, edificiosIniciales, layoutInicial } from './config.js';
import { createStore } from './store.js';
import { generarReservas } from './seed.js';
import { KITS } from './modules/index.js';
import { addDays, clamp, esc, fmtDateLong, fmtDateShort, fmtDuration, fmtMoney, fmtTime, normalize, nowMinutes, todayISO, uid } from './utils.js';

const $ = (sel) => document.querySelector(sel);

let modulo = TENANT.modulos[0];
const { abre, cierra } = TENANT.horario;
const PASO = TENANT.paso;
const FILA_PX = 26; // Alto de media hora en la agenda.
const MAX_FILAS = 200;

const store = createStore(TENANT, (m, desde, hasta) => generarReservas(TENANT, m, desde, hasta));

// Incluye las dadas de baja: sus reservas pasadas siguen en el historial.
const canchaPorId = (id) => store.canchas[modulo.id].find((c) => c.id === id);

const moduloDeCancha = (id) => TENANT.modulos.find((m) => store.canchas[m.id].some((c) => c.id === id));

// En el plano conviven todos los deportes, así que "Cancha 1" no alcanza para identificarlas.
let canchasPlano = [];

function refrescarCanchas() {
  canchasPlano = [];
  for (const m of TENANT.modulos) {
    m.canchas = store.canchas[m.id].filter((c) => !c.baja);
    for (const c of m.canchas) {
      const numero = c.nombre.replace(/^Cancha\s+/i, '');
      canchasPlano.push({ ...c, modulo: m.id, kit: m.kit, deporte: m.nombre, numero, etiqueta: `${m.nombre} ${numero}` });
    }
  }
}

refrescarCanchas();

const idsDelModulo = () => modulo.canchas.map((c) => c.id);

const estado = {
  vista: 'complejo',
  fecha: todayISO(),
  hora: abre,
  seguirAhora: true,
  cancha: null,
  editando: false,
  itemEditado: null,
};

const VISTAS = ['complejo', 'agenda', 'reservas'];
const MAX_DESHACER = 30;

let venue = null;
let layoutAplicado = store.layout;
let canchasAplicadas = store.canchas;
let obrasAplicadas = store.obras;
let edificiosAplicados = store.edificios;
const historialLayout = [];

// ---------- Cálculos ----------

const reservasDelDia = () => store.delDia(modulo.id, estado.fecha);

const finDe = (r) => r.inicio + r.duracion;

const horaDeHoy = () => clamp(nowMinutes(), abre, cierra - 1);

function estadoCancha(cancha, delDia, t) {
  const propias = delDia.filter((r) => r.cancha === cancha.id);
  const actual = propias.find((r) => r.inicio <= t && t < finDe(r));

  if (actual) {
    const bloqueo = actual.tipo === 'bloqueo';
    const hasta = `hasta ${fmtTime(finDe(actual))}`;
    return {
      nombre: cancha.nombre,
      status: bloqueo ? 'bloqueada' : 'ocupada',
      sub: `${bloqueo ? 'Bloqueada' : 'Ocupada'} ${hasta}`,
      textoLargo: bloqueo ? `bloqueada ${hasta}` : `ocupada por ${actual.cliente} ${hasta}`,
    };
  }

  const siguiente = propias.find((r) => r.inicio > t);
  const sub = siguiente ? `Libre hasta ${fmtTime(siguiente.inicio)}` : 'Libre hasta el cierre';
  return { nombre: cancha.nombre, status: 'libre', sub, textoLargo: sub.toLowerCase() };
}

function resumen(reservas, dias = 1) {
  const pagas = reservas.filter((r) => r.tipo !== 'bloqueo');
  const minutos = pagas.reduce((s, r) => s + r.duracion, 0);
  const capacidad = modulo.canchas.length * (cierra - abre) * dias;
  const total = pagas.reduce((s, r) => s + r.precio, 0);
  const cobrado = pagas.reduce((s, r) => s + (r.pago === 'pagado' ? r.precio : r.pago === 'sena' ? r.sena : 0), 0);
  return {
    cantidad: pagas.length,
    horas: minutos / 60,
    ocupacion: capacidad ? Math.round((minutos / capacidad) * 100) : 0,
    total,
    cobrado,
    porCobrar: total - cobrado,
  };
}

function huecosLibres(propias) {
  const huecos = [];
  let t = abre;
  for (const r of propias) {
    if (r.inicio > t) huecos.push({ inicio: t, fin: r.inicio });
    t = Math.max(t, finDe(r));
  }
  if (t < cierra) huecos.push({ inicio: t, fin: cierra });
  return huecos.filter((h) => h.fin - h.inicio >= Math.min(...modulo.duraciones));
}

// ---------- Vista: complejo ----------

function pintarTimeline(delDia) {
  const heat = $('#heat');
  const slots = [];
  for (let t = abre; t < cierra; t += PASO) {
    const ocupadas = new Set(delDia.filter((r) => r.tipo !== 'bloqueo' && r.inicio <= t && t < finDe(r)).map((r) => r.cancha)).size;
    slots.push(`<i style="--o:${(ocupadas / (modulo.canchas.length || 1)).toFixed(2)}"></i>`);
  }
  heat.innerHTML = slots.join('');

  $('#time-range').value = Math.floor(estado.hora / PASO) * PASO;
  $('#time-label').textContent = fmtTime(estado.hora);
  $('#time-date').textContent = fmtDateLong(estado.fecha);
  $('#time-now').hidden = estado.fecha === todayISO() && estado.seguirAhora;
}

// Otra pestaña, "Restablecer demo", deshacer o un alta de cancha cambian el plano.
function sincronizarPlano() {
  const sinCambios =
    store.layout === layoutAplicado && store.canchas === canchasAplicadas && store.obras === obrasAplicadas && store.edificios === edificiosAplicados;
  if (sinCambios) return;
  layoutAplicado = store.layout;
  canchasAplicadas = store.canchas;
  obrasAplicadas = store.obras;
  edificiosAplicados = store.edificios;
  refrescarCanchas();
  if (!canchasPlano.some((c) => c.id === estado.cancha)) estado.cancha = null;
  venue?.sincronizar(canchasPlano, store.obras, store.edificios, store.layout);
  if (estado.itemEditado && !venue?.datosItem(estado.itemEditado)) estado.itemEditado = null;
}

function pintarPlano() {
  if (!venue) return;
  const estados = {};
  for (const m of TENANT.modulos) {
    const delDia = store.delDia(m.id, estado.fecha);
    for (const c of canchasPlano.filter((x) => x.modulo === m.id)) {
      estados[c.id] = { ...estadoCancha(c, delDia, estado.hora), nombre: c.etiqueta };
    }
  }
  venue.setHora(estado.hora);
  venue.setEstados(estados);
  venue.setActivo(modulo.id);
  venue.setSeleccion(estado.cancha);
}

const kpi = (etiqueta, valor) => `<div class="kpi"><span>${esc(etiqueta)}</span><strong>${esc(valor)}</strong></div>`;

function filaTurno(r, conCancha) {
  const titulo = r.tipo === 'bloqueo' ? r.notas || 'Bloqueo' : r.cliente;
  const detalle = [conCancha ? canchaPorId(r.cancha)?.nombre : null, r.tipo === 'bloqueo' ? null : TIPOS[r.tipo], r.tipo === 'bloqueo' ? null : PAGOS[r.pago]]
    .filter(Boolean)
    .join(' · ');
  return `<button type="button" class="turno" data-open="${esc(r.id)}" data-tipo="${esc(r.tipo)}">
    <span class="turno-hora">${fmtTime(r.inicio)}<small>${fmtTime(finDe(r))}</small></span>
    <span class="turno-info"><strong>${esc(titulo)}</strong><small>${esc(detalle)}</small></span>
  </button>`;
}

function pintarPanelGeneral(delDia) {
  const rail = $('#rail');
  if (!modulo.canchas.length) {
    rail.innerHTML = `
      <h2>${esc(modulo.nombre)}</h2>
      <p class="empty">Todavía no hay canchas de ${esc(modulo.nombre)}.</p>
      <button type="button" class="btn btn-primary ed-ancho" data-editar-plano>Agregar desde Editar plano</button>
      ${pieDemo()}`;
    return;
  }
  const r = resumen(delDia);
  const proximos = delDia
    .filter((x) => finDe(x) > estado.hora && x.tipo !== 'bloqueo')
    .sort((a, b) => a.inicio - b.inicio)
    .slice(0, 6);
  const libres = modulo.canchas.filter((c) => estadoCancha(c, delDia, estado.hora).status === 'libre').length;

  rail.innerHTML = `
    <h2>Resumen del día</h2>
    <div class="kpis kpis-rail">
      ${kpi(`Libres a las ${fmtTime(estado.hora)}`, `${libres} de ${modulo.canchas.length}`)}
      ${kpi('Ocupación', `${r.ocupacion}%`)}
      ${kpi('Ingresos', fmtMoney(r.total))}
      ${kpi('Por cobrar', fmtMoney(r.porCobrar))}
    </div>
    <h3>Próximos turnos</h3>
    <div class="turnos">${proximos.map((x) => filaTurno(x, true)).join('') || '<p class="empty">No quedan turnos para este día.</p>'}</div>
    <p class="rail-hint">Tocá una cancha en el plano para ver su día.</p>
    ${pieDemo()}`;
}

function pintarPanelCancha(delDia) {
  const cancha = canchaPorId(estado.cancha);
  const propias = delDia.filter((r) => r.cancha === cancha.id);
  const e = estadoCancha(cancha, delDia, estado.hora);

  const items = [
    ...propias.map((r) => ({ t: r.inicio, html: filaTurno(r, false) })),
    ...huecosLibres(propias).map((h) => ({
      t: h.inicio,
      html: `<button type="button" class="turno turno-libre" data-new="${h.inicio}" data-max="${h.fin - h.inicio}">
        <span class="turno-hora">${fmtTime(h.inicio)}<small>${fmtTime(h.fin)}</small></span>
        <span class="turno-info"><strong>Libre</strong><small>${fmtDuration(h.fin - h.inicio)} · Reservar</small></span>
      </button>`,
    })),
  ].sort((a, b) => a.t - b.t);

  $('#rail').innerHTML = `
    <div class="rail-head">
      <div>
        <h2>${esc(cancha.nombre)}</h2>
        <p>${esc(cancha.tipo)}</p>
      </div>
      <button type="button" class="icon-btn" id="rail-close" aria-label="Volver al resumen del día">&#10005;</button>
    </div>
    <p class="status-line" data-status="${e.status}">A las ${fmtTime(estado.hora)}: ${esc(e.sub.toLowerCase())}</p>
    <div class="turnos">${items.map((i) => i.html).join('')}</div>
    ${pieDemo()}`;
}

function pieDemo() {
  if (!TENANT.demo) return '';
  const nota = store.persistente ? 'Demo: los datos se guardan solo en este navegador.' : 'Demo: este navegador no permite guardar, los cambios se pierden al recargar.';
  return `<p class="demo-note">${nota} <button type="button" class="link-btn" id="demo-reset">Restablecer demo</button></p>`;
}

function pintarComplejo() {
  const delDia = reservasDelDia();
  pintarTimeline(delDia);
  pintarPlano();
  if (estado.editando) return; // El panel de edición se actualiza por su cuenta.
  if (estado.cancha) pintarPanelCancha(delDia);
  else pintarPanelGeneral(delDia);
}

// ---------- Edición del plano ----------

const redondear = (v) => Number(v.toFixed(2));

// El panel muestra metros desde el borde del predio, que es como se mide en un plano real.
function valoresItem(id) {
  const it = venue.datosItem(id);
  const p = venue.getPredio();
  return { ...it, desdeOeste: redondear(it.x - p.x0), desdeNorte: redondear(it.z - p.z0), rot: redondear(it.rot) };
}

function camposCalle(it) {
  const { anchoMinimo, largoMinimo } = OBRAS.calle;
  return `<div class="form-grid ed-campos">
      <label class="field"><span>Largo (m)</span><input type="number" id="ed-obra-largo" min="${largoMinimo}" step="0.5" value="${redondear(it.largo)}" /></label>
      <label class="field"><span>Ancho (m)</span><input type="number" id="ed-obra-ancho" min="${anchoMinimo}" step="0.5" value="${redondear(it.ancho)}" /></label>
    </div>
    <p class="rail-hint">Arrastrá ↔ para alargarla.</p>`;
}

function camposEstacionamiento(it) {
  const { anchoPlaza, largoPlaza } = OBRAS.estacionamiento;
  return `<label class="field ed-campos"><span>Lugares para autos</span><input type="number" id="ed-obra-plazas" min="1" step="1" value="${Math.round(it.ancho / anchoPlaza)}" /></label>
    <p class="rail-hint">Cada lugar mide ${String(anchoPlaza).replace('.', ',')} × ${largoPlaza} m. Arrastrá ↔ para sumar o sacar.</p>`;
}

function pintarPanelEdicion() {
  const p = venue.getPredio();
  const it = estado.itemEditado ? valoresItem(estado.itemEditado) : null;
  const opcionesItems = opciones([['', 'Elegí un elemento'], ...venue.listaItems().map((i) => [i.id, i.nombre])], estado.itemEditado ?? '');
  const moduloCancha = it?.tipo === 'cancha' ? moduloDeCancha(it.id) : null;
  const cancha = moduloCancha && store.canchas[moduloCancha.id].find((c) => c.id === it.id);
  const aviso = cancha ? reservasDesdeHoy(moduloCancha, cancha.id).filter((r) => r.tipo !== 'bloqueo').length : 0;
  const obra = it && store.obras.find((o) => o.id === it.id);
  const edificio = it && store.edificios.find((e) => e.id === it.id);

  const moduloNuevo = TENANT.modulos.find((m) => m.id === estado.moduloNuevo) ?? modulo;

  $('#rail').innerHTML = `
    <div class="rail-head">
      <div>
        <h2>Editar plano</h2>
        <p>Los cambios se guardan solos.</p>
      </div>
    </div>
    <p class="rail-hint">Arrastrá una cancha o un edificio para moverlo, y los puntos del borde para estirar el predio.</p>

    <h3>Predio</h3>
    <div class="form-grid">
      <label class="field"><span>Ancho (m)</span><input type="number" id="ed-ancho" min="20" step="0.5" value="${redondear(p.x1 - p.x0)}" /></label>
      <label class="field"><span>Largo (m)</span><input type="number" id="ed-largo" min="20" step="0.5" value="${redondear(p.z1 - p.z0)}" /></label>
    </div>

    <h3>Agregar cancha</h3>
    <div class="form-grid">
      <label class="field"><span>Deporte</span><select id="ag-modulo">${opciones(TENANT.modulos.map((m) => [m.id, m.nombre]), moduloNuevo.id)}</select></label>
      <label class="field"><span>Tipo</span><select id="ag-tipo">${opciones(moduloNuevo.tiposCancha.map((t, i) => [i, t.tipo]), 0)}</select></label>
    </div>
    <button type="button" class="btn btn-ghost ed-ancho" id="ag-agregar">Agregar al plano</button>

    <h3>Calles, estacionamiento y edificios</h3>
    <div class="ed-obras">
      <button type="button" class="btn btn-ghost" data-obra="calle">Calle</button>
      <button type="button" class="btn btn-ghost" data-obra="estacionamiento">Estacionamiento</button>
      <button type="button" class="btn btn-ghost" data-obra="edificio">Edificio</button>
    </div>

    <h3>Elemento</h3>
    <label class="field"><span class="sr-only">Elemento a editar</span><select id="ed-item">${opcionesItems}</select></label>
    ${
      cancha || obra || edificio
        ? `<label class="field ed-campos"><span>Nombre</span><input type="text" id="ed-nombre" maxlength="30" value="${esc((cancha ?? obra ?? edificio).nombre)}" /></label>`
        : ''
    }
    ${obra?.tipo === 'calle' ? camposCalle(it) : ''}
    ${obra?.tipo === 'estacionamiento' ? camposEstacionamiento(it) : ''}
    ${
      it
        ? `<div class="form-grid ed-campos">
            <label class="field"><span>Desde el oeste (m)</span><input type="number" id="ed-x" step="0.5" value="${it.desdeOeste}" /></label>
            <label class="field"><span>Desde el norte (m)</span><input type="number" id="ed-z" step="0.5" value="${it.desdeNorte}" /></label>
            <label class="field"><span>Rotación (°)</span><input type="number" id="ed-rot" step="1" value="${it.rot}" /></label>
            <div class="field"><span>Girar 90°</span>
              <div class="ed-giros">
                <button type="button" class="btn btn-ghost" data-girar="-90" aria-label="Girar 90 grados a la izquierda">⟲</button>
                <button type="button" class="btn btn-ghost" data-girar="90" aria-label="Girar 90 grados a la derecha">⟳</button>
              </div>
            </div>
          </div>
          <p class="rail-hint">Con el teclado: flechas para mover, Q y E para rotar.</p>`
        : ''
    }
    ${
      cancha
        ? `<button type="button" class="btn btn-danger ed-ancho" id="ed-quitar" data-reservas="${aviso}">Quitar cancha</button>
           ${aviso ? `<p class="rail-hint">Tiene ${aviso} ${aviso === 1 ? 'reserva' : 'reservas'} desde hoy.</p>` : ''}`
        : ''
    }
    ${obra || edificio ? `<button type="button" class="btn btn-danger ed-ancho" id="ed-quitar-obra">Quitar</button>` : ''}

    <div class="ed-acciones">
      <button type="button" class="btn btn-ghost" id="ed-deshacer"${historialLayout.length ? '' : ' disabled'}>Deshacer</button>
      <button type="button" class="btn btn-ghost" id="ed-restablecer">Restablecer plano</button>
    </div>`;
}

// Actualiza los números sin regenerar el panel, para no perder el foco mientras se arrastra.
function refrescarValoresEdicion() {
  const p = venue.getPredio();
  const poner = (sel, v) => {
    const el = $(sel);
    if (el && el !== document.activeElement) el.value = v;
  };
  poner('#ed-ancho', redondear(p.x1 - p.x0));
  poner('#ed-largo', redondear(p.z1 - p.z0));
  if (estado.itemEditado) {
    const it = valoresItem(estado.itemEditado);
    poner('#ed-x', it.desdeOeste);
    poner('#ed-z', it.desdeNorte);
    poner('#ed-rot', it.rot);
    poner('#ed-obra-largo', redondear(it.largo));
    poner('#ed-obra-ancho', redondear(it.ancho));
    poner('#ed-obra-plazas', Math.round(it.ancho / OBRAS.estacionamiento.anchoPlaza));
  }
}

function elegirItemEdicion(id) {
  estado.itemEditado = id;
  pintarPanelEdicion();
}

function elegirItemSelect(id) {
  venue.seleccionarItem(id || null);
  elegirItemEdicion(id || null);
}

function alternarEdicion(activa) {
  if (activa === estado.editando || !venue) return;
  estado.editando = activa;
  estado.itemEditado = null;
  estado.cancha = null;
  venue.setSeleccion(null);
  venue.setEdicion(activa);
  $('#cam-editar').textContent = activa ? 'Listo' : 'Editar plano';
  $('#cam-editar').setAttribute('aria-pressed', String(activa));
  if (activa) pintarPanelEdicion();
  else pintarComplejo();
}

function recordarPlano(extra = {}) {
  historialLayout.push({ layout: store.layout, canchas: store.canchas, obras: store.obras, edificios: store.edificios, ...extra });
  if (historialLayout.length > MAX_DESHACER) historialLayout.shift();
}

function guardarLayout(layout) {
  recordarPlano();
  layoutAplicado = layout;
  store.guardarLayout(layout);
  if (estado.editando) {
    $('#ed-deshacer').disabled = false;
    refrescarValoresEdicion();
  }
}

const reservasDesdeHoy = (m, canchaId) => {
  const hoy = todayISO();
  return store.todas(m.id).filter((r) => r.cancha === canchaId && r.estado !== 'cancelada' && r.fecha >= hoy);
};

function deshacerLayout() {
  const previo = historialLayout[historialLayout.length - 1];
  if (!previo) return;

  // Deshacer un alta haría desaparecer la cancha: no puede pasar si ya le tomaron reservas.
  for (const m of TENANT.modulos) {
    for (const c of m.canchas) {
      const vuelve = previo.canchas[m.id].some((x) => x.id === c.id && !x.baja);
      if (!vuelve && reservasDesdeHoy(m, c.id).length) {
        avisar(`No se puede deshacer: ${c.nombre} de ${m.nombre} ya tiene reservas.`);
        return;
      }
    }
  }

  historialLayout.pop();
  store.guardarPlano(previo);
  pintarPanelEdicion();
}

function restablecerLayout() {
  const hoy = todayISO();
  const canchas = {};
  const cancelar = [];
  const iniciales = canchasIniciales(TENANT);

  // Las canchas agregadas se dan de baja: pueden tener reservas pasadas.
  for (const m of TENANT.modulos) {
    const agregadas = store.canchas[m.id].filter((c) => !iniciales[m.id].some((x) => x.id === c.id));
    for (const c of agregadas) cancelar.push(...reservasDesdeHoy(m, c.id).map((r) => r.id));
    canchas[m.id] = [...iniciales[m.id], ...agregadas.map((c) => ({ ...c, baja: c.baja ?? hoy }))];
  }

  const aviso = cancelar.length ? ` También se cancelan ${cancelar.length} reservas de las canchas agregadas.` : '';
  const obras = store.obras.length ? ' Se borran las calles y los estacionamientos.' : '';
  if (!confirm(`El plano y las canchas vuelven a la distribución inicial.${obras}${aviso}`)) return;

  recordarPlano({ reactivar: cancelar });
  estado.itemEditado = null;
  store.guardarPlano({ canchas, obras: [], edificios: edificiosIniciales(TENANT), layout: layoutInicial(TENANT), cancelar });
  pintarPanelEdicion();
}

function agregarEdificio() {
  const posicion = venue.lugarEdificio();
  if (!posicion) {
    avisar('No hay lugar libre en el predio. Estiralo o mové otros elementos.');
    return;
  }

  const numeros = store.edificios.map((e) => Number(e.nombre.match(/^Edificio (\d+)$/)?.[1] ?? 0));
  const edificio = { id: `edificio-${uid()}`, nombre: `Edificio ${Math.max(0, ...numeros) + 1}` };

  recordarPlano();
  const layout = venue.getLayout();
  layout.items[edificio.id] = posicion;
  store.guardarPlano({ edificios: [...store.edificios, edificio], layout });

  venue.seleccionarItem(edificio.id);
  elegirItemEdicion(edificio.id);
  $('#ed-nombre').select();
}

function agregarObra(tipo) {
  if (tipo === 'edificio') return agregarEdificio();
  const def = OBRAS[tipo];
  const medidas = tipo === 'calle' ? { ancho: def.ancho, largo: def.largo } : { ancho: def.plazas * def.anchoPlaza, largo: def.largoPlaza };
  const posicion = venue.lugarLibre(medidas.ancho, medidas.largo);
  if (!posicion) {
    avisar('No hay lugar libre en el predio. Estiralo o mové otros elementos.');
    return;
  }

  const numeros = store.obras.filter((o) => o.tipo === tipo).map((o) => Number(o.nombre.match(/(\d+)$/)?.[1] ?? 0));
  const obra = { id: `${tipo}-${uid()}`, tipo, nombre: `${def.nombre} ${Math.max(0, ...numeros) + 1}` };

  recordarPlano();
  const layout = venue.getLayout();
  layout.items[obra.id] = { ...posicion, ...medidas };
  store.guardarPlano({ obras: [...store.obras, obra], layout });

  venue.seleccionarItem(obra.id);
  elegirItemEdicion(obra.id);
}

function quitarObra() {
  const id = estado.itemEditado;
  recordarPlano();
  const layout = venue.getLayout();
  delete layout.items[id];
  estado.itemEditado = null;
  store.guardarPlano({ obras: store.obras.filter((o) => o.id !== id), edificios: store.edificios.filter((e) => e.id !== id), layout });
  pintarPanelEdicion();
}

function agregarCancha() {
  const m = TENANT.modulos.find((x) => x.id === $('#ag-modulo').value);
  const tipo = m.tiposCancha[Number($('#ag-tipo').value)];
  const posicion = venue.lugarPara(m.kit, m.canchas.map((c) => c.id));
  if (!posicion) {
    avisar('No hay lugar libre en el predio. Estiralo o mové otras canchas.');
    return;
  }

  const numeros = m.canchas.map((c) => Number(c.nombre.match(/(\d+)$/)?.[1] ?? 0));
  const cancha = { ...tipo, id: `${m.id}-${uid()}`, nombre: `Cancha ${Math.max(0, ...numeros) + 1}` };

  recordarPlano();
  const layout = venue.getLayout();
  layout.items[cancha.id] = posicion;
  store.guardarPlano({ canchas: { ...store.canchas, [m.id]: [...store.canchas[m.id], cancha] }, layout });

  estado.moduloNuevo = m.id;
  venue.seleccionarItem(cancha.id);
  elegirItemEdicion(cancha.id);
  avisar(`${m.nombre}: ${cancha.nombre} agregada. Arrastrala a su lugar.`);
}

function quitarCancha(boton) {
  const id = estado.itemEditado;
  const m = moduloDeCancha(id);
  const reservas = reservasDesdeHoy(m, id);
  const conClientes = Number(boton.dataset.reservas);
  if (!boton.dataset.confirmar) {
    boton.dataset.confirmar = '1';
    boton.textContent = conClientes ? `Quitar y cancelar ${conClientes} ${conClientes === 1 ? 'reserva' : 'reservas'}` : '¿Confirmás?';
    return;
  }

  const hoy = todayISO();
  const cancelar = reservas.map((r) => r.id);
  recordarPlano({ reactivar: cancelar });
  const canchas = { ...store.canchas, [m.id]: store.canchas[m.id].map((c) => (c.id === id ? { ...c, baja: hoy } : c)) };
  const { nombre } = store.canchas[m.id].find((c) => c.id === id);
  estado.itemEditado = null;
  store.guardarPlano({ canchas, layout: store.layout, cancelar });
  pintarPanelEdicion();
  avisar(`${nombre} de ${m.nombre} quitada.${conClientes ? ` Avisales a los clientes: se cancelaron ${conClientes} reservas.` : ''}`);
}

function renombrarElemento(valor) {
  const id = estado.itemEditado;
  const nombre = valor.trim();
  const renombrar = (lista) => lista.map((x) => (x.id === id ? { ...x, nombre } : x));
  if (store.obras.some((o) => o.id === id) || store.edificios.some((e) => e.id === id)) {
    if (nombre) {
      recordarPlano();
      store.guardarPlano({ obras: renombrar(store.obras), edificios: renombrar(store.edificios), layout: store.layout });
    }
    return pintarPanelEdicion();
  }
  const m = moduloDeCancha(id);
  const repetido = store.canchas[m.id].some((c) => c.id !== id && !c.baja && c.nombre === nombre);
  if (nombre && !repetido) {
    recordarPlano();
    const canchas = { ...store.canchas, [m.id]: store.canchas[m.id].map((c) => (c.id === id ? { ...c, nombre } : c)) };
    store.guardarPlano({ canchas, layout: store.layout });
  } else if (repetido) {
    avisar(`Ya hay una ${nombre} en ${m.nombre}.`);
  }
  pintarPanelEdicion();
}

function moverConTeclado(e) {
  if (!estado.editando || !estado.itemEditado) return;
  if (e.target.closest('input, select, textarea, dialog')) return;
  const paso = e.shiftKey ? 5 : 0.5;
  const it = venue.datosItem(estado.itemEditado);
  const cambios = {
    ArrowLeft: { x: it.x - paso },
    ArrowRight: { x: it.x + paso },
    ArrowUp: { z: it.z - paso },
    ArrowDown: { z: it.z + paso },
    q: { rot: it.rot - 5 },
    e: { rot: it.rot + 5 },
  }[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!cambios) return;
  e.preventDefault();
  venue.cambiarItem(it.id, cambios);
}

// ---------- Vista: agenda ----------

function pintarAgenda() {
  const delDia = reservasDelDia();
  // Una cancha quitada sigue apareciendo en los días anteriores a su baja.
  const columnasDia = store.canchas[modulo.id].filter((c) => !c.baja || estado.fecha < c.baja);
  const r = resumen(delDia);
  $('#agenda-title').textContent = fmtDateLong(estado.fecha);
  $('#agenda-sub').textContent = `${r.cantidad} turnos · ${r.ocupacion}% de ocupación · ${fmtMoney(r.total)}`;

  const filas = (cierra - abre) / PASO;
  const alto = filas * FILA_PX;

  let horas = '';
  for (let t = abre; t < cierra; t += 60) {
    horas += `<span style="top:${((t - abre) / PASO) * FILA_PX}px">${fmtTime(t)}</span>`;
  }

  const lineaAhora =
    estado.fecha === todayISO() && nowMinutes() >= abre
      ? `<div class="agenda-now" style="top:${((nowMinutes() - abre) / PASO) * FILA_PX}px" aria-hidden="true"></div>`
      : '';

  const columnas = columnasDia
    .map((c) => {
      let celdas = '';
      for (let t = abre; !c.baja && t < cierra; t += PASO) {
        celdas += `<button type="button" class="slot" data-cancha="${c.id}" data-t="${t}" aria-label="${esc(c.nombre)}, ${fmtTime(t)}, nueva reserva"></button>`;
      }
      const bloques = delDia
        .filter((x) => x.cancha === c.id)
        .map((x) => {
          const top = ((x.inicio - abre) / PASO) * FILA_PX;
          const h = (x.duracion / PASO) * FILA_PX;
          const titulo = x.tipo === 'bloqueo' ? x.notas || 'Bloqueo' : x.cliente;
          return `<button type="button" class="bloque" data-open="${esc(x.id)}" data-tipo="${esc(x.tipo)}" data-pago="${esc(x.pago)}" style="top:${top}px;height:${h - 2}px">
            <strong>${esc(titulo)}</strong>
            <small>${fmtTime(x.inicio)}–${fmtTime(finDe(x))}${x.tipo === 'bloqueo' ? '' : ` · ${esc(PAGOS[x.pago])}`}</small>
          </button>`;
        })
        .join('');
      return `<div class="agenda-col" style="height:${alto}px">${celdas}${bloques}${lineaAhora}</div>`;
    })
    .join('');

  const scroll = $('#agenda');
  if (!columnasDia.length) {
    scroll.innerHTML = `<p class="empty agenda-vacia">No hay canchas de ${esc(modulo.nombre)}. Agregalas desde Complejo, con Editar plano.</p>`;
    return;
  }
  const top = scroll.scrollTop;
  scroll.innerHTML = `
    <div class="agenda" style="--cols:${columnasDia.length}">
      <div class="agenda-corner"></div>
      ${columnasDia.map((c) => `<div class="agenda-head">${esc(c.nombre)}${c.baja ? ' (quitada)' : ''}</div>`).join('')}
      <div class="agenda-hours" style="height:${alto}px">${horas}</div>
      ${columnas}
    </div>`;
  scroll.scrollTop = top;
}

// ---------- Vista: reservas ----------

// El número de una cancha quitada se puede reutilizar, así que el historial las distingue.
function nombreEnHistorial(id) {
  const c = canchaPorId(id);
  return c?.baja ? `${c.nombre} (quitada)` : c?.nombre;
}

function pintarLista() {
  const f = new FormData($('#filters'));
  const q = normalize(f.get('q'));
  const rango = f.get('rango');
  const pago = f.get('pago');
  const canceladas = f.get('canceladas') === 'on';

  const desde = rango === 'semana' ? estado.fecha : null;
  const hasta = rango === 'semana' ? addDays(estado.fecha, 6) : null;

  const lista = store
    .todas(modulo.id)
    .filter((r) => {
      if (r.estado === 'cancelada' && !canceladas) return false;
      if (rango === 'dia' && r.fecha !== estado.fecha) return false;
      if (desde && (r.fecha < desde || r.fecha > hasta)) return false;
      if (pago && (r.pago !== pago || r.tipo === 'bloqueo')) return false;
      return !q || normalize(`${r.cliente} ${r.telefono} ${r.notas}`).includes(q);
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio);

  const activas = lista.filter((r) => r.estado !== 'cancelada');
  const dias = rango === 'dia' ? 1 : rango === 'semana' ? 7 : null;
  const r = resumen(activas, dias ?? 1);
  $('#list-kpis').innerHTML = [
    kpi('Turnos', r.cantidad),
    dias ? kpi('Ocupación', `${r.ocupacion}%`) : kpi('Horas', Math.round(r.horas)),
    kpi('Ingresos', fmtMoney(r.total)),
    kpi('Por cobrar', fmtMoney(r.porCobrar)),
  ].join('');

  if (!lista.length) {
    $('#list').innerHTML = '<p class="empty">No hay reservas con estos filtros.</p>';
    return;
  }

  const filas = lista
    .slice(0, MAX_FILAS)
    .map((x) => {
      const titulo = x.tipo === 'bloqueo' ? x.notas || 'Bloqueo' : x.cliente;
      const cancelada = x.estado === 'cancelada';
      const pagoTxt = cancelada ? 'Cancelada' : x.tipo === 'bloqueo' ? '—' : PAGOS[x.pago];
      return `<tr class="${cancelada ? 'is-cancelled' : ''}">
        <td data-label="Fecha">${fmtDateShort(x.fecha)}</td>
        <td data-label="Horario" class="mono">${fmtTime(x.inicio)}–${fmtTime(finDe(x))}</td>
        <td data-label="Cancha">${esc(nombreEnHistorial(x.cancha))}</td>
        <td data-label="Cliente"><button type="button" class="link-btn" data-open="${esc(x.id)}">${esc(titulo)}</button></td>
        <td data-label="Tipo">${esc(TIPOS[x.tipo])}</td>
        <td data-label="Pago"><span class="pago" data-pago="${cancelada ? 'cancelada' : esc(x.pago)}">${esc(pagoTxt)}</span></td>
        <td data-label="Precio" class="num">${x.tipo === 'bloqueo' ? '—' : fmtMoney(x.precio)}</td>
      </tr>`;
    })
    .join('');

  $('#list').innerHTML = `
    <table class="table">
      <thead><tr><th>Fecha</th><th>Horario</th><th>Cancha</th><th>Cliente</th><th>Tipo</th><th>Pago</th><th class="num">Precio</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    ${lista.length > MAX_FILAS ? `<p class="empty">Mostrando ${MAX_FILAS} de ${lista.length}. Usá los filtros para acotar.</p>` : ''}`;
}

// ---------- Refresco general ----------

function pintar() {
  sincronizarPlano();
  $('#date-input').value = estado.fecha;
  $('#date-today').disabled = estado.fecha === todayISO();
  const sinCanchas = !modulo.canchas.length;
  $('#new-booking').disabled = sinCanchas;
  $('#new-booking').title = sinCanchas ? `No hay canchas de ${modulo.nombre}` : '';
  document.querySelectorAll('[data-view]').forEach((b) => {
    if (b.dataset.view === estado.vista) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-modulo]').forEach((b) => {
    if (b.dataset.modulo === modulo.id) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });
  for (const v of VISTAS) $(`#view-${v}`).hidden = v !== estado.vista;

  if (estado.vista === 'complejo') pintarComplejo();
  else if (estado.vista === 'agenda') pintarAgenda();
  else pintarLista();
}

const actualizarHash = () => history.replaceState(null, '', `#${modulo.id}/${estado.vista}`);

function irAModulo(id, { encuadrar = true } = {}) {
  if (id === modulo.id) return;
  modulo = TENANT.modulos.find((m) => m.id === id);
  estado.cancha = null;
  actualizarHash();
  pintar();
  if (encuadrar && !estado.editando) venue?.encuadrar(idsDelModulo());
}

function irAVista(vista) {
  if (vista !== 'complejo') alternarEdicion(false);
  estado.vista = vista;
  actualizarHash();
  pintar();
  if (vista === 'agenda' && estado.fecha === todayISO()) {
    $('#agenda').scrollTop = Math.max(0, ((nowMinutes() - abre - 60) / PASO) * FILA_PX);
  }
}

function irAFecha(fecha) {
  if (!fecha) return;
  estado.fecha = fecha;
  estado.seguirAhora = fecha === todayISO();
  if (estado.seguirAhora) estado.hora = horaDeHoy();
  pintar();
}

function elegirCancha(id) {
  if (!id && !estado.cancha) return; // Clic en una zona vacía sin nada elegido.
  // Una cancha de otro deporte en el plano lleva a ese módulo.
  const delPlano = canchasPlano.find((c) => c.id === id);
  if (delPlano) irAModulo(delPlano.modulo, { encuadrar: false });
  estado.cancha = id;
  pintarComplejo();
  if (venue) {
    if (id) venue.enfocar(id);
    else venue.encuadrar(idsDelModulo());
  }
}

// ---------- Avisos ----------

let toastTimer = 0;
function avisar(mensaje, deshacer) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(mensaje)}</span>`;
  if (deshacer) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'link-btn';
    b.textContent = 'Deshacer';
    b.addEventListener('click', () => {
      deshacer();
      t.hidden = true;
    });
    t.appendChild(b);
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), deshacer ? 8000 : 4500);
}

// ---------- Formulario de reserva ----------

const dialog = $('#booking-dialog');
const form = $('#booking-form');
let edicionId = null;
let precioManual = false;

const opciones = (pares, seleccion) =>
  pares.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(seleccion) ? ' selected' : ''}>${esc(t)}</option>`).join('');

function valoresForm() {
  const f = form.elements;
  return {
    cancha: f.cancha.value,
    tipo: f.tipo.value,
    fecha: f.fecha.value,
    inicio: Number(f.inicio.value),
    duracion: Number(f.duracion.value),
  };
}

function cargarDuraciones(seleccion) {
  const inicio = Number(form.elements.inicio.value);
  const posibles = modulo.duraciones.filter((d) => inicio + d <= cierra);
  const elegida = posibles.includes(seleccion) ? seleccion : posibles[posibles.length - 1];
  form.elements.duracion.innerHTML = opciones(posibles.map((d) => [d, fmtDuration(d)]), elegida);
}

function actualizarForm() {
  const v = valoresForm();
  const f = form.elements;
  const bloqueo = v.tipo === 'bloqueo';

  form.querySelector('[data-hide="bloqueo"]').hidden = bloqueo;
  const repite = v.tipo === 'fijo' && !edicionId;
  form.querySelector('[data-only="fijo"]').hidden = !repite;
  f.duracion.closest('.field').classList.toggle('span-2', !repite);
  form.querySelector('[data-only="sena"]').hidden = f.pago.value !== 'sena';
  $('#notes-label').textContent = bloqueo ? 'Motivo del bloqueo' : 'Notas';

  const sugerido = v.fecha ? calcularPrecio(modulo, v.fecha, v.inicio, v.duracion) : 0;
  if (!precioManual) f.precio.value = sugerido;
  $('#price-hint').textContent = `Tarifa: ${fmtMoney(sugerido)}`;
  if (f.pago.value === 'sena' && !f.sena.value) {
    f.sena.value = Math.round((Number(f.precio.value) * modulo.tarifa.senaPct) / 1000) * 1000;
  }

  const choque = v.fecha ? store.conflicto(modulo.id, v, edicionId) : null;
  mostrarError(canchaSinServicio(v) || (choque ? mensajeChoque(choque) : ''));
}

// Una reserva vieja se puede corregir, pero no llevarla a una fecha en que la cancha ya no está.
function canchaSinServicio({ cancha, fecha }) {
  const c = canchaPorId(cancha);
  return c?.baja && fecha >= c.baja ? `${c.nombre} se quitó del club. Elegí otra cancha.` : '';
}

function mensajeChoque(r) {
  const quien = r.tipo === 'bloqueo' ? 'un bloqueo' : r.cliente;
  return `${canchaPorId(r.cancha).nombre} ya está tomada de ${fmtTime(r.inicio)} a ${fmtTime(finDe(r))} por ${quien}.`;
}

function mostrarError(texto) {
  const e = $('#booking-error');
  e.textContent = texto;
  e.hidden = !texto;
  $('#booking-save').disabled = !!texto;
}

// Sin cancha elegida propone la primera libre, para no abrir el formulario con un error.
function canchaSugerida(inicio, duracion) {
  const libre = modulo.canchas.find((c) => !store.conflicto(modulo.id, { cancha: c.id, fecha: estado.fecha, inicio, duracion }));
  return (libre ?? modulo.canchas[0]).id;
}

function abrirFormulario(datos = {}) {
  const r = datos.id ? store.porId(datos.id) : null;
  edicionId = r?.id ?? null;
  precioManual = !!r;

  const f = form.elements;
  const inicio = r?.inicio ?? clamp(datos.inicio ?? Math.ceil(estado.hora / PASO) * PASO, abre, cierra - Math.min(...modulo.duraciones));
  const duracion = r?.duracion ?? Math.min(modulo.duracionDefault, datos.max ?? Infinity);
  const v = {
    cancha: r?.cancha ?? datos.cancha ?? estado.cancha ?? canchaSugerida(inicio, duracion),
    tipo: r?.tipo ?? 'reserva',
    fecha: r?.fecha ?? estado.fecha,
    inicio,
    duracion,
  };

  // Una reserva vieja puede estar en una cancha quitada: si faltara, el select la movería sola.
  const elegibles = store.canchas[modulo.id].filter((c) => !c.baja || c.id === v.cancha);
  f.cancha.innerHTML = opciones(elegibles.map((c) => [c.id, c.baja ? `${c.nombre} (quitada)` : c.nombre]), v.cancha);
  f.tipo.innerHTML = opciones(Object.entries(TIPOS), v.tipo);
  f.pago.innerHTML = opciones(Object.entries(PAGOS), r?.pago ?? 'pendiente');
  f.fecha.value = v.fecha;

  const horas = [];
  for (let t = abre; t + Math.min(...modulo.duraciones) <= cierra; t += PASO) horas.push([t, fmtTime(t)]);
  f.inicio.innerHTML = opciones(horas, v.inicio);
  cargarDuraciones(v.duracion);

  f.cliente.value = r?.cliente ?? '';
  f.telefono.value = r?.telefono ?? '';
  f.notas.value = r?.notas ?? '';
  f.precio.value = r?.precio ?? '';
  f.sena.value = r?.pago === 'sena' ? r.sena : '';
  f.semanas.value = '8';

  const clientes = new Map();
  for (const x of store.todas(modulo.id)) if (x.cliente) clientes.set(x.cliente, x.telefono);
  $('#clientes').innerHTML = [...clientes.keys()].sort().map((n) => `<option value="${esc(n)}"></option>`).join('');

  $('#booking-title').textContent = r ? 'Editar reserva' : 'Nueva reserva';
  $('#booking-cancel').hidden = !r || r.estado === 'cancelada';
  $('#booking-cancel').textContent = 'Cancelar reserva';
  delete $('#booking-cancel').dataset.confirmar;

  actualizarForm();
  dialog.showModal();
  // En táctil no se enfoca: el teclado taparía el formulario apenas abre.
  if (!r && matchMedia('(pointer: fine)').matches) f.cliente.focus();
}

function guardarReserva(e) {
  e.preventDefault();
  const f = form.elements;
  const v = valoresForm();
  const bloqueo = v.tipo === 'bloqueo';

  if (!v.fecha) return mostrarError('Elegí una fecha.');
  const cliente = f.cliente.value.trim();
  if (!bloqueo && !cliente) {
    f.cliente.focus();
    return mostrarError('Falta el nombre del cliente.');
  }

  const fueraDeServicio = canchaSinServicio(v);
  if (fueraDeServicio) return mostrarError(fueraDeServicio);

  const choque = store.conflicto(modulo.id, v, edicionId);
  if (choque) return mostrarError(mensajeChoque(choque));

  const pago = bloqueo ? 'pendiente' : f.pago.value;
  const datos = {
    modulo: modulo.id,
    ...v,
    cliente: bloqueo ? '' : cliente,
    telefono: bloqueo ? '' : f.telefono.value.trim(),
    notas: f.notas.value.trim(),
    precio: bloqueo ? 0 : Math.max(0, Number(f.precio.value) || 0),
    pago,
    sena: pago === 'sena' ? Math.max(0, Number(f.sena.value) || 0) : 0,
  };

  if (edicionId) {
    const original = store.porId(edicionId);
    store.actualizar(edicionId, { ...datos, estado: 'confirmada' });
    dialog.close();
    avisar(original.estado === 'cancelada' ? 'Reserva reactivada.' : 'Cambios guardados.');
    return;
  }

  const semanas = v.tipo === 'fijo' ? Number(f.semanas.value) : 1;
  const crear = [];
  const salteadas = [];
  for (let i = 0; i < semanas; i++) {
    const fecha = addDays(v.fecha, i * 7);
    const turno = { ...datos, fecha };
    if (store.conflicto(modulo.id, turno)) salteadas.push(fmtDateShort(fecha));
    else crear.push(turno);
  }
  const creadas = store.crear(crear);
  dialog.close();

  const nombre = canchaPorId(v.cancha).nombre;
  const hora = fmtTime(v.inicio);
  const texto =
    semanas === 1
      ? `${bloqueo ? 'Bloqueo creado' : 'Reserva creada'}: ${nombre}, ${hora}.`
      : `Turno fijo creado: ${crear.length} de ${semanas} semanas.${salteadas.length ? ` Ocupadas: ${salteadas.join(', ')}.` : ''}`;
  avisar(texto, () => creadas.forEach((c) => store.actualizar(c.id, { estado: 'cancelada' })));
}

function cancelarReserva() {
  const b = $('#booking-cancel');
  if (!b.dataset.confirmar) {
    b.dataset.confirmar = '1';
    b.textContent = '¿Confirmás la cancelación?';
    return;
  }
  const id = edicionId;
  store.actualizar(id, { estado: 'cancelada' });
  dialog.close();
  avisar('Reserva cancelada.', () => {
    const r = store.porId(id);
    const choque = store.conflicto(modulo.id, r, id);
    if (choque) avisar(`No se pudo reactivar: ${mensajeChoque(choque)}`);
    else if (canchaSinServicio(r)) avisar(canchaSinServicio(r));
    else store.actualizar(id, { estado: 'confirmada' });
  });
}

// ---------- Eventos ----------

function iniciarEventos() {
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => irAVista(b.dataset.view)));

  $('#sports').addEventListener('click', (e) => {
    const b = e.target.closest('[data-modulo]');
    if (b) irAModulo(b.dataset.modulo);
  });

  $('#date-prev').addEventListener('click', () => irAFecha(addDays(estado.fecha, -1)));
  $('#date-next').addEventListener('click', () => irAFecha(addDays(estado.fecha, 1)));
  $('#date-today').addEventListener('click', () => irAFecha(todayISO()));
  $('#date-input').addEventListener('change', (e) => irAFecha(e.target.value));

  $('#new-booking').addEventListener('click', () => abrirFormulario());

  $('#time-range').addEventListener('input', (e) => {
    estado.hora = Number(e.target.value);
    estado.seguirAhora = false;
    pintarComplejo();
  });
  $('#time-now').addEventListener('click', () => {
    if (estado.fecha !== todayISO()) estado.fecha = todayISO();
    estado.seguirAhora = true;
    estado.hora = horaDeHoy();
    pintar();
  });

  $('#cam-general').addEventListener('click', () => venue?.vistaGeneral());
  $('#cam-planta').addEventListener('click', () => venue?.vistaPlanta());
  $('#cam-editar').addEventListener('click', () => alternarEdicion(!estado.editando));
  document.addEventListener('keydown', moverConTeclado);

  $('#rail').addEventListener('change', (e) => {
    if (!estado.editando) return;
    if (e.target.id === 'ag-modulo') {
      estado.moduloNuevo = e.target.value;
      return pintarPanelEdicion();
    }
    if (e.target.id === 'ag-tipo') return;
    if (e.target.id === 'ed-nombre') return renombrarElemento(e.target.value);
    const valor = Number(e.target.value);
    const id = estado.itemEditado;
    const p = venue.getPredio();
    if (e.target.id === 'ed-item') return elegirItemSelect(e.target.value);
    if (e.target.value === '' || Number.isNaN(valor)) return refrescarValoresEdicion();
    if (e.target.id === 'ed-ancho') venue.cambiarTamanoPredio({ ancho: valor });
    else if (e.target.id === 'ed-largo') venue.cambiarTamanoPredio({ largo: valor });
    else if (e.target.id === 'ed-x') venue.cambiarItem(id, { x: p.x0 + valor });
    else if (e.target.id === 'ed-z') venue.cambiarItem(id, { z: p.z0 + valor });
    else if (e.target.id === 'ed-rot') venue.cambiarItem(id, { rot: valor });
    else if (e.target.id === 'ed-obra-largo') venue.cambiarItem(id, { largo: Math.max(valor, OBRAS.calle.largoMinimo) });
    else if (e.target.id === 'ed-obra-ancho') venue.cambiarItem(id, { ancho: Math.max(valor, OBRAS.calle.anchoMinimo) });
    else if (e.target.id === 'ed-obra-plazas') venue.cambiarItem(id, { ancho: Math.max(1, Math.round(valor)) * OBRAS.estacionamiento.anchoPlaza });
    refrescarValoresEdicion();
  });

  // Delegado: el panel, la agenda y la lista se regeneran en cada refresco.
  document.addEventListener('click', (e) => {
    const abrir = e.target.closest('[data-open]');
    if (abrir) return abrirFormulario({ id: abrir.dataset.open });

    const nuevo = e.target.closest('[data-new]');
    if (nuevo) return abrirFormulario({ inicio: Number(nuevo.dataset.new), max: Number(nuevo.dataset.max) });

    const slot = e.target.closest('.slot');
    if (slot) return abrirFormulario({ cancha: slot.dataset.cancha, inicio: Number(slot.dataset.t) });

    if (e.target.closest('#rail-close')) return elegirCancha(null);

    const girar = e.target.closest('[data-girar]');
    if (girar) {
      const it = venue.datosItem(estado.itemEditado);
      return void venue.cambiarItem(it.id, { rot: it.rot + Number(girar.dataset.girar) });
    }
    if (e.target.closest('[data-editar-plano]')) return alternarEdicion(true);
    if (e.target.closest('#ag-agregar')) return agregarCancha();
    const obra = e.target.closest('[data-obra]');
    if (obra) return agregarObra(obra.dataset.obra);
    if (e.target.closest('#ed-quitar-obra')) return quitarObra();
    if (e.target.closest('#ed-quitar')) return quitarCancha(e.target.closest('#ed-quitar'));
    if (e.target.closest('#ed-deshacer')) return deshacerLayout();
    if (e.target.closest('#ed-restablecer')) return restablecerLayout();

    if (e.target.closest('#demo-reset') && confirm('Se borran los cambios y se vuelven a generar las reservas de ejemplo.')) {
      store.restablecer();
      avisar('Demo restablecida.');
    }
  });

  $('#filters').addEventListener('input', pintarLista);
  $('#filters').addEventListener('submit', (e) => e.preventDefault());

  form.addEventListener('submit', guardarReserva);
  form.addEventListener('change', (e) => {
    if (e.target.name === 'inicio') cargarDuraciones(Number(form.elements.duracion.value));
    if (e.target.name === 'cliente' && !form.elements.telefono.value) {
      const previo = store.todas(modulo.id).find((r) => r.cliente === e.target.value.trim());
      if (previo) form.elements.telefono.value = previo.telefono;
    }
    actualizarForm();
  });
  form.elements.precio.addEventListener('input', () => {
    precioManual = true;
  });
  $('#booking-close').addEventListener('click', () => dialog.close());
  $('#booking-cancel').addEventListener('click', cancelarReserva);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  store.subscribe(pintar);

  // Mantiene el plano en la hora real mientras nadie mueva el control.
  setInterval(() => {
    if (estado.seguirAhora && estado.fecha === todayISO()) {
      estado.hora = horaDeHoy();
      if (estado.vista === 'complejo') pintarComplejo();
    }
  }, 30000);
}

function iniciarEncabezado() {
  document.title = `Reservas | ${TENANT.name}`;
  $('#tenant-name').textContent = TENANT.name;

  $('#sports').innerHTML = TENANT.modulos.map((m) => `<button type="button" data-modulo="${esc(m.id)}">${esc(m.nombre)}</button>`).join('');

  const rango = $('#time-range');
  rango.min = abre;
  rango.max = cierra - PASO;
  rango.step = PASO;

  let marcas = '';
  for (let t = abre; t <= cierra; t += 240) marcas += `<span>${fmtTime(t)}</span>`;
  $('#time-scale').innerHTML = marcas;
}

function planoNoDisponible(err) {
  if (err) console.error('No se pudo iniciar el plano 3D', err);
  $('#venue-fallback').hidden = false;
  $('.venue-tools').hidden = true;
  $('.legend').hidden = true;
}

async function iniciarPlano() {
  try {
    const motor = await import('./engine3d.js');
    if (!motor.soportaWebGL()) return planoNoDisponible();
    venue = motor.createVenue($('#venue'), {
      canchas: canchasPlano,
      edificios: store.edificios,
      obras: store.obras,
      kits: KITS,
      layout: store.layout,
      onSelect: elegirCancha,
      onEditSelect: elegirItemEdicion,
      onEditCambio: refrescarValoresEdicion,
      onLayout: guardarLayout,
      onAviso: avisar,
    });
    venue.encuadrar(idsDelModulo());
    if (estado.vista === 'complejo') pintarComplejo();
  } catch (err) {
    planoNoDisponible(err);
  }
}

function iniciar() {
  // Acepta #futbol/agenda y también el formato anterior, #agenda.
  const partes = location.hash.slice(1).split('/');
  const vista = partes[partes.length - 1];
  modulo = (partes.length > 1 && TENANT.modulos.find((m) => m.id === partes[0])) || modulo;
  if (VISTAS.includes(vista)) estado.vista = vista;
  estado.hora = horaDeHoy();

  iniciarEncabezado();
  iniciarEventos();
  pintar();
  iniciarPlano();
}

iniciar();

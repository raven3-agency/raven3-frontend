/* ═══════════════════════════════════════════════════
   DATA — Status/priority/quality metadata & kanban config
   ═══════════════════════════════════════════════════ */

const Data = (() => {

  /* ── STATUS META ── */
  const STATUS_META = {
    nuevo:            { label: 'Nuevo',            cls: 'badge-nuevo',      color: '#4E9CFF' },
    investigar:       { label: 'Investigar',       cls: 'badge-investigar', color: '#6C5CE7' },
    sin_web:          { label: 'Sin web',           cls: 'badge-sin-web',    color: '#E05454' },
    web_mejorable:    { label: 'Web mejorable',    cls: 'badge-web-mejorable', color: '#F4C842' },
    contactado:       { label: 'Contactado',       cls: 'badge-contactado', color: '#00B9FF' },
    respondio:        { label: 'Respondió',        cls: 'badge-respondio',  color: '#00C896' },
    propuesta_enviada:{ label: 'Propuesta enviada',cls: 'badge-propuesta',  color: '#00E5C8' },
    ganado:           { label: 'Ganado',           cls: 'badge-ganado',     color: '#00C896' },
    perdido:          { label: 'Perdido',          cls: 'badge-perdido',    color: '#556670' },
  };

  const PRIORITY_META = {
    alta:  { label: 'Alta',  cls: 'badge priority-alta' },
    media: { label: 'Media', cls: 'badge priority-media' },
    baja:  { label: 'Baja',  cls: 'badge priority-baja' },
  };

  const WEB_QUALITY_META = {
    none:    { label: 'Sin web',   cls: 'badge-sin-web',        color: '#E05454' },
    poor:    { label: 'Deficiente',cls: 'badge-web-mejorable',  color: '#F4C842' },
    average: { label: 'Promedio',  cls: 'badge-contactado',     color: '#00B9FF' },
    good:    { label: 'Buena',     cls: 'badge-ganado',         color: '#00C896' },
  };

  /* ── KANBAN COLUMNS ── */
  const KANBAN_COLUMNS = [
    { id: 'nuevo',             label: 'Nuevo',             color: '#4E9CFF' },
    { id: 'investigar',        label: 'Investigar',        color: '#6C5CE7' },
    { id: 'sin_web',           label: 'Sin web',           color: '#E05454' },
    { id: 'web_mejorable',     label: 'Web mejorable',     color: '#F4C842' },
    { id: 'contactado',        label: 'Contactado',        color: '#00B9FF' },
    { id: 'respondio',         label: 'Respondió',         color: '#00C896' },
    { id: 'propuesta_enviada', label: 'Propuesta enviada', color: '#00E5C8' },
    { id: 'ganado',            label: 'Ganado',            color: '#00C896' },
    { id: 'perdido',           label: 'Perdido',           color: '#556670' },
  ];

  return {
    STATUS_META, PRIORITY_META, WEB_QUALITY_META,
    KANBAN_COLUMNS,
  };
})();

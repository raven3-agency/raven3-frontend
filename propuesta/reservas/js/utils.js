// Helpers de fecha, formato y escape. Las fechas se manejan como 'YYYY-MM-DD' en hora local
// (nunca toISOString, que en Argentina adelanta el día después de las 21:00) y las horas
// como minutos desde la medianoche.

const pad = (n) => String(n).padStart(2, '0');

const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISO(new Date());

export const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export const fmtTime = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

export const fmtDuration = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? (h ? `${h} h ${m} min` : `${m} min`) : `${h} h`;
};

const dateLong = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const dateShort = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const fmtDateLong = (iso) => {
  const s = dateLong.format(parseISO(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const fmtDateShort = (iso) => dateShort.format(parseISO(iso));
export const fmtMoney = (n) => money.format(n || 0);

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Compara sin tildes ni mayúsculas, para el buscador.
export const normalize = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

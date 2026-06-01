'use strict';

/**
 * Raven3 Web Monitor
 * Verifica DNS + HTTP de cada sitio cliente.
 * Envía email via Resend cuando un sitio cae o se recupera.
 * Cooldown de 4h para no spamear mientras el sitio sigue caído.
 */

const dns  = require('dns').promises;
const fs   = require('fs');
const path = require('path');

// ── CONFIG ────────────────────────────────────────────────────────────────────

const RESEND_API_KEY     = process.env.RESEND_API_KEY;
const RAVEN3_EMAIL       = process.env.RAVEN3_EMAIL || 'hola@raven3.com.ar';
const FROM_EMAIL         = 'Raven3 Monitor <monitor@raven3.com.ar>';
const ALERT_COOLDOWN_MS  = 4 * 60 * 60 * 1000;  // recordatorio cada 4hs si sigue caído
const STATE_FILE         = path.join(__dirname, '..', '..', '.monitor-state.json');

// Umbrales de alerta de vencimiento de dominio (días antes del vencimiento).
// Se envía una alerta por cada umbral cruzado, sin repeticiones.
const EXPIRY_THRESHOLDS  = [60, 30, 7];

// ── SITIOS ────────────────────────────────────────────────────────────────────
// Completá stakeholderEmail con el email del cliente de cada sitio.
// Si está vacío, solo se notifica a Raven3.

// domainExpiry: fecha de vencimiento del dominio en formato 'YYYY-MM-DD'.
// Completar con los datos del panel del registrar (NIC Argentina u otro).
// Dejar null si no se conoce la fecha.
const SITES = [
  { name: 'NDB Propiedades',         url: 'https://ndbpropiedades.com.ar',          category: 'Inmobiliaria', stakeholderEmail: '', domainExpiry: '2027-04-23' },
  { name: 'Art1',                    url: 'https://art1.com.ar',                    category: 'Arte',         stakeholderEmail: '', domainExpiry: '2026-04-29' },
  { name: 'Somos Grupos de Mujeres', url: 'https://somosgrupodemujeresmas.ar',       category: 'Comunidad',    stakeholderEmail: '', domainExpiry: null          },
  { name: 'CEA American',            url: 'https://cea-american.com.ar',            category: 'Educación',    stakeholderEmail: '', domainExpiry: null          },
  { name: 'OKOS',                    url: 'https://okos.com.ar',                    category: 'E-commerce',   stakeholderEmail: '', domainExpiry: null          },
  { name: 'Perniles Cochon',         url: 'https://pernilescochon.com.ar',          category: 'Gastronomía',  stakeholderEmail: '', domainExpiry: null          },
  { name: 'Ibarra Propiedades',      url: 'https://ibarraprop.com.ar',              category: 'Inmobiliaria', stakeholderEmail: '', domainExpiry: null          },
  { name: 'Etienne de Montebello',   url: 'https://etiennedemontebello.com',        category: 'Moda',         stakeholderEmail: '', domainExpiry: null          },
  { name: 'Lassen',                  url: 'https://lassen.ar',                      category: 'Empresa',      stakeholderEmail: '', domainExpiry: null          },
  { name: 'Beforce',                 url: 'https://beforce.ar',                     category: 'Fitness',      stakeholderEmail: '', domainExpiry: null          },
  { name: 'Knots4',                  url: 'https://knots4.mitiendanube.com',        category: 'E-commerce',   stakeholderEmail: '', domainExpiry: null          },
  // { name: 'Didot Estudio',        url: 'https://didot.com.ar',                   category: 'Diseño',       stakeholderEmail: '', domainExpiry: null          },
];

// ── DNS CHECK ─────────────────────────────────────────────────────────────────

async function checkDNS(hostname) {
  try {
    const addrs = await dns.resolve4(hostname);
    return addrs.length > 0;
  } catch {
    return false;
  }
}

// ── HTTP CHECK ────────────────────────────────────────────────────────────────

async function checkHTTP(url) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  const t0    = Date.now();
  try {
    const res = await fetch(url, {
      signal:   ctrl.signal,
      redirect: 'follow',
      headers:  { 'User-Agent': 'Raven3-Monitor/1.0' },
    });
    clearTimeout(timer);
    const ms   = Date.now() - t0;
    const ok   = res.status >= 200 && res.status < 400;
    return { ok, code: res.status, ms };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
    return { ok: false, code: null, ms: isTimeout ? 'timeout' : null };
  }
}

// ── SITE CHECK ────────────────────────────────────────────────────────────────

async function checkSite(site) {
  let hostname;
  try { hostname = new URL(site.url).hostname; }
  catch { return { status: 'dns', detail: 'URL inválida' }; }

  const dnsOk = await checkDNS(hostname);
  if (!dnsOk) return { status: 'dns', detail: 'DNS no resuelve' };

  const { ok, code, ms } = await checkHTTP(site.url);
  if (!ok) return { status: 'down', detail: `HTTP ${code ?? 'sin respuesta'}`, ms };
  return { status: 'up', detail: `HTTP ${code}`, ms };
}

// ── STATE ─────────────────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('  ⚠  RESEND_API_KEY no configurado — email omitido');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`  ✗ Email falló (${res.status}): ${txt}`);
    } else {
      console.log(`  ✉  Enviado a: ${to.join(', ')}`);
    }
  } catch (err) {
    console.error(`  ✗ Error al enviar email: ${err.message}`);
  }
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────

function arTime() {
  return new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function emailDown(site, result) {
  const statusLabel = result.status === 'dns' ? 'Error de DNS' : 'Sitio caído';
  return {
    subject: `🔴 ALERTA — ${site.name} no responde`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#0b0f17;color:#d7e8f5;border-radius:12px;overflow:hidden;border:1px solid rgba(239,68,68,0.2);">
  <div style="background:#111827;padding:20px 28px;border-bottom:1px solid rgba(0,229,200,0.12);">
    <span style="font-size:10px;letter-spacing:0.3em;color:#00e5c8;text-transform:uppercase;font-weight:700;">RAVEN3 · WEB MONITOR</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 6px;color:#ef4444;font-size:20px;">⚠ ${statusLabel} detectado</h2>
    <p style="color:#64748b;margin:0 0 24px;font-size:13px;">${arTime()}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;width:120px;">Sitio</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-weight:600;">${site.name}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;">Categoría</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${site.category}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;">URL</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><a href="${site.url}" style="color:#00e5c8;">${site.url}</a></td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;">Estado</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#ef4444;font-weight:600;">${statusLabel}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Detalle</td>
          <td style="padding:10px 0;font-family:monospace;font-size:12px;color:#94a3b8;">${result.detail}</td></tr>
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:rgba(239,68,68,0.07);border-radius:8px;border:1px solid rgba(239,68,68,0.18);font-size:13px;color:#fca5a5;line-height:1.5;">
      Revisá el panel de hosting, el estado del dominio o comunicate con el proveedor.
    </div>
  </div>
  <div style="padding:14px 28px;background:#111827;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#334155;">
    Raven3 Web Monitor · Checks automáticos cada 5 min · Se enviará recordatorio si sigue caído en 4hs
  </div>
</div>`,
  };
}

function emailRecovery(site, result) {
  return {
    subject: `✅ RECUPERADO — ${site.name} volvió a estar online`,
    html: `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#0b0f17;color:#d7e8f5;border-radius:12px;overflow:hidden;border:1px solid rgba(0,229,200,0.2);">
  <div style="background:#111827;padding:20px 28px;border-bottom:1px solid rgba(0,229,200,0.12);">
    <span style="font-size:10px;letter-spacing:0.3em;color:#00e5c8;text-transform:uppercase;font-weight:700;">RAVEN3 · WEB MONITOR</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 6px;color:#00e5c8;font-size:20px;">✅ Sitio recuperado</h2>
    <p style="color:#64748b;margin:0 0 24px;font-size:13px;">${arTime()}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;width:120px;">Sitio</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-weight:600;">${site.name}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;">URL</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><a href="${site.url}" style="color:#00e5c8;">${site.url}</a></td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;">Estado</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#00e5c8;font-weight:600;">Online ✓</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Tiempo resp.</td>
          <td style="padding:10px 0;font-family:monospace;font-size:13px;">${result.ms ? result.ms + ' ms' : '—'}</td></tr>
    </table>
  </div>
  <div style="padding:14px 28px;background:#111827;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#334155;">
    Raven3 Web Monitor · Checks automáticos cada 5 min
  </div>
</div>`,
  };
}

// ── DOMAIN EXPIRY ─────────────────────────────────────────────────────────────

function daysUntilExpiry(dateStr) {
  const expiry  = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

// Retorna el umbral que debe disparar alerta, o null si no corresponde.
// Se basa en el último umbral ya notificado (lastExpiryThreshold en state).
function pendingExpiryThreshold(daysLeft, lastThreshold) {
  if (daysLeft <= 0)  return lastThreshold === 'expired' ? null : 'expired';
  for (const t of EXPIRY_THRESHOLDS) {
    if (daysLeft <= t && (lastThreshold === null || lastThreshold > t)) return t;
  }
  return null;
}

function emailDomainExpiry(site, daysLeft) {
  const expired     = daysLeft <= 0;
  const accentColor = expired ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#eab308';
  const icon        = expired ? '💀' : daysLeft <= 7 ? '🔥' : '⚠️';
  const subject     = expired
    ? `${icon} DOMINIO VENCIDO — ${site.name} (${new URL(site.url).hostname})`
    : `${icon} Dominio por vencer — ${site.name} vence en ${daysLeft} días`;
  const bodyMsg = expired
    ? `El dominio <strong>${new URL(site.url).hostname}</strong> ya está <strong style="color:${accentColor}">vencido</strong>. Renovalo cuanto antes para evitar que el sitio deje de funcionar.`
    : `El dominio <strong>${new URL(site.url).hostname}</strong> vence en <strong style="color:${accentColor}">${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong> (${new Date(site.domainExpiry).toLocaleDateString('es-AR')}). Coordiná la renovación a tiempo.`;

  return {
    subject,
    html: `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#0b0f17;color:#d7e8f5;border-radius:12px;overflow:hidden;border:1px solid ${accentColor}33;">
  <div style="background:#111827;padding:20px 28px;border-bottom:1px solid rgba(0,229,200,0.12);">
    <span style="font-size:10px;letter-spacing:0.3em;color:#00e5c8;text-transform:uppercase;font-weight:700;">RAVEN3 · WEB MONITOR</span>
  </div>
  <div style="padding:28px;">
    <h2 style="margin:0 0 6px;color:${accentColor};font-size:20px;">${icon} ${expired ? 'Dominio vencido' : 'Dominio por vencer'}</h2>
    <p style="color:#64748b;margin:0 0 24px;font-size:13px;">${arTime()}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;width:130px;">Sitio</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-weight:600;">${site.name}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;">Dominio</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-family:monospace;font-size:13px;">${new URL(site.url).hostname}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#64748b;">Vencimiento</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${new Date(site.domainExpiry).toLocaleDateString('es-AR')}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Días restantes</td>
          <td style="padding:10px 0;color:${accentColor};font-weight:700;font-size:16px;">${expired ? 'VENCIDO' : daysLeft}</td></tr>
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:${accentColor}11;border-radius:8px;border:1px solid ${accentColor}30;font-size:13px;color:#fde68a;line-height:1.5;">
      ${bodyMsg}
    </div>
  </div>
  <div style="padding:14px 28px;background:#111827;border-top:1px solid rgba(255,255,255,0.05);font-size:11px;color:#334155;">
    Raven3 Web Monitor · Alertas de vencimiento: 60, 30 y 7 días antes
  </div>
</div>`,
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 Raven3 Web Monitor — ${new Date().toISOString()}`);
  console.log(`   Verificando ${SITES.length} sitios...\n`);

  const state    = loadState();
  const newState = {};

  await Promise.all(SITES.map(async (site) => {
    const hostname = new URL(site.url).hostname;
    const result   = await checkSite(site);

    const isDown  = result.status !== 'up';
    const prev    = state[hostname] || {};
    const wasDown = prev.status === 'down' || prev.status === 'dns';

    const ms   = typeof result.ms === 'number' ? ` (${result.ms}ms)` : result.ms ? ` (${result.ms})` : '';
    const icon = isDown ? '🔴' : '✅';
    console.log(`${icon} ${site.name.padEnd(26)} ${result.status}${ms}`);

    const now           = new Date().toISOString();
    const lastAlertAt   = prev.lastAlertAt ? new Date(prev.lastAlertAt).getTime() : 0;
    const cooldownDone  = (Date.now() - lastAlertAt) > ALERT_COOLDOWN_MS;

    let newLastAlertAt = prev.lastAlertAt || null;

    if (isDown && (!wasDown || cooldownDone)) {
      const { subject, html } = emailDown(site, result);
      const to = [RAVEN3_EMAIL, ...(site.stakeholderEmail ? [site.stakeholderEmail] : [])];
      await sendEmail({ to, subject, html });
      newLastAlertAt = now;
    } else if (!isDown && wasDown) {
      const { subject, html } = emailRecovery(site, result);
      const to = [RAVEN3_EMAIL, ...(site.stakeholderEmail ? [site.stakeholderEmail] : [])];
      await sendEmail({ to, subject, html });
      newLastAlertAt = null;
    }

    newState[hostname] = {
      status:       result.status,
      lastChecked:  now,
      lastAlertAt:  newLastAlertAt,
      downSince:    isDown ? (prev.downSince || now) : null,
    };
  }));

  saveState(newState);

  const downCount = Object.values(newState).filter(s => s.status !== 'up').length;
  console.log(`\n   ✅ ${SITES.length - downCount}/${SITES.length} online`);
  if (downCount > 0) console.log(`   🔴 ${downCount} con problemas\n`);
}

main().catch(err => { console.error(err); process.exit(1); });

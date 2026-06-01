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

// ── SITIOS ────────────────────────────────────────────────────────────────────
// Completá stakeholderEmail con el email del cliente de cada sitio.
// Si está vacío, solo se notifica a Raven3.

const SITES = [
  { name: 'NDB Propiedades',         url: 'https://ndbpropiedades.com.ar',                      category: 'Inmobiliaria', stakeholderEmail: '' },
  { name: 'Art1',                    url: 'https://art1.com.ar',                                 category: 'Arte',         stakeholderEmail: '' },
  { name: 'Somos Grupos de Mujeres', url: 'https://somosgrupodemujeresmas.ar',                   category: 'Comunidad',    stakeholderEmail: '' },
  { name: 'CEA American',            url: 'https://cea-american.com.ar',                         category: 'Educación',    stakeholderEmail: '' },
  { name: 'OKOS',                    url: 'https://okos.com.ar',                                 category: 'E-commerce',   stakeholderEmail: '' },
  { name: 'Perniles Cochon',         url: 'https://pernilescochon.com.ar',                       category: 'Gastronomía',  stakeholderEmail: '' },
  { name: 'Ibarra Propiedades',      url: 'https://ibarraprop.com.ar',                           category: 'Inmobiliaria', stakeholderEmail: '' },
  { name: 'Etienne de Montebello',   url: 'https://etiennedemontebello.com',                     category: 'Moda',         stakeholderEmail: '' },
  { name: 'Lassen',                  url: 'https://lassen.ar',                                   category: 'Empresa',      stakeholderEmail: '' },
  { name: 'Beforce',                 url: 'https://beforce.ar',                                  category: 'Fitness',      stakeholderEmail: '' },
  { name: 'Knots4',                  url: 'https://knots4.mitiendanube.com',                     category: 'E-commerce',   stakeholderEmail: '' },
  // { name: 'Didot Estudio',           url: 'https://didot.com.ar',                                category: 'Diseño',       stakeholderEmail: '' },
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

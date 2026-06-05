/* ═══════════════════════════════════════════════════
   STORAGE — localStorage CRUD
   ═══════════════════════════════════════════════════ */

const Storage = (() => {
  const K = {
    LEADS:     'r3lr_leads',
    TEMPLATES: 'r3lr_templates',
    SETTINGS:  'r3lr_settings',
    ACTIVITY:  'r3lr_activity',
    SEEDED:    'r3lr_seeded',
  };

  /* ── LEADS ── */
  const getLeads = () => {
    try { return JSON.parse(localStorage.getItem(K.LEADS) || '[]'); }
    catch { return []; }
  };
  const saveLeads = (leads) => localStorage.setItem(K.LEADS, JSON.stringify(leads));

  const getLead = (id) => getLeads().find(l => l.id === id) || null;

  const upsertLead = (lead) => {
    const leads = getLeads();
    const idx = leads.findIndex(l => l.id === lead.id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      leads[idx] = { ...lead, updatedAt: now };
    } else {
      leads.push({ ...lead, createdAt: lead.createdAt || now, updatedAt: now });
    }
    saveLeads(leads);
    return idx >= 0 ? leads[idx] : leads[leads.length - 1];
  };

  const deleteLead = (id) => {
    saveLeads(getLeads().filter(l => l.id !== id));
  };

  const deleteLeads = (ids) => {
    const set = new Set(ids);
    saveLeads(getLeads().filter(l => !set.has(l.id)));
  };

  const leadExists = (id) => getLeads().some(l => l.id === id);

  /* ── TEMPLATES ── */
  const getTemplates = () => {
    try { return JSON.parse(localStorage.getItem(K.TEMPLATES) || 'null'); }
    catch { return null; }
  };
  const saveTemplates = (tpls) => localStorage.setItem(K.TEMPLATES, JSON.stringify(tpls));

  /* ── SETTINGS ── */
  const DEFAULTS = { backendUrl: 'https://weathered-tree-bfc3.inforaven3.workers.dev' };

  const getSettings = () => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(K.SETTINGS) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  };
  const saveSettings = (s) => localStorage.setItem(K.SETTINGS, JSON.stringify(s));
  const mergeSetting = (key, val) => {
    const s = getSettings();
    saveSettings({ ...s, [key]: val });
  };

  /* ── ACTIVITY ── */
  const getActivity = () => {
    try { return JSON.parse(localStorage.getItem(K.ACTIVITY) || '[]'); }
    catch { return []; }
  };
  const addActivity = (entry) => {
    const log = getActivity();
    log.unshift({ ...entry, ts: new Date().toISOString() });
    if (log.length > 60) log.length = 60;
    localStorage.setItem(K.ACTIVITY, JSON.stringify(log));
  };

  /* ── SEEDING ── */
  const isSeeded = () => !!localStorage.getItem(K.SEEDED);
  const markSeeded = () => localStorage.setItem(K.SEEDED, '1');

  /* ── RESET ── */
  const clearAll = () => Object.values(K).forEach(k => localStorage.removeItem(k));

  return {
    getLeads, saveLeads, getLead, upsertLead, deleteLead, deleteLeads, leadExists,
    getTemplates, saveTemplates,
    getSettings, saveSettings, mergeSetting,
    getActivity, addActivity,
    isSeeded, markSeeded,
    clearAll,
  };
})();

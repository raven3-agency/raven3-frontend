/* ═══════════════════════════════════════════════════
   STORAGE — In-memory cache with Supabase persistence
   Falls back to localStorage when Supabase is not configured.
   ═══════════════════════════════════════════════════ */

const Storage = (() => {

  /* ── In-memory state ── */
  let _leads     = [];
  let _templates = null;
  let _settings  = {};
  let _activity  = [];
  let _seeded    = false;
  let _sb        = null;   // Supabase client instance
  let _connected = false;

  const DEFAULTS = { backendUrl: 'https://weathered-tree-bfc3.inforaven3.workers.dev' };

  /* ── localStorage keys ── */
  const K = {
    LEADS:     'r3lr_leads',
    TEMPLATES: 'r3lr_templates',
    SETTINGS:  'r3lr_settings',
    ACTIVITY:  'r3lr_activity',
    SEEDED:    'r3lr_seeded',
    SB_URL:    'r3lr_sb_url',
    SB_KEY:    'r3lr_sb_key',
  };

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
  const init = async () => {
    const sbUrl = localStorage.getItem(K.SB_URL);
    const sbKey = localStorage.getItem(K.SB_KEY);

    if (sbUrl && sbKey && window.supabase) {
      try {
        _sb = window.supabase.createClient(sbUrl, sbKey);
        await _loadFromSupabase();
        _connected = true;
        return true;
      } catch (err) {
        console.warn('[Storage] Supabase init failed, falling back to localStorage:', err.message);
        _sb = null;
        _connected = false;
      }
    }

    _loadFromLocalStorage();
    return false;
  };

  /* ── Load all data from Supabase into memory ── */
  const _loadFromSupabase = async () => {
    const [leadsRes, configRes, activityRes] = await Promise.all([
      _sb.from('leads').select('data, created_at').order('created_at', { ascending: true }),
      _sb.from('app_config').select('key, value'),
      _sb.from('activity').select('id, msg, color, ts').order('ts', { ascending: false }).limit(60),
    ]);

    if (leadsRes.error) throw leadsRes.error;

    _leads = (leadsRes.data || []).map(r => r.data);

    const cfg = {};
    (configRes.data || []).forEach(r => { cfg[r.key] = r.value; });
    _settings = { ...DEFAULTS, ...(cfg.settings || {}) };
    _templates = cfg.templates || null;
    _seeded    = !!cfg.seeded;

    _activity = (activityRes.data || []).map(r => ({
      msg:   r.msg   || '',
      color: r.color || '',
      ts:    r.ts,
    }));
  };

  /* ── Load all data from localStorage into memory ── */
  const _loadFromLocalStorage = () => {
    try { _leads     = JSON.parse(localStorage.getItem(K.LEADS)     || '[]');   } catch { _leads     = []; }
    try { _templates = JSON.parse(localStorage.getItem(K.TEMPLATES) || 'null'); } catch { _templates = null; }
    try { _settings  = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(K.SETTINGS) || '{}') }; } catch { _settings = { ...DEFAULTS }; }
    try { _activity  = JSON.parse(localStorage.getItem(K.ACTIVITY)  || '[]');   } catch { _activity  = []; }
    _seeded = !!localStorage.getItem(K.SEEDED);
  };

  /* ── Persist to the active backend ── */
  const _persistLeads = () => {
    if (!_sb) localStorage.setItem(K.LEADS, JSON.stringify(_leads));
  };

  /* ═══════════════════════════════════
     LEADS
  ═══════════════════════════════════ */
  const getLeads  = ()   => _leads;
  const getLead   = (id) => _leads.find(l => l.id === id) || null;
  const leadExists = (id) => _leads.some(l => l.id === id);

  const upsertLead = (lead) => {
    const now = new Date().toISOString();
    const idx = _leads.findIndex(l => l.id === lead.id);
    const updated = idx >= 0
      ? { ...lead, updatedAt: now }
      : { ...lead, createdAt: lead.createdAt || now, updatedAt: now };

    if (idx >= 0) _leads[idx] = updated; else _leads.push(updated);

    if (_sb) {
      _sb.from('leads')
        .upsert({ id: updated.id, data: updated, updated_at: now })
        .then(({ error }) => { if (error) console.error('[Storage] upsertLead:', error.message); });
    } else {
      _persistLeads();
    }

    return updated;
  };

  /* saveLeads: replace entire array (used by internal callers) */
  const saveLeads = (leads) => {
    _leads = leads;
    _persistLeads();
  };

  const deleteLead = (id) => {
    _leads = _leads.filter(l => l.id !== id);
    if (_sb) {
      _sb.from('leads').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('[Storage] deleteLead:', error.message); });
    } else {
      _persistLeads();
    }
  };

  const deleteLeads = (ids) => {
    const set = new Set(ids);
    _leads = _leads.filter(l => !set.has(l.id));
    if (_sb) {
      _sb.from('leads').delete().in('id', [...ids])
        .then(({ error }) => { if (error) console.error('[Storage] deleteLeads:', error.message); });
    } else {
      _persistLeads();
    }
  };

  /* ═══════════════════════════════════
     TEMPLATES
  ═══════════════════════════════════ */
  const getTemplates = () => _templates;

  const saveTemplates = (tpls) => {
    _templates = tpls;
    if (_sb) {
      _sb.from('app_config').upsert({ key: 'templates', value: tpls })
        .then(({ error }) => { if (error) console.error('[Storage] saveTemplates:', error.message); });
    } else {
      localStorage.setItem(K.TEMPLATES, JSON.stringify(tpls));
    }
  };

  /* ═══════════════════════════════════
     SETTINGS
  ═══════════════════════════════════ */
  const getSettings = () => ({ ...DEFAULTS, ..._settings });

  const saveSettings = (s) => {
    _settings = s;
    if (_sb) {
      _sb.from('app_config').upsert({ key: 'settings', value: s })
        .then(({ error }) => { if (error) console.error('[Storage] saveSettings:', error.message); });
    } else {
      localStorage.setItem(K.SETTINGS, JSON.stringify(s));
    }
  };

  const mergeSetting = (key, val) => saveSettings({ ..._settings, [key]: val });

  /* ═══════════════════════════════════
     ACTIVITY
  ═══════════════════════════════════ */
  const getActivity = () => _activity;

  const addActivity = (entry) => {
    const act = { ...entry, ts: new Date().toISOString() };
    _activity.unshift(act);
    if (_activity.length > 60) _activity.length = 60;

    if (_sb) {
      _sb.from('activity').insert({ msg: entry.msg || '', color: entry.color || '', ts: act.ts })
        .then(({ error }) => { if (error) console.error('[Storage] addActivity:', error.message); });
    } else {
      localStorage.setItem(K.ACTIVITY, JSON.stringify(_activity));
    }
  };

  /* ═══════════════════════════════════
     SEEDING
  ═══════════════════════════════════ */
  const isSeeded  = () => _seeded;
  const markSeeded = () => {
    _seeded = true;
    if (_sb) {
      _sb.from('app_config').upsert({ key: 'seeded', value: true })
        .then(({ error }) => { if (error) console.error('[Storage] markSeeded:', error.message); });
    } else {
      localStorage.setItem(K.SEEDED, '1');
    }
  };

  /* ═══════════════════════════════════
     SUPABASE CONFIGURATION
  ═══════════════════════════════════ */
  const getSupabaseConfig = () => ({
    url: localStorage.getItem(K.SB_URL) || '',
    key: localStorage.getItem(K.SB_KEY) || '',
  });

  /* Test connection, then save credentials */
  const connectSupabase = async (url, key) => {
    if (!window.supabase) throw new Error('Supabase SDK no disponible');
    const client = window.supabase.createClient(url, key);

    const { error } = await client.from('leads').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || (error.message || '').includes('does not exist')) {
        throw new Error('Tablas no encontradas. Ejecutá el SQL de setup en tu proyecto de Supabase primero.');
      }
      throw new Error(error.message || 'Error de conexión');
    }

    localStorage.setItem(K.SB_URL, url);
    localStorage.setItem(K.SB_KEY, key);
    _sb        = client;
    _connected = true;
    return true;
  };

  const isConnected = () => _connected;

  /* ── Migrate existing localStorage data → Supabase ── */
  const migrateFromLocalStorage = async () => {
    if (!_sb) throw new Error('Supabase no conectado');

    const lsLeads     = (() => { try { return JSON.parse(localStorage.getItem(K.LEADS)     || '[]');   } catch { return []; }   })();
    const lsTemplates = (() => { try { return JSON.parse(localStorage.getItem(K.TEMPLATES) || 'null'); } catch { return null; } })();
    const lsSettings  = (() => { try { return JSON.parse(localStorage.getItem(K.SETTINGS)  || '{}');   } catch { return {};   } })();

    const ops = [];

    if (lsLeads.length) {
      const rows = lsLeads.map(l => ({
        id:         l.id,
        data:       l,
        created_at: l.createdAt  || new Date().toISOString(),
        updated_at: l.updatedAt  || new Date().toISOString(),
      }));
      ops.push(_sb.from('leads').upsert(rows));
    }

    if (lsTemplates) {
      ops.push(_sb.from('app_config').upsert({ key: 'templates', value: lsTemplates }));
    }
    ops.push(_sb.from('app_config').upsert({ key: 'settings', value: { ...DEFAULTS, ...lsSettings } }));
    ops.push(_sb.from('app_config').upsert({ key: 'seeded', value: true }));

    const results = await Promise.all(ops);
    const firstError = results.find(r => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    // Update in-memory cache
    if (lsLeads.length)  _leads     = lsLeads;
    if (lsTemplates)     _templates = lsTemplates;
    _settings = { ...DEFAULTS, ...lsSettings };
    _seeded   = true;

    return lsLeads.length;
  };

  /* ═══════════════════════════════════
     RESET
  ═══════════════════════════════════ */
  const clearAll = async () => {
    _leads     = [];
    _templates = null;
    _settings  = { ...DEFAULTS };
    _activity  = [];
    _seeded    = false;

    if (_sb) {
      await Promise.all([
        _sb.from('leads').delete().neq('id', ''),
        _sb.from('activity').delete().gt('id', 0),
        _sb.from('app_config').delete().neq('key', ''),
      ]);
    }

    /* Always clear localStorage data (keep Supabase creds) */
    [K.LEADS, K.TEMPLATES, K.SETTINGS, K.ACTIVITY, K.SEEDED]
      .forEach(k => localStorage.removeItem(k));
  };

  /* ── Public API ── */
  return {
    init,
    getLeads, saveLeads, getLead, upsertLead, deleteLead, deleteLeads, leadExists,
    getTemplates, saveTemplates,
    getSettings, saveSettings, mergeSetting,
    getActivity, addActivity,
    isSeeded, markSeeded,
    getSupabaseConfig, connectSupabase, isConnected,
    migrateFromLocalStorage,
    clearAll,
  };
})();

/* ═══════════════════════════════════════════════════
   APP — Main controller, navigation, event wiring
   ═══════════════════════════════════════════════════ */

const App = (() => {

  /* ── STATE ── */
  let currentSection = 'dashboard';
  let searchResults  = [];
  let tableFilters   = { text: '', status: '', priority: '', website: '', sort: 'opportunityScore_desc' };

  /* ═══════════════════════════════════════
     INIT
  ═══════════════════════════════════════ */
  const init = async () => {
    /* Show loading state before Supabase resolves */
    const statusEl    = document.querySelector('.topbar-status');
    const statusLabel = document.querySelector('.topbar-status .status-label');
    if (statusEl)    statusEl.classList.add('loading');
    if (statusLabel) statusLabel.textContent = 'Conectando...';

    Proposals.load();
    const connected = await Storage.init();

    if (statusEl)    statusEl.classList.remove('loading');
    if (statusLabel) statusLabel.textContent = connected ? 'Supabase' : 'LocalDB';
    if (statusEl)    statusEl.classList.toggle('supabase', connected);

    /* Update sidebar with logged-in user */
    const user = Auth.getUser();
    if (user) {
      const avatarEl = document.getElementById('sidebarAvatar');
      const nameEl   = document.getElementById('sidebarUserName');
      if (avatarEl) avatarEl.textContent = Auth.getAvatarLetter(user);
      if (nameEl)   nameEl.textContent   = Auth.getDisplayName(user);
    }

    /* Hide settings nav for non-admin users */
    if (!Auth.isAdmin()) {
      const settingsNav = document.querySelector('.nav-item[data-section="settings"]');
      if (settingsNav) settingsNav.style.display = 'none';
    }

    /* Logout button */
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      await Auth.signOut();
    });

    setupNav();
    setupTopbarActions();
    setupDrawer();
    setupModal();
    setupSearch();
    setupTableFilters();
    setupMobile();
    navigate('dashboard');
    UI.updateNavBadge();
  };

  /* ═══════════════════════════════════════
     NAVIGATION
  ═══════════════════════════════════════ */
  const navigate = (section) => {
    if (section === 'settings' && !Auth.isAdmin()) section = 'dashboard';
    currentSection = section;

    // Section visibility
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById(`sec-${section}`);
    if (sec) sec.classList.add('active');

    // Nav active state
    document.querySelectorAll('.nav-item').forEach(a => {
      a.classList.toggle('active', a.dataset.section === section);
    });

    // Topbar title
    const titles = {
      dashboard: 'Dashboard', search: 'Buscar Leads', leads: 'Leads',
      kanban: 'Pipeline', templates: 'Templates', settings: 'Configuración',
    };
    document.getElementById('topbarTitle').textContent = titles[section] || section;

    // Render section content
    switch (section) {
      case 'dashboard': UI.renderDashboard(); break;
      case 'leads':     renderLeads(); break;
      case 'kanban':    UI.renderKanban(); break;
      case 'templates': UI.renderTemplates(); break;
      case 'settings':  UI.renderSettings(); break;
    }

    // Close mobile sidebar
    closeMobileSidebar();
  };

  const setupNav = () => {
    document.querySelectorAll('.nav-item[data-section]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(a.dataset.section);
      });
    });
  };

  /* ═══════════════════════════════════════
     TOPBAR ACTIONS
  ═══════════════════════════════════════ */
  const setupTopbarActions = () => {
    document.getElementById('btnAddLead')?.addEventListener('click', () => UI.openAddModal());
    document.getElementById('btnExport')?.addEventListener('click', exportCSV);
    document.getElementById('btnSaveTemplates')?.addEventListener('click', UI.saveTemplates);
    document.getElementById('btnBulkDelete')?.addEventListener('click', bulkDelete);
    setupThemeToggle();
  };

  const setupThemeToggle = () => {
    const btn = document.getElementById('btnThemeToggle');
    if (!btn) return;

    const applyTheme = (light) => {
      document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
      localStorage.setItem('lr-theme', light ? 'light' : 'dark');
    };

    applyTheme(localStorage.getItem('lr-theme') === 'light');

    btn.addEventListener('click', () => {
      applyTheme(document.documentElement.getAttribute('data-theme') !== 'light');
    });
  };

  /* ═══════════════════════════════════════
     SEARCH
  ═══════════════════════════════════════ */
  const setupSearch = () => {
    document.getElementById('btnSearch')?.addEventListener('click', runSearch);
  };

  const runSearch = async () => {
    const category = document.getElementById('searchCategory').value;
    const zone     = document.getElementById('searchZone').value.trim();
    const radius   = parseInt(document.getElementById('searchRadius').value);
    const limit    = parseInt(document.getElementById('searchLimit').value);
    const filter   = document.querySelector('input[name="searchFilter"]:checked')?.value || 'all';

    if (!category) { UI.toast('Seleccioná un rubro primero', 'warning'); return; }
    if (!zone)     { UI.toast('Ingresá una zona o ciudad', 'warning'); return; }

    UI.renderSearchLoading();

    const settings   = Storage.getSettings();
    const useRealApi = !!settings.backendUrl;

    if (useRealApi) {
      try {
        const res = await fetch(settings.backendUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ category, zone, radius: radius * 1000, limit }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        let results = (data.leads || []).map(l => Scoring.enrich(l));
        if (filter !== 'all') {
          results = results.filter(l => {
            if (filter === 'no_website')    return !l.hasWebsite;
            if (filter === 'poor_website')  return l.websiteQuality === 'poor';
            if (filter === 'has_instagram') return !!l.instagram;
            if (filter === 'high_score')    return l.opportunityScore >= 70;
            return true;
          });
        }
        searchResults = results.sort((a, b) => b.opportunityScore - a.opportunityScore);
      } catch (err) {
        UI.toast(`Error al buscar: ${err.message}`, 'error');
        searchResults = [];
      }
    } else {
      UI.toast('Configurá el Backend URL en Ajustes para buscar leads', 'warning');
      searchResults = [];
    }

    const existingIds = new Set(Storage.getLeads().map(l => l.id));
    UI.renderSearchResults(searchResults, existingIds);
    Storage.addActivity({ msg: `Búsqueda: ${category} en ${zone} → ${searchResults.length} resultados`, color: '' });
  };

  const addLeadFromSearch = (id) => {
    const lead = searchResults.find(l => l.id === id);
    if (!lead) return;
    Storage.upsertLead(lead);
    Storage.addActivity({ msg: `Lead agregado: ${lead.businessName}`, color: 'cyan' });
    UI.updateNavBadge();
    UI.toast(`${lead.businessName} agregado`, 'success');

    // Update card UI
    const btn = document.querySelector(`.result-add-btn[data-id="${id}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Agregado';
      btn.style.opacity = '0.5';
      const card = btn.closest('.result-card');
      card?.classList.add('already-added');
      const badges = card?.querySelector('.result-card-badges');
      if (badges && !badges.querySelector('.added-tag')) {
        const tag = document.createElement('span');
        tag.className = 'added-tag';
        tag.textContent = 'Agregado';
        badges.insertBefore(tag, badges.firstChild);
      }
    }
  };

  const importSearchResults = (results, onlyNew) => {
    const existingIds = new Set(Storage.getLeads().map(l => l.id));
    const toImport = onlyNew ? results.filter(l => !existingIds.has(l.id)) : results;
    if (!toImport.length) { UI.toast('Todos los resultados ya están importados', 'info'); return; }
    toImport.forEach(l => Storage.upsertLead(l));
    Storage.addActivity({ msg: `${toImport.length} leads importados en bloque`, color: 'cyan' });
    UI.updateNavBadge();
    UI.toast(`${toImport.length} leads importados`, 'success');
    // Refresh buttons
    const existingIdsNew = new Set(Storage.getLeads().map(l => l.id));
    document.querySelectorAll('.result-add-btn').forEach(btn => {
      if (existingIdsNew.has(btn.dataset.id)) {
        btn.disabled = true;
        btn.textContent = 'Agregado';
        btn.style.opacity = '0.5';
      }
    });
  };

  /* ═══════════════════════════════════════
     LEADS TABLE & FILTERS
  ═══════════════════════════════════════ */
  const renderLeads = () => {
    const filtered = getFilteredLeads();
    UI.renderLeadsTable(filtered);
  };

  const getFilteredLeads = () => {
    let leads = Storage.getLeads();

    if (tableFilters.text) {
      const q = tableFilters.text.toLowerCase();
      leads = leads.filter(l =>
        l.businessName.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.zone.toLowerCase().includes(q)
      );
    }
    if (tableFilters.status)   leads = leads.filter(l => l.status === tableFilters.status);
    if (tableFilters.priority) leads = leads.filter(l => l.priority === tableFilters.priority);
    if (tableFilters.website)  leads = leads.filter(l => l.websiteQuality === tableFilters.website || (tableFilters.website === 'none' && !l.hasWebsite));

    const [field, dir] = tableFilters.sort.split('_');
    leads.sort((a,b) => {
      const av = field === 'createdAt' ? new Date(a[field]) : (a[field] || 0);
      const bv = field === 'createdAt' ? new Date(b[field]) : (b[field] || 0);
      return dir === 'asc' ? av - bv : bv - av;
    });

    return leads;
  };

  const setupTableFilters = () => {
    let debounceTimer;
    document.getElementById('tableSearch')?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        tableFilters.text = e.target.value;
        if (currentSection === 'leads') renderLeads();
      }, 200);
    });

    ['filterStatus','filterPriority','filterWebsite','sortBy'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        const key = { filterStatus:'status', filterPriority:'priority', filterWebsite:'website', sortBy:'sort' }[id];
        tableFilters[key] = e.target.value;
        if (currentSection === 'leads') renderLeads();
      });
    });
  };

  /* ═══════════════════════════════════════
     LEAD CRUD
  ═══════════════════════════════════════ */
  const saveDrawerChanges = (id) => {
    const lead = Storage.getLead(id);
    if (!lead) return;
    const newNotes  = document.getElementById('drawerNotes').value;
    const newStatus = document.getElementById('drawerStatus').value;
    const now = new Date().toISOString();
    const log = [...(lead.activityLog || [])];
    if (newNotes && newNotes !== lead.notes) {
      log.push({ type: 'note', text: 'Notas actualizadas', ts: now });
    }
    if (newStatus !== lead.status) {
      const label = Data.STATUS_META[newStatus]?.label || newStatus;
      log.push({ type: 'status', text: `Estado → ${label}`, ts: now });
    }
    log.push({ type: 'save', text: 'Lead guardado', ts: now });
    const updated = {
      ...lead,
      status:          newStatus,
      priority:        document.getElementById('drawerPriority').value,
      notes:           newNotes,
      lastContactDate: document.getElementById('drawerLastContact').value || null,
      nextActionDate:  document.getElementById('drawerNextAction').value || null,
      activityLog:     log,
    };
    Storage.upsertLead(updated);
    Storage.addActivity({ msg: `Lead actualizado: ${lead.businessName}`, color: 'purple' });
    UI.toast('Cambios guardados', 'success');
    refreshCurrentView();
  };

  const updateLeadStatus = (id, newStatus, fromKanban = false) => {
    const lead = Storage.getLead(id);
    if (!lead || lead.status === newStatus) return;
    const label = Data.STATUS_META[newStatus]?.label || newStatus;
    const log = [...(lead.activityLog || []), { type: 'status', text: `Estado → ${label}`, ts: new Date().toISOString() }];
    const updated = { ...lead, status: newStatus, activityLog: log };
    Storage.upsertLead(updated);
    Storage.addActivity({ msg: `${lead.businessName} → ${label}`, color: getActivityColor(newStatus) });
    UI.toast(`Estado: ${label}`, 'info');
    refreshCurrentView();
  };

  const getActivityColor = (status) => {
    const map = { ganado:'success', propuesta_enviada:'cyan', contactado:'', respondio:'success', perdido:'warning' };
    return map[status] || '';
  };

  const deleteLead = (id) => {
    const lead = Storage.getLead(id);
    if (!lead) return;
    if (!confirm(`¿Eliminar "${lead.businessName}"?`)) return;
    Storage.deleteLead(id);
    Storage.addActivity({ msg: `Lead eliminado: ${lead.businessName}`, color: 'warning' });
    UI.toast('Lead eliminado', 'warning');
    UI.updateNavBadge();
    UI.closeDrawer();
    refreshCurrentView();
  };

  const openEditModal = (id) => {
    const lead = Storage.getLead(id);
    if (lead) UI.openAddModal(lead);
  };

  const confirmAddLead = (editId = null) => {
    const data = UI.getModalFormData();
    if (!data.businessName) { UI.toast('El nombre es requerido', 'warning'); return; }

    const existingLead = editId ? Storage.getLead(editId) : null;
    const enriched = Scoring.enrich({
      ...data,
      id: editId || `ld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,
      notes: existingLead?.notes || '',
      lastContactDate: existingLead?.lastContactDate || null,
      nextActionDate:  existingLead?.nextActionDate  || null,
      createdAt: existingLead?.createdAt || new Date().toISOString(),
      activityLog: existingLead?.activityLog || [{ type: 'created', text: 'Lead agregado manualmente', ts: new Date().toISOString() }],
    });

    Storage.upsertLead(enriched);
    Storage.addActivity({ msg: `${editId ? 'Editado' : 'Agregado'}: ${enriched.businessName}`, color: 'cyan' });
    UI.toast(`${enriched.businessName} ${editId ? 'actualizado' : 'agregado'}`, 'success');
    UI.closeAddModal();
    UI.updateNavBadge();
    refreshCurrentView();
  };

  /* ── Bulk delete ── */
  const bulkDelete = () => {
    const ids = UI.getCheckedIds ? UI.getCheckedIds() : [];
    // getCheckedIds is exposed via the UI module, but we query directly here
    const checked = [...document.querySelectorAll('.row-check:checked')].map(c => c.dataset.id);
    if (!checked.length) { UI.toast('Seleccioná al menos un lead', 'warning'); return; }
    if (!confirm(`¿Eliminar ${checked.length} leads seleccionados?`)) return;
    Storage.deleteLeads(checked);
    Storage.addActivity({ msg: `${checked.length} leads eliminados en bloque`, color: 'warning' });
    UI.toast(`${checked.length} leads eliminados`, 'warning');
    UI.updateNavBadge();
    renderLeads();
  };

  /* ── Export CSV ── */
  const exportCSV = () => {
    const leads = Storage.getLeads();
    if (!leads.length) { UI.toast('No hay leads para exportar', 'info'); return; }
    const headers = ['ID','Negocio','Categoría','Zona','Dirección','Teléfono','Rating','Reseñas','Website','Calidad Web','Instagram','WhatsApp','Score','Prioridad','Estado','Notas','Último contacto','Próxima acción','Creado'];
    const rows = leads.map(l => [
      l.id, l.businessName, l.category, l.zone, l.address,
      l.phone||'', l.rating, l.reviewsCount, l.website||'', l.websiteQuality,
      l.instagram||'', l.whatsapp||'', l.opportunityScore, l.priority, l.status,
      (l.notes||'').replace(/"/g,'""'), l.lastContactDate||'', l.nextActionDate||'', l.createdAt||'',
    ].map(v => `"${v}"`));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raven3-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('CSV exportado', 'success');
  };

  /* ═══════════════════════════════════════
     DRAWER
  ═══════════════════════════════════════ */
  const setupDrawer = () => {
    document.getElementById('btnDrawerClose')?.addEventListener('click', UI.closeDrawer);
    document.getElementById('drawerOverlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('drawerOverlay')) UI.closeDrawer();
    });
  };

  /* ═══════════════════════════════════════
     MODAL
  ═══════════════════════════════════════ */
  const setupModal = () => {
    document.getElementById('btnCloseAddLead')?.addEventListener('click', UI.closeAddModal);
    document.getElementById('addLeadOverlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('addLeadOverlay')) UI.closeAddModal();
    });
  };

  /* ═══════════════════════════════════════
     MOBILE SIDEBAR
  ═══════════════════════════════════════ */
  const setupMobile = () => {
    document.getElementById('menuToggle')?.addEventListener('click', toggleMobileSidebar);
    document.getElementById('mobileOverlay')?.addEventListener('click', closeMobileSidebar);
  };

  const toggleMobileSidebar = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobileOverlay').classList.toggle('visible');
  };

  const closeMobileSidebar = () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('visible');
  };

  /* ═══════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════ */
  const refreshCurrentView = () => {
    switch (currentSection) {
      case 'dashboard': UI.renderDashboard(); break;
      case 'leads':     renderLeads(); break;
      case 'kanban':    UI.renderKanban(); break;
    }
  };

  /* ── Keyboard shortcuts ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      UI.closeDrawer();
      UI.closeAddModal();
      UI.closeMapPanel();
    }
  });

  return {
    init,
    navigate,
    addLeadFromSearch,
    importSearchResults,
    saveDrawerChanges,
    updateLeadStatus,
    deleteLead,
    openEditModal,
    confirmAddLead,
    bulkDelete,
    exportCSV,
  };
})();

/* ── Bootstrap ── */
document.addEventListener('DOMContentLoaded', async () => {
  const overlay  = document.getElementById('loginOverlay');
  const form     = document.getElementById('loginForm');
  const errorEl  = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');

  /* Check existing session */
  const authenticated = await Auth.checkSession();
  if (authenticated) {
    overlay.classList.add('hidden');
    await App.init();
    return;
  }

  /* Show login screen */
  overlay.classList.remove('hidden');

  /* Password visibility toggle */
  const toggleBtn = document.getElementById('togglePassword');
  const pwdInput  = document.getElementById('loginPassword');
  toggleBtn.addEventListener('click', () => {
    const show = pwdInput.type === 'password';
    pwdInput.type = show ? 'text' : 'password';
    toggleBtn.querySelector('.eye-off').classList.toggle('hidden', show);
    toggleBtn.querySelector('.eye-on').classList.toggle('hidden', !show);
    toggleBtn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    errorEl.classList.remove('visible');
    loginBtn.disabled    = true;
    loginBtn.textContent = 'Ingresando...';

    try {
      await Auth.signIn(email, password);
      overlay.classList.add('hidden');
      await App.init();
    } catch {
      errorEl.textContent = 'Email o contraseña incorrectos.';
      errorEl.classList.add('visible');
      loginBtn.disabled    = false;
      loginBtn.textContent = 'Ingresar';
    }
  });
});

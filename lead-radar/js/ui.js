/* ═══════════════════════════════════════════════════
   UI — All rendering and DOM functions
   ═══════════════════════════════════════════════════ */

const UI = (() => {

  /* ────────────────────────────────────────────────
     TOAST NOTIFICATIONS
  ──────────────────────────────────────────────── */
  const toast = (msg, type = 'info', duration = 3200) => {
    const icons = {
      success: `<svg class="toast-icon" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 9L8 11.5L12.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      error:   `<svg class="toast-icon" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M6 6L12 12M12 6L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      info:    `<svg class="toast-icon" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M9 8.5V12.5M9 6V6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      warning: `<svg class="toast-icon" viewBox="0 0 18 18" fill="none"><path d="M9 2L16 15H2L9 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 7V11M9 13V13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icons[type] || icons.info}<span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()"><svg viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 320);
    }, duration);
  };

  /* ────────────────────────────────────────────────
     SHARED BADGE HELPERS
  ──────────────────────────────────────────────── */
  const statusBadge = (status) => {
    const m = Data.STATUS_META[status] || Data.STATUS_META['nuevo'];
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  };

  const priorityBadge = (priority) => {
    const m = Data.PRIORITY_META[priority] || Data.PRIORITY_META['baja'];
    return `<span class="${m.cls}">${m.label}</span>`;
  };

  const webQualityBadge = (lead) => {
    if (!lead.hasWebsite) return `<span class="badge badge-sin-web">Sin web</span>`;
    const m = Data.WEB_QUALITY_META[lead.websiteQuality] || Data.WEB_QUALITY_META['average'];
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  };

  const proposalBadge = (businessName) => {
    const p = Proposals.find(businessName);
    if (p) return `<a href="propuestas/${p.slug}/" target="_blank" rel="noopener" class="badge badge-propuesta" style="text-decoration:none" title="Ver propuesta">
      <svg viewBox="0 0 12 12" fill="none" style="width:9px;height:9px;margin-right:3px;flex-shrink:0"><path d="M2 6.5L4.5 9L10 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Lista</a>`;
    return `<span class="badge badge-perdido">Pendiente</span>`;
  };

  const scorePill = (score) => {
    const cls = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';
    return `<div class="score-pill ${cls}">${score}</div>`;
  };

  const scoreBar = (score) => {
    const cls = score >= 75 ? 'score-high' : score >= 45 ? 'score-medium' : 'score-low';
    return `<div class="score-wrap"><div class="score-bar-track"><div class="score-bar-fill ${cls}" style="width:${score}%"></div></div><span class="score-value mono">${score}</span></div>`;
  };

  const ratingHtml = (rating, count) =>
    `<div class="rating"><span class="rating-val">★ ${rating}</span><span class="rating-count">(${count})</span></div>`;

  const _igSvg = `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>`;
  const _globeSvg = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const _waSvg = `<svg viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const instagramIndicator = (l) => {
    if (l.instagram) return `<div class="social-icon si-ig" title="${l.instagram}">${_igSvg}</div>`;
    return `<div class="social-icon si-off" title="Sin Instagram">${_igSvg}</div>`;
  };

  const whatsappIndicator = (l) => {
    if (l.whatsapp) return `<div class="social-icon si-wa" title="${l.whatsapp}">${_waSvg}</div>`;
    return `<div class="social-icon si-off" title="Sin WhatsApp">${_waSvg}</div>`;
  };

  const domainIndicator = (l) => {
    if (l.website) return `<div class="social-icon si-web" title="${l.website}">${_globeSvg}</div>`;
    return `<div class="social-icon si-off" title="Sin dominio">${_globeSvg}</div>`;
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
  };

  /* ────────────────────────────────────────────────
     DASHBOARD
  ──────────────────────────────────────────────── */
  const renderDashboard = () => {
    const leads = Storage.getLeads();
    const activity = Storage.getActivity();
    const total = leads.length;
    const noWeb  = leads.filter(l => !l.hasWebsite).length;
    const poorWeb= leads.filter(l => l.websiteQuality === 'poor').length;
    const contacted = leads.filter(l => ['contactado','respondio'].includes(l.status)).length;
    const proposals = leads.filter(l => l.status === 'propuesta_enviada').length;
    const won    = leads.filter(l => l.status === 'ganado').length;
    const avgScore = total ? Math.round(leads.reduce((s,l) => s + (l.opportunityScore||0), 0) / total) : 0;

    const topOpps = [...leads]
      .filter(l => l.status !== 'ganado' && l.status !== 'perdido')
      .sort((a,b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 5);

    const byStatus = Data.KANBAN_COLUMNS.map(col => ({
      ...col, count: leads.filter(l => l.status === col.id).length
    }));
    const maxStatus = Math.max(...byStatus.map(c => c.count), 1);

    document.getElementById('dashboardContent').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card cyan">
          <div class="stat-label">Total Leads</div>
          <div class="stat-value">${total}</div>
          <div class="stat-sub">En base de datos</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-label">Sin web</div>
          <div class="stat-value">${noWeb}</div>
          <div class="stat-sub">${total ? Math.round(noWeb/total*100) : 0}% del total</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Web mejorable</div>
          <div class="stat-value">${poorWeb}</div>
          <div class="stat-sub">Rediseño potencial</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">Contactados</div>
          <div class="stat-value">${contacted}</div>
          <div class="stat-sub">En conversación</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-label">Propuestas</div>
          <div class="stat-value">${proposals}</div>
          <div class="stat-sub">Enviadas</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Ganados</div>
          <div class="stat-value">${won}</div>
          <div class="stat-sub">Clientes activos</div>
        </div>
        <div class="stat-card muted">
          <div class="stat-label">Score promedio</div>
          <div class="stat-value">${avgScore}</div>
          <div class="stat-sub">/ 100</div>
        </div>
      </div>

      <div class="dashboard-bottom">
        <div class="card">
          <div class="section-heading">Top oportunidades</div>
          ${topOpps.length ? `<div class="top-opp-list">${topOpps.map(l => `
            <div class="top-opp-item" data-open-lead="${l.id}">
              ${scorePill(l.opportunityScore)}
              <div style="flex:1;min-width:0">
                <div class="top-opp-name">${l.businessName}</div>
                <div class="top-opp-zone">${l.category} · ${l.zone}</div>
              </div>
              ${priorityBadge(l.priority)}
            </div>`).join('')}</div>`
          : emptyState('Sin oportunidades', 'Busca leads para ver oportunidades aquí.')}
        </div>

        <div class="card">
          <div class="section-heading">Por estado</div>
          <div class="status-dist-list">
            ${byStatus.filter(c => c.count > 0).map(c => `
              <div class="status-dist-item">
                <span class="status-dist-label">${c.label}</span>
                <div class="status-dist-bar-track">
                  <div class="status-dist-bar-fill" style="width:${(c.count/maxStatus*100).toFixed(1)}%;background:${c.color}"></div>
                </div>
                <span class="status-dist-count">${c.count}</span>
              </div>`).join('') || '<p class="text-muted" style="text-align:center;padding:20px 0">Sin datos</p>'}
          </div>
        </div>

        <div class="card">
          <div class="section-heading">Actividad reciente</div>
          ${activity.length ? `<div class="activity-list">${activity.slice(0,8).map(a => `
            <div class="activity-item">
              <div class="activity-dot ${a.color || ''}"></div>
              <div>
                <div class="activity-text">${a.msg}</div>
                <div class="activity-time">${timeAgo(a.ts)}</div>
              </div>
            </div>`).join('')}</div>`
          : emptyState('Sin actividad', 'Las acciones aparecerán aquí.')}
        </div>
      </div>
    `;

    // Attach open-lead listeners
    document.querySelectorAll('[data-open-lead]').forEach(el => {
      el.addEventListener('click', () => openDrawer(el.dataset.openLead));
    });
  };

  function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min}m`;
    const h = Math.floor(min/60);
    if (h < 24) return `hace ${h}h`;
    return `hace ${Math.floor(h/24)}d`;
  }

  function emptyState(title, desc) {
    return `<div class="empty-state">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 8V12.5M12 15V15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
      <div class="empty-title">${title}</div>
      <div class="empty-desc">${desc}</div>
    </div>`;
  }

  /* ────────────────────────────────────────────────
     SEARCH RESULTS
  ──────────────────────────────────────────────── */
  const renderSearchLoading = () => {
    const container = document.getElementById('searchResults');
    container.innerHTML = `
      <div class="results-header">
        <span class="results-title">Buscando oportunidades...</span>
      </div>
      <div class="skeleton-grid">
        ${Array(6).fill(0).map(() => `
          <div class="skeleton-card">
            <div class="skeleton-line" style="height:16px;width:65%;margin-bottom:8px"></div>
            <div class="skeleton-line" style="height:12px;width:45%"></div>
            <div style="height:20px"></div>
            <div class="skeleton-line" style="height:11px;width:80%"></div>
            <div class="skeleton-line" style="height:11px;width:60%"></div>
            <div class="skeleton-line" style="height:11px;width:70%"></div>
          </div>`).join('')}
      </div>`;
  };

  const renderSearchResults = (results, existingIds) => {
    const container = document.getElementById('searchResults');
    if (!results.length) {
      container.innerHTML = emptyState('Sin resultados', 'Ajustá los filtros o cambiá el rubro y zona.');
      return;
    }
    container.innerHTML = `
      <div class="results-header">
        <span class="results-title">${results.length} resultado${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}</span>
        <span class="results-meta">Ordenados por score de oportunidad</span>
      </div>
      <div class="results-grid">
        ${results.map(l => renderResultCard(l, existingIds.has(l.id))).join('')}
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-primary" id="btnImportAll">
          <svg viewBox="0 0 16 16" fill="none"><path d="M8 2V10M4 7L8 11L12 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Importar todos
        </button>
        <button class="btn-secondary" id="btnImportNew">
          Importar solo nuevos
        </button>
      </div>
    `;
    container.querySelectorAll('.result-add-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        App.addLeadFromSearch(id);
      });
    });
    container.querySelectorAll('.result-card').forEach(card => {
      const addrEl = card.querySelector('.result-address');
      if (!addrEl) return;
      card.addEventListener('click', () => {
        openMapPanel(addrEl.dataset.address, addrEl.dataset.name, addrEl.dataset.placeId);
      });
    });
    document.getElementById('btnImportAll').addEventListener('click', () => App.importSearchResults(results, false));
    document.getElementById('btnImportNew').addEventListener('click', () => App.importSearchResults(results, true));
  };

  const renderResultCard = (l, alreadyAdded) => {
    return `
      <div class="result-card${alreadyAdded ? ' already-added' : ''}">
        <div class="result-card-header">
          ${scorePill(l.opportunityScore)}
          <div class="result-card-info">
            <div class="result-card-name">${l.businessName}</div>
            <div class="result-card-meta">${l.category} · ${l.zone}</div>
          </div>
          <div class="result-card-badges">
            ${alreadyAdded ? '<span class="added-tag">Agregado</span>' : ''}
            ${priorityBadge(l.priority)}
          </div>
        </div>
        <div class="result-card-body">
          ${ratingHtml(l.rating, l.reviewsCount)}
          <div class="result-detail result-address" data-address="${l.address}" data-name="${l.businessName}" data-place-id="${l.googlePlaceId || ''}" title="Ver en mapa">
            <svg viewBox="0 0 14 14" fill="none"><path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9 7 12.5 7 12.5C7 12.5 11.5 9 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="6" r="1.5" stroke="currentColor" stroke-width="1.2"/></svg>
            ${l.address}
          </div>
          ${l.phone ? `<div class="result-detail"><svg viewBox="0 0 14 14" fill="none"><path d="M2 3C2 2.5 2.5 2 3 2H5L6.5 5.5L5 6.5C5.7 8 6 8.3 7.5 9L8.5 7.5L12 9V11C12 11.5 11.5 12 11 12C6 12 2 8 2 3Z" stroke="currentColor" stroke-width="1.2"/></svg>${l.phone}</div>` : ''}
          <div class="result-detail">
            <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 7H10M7 4V10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            ${webQualityBadge(l)}
            ${l.instagram ? `<span style="color:var(--text-4);font-size:11px">IG: ${l.instagram}</span>` : ''}
          </div>
        </div>
        <div class="result-card-footer">
          <div style="font-size:11px;color:var(--text-4);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.diagnosis.split('.')[0]}</div>
          <button class="btn-primary result-add-btn" data-id="${l.id}" style="padding:6px 12px;font-size:12px;${alreadyAdded?'opacity:0.5;cursor:default':''}" ${alreadyAdded?'disabled':''}>
            ${alreadyAdded ? 'Agregado' : '+ Agregar'}
          </button>
        </div>
      </div>`;
  };

  /* ────────────────────────────────────────────────
     LEADS TABLE
  ──────────────────────────────────────────────── */
  const renderLeadsTable = (leads) => {
    const wrapper = document.getElementById('leadsTableWrapper');
    document.getElementById('leadsSubtitle').textContent = `${leads.length} lead${leads.length !== 1 ? 's' : ''} en total`;
    document.getElementById('navLeadCount').textContent = leads.length;

    if (!leads.length) {
      wrapper.innerHTML = emptyState('Sin leads',
        'No hay leads que coincidan. Buscá nuevas oportunidades o ajustá los filtros.');
      return;
    }

    wrapper.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:38px"><input type="checkbox" class="table-checkbox" id="checkAll"></th>
              <th style="min-width:180px">Negocio</th>
              <th>Zona</th>
              <th>Rating</th>
              <th>Web</th>
              <th class="col-social" title="Instagram">${_igSvg}</th>
              <th class="col-social" title="WhatsApp">${_waSvg}</th>
              <th class="col-social" title="Dominio">${_globeSvg}</th>
              <th>Score</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Propuesta</th>
              <th style="width:110px">Acciones</th>
            </tr>
          </thead>
          <tbody id="leadsTableBody">
            ${leads.map(l => renderLeadRow(l)).join('')}
          </tbody>
        </table>
      </div>`;

    attachTableListeners(wrapper, leads);
  };

  const renderLeadRow = (l) => `
    <tr data-id="${l.id}">
      <td><input type="checkbox" class="table-checkbox row-check" data-id="${l.id}"></td>
      <td class="col-name">
        <div class="td-name">${l.businessName}</div>
        <div class="td-category">${l.category}</div>
      </td>
      <td>${l.zone}</td>
      <td>${ratingHtml(l.rating, l.reviewsCount)}</td>
      <td>${webQualityBadge(l)}</td>
      <td class="col-social">${instagramIndicator(l)}</td>
      <td class="col-social">${whatsappIndicator(l)}</td>
      <td class="col-social">${domainIndicator(l)}</td>
      <td>${scoreBar(l.opportunityScore)}</td>
      <td>${priorityBadge(l.priority)}</td>
      <td>${statusBadge(l.status)}</td>
      <td>${proposalBadge(l.businessName)}</td>
      <td>
        <div class="actions-cell">
          <button class="table-action-btn action-view" data-id="${l.id}" title="Ver detalle">
            <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 8C3 4.5 5 2.5 8 2.5C11 2.5 13 4.5 14.5 8C13 11.5 11 13.5 8 13.5C5 13.5 3 11.5 1.5 8Z" stroke="currentColor" stroke-width="1.3"/></svg>
          </button>
          <button class="table-action-btn action-edit" data-id="${l.id}" title="Editar">
            <svg viewBox="0 0 16 16" fill="none"><path d="M2 12.5L4.5 10L11.5 3L13 4.5L6 11.5L2 14L2 12.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 4L12 6" stroke="currentColor" stroke-width="1.3"/></svg>
          </button>
          <button class="table-action-btn danger action-delete" data-id="${l.id}" title="Eliminar">
            <svg viewBox="0 0 16 16" fill="none"><path d="M3 4H13M5.5 4V2.5H10.5V4M4.5 4L5 13H11L11.5 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </td>
    </tr>`;

  const attachTableListeners = (wrapper, leads) => {
    wrapper.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-id]');
      const btn = e.target.closest('button');
      if (btn) {
        const id = btn.dataset.id;
        if (btn.classList.contains('action-view'))   openDrawer(id);
        if (btn.classList.contains('action-edit'))   App.openEditModal(id);
        if (btn.classList.contains('action-delete')) App.deleteLead(id);
        return;
      }
      if (row && !e.target.classList.contains('table-checkbox')) openDrawer(row.dataset.id);
    });

    const checkAll = wrapper.querySelector('#checkAll');
    checkAll?.addEventListener('change', () => {
      wrapper.querySelectorAll('.row-check').forEach(c => c.checked = checkAll.checked);
      updateBulkDeleteBtn();
    });
    wrapper.addEventListener('change', (e) => {
      if (e.target.classList.contains('row-check')) updateBulkDeleteBtn();
    });
  };

  const updateBulkDeleteBtn = () => {
    const checked = document.querySelectorAll('.row-check:checked').length;
    const btn = document.getElementById('btnBulkDelete');
    if (btn) {
      btn.style.display = checked > 0 ? 'inline-flex' : 'none';
      btn.textContent = `Eliminar selección (${checked})`;
    }
  };

  const getCheckedIds = () =>
    [...document.querySelectorAll('.row-check:checked')].map(c => c.dataset.id);

  /* ────────────────────────────────────────────────
     KANBAN BOARD
  ──────────────────────────────────────────────── */
  const renderKanban = () => {
    const leads = Storage.getLeads();
    const board = document.getElementById('kanbanBoard');
    board.innerHTML = Data.KANBAN_COLUMNS.map(col => {
      const colLeads = leads.filter(l => l.status === col.id)
        .sort((a,b) => b.opportunityScore - a.opportunityScore);
      return `
        <div class="kanban-col" data-col="${col.id}">
          <div class="kanban-col-header" style="border-top:2px solid ${col.color}20">
            <span class="kanban-col-title" style="color:${col.color}">${col.label}</span>
            <span class="kanban-col-count">${colLeads.length}</span>
          </div>
          <div class="kanban-col-body" data-status="${col.id}">
            ${colLeads.map(l => kanbanCard(l)).join('')}
            ${colLeads.length === 0 ? `<div class="empty-state" style="padding:24px 8px">
              <div class="empty-desc" style="font-size:11px">Arrastrá leads aquí</div>
            </div>` : ''}
          </div>
        </div>`;
    }).join('');

    attachKanbanListeners(board);
  };

  const kanbanCard = (l) => `
    <div class="kanban-card" draggable="true" data-id="${l.id}">
      <div class="kanban-card-name">${l.businessName}</div>
      <div class="kanban-card-meta">
        ${scorePill(l.opportunityScore)}
        ${priorityBadge(l.priority)}
      </div>
      <div class="kanban-card-diag">${l.diagnosis}</div>
      <div class="kanban-card-footer">
        ${l.nextActionDate ? `<span class="kanban-card-date">📅 ${formatDate(l.nextActionDate)}</span>` : '<span></span>'}
        <button class="table-action-btn action-view" data-id="${l.id}" style="width:24px;height:24px">
          <svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M1 7C2.3 4 4.5 2 7 2C9.5 2 11.7 4 13 7C11.7 10 9.5 12 7 12C4.5 12 2.3 10 1 7Z" stroke="currentColor" stroke-width="1.2"/></svg>
        </button>
      </div>
    </div>`;

  const attachKanbanListeners = (board) => {
    let dragging = null;

    board.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.kanban-card');
      if (!card) return;
      dragging = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });

    board.addEventListener('dragend', () => {
      dragging?.classList.remove('dragging');
      board.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
      dragging = null;
    });

    board.querySelectorAll('[data-status]').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.closest('.kanban-col').classList.add('drag-over');
      });
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget))
          zone.closest('.kanban-col').classList.remove('drag-over');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        const newStatus = zone.dataset.status;
        zone.closest('.kanban-col').classList.remove('drag-over');
        App.updateLeadStatus(id, newStatus, true);
      });
    });

    board.querySelectorAll('.action-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDrawer(btn.dataset.id);
      });
    });
  };

  /* ────────────────────────────────────────────────
     MAP PANEL
  ──────────────────────────────────────────────── */
  const openMapPanel = (address, name, placeId) => {
    const mapsUrl = placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
    const embedQ = encodeURIComponent(placeId ? `place_id:${placeId}` : `${name} ${address}`);
    document.getElementById('mapPanelTitle').textContent = name || 'Ubicación';
    document.getElementById('mapPanelAddress').textContent = address;
    document.getElementById('mapPanelLink').href = mapsUrl;
    document.getElementById('mapPanelIframe').src = `https://maps.google.com/maps?q=${embedQ}&output=embed&z=15`;
    document.getElementById('mapPanelOverlay').classList.add('open');
  };

  const closeMapPanel = () => {
    const overlay = document.getElementById('mapPanelOverlay');
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => {
      document.getElementById('mapPanelIframe').src = '';
    }, { once: true });
  };

  document.getElementById('btnCloseMapPanel').addEventListener('click', closeMapPanel);
  document.getElementById('mapPanelOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('mapPanelOverlay')) closeMapPanel();
  });

  /* ────────────────────────────────────────────────
     LEAD DETAIL DRAWER
  ──────────────────────────────────────────────── */
  const openDrawer = (id) => {
    const lead = Storage.getLead(id);
    if (!lead) return;
    renderDrawer(lead);
    document.getElementById('drawerOverlay').classList.add('open');
  };

  const closeDrawer = () => {
    document.getElementById('drawerOverlay').classList.remove('open');
  };

  /* ── helpers for drawer ── */
  const relativeTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return 'hace un momento';
    if (m < 60) return `hace ${m} min`;
    if (h < 24) return `hace ${h}h`;
    if (d < 7)  return `hace ${d}d`;
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const timelineDotColor = (type) => {
    const map = { created: 'var(--text-3)', status: 'var(--accent)', note: '#a78bfa', save: 'var(--text-4)' };
    return map[type] || 'var(--text-4)';
  };

  const actionPill = (href, label, icon, target = '_self') =>
    `<a href="${href}" target="${target}" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:var(--bg-3);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text-1);text-decoration:none;white-space:nowrap;transition:border-color .15s"
        onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">${icon} ${label}</a>`;

  const checkSiteStatus = async (website) => {
    const el = document.getElementById('siteStatusBadge');
    if (!el) return;
    const settings = Storage.getSettings();
    if (!settings.backendUrl) { el.remove(); return; }
    try {
      const res = await fetch(`${settings.backendUrl}/check?url=${encodeURIComponent(website)}`);
      const d = await res.json();
      if (d.online) {
        el.innerHTML = `<span style="color:#26c6b0">● Online</span>&nbsp;<span style="color:var(--text-4)">${d.ms}ms</span>`;
      } else {
        el.innerHTML = `<span style="color:#ff6b6b">● Offline</span>`;
      }
    } catch {
      el.remove();
    }
  };

  const renderDrawer = (lead) => {
    document.getElementById('drawerTitle').textContent = lead.businessName;
    document.getElementById('drawerHeaderActions').innerHTML = `
      <button class="btn-primary" id="btnMarkContacted" style="padding:6px 12px;font-size:12px">Marcar contactado</button>
      <button class="btn-secondary" id="btnMarkProposal" style="padding:6px 12px;font-size:12px">Propuesta enviada</button>
    `;

    const breakdown = Scoring.getBreakdown(lead);
    const waMsg = Templates.renderById('whatsapp_inicial', lead);
    const emailMsg = Templates.renderById('email_inicial', lead);
    const igMsg = lead.instagram ? Templates.renderById('instagram_dm', lead) : '';

    const workerUrl = (Storage.getSettings().backendUrl || '').replace(/\/$/, '');

    /* Today's opening hours (Google: Mon=0 … Sun=6; JS: Sun=0 … Sat=6) */
    const todayHours = (() => {
      const descs = lead.openingHours?.weekdayDescriptions;
      if (!descs?.length) return null;
      const googleDay = (new Date().getDay() + 6) % 7;
      const full = descs[googleDay] || '';
      return full.includes(': ') ? full.split(': ').slice(1).join(': ') : full;
    })();

    /* WhatsApp URL */
    const waNum = lead.whatsapp ? lead.whatsapp.replace(/\D/g, '') : null;
    const waHref = waNum ? `https://wa.me/${waNum}` : null;

    /* Instagram DM URL */
    const igHandle = lead.instagram ? lead.instagram.replace(/^@/, '').trim() : null;
    const igHref = igHandle ? `https://ig.me/m/${igHandle}` : null;

    /* Website with protocol */
    const webHref = lead.website
      ? (/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`)
      : null;

    /* Maps URL — use place_id when available for exact business match */
    const mapsHref = (lead.address || lead.googlePlaceId)
      ? (lead.googlePlaceId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.businessName)}&query_place_id=${lead.googlePlaceId}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.businessName} ${lead.address}`)}`)
      : null;

    /* Proposal web */
    const proposal = Proposals.find(lead.businessName);
    const proposalHref = proposal ? `propuestas/${proposal.slug}/` : null;

    /* Activity log (newest first) */
    const actLog = [...(lead.activityLog || [])].reverse();

    document.getElementById('drawerBody').innerHTML = `

      <!-- Columna izquierda: Acciones + Info + Score + Diagnóstico + Actividad -->
      <div class="drawer-col">

        <!-- Acciones rápidas -->
        <div class="drawer-section" style="padding:10px 14px">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${lead.phone  ? actionPill(`tel:${lead.phone}`, 'Llamar',
                '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M2.5 3C2.5 3 3 5 5 7C7 9 9 9.5 9 9.5L10.5 8C10.5 8 9.5 7.5 9 7C8.5 6.5 8.5 5.5 8.5 5.5L5.5 2.5C5.5 2.5 4.5 2.5 3.5 2.5C3 2.5 2.5 3 2.5 3Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>') : ''}
            ${waHref      ? actionPill(waHref, 'WhatsApp',
                '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 9.5C5.5 10 8.5 10 10 8C11.5 6 10.5 3.5 8 3C5.5 2.5 3 4.5 3.5 7C3.7 8 4 8.5 4.5 9.5L3.5 11L5.5 10.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>', '_blank') : ''}
            ${igHref      ? actionPill(igHref, 'Instagram DM',
                '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><rect x="1.5" y="1.5" width="11" height="11" rx="3" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.1"/><circle cx="10.2" cy="3.8" r="0.7" fill="currentColor"/></svg>', '_blank') : ''}
            ${webHref     ? actionPill(webHref, 'Web',
                '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M7 1.5C7 1.5 5 4 5 7C5 10 7 12.5 7 12.5M7 1.5C7 1.5 9 4 9 7C9 10 7 12.5 7 12.5M1.5 7H12.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>', '_blank') : ''}
            ${mapsHref    ? actionPill(mapsHref, 'Maps',
                '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M7 1.5C5 1.5 3.5 3 3.5 5C3.5 8 7 12.5 7 12.5C7 12.5 10.5 8 10.5 5C10.5 3 9 1.5 7 1.5Z" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="5" r="1.2" stroke="currentColor" stroke-width="1.1"/></svg>', '_blank') : ''}
            ${proposalHref ? actionPill(proposalHref, 'Ver propuesta',
                '<svg viewBox="0 0 14 14" fill="none" width="12" height="12"><rect x="2" y="2.5" width="8" height="6" rx="1.1" stroke="currentColor" stroke-width="1.2"/><path d="M4 9.5V11.5H10V5.5H9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>', '_blank') : ''}
          </div>
        </div>

        <!-- Info principal -->
        <div class="drawer-section">
          <div class="drawer-section-title">Información general</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            ${scorePill(lead.opportunityScore)}
            <div>
              <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:18px">${lead.businessName}</div>
              <div style="font-size:12px;color:var(--text-3)">${lead.category} · ${lead.zone}</div>
            </div>
            <div style="margin-left:auto;display:flex;gap:6px">
              ${statusBadge(lead.status)}
              ${priorityBadge(lead.priority)}
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">Dirección</div><div class="info-value">${lead.address || '—'}</div></div>
            <div class="info-item"><div class="info-label">Teléfono</div><div class="info-value">${lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : '—'}</div></div>
            <div class="info-item"><div class="info-label">Rating</div><div class="info-value">${ratingHtml(lead.rating, lead.reviewsCount)}</div></div>
            <div class="info-item"><div class="info-label">Fuente</div><div class="info-value">${lead.source || '—'}</div></div>
            <div class="info-item"><div class="info-label">Instagram</div><div class="info-value">${lead.instagram || '—'}</div></div>
            <div class="info-item"><div class="info-label">WhatsApp</div><div class="info-value">${waNum ? `<a href="${waHref}" target="_blank" rel="noopener">${lead.whatsapp}</a>` : '—'}</div></div>
            <div class="info-item" style="grid-column:1/-1">
              <div class="info-label">Sitio web</div>
              <div class="info-value" style="display:flex;align-items:center;gap:8px">
                ${webHref ? `<a href="${webHref}" target="_blank" rel="noopener">${lead.website}</a><span id="siteStatusBadge" style="font-size:11px;color:var(--text-3)">···</span>` : '—'}
              </div>
            </div>
            <div class="info-item"><div class="info-label">Calidad web</div><div class="info-value">${webQualityBadge(lead)}</div></div>
            ${lead.openingHours ? `
            <div class="info-item">
              <div class="info-label">Horario hoy</div>
              <div class="info-value" style="display:flex;align-items:center;gap:6px">
                <span style="color:${lead.openingHours.openNow ? '#26c6b0' : '#ff6b6b'};font-size:10px">●</span>
                <span>${lead.openingHours.openNow ? 'Abierto' : 'Cerrado'}${todayHours ? ` · ${todayHours}` : ''}</span>
              </div>
            </div>` : ''}
          </div>

          ${lead.address ? `
          <a href="${mapsHref}" target="_blank" rel="noopener" style="display:block;margin-top:12px;border-radius:var(--r-md);overflow:hidden;border:1px solid var(--border);text-decoration:none">
            <iframe
              src="https://maps.google.com/maps?q=${encodeURIComponent(lead.address)}&output=embed&z=15"
              width="100%" height="160" style="border:0;display:block;pointer-events:none"
              loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </a>` : ''}

          ${lead.photos?.length && workerUrl ? `
          <div style="display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:2px">
            ${lead.photos.map(name => `<img
              src="${workerUrl}/photo?name=${encodeURIComponent(name)}"
              style="width:110px;height:78px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid var(--border)"
              loading="lazy" onerror="this.style.display='none'"
            >`).join('')}
          </div>` : ''}
        </div>

        ${proposalHref ? `
        <!-- Propuesta web -->
        <div class="drawer-section">
          <div class="drawer-section-title">Propuesta web</div>
          <a href="${proposalHref}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--bg-3);border:1px solid var(--accent);border-radius:var(--r-md);text-decoration:none;color:var(--text-1);font-size:13px;font-weight:600;transition:background .15s"
              onmouseover="this.style.background='var(--bg-4)'" onmouseout="this.style.background='var(--bg-3)'">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18" style="flex-shrink:0;color:var(--accent)"><rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 14v2h8V7h-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 7.5h6M5 10h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            <div>
              <div>${proposal.name || lead.businessName}</div>
              <div style="font-size:11px;font-weight:400;color:var(--text-3);margin-top:2px">propuestas/${proposal.slug}/</div>
            </div>
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13" style="margin-left:auto;color:var(--text-3)"><path d="M3 11L11 3M11 3H6.5M11 3V7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>` : ''}

        <!-- Score -->
        <div class="drawer-section">
          <div class="drawer-section-title">Score de oportunidad</div>
          <div class="score-breakdown">
            ${breakdown.map(b => `
              <div class="breakdown-item">
                <span class="breakdown-label">${b.label}</span>
                <span class="breakdown-points ${b.pts > 0 ? 'positive' : 'negative'}">${b.pts > 0 ? '+' : ''}${b.pts} pts</span>
              </div>`).join('')}
            <div class="score-total-row">
              <span class="score-total-label">Score total</span>
              ${scorePill(lead.opportunityScore)}
            </div>
          </div>
          <div class="pitch-box" style="margin-top:10px">${lead.recommendedPitch}</div>
        </div>

        <!-- Diagnóstico -->
        <div class="drawer-section">
          <div class="drawer-section-title">Diagnóstico</div>
          <div style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--r-md);padding:14px;font-size:13px;color:var(--text-2);line-height:1.6">${lead.diagnosis}</div>
        </div>

        <!-- Actividad -->
        <div class="drawer-section">
          <div class="drawer-section-title">Actividad</div>
          ${actLog.length === 0
            ? `<div style="font-size:12px;color:var(--text-3)">Sin actividad registrada</div>`
            : `<div style="display:flex;flex-direction:column;gap:10px">
              ${actLog.map(e => `
              <div style="display:flex;gap:10px;align-items:flex-start">
                <div style="width:8px;height:8px;border-radius:50%;background:${timelineDotColor(e.type)};margin-top:4px;flex-shrink:0;box-shadow:0 0 0 2px var(--bg-2)"></div>
                <div>
                  <div style="font-size:12px;color:var(--text-1);line-height:1.4">${e.text}</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:1px">${relativeTime(e.ts)}</div>
                </div>
              </div>`).join('')}
            </div>`}
        </div>

      </div>

      <!-- Columna derecha: Gestión + Mensajes -->
      <div class="drawer-col">

        <!-- Gestión -->
        <div class="drawer-section">
          <div class="drawer-section-title">Gestión del lead</div>
          <div class="drawer-form-grid">
            <div class="form-group">
              <label class="form-label">Estado</label>
              <select class="form-select" id="drawerStatus">
                ${Object.entries(Data.STATUS_META).map(([k,v]) => `<option value="${k}" ${lead.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Prioridad</label>
              <select class="form-select" id="drawerPriority">
                <option value="alta"  ${lead.priority === 'alta'  ? 'selected' : ''}>Alta</option>
                <option value="media" ${lead.priority === 'media' ? 'selected' : ''}>Media</option>
                <option value="baja"  ${lead.priority === 'baja'  ? 'selected' : ''}>Baja</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Último contacto</label>
              <input type="date" class="form-input" id="drawerLastContact" value="${lead.lastContactDate || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Próxima acción</label>
              <input type="date" class="form-input" id="drawerNextAction" value="${lead.nextActionDate || ''}">
            </div>
          </div>
          <div class="form-group" style="margin-top:12px">
            <label class="form-label">Notas internas</label>
            <textarea class="form-textarea" id="drawerNotes" rows="4" placeholder="Agrega notas sobre este lead...">${lead.notes || ''}</textarea>
          </div>
          <div class="drawer-actions" style="margin-top:12px">
            <button class="btn-primary" id="btnSaveDrawer" data-id="${lead.id}">Guardar cambios</button>
            <button class="btn-secondary" id="btnDeleteDrawer" data-id="${lead.id}">Eliminar</button>
          </div>
        </div>

        <!-- Mensajes -->
        <div class="drawer-section">
          <div class="drawer-section-title">Mensajes personalizados</div>
          <div style="font-size:12px;font-weight:600;color:var(--text-3);margin-bottom:6px">WhatsApp</div>
          <div class="msg-preview" id="waPreview">${waMsg}</div>
          <button class="btn-secondary" id="btnCopyWa" style="margin-top:8px;padding:7px 12px;font-size:12px">
            <svg viewBox="0 0 14 14" fill="none"><rect x="3.5" y="2" width="7" height="9" rx="1.2" stroke="currentColor" stroke-width="1.2"/><path d="M2 4.5V12H9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Copiar mensaje WhatsApp
          </button>

          <div style="font-size:12px;font-weight:600;color:var(--text-3);margin:16px 0 6px">Email inicial</div>
          <div class="msg-preview" id="emailPreview">${emailMsg}</div>
          <button class="btn-secondary" id="btnCopyEmail" style="margin-top:8px;padding:7px 12px;font-size:12px">
            <svg viewBox="0 0 14 14" fill="none"><rect x="3.5" y="2" width="7" height="9" rx="1.2" stroke="currentColor" stroke-width="1.2"/><path d="M2 4.5V12H9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Copiar email
          </button>

          ${igHandle ? `
          <div style="font-size:12px;font-weight:600;color:#E1306C;margin:16px 0 6px;display:flex;align-items:center;gap:5px">
            <svg viewBox="0 0 12 12" fill="none" width="11" height="11"><rect x="1" y="1" width="10" height="10" rx="2.8" stroke="currentColor" stroke-width="1.1"/><circle cx="6" cy="6" r="2.2" stroke="currentColor" stroke-width="1"/><circle cx="8.8" cy="3.2" r="0.6" fill="currentColor"/></svg>
            Instagram DM
          </div>
          <div class="msg-preview" id="igPreview">${igMsg}</div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <button class="btn-secondary" id="btnCopyIg" style="padding:7px 12px;font-size:12px">
              <svg viewBox="0 0 14 14" fill="none"><rect x="3.5" y="2" width="7" height="9" rx="1.2" stroke="currentColor" stroke-width="1.2"/><path d="M2 4.5V12H9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
              Copiar DM
            </button>
            <a href="${igHref}" target="_blank" rel="noopener"
               style="display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:var(--r-sm);background:rgba(225,48,108,0.1);border:1px solid rgba(225,48,108,0.28);color:#E1306C;font-size:12px;font-weight:600;text-decoration:none;transition:var(--t)"
               onmouseover="this.style.background='rgba(225,48,108,0.2)'" onmouseout="this.style.background='rgba(225,48,108,0.1)'">
              Abrir chat en Instagram
            </a>
          </div>` : ''}
        </div>

      </div>

    `;

    // Drawer action listeners
    document.getElementById('btnSaveDrawer').addEventListener('click', () => {
      App.saveDrawerChanges(lead.id);
    });
    document.getElementById('btnDeleteDrawer').addEventListener('click', () => {
      App.deleteLead(lead.id);
      closeDrawer();
    });
    document.getElementById('btnMarkContacted').addEventListener('click', () => {
      App.updateLeadStatus(lead.id, 'contactado');
      document.getElementById('drawerStatus').value = 'contactado';
    });
    document.getElementById('btnMarkProposal').addEventListener('click', () => {
      App.updateLeadStatus(lead.id, 'propuesta_enviada');
      document.getElementById('drawerStatus').value = 'propuesta_enviada';
    });
    document.getElementById('btnCopyWa').addEventListener('click', () => {
      copyToClipboard(document.getElementById('waPreview').textContent, 'Mensaje WhatsApp copiado');
    });
    document.getElementById('btnCopyEmail').addEventListener('click', () => {
      copyToClipboard(document.getElementById('emailPreview').textContent, 'Email copiado');
    });
    document.getElementById('btnCopyIg')?.addEventListener('click', () => {
      copyToClipboard(document.getElementById('igPreview').textContent, 'DM de Instagram copiado');
    });

    // Async: check website status
    if (lead.website) checkSiteStatus(lead.website);
  };

  const copyToClipboard = (text, msg = 'Copiado') => {
    navigator.clipboard.writeText(text).then(() => toast(msg, 'success')).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
      toast(msg, 'success');
    });
  };

  /* ────────────────────────────────────────────────
     ADD/EDIT LEAD MODAL
  ──────────────────────────────────────────────── */
  const openAddModal = (lead = null) => {
    const isEdit = !!lead;
    document.getElementById('addLeadModal').querySelector('.modal-title').textContent = isEdit ? 'Editar Lead' : 'Agregar Lead';
    document.getElementById('addLeadModalBody').innerHTML = `
      <div class="modal-form-grid">
        <div class="form-group span-2">
          <label class="form-label">Nombre del negocio *</label>
          <input class="form-input" id="mf_name" value="${lead?.businessName||''}" placeholder="Nombre del negocio">
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-select" id="mf_category">
            ${['Restaurante','Bar','Cafetería','Peluquería','Veterinaria','Ferretería','Panadería','Odontología','Gimnasio','Farmacia','Mecánica','Hotel','Estética','Psicología','Inmobiliaria','Arquitectura','Contabilidad','Abogado','Clínica','Otro'].map(c => `<option ${lead?.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Zona</label>
          <input class="form-input" id="mf_zone" value="${lead?.zone||''}" placeholder="Ej: Palermo">
        </div>
        <div class="form-group span-2">
          <label class="form-label">Dirección</label>
          <input class="form-input" id="mf_address" value="${lead?.address||''}" placeholder="Dirección completa">
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input class="form-input" id="mf_phone" value="${lead?.phone||''}" placeholder="+54 11...">
        </div>
        <div class="form-group">
          <label class="form-label">WhatsApp</label>
          <input class="form-input" id="mf_whatsapp" value="${lead?.whatsapp||''}" placeholder="+54 9 11...">
        </div>
        <div class="form-group">
          <label class="form-label">Rating</label>
          <input class="form-input" id="mf_rating" type="number" min="1" max="5" step="0.1" value="${lead?.rating||4.0}">
        </div>
        <div class="form-group">
          <label class="form-label">Cantidad de reseñas</label>
          <input class="form-input" id="mf_reviews" type="number" min="0" value="${lead?.reviewsCount||0}">
        </div>
        <div class="form-group">
          <label class="form-label">Sitio web</label>
          <input class="form-input" id="mf_website" value="${lead?.website||''}" placeholder="dominio.com">
        </div>
        <div class="form-group">
          <label class="form-label">Calidad del sitio</label>
          <select class="form-select" id="mf_wq">
            <option value="none"    ${lead?.websiteQuality==='none'   ?'selected':''}>Sin web</option>
            <option value="poor"    ${lead?.websiteQuality==='poor'   ?'selected':''}>Deficiente</option>
            <option value="average" ${lead?.websiteQuality==='average'?'selected':''}>Promedio</option>
            <option value="good"    ${lead?.websiteQuality==='good'   ?'selected':''}>Buena</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Instagram</label>
          <input class="form-input" id="mf_instagram" value="${lead?.instagram||''}" placeholder="@usuario">
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-select" id="mf_status">
            ${Object.entries(Data.STATUS_META).map(([k,v]) => `<option value="${k}" ${lead?.status===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="btnCancelAddLead">Cancelar</button>
        <button class="btn-primary" id="btnConfirmAddLead" data-id="${lead?.id||''}">
          ${isEdit ? 'Guardar cambios' : 'Agregar lead'}
        </button>
      </div>`;

    document.getElementById('addLeadOverlay').classList.add('open');
    document.getElementById('btnCancelAddLead').addEventListener('click', closeAddModal);
    document.getElementById('btnConfirmAddLead').addEventListener('click', () => App.confirmAddLead(lead?.id));
  };

  const closeAddModal = () => {
    document.getElementById('addLeadOverlay').classList.remove('open');
  };

  const getModalFormData = () => {
    const website = document.getElementById('mf_website').value.trim();
    const wq = document.getElementById('mf_wq').value;
    return {
      businessName: document.getElementById('mf_name').value.trim(),
      category:     document.getElementById('mf_category').value,
      zone:         document.getElementById('mf_zone').value.trim(),
      address:      document.getElementById('mf_address').value.trim(),
      phone:        document.getElementById('mf_phone').value.trim() || null,
      whatsapp:     document.getElementById('mf_whatsapp').value.trim() || null,
      rating:       parseFloat(document.getElementById('mf_rating').value) || 4.0,
      reviewsCount: parseInt(document.getElementById('mf_reviews').value) || 0,
      website:      website || null,
      hasWebsite:   !!website,
      websiteQuality: wq,
      instagram:    document.getElementById('mf_instagram').value.trim() || null,
      status:       document.getElementById('mf_status').value,
      source:       'Manual',
    };
  };

  /* ────────────────────────────────────────────────
     TEMPLATES SECTION
  ──────────────────────────────────────────────── */
  const renderTemplates = () => {
    const tpls = Templates.getAll();
    document.getElementById('templatesLayout').innerHTML = tpls.map(t => `
      <div class="template-card">
        <div class="template-card-header">
          <span class="template-card-title">${t.title}</span>
          <span class="template-card-type badge ${Templates.TYPE_META[t.type]?.cls || 'type-email'}">${Templates.TYPE_META[t.type]?.label || t.type}</span>
        </div>
        <div class="template-card-body">
          <div class="template-vars">
            <span class="filter-row-label" style="font-size:11px;margin-right:2px">Variables:</span>
            ${Templates.VARS.map(v => `<span class="template-var" onclick="UI.insertTemplateVar('${t.id}','${v}')">${v}</span>`).join('')}
          </div>
          <textarea class="template-textarea" id="tpl_${t.id}" data-id="${t.id}">${t.body}</textarea>
        </div>
      </div>`).join('');
  };

  const insertTemplateVar = (id, varStr) => {
    const ta = document.getElementById(`tpl_${id}`);
    if (!ta) return;
    const pos = ta.selectionStart;
    ta.value = ta.value.slice(0, pos) + varStr + ta.value.slice(pos);
    ta.setSelectionRange(pos + varStr.length, pos + varStr.length);
    ta.focus();
  };

  const saveTemplates = () => {
    const tpls = Templates.getAll();
    const updated = tpls.map(t => {
      const el = document.getElementById(`tpl_${t.id}`);
      return el ? { ...t, body: el.value } : t;
    });
    Templates.saveAll(updated);
    toast('Templates guardados', 'success');
  };

  /* ────────────────────────────────────────────────
     SETTINGS SECTION
  ──────────────────────────────────────────────── */
  const renderSettings = () => {
    const s         = Storage.getSettings();
    const apiActive = !!s.backendUrl;
    const sbCfg     = Storage.getSupabaseConfig();
    const sbConn    = Storage.isConnected();
    const lsLeads   = (() => { try { return JSON.parse(localStorage.getItem('r3lr_leads') || '[]'); } catch { return []; } })();
    const hasLsData = lsLeads.length > 0;

    document.getElementById('settingsContent').innerHTML = `
      <div class="settings-layout">

        <!-- ── SUPABASE ── -->
        <div class="settings-card settings-card-accent" style="grid-column:span 2">
          <div class="settings-card-title" style="color:var(--accent)">Supabase — Persistencia en la nube</div>
          <div class="settings-card-desc">Guardá tus leads en Supabase para que persistan entre dispositivos y no dependas del localStorage del browser.</div>

          <div class="settings-status ${sbConn ? 'active' : 'inactive'}" style="margin:12px 0 16px">
            ${sbConn
              ? `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 7L6 8.5L9.5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 Conectado a Supabase`
              : `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                 Sin conexión — usando localStorage`}
          </div>

          <div class="settings-field" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            <div class="form-group">
              <label class="form-label">URL del proyecto</label>
              <input class="form-input" id="settingSbUrl" value="${sbCfg.url}" placeholder="https://xxxxxxxxxxx.supabase.co">
            </div>
            <div class="form-group">
              <label class="form-label">Clave anon / public</label>
              <input class="form-input" id="settingSbKey" value="${sbCfg.key}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button class="btn-primary" id="btnConnectSupabase">
              <svg viewBox="0 0 16 16" fill="none"><path d="M13 8A5 5 0 1 1 3 8a5 5 0 0 1 10 0Z" stroke="currentColor" stroke-width="1.3"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
              ${sbConn ? 'Reconectar' : 'Conectar'}
            </button>
            ${sbConn && hasLsData ? `
            <button class="btn-secondary" id="btnMigrateData">
              <svg viewBox="0 0 16 16" fill="none"><path d="M3 8H13M10 5l3 3-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Migrar ${lsLeads.length} leads de localStorage
            </button>` : ''}
          </div>

          <div class="api-endpoint-box" style="margin-top:16px;font-size:12px"><span class="api-method">Setup</span> Cómo crear el proyecto Supabase (una sola vez)

  1. <span class="api-key">supabase.com</span> → New project (plan gratuito disponible)
  2. Settings → API → copiar <span class="api-val">Project URL</span> y <span class="api-val">anon public key</span>
  3. SQL Editor → pegar y ejecutar el contenido de <span class="api-key">supabase-schema.sql</span> (en el repo)
  4. Pegá URL y clave arriba → Conectar</div>
        </div>

        <!-- ── GOOGLE PLACES ── -->
        <div class="settings-card">
          <div class="settings-card-title">Estado de integración</div>
          <div class="settings-card-desc">Google Places API (New) vía Cloudflare Workers. La clave vive como secret en el worker — nunca expuesta al browser.</div>
          <div class="settings-status ${apiActive ? 'active' : 'inactive'}" style="margin-top:14px">
            ${apiActive
              ? `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 7L6 8.5L9.5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                 API real activa — Google Places`
              : `<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                 Modo demo — configurá el Worker URL para activar datos reales`}
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-title">Worker URL</div>
          <div class="settings-card-desc">URL del Cloudflare Worker que actúa como proxy seguro hacia Google Places API. Seguí los pasos de abajo para obtenerla.</div>
          <div class="settings-field">
            <div class="form-group">
              <label class="form-label">URL del worker</label>
              <input class="form-input" id="settingBackendUrl" value="${s.backendUrl||''}" placeholder="https://search-leads.TU-USUARIO.workers.dev">
            </div>
          </div>
        </div>

        <div class="settings-card" style="grid-column:span 2">
          <div class="settings-card-title">Cómo activar Google Places real</div>
          <div class="settings-card-desc" style="margin-bottom:16px">Cuatro pasos — una sola vez. No requiere instalar nada.</div>
          <div class="api-endpoint-box"><span class="api-method">1</span> Obtener clave de API de Google

  console.cloud.google.com → APIs &amp; Services → Enable APIs
  Habilitar: <span class="api-key">Places API (New)</span>
  Credentials → Create API Key → copiar el valor

<span class="api-method">2</span> Crear el Cloudflare Worker (gratis, 100k req/día)

  workers.cloudflare.com → crear cuenta → Create a Worker
  Reemplazar todo el código con el contenido de:
  <span class="api-key">api-worker/search-leads.js</span> (en el repo)
  → Save and Deploy

<span class="api-method">3</span> Agregar el secret al Worker

  Workers → tu worker → Settings → Variables → Add variable:
  <span class="api-key">GOOGLE_PLACES_API_KEY</span> = <span class="api-val">AIzaSy...</span>  (marcar como secret)
  → Save and Deploy

<span class="api-method">4</span> Configurar en Lead Radar

  Copiar la URL del worker: <span class="api-val">https://search-leads.TU-USUARIO.workers.dev</span>
  Pegarla en el campo "Worker URL" (arriba) → Guardar cambios
  La próxima búsqueda usará datos reales de Google.</div>
        </div>

        <div class="settings-card">
          <div class="settings-card-title">Datos</div>
          <div class="settings-card-desc">Gestión de datos almacenados.</div>
          <button class="btn-secondary" id="btnExportCSV" style="margin-bottom:10px">
            <svg viewBox="0 0 16 16" fill="none"><path d="M3.5 12V15H12.5V12M8 3V10M5.5 7.5L8 10.5L10.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Exportar leads CSV
          </button>
          <div class="danger-zone">
            <div class="danger-zone-title">Zona de peligro</div>
            <button class="btn-danger" id="btnClearData">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2.5 3.5H11.5M5 3.5V2.5H9V3.5M4 3.5L4.5 12H9.5L10 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Borrar todos los datos
            </button>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card-title">Guardar configuración</div>
          <div class="settings-card-desc">Guardá los cambios de Worker URL.</div>
          <button class="btn-primary" id="btnSaveSettings">
            <svg viewBox="0 0 16 16" fill="none"><path d="M2.5 2.5H11L13.5 5V13.5H2.5V2.5Z" stroke="currentColor" stroke-width="1.3"/><rect x="5" y="8.5" width="6" height="5" rx="0.5" stroke="currentColor" stroke-width="1.3"/><rect x="5" y="2.5" width="4.5" height="3" rx="0.5" stroke="currentColor" stroke-width="1.3"/></svg>
            Guardar cambios
          </button>
        </div>

        <!-- ── USUARIOS ── -->
        <div class="settings-card" style="grid-column:span 2">
          <div class="settings-card-title">Usuarios</div>
          <div class="settings-card-desc">Usuarios registrados y sus roles en el sistema.</div>
          <table class="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div class="user-cell-row">
                    <div class="user-table-avatar" style="background:linear-gradient(135deg,var(--accent),var(--accent-dark))">P</div>
                    <span>Patricio</span>
                  </div>
                </td>
                <td class="user-email">patricio.monpelat@gmail.com</td>
                <td><span class="role-badge role-admin">Admin</span></td>
                <td><span class="user-status-active"><span class="user-status-dot"></span>Activo</span></td>
              </tr>
              <tr>
                <td>
                  <div class="user-cell-row">
                    <div class="user-table-avatar" style="background:linear-gradient(135deg,var(--purple),#9B8FE8)">C</div>
                    <span>Constanza</span>
                  </div>
                </td>
                <td class="user-email">—</td>
                <td><span class="role-badge role-user">Usuario</span></td>
                <td><span class="user-status-active"><span class="user-status-dot"></span>Activo</span></td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>`;

    /* ── Supabase connect ── */
    document.getElementById('btnConnectSupabase')?.addEventListener('click', async () => {
      const url = document.getElementById('settingSbUrl').value.trim();
      const key = document.getElementById('settingSbKey').value.trim();
      if (!url || !key) { toast('Completá la URL y la clave anon', 'warning'); return; }

      const btn = document.getElementById('btnConnectSupabase');
      btn.disabled = true;
      btn.textContent = 'Conectando...';

      try {
        await Storage.connectSupabase(url, key);
        toast('Conexión exitosa', 'success');

        /* Reload after short delay so status bar updates */
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        toast(`Error: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Conectar';
      }
    });

    /* ── Migrate localStorage → Supabase ── */
    document.getElementById('btnMigrateData')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnMigrateData');
      btn.disabled = true;
      btn.textContent = 'Migrando...';
      try {
        const count = await Storage.migrateFromLocalStorage();
        toast(`${count} leads migrados a Supabase`, 'success');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        toast(`Error al migrar: ${err.message}`, 'error');
        btn.disabled = false;
        btn.textContent = 'Migrar datos de localStorage';
      }
    });

    /* ── Save Worker URL ── */
    document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
      Storage.saveSettings({
        ...Storage.getSettings(),
        backendUrl: document.getElementById('settingBackendUrl').value.trim(),
      });
      toast('Configuración guardada', 'success');
    });

    /* ── Clear all data (async for Supabase) ── */
    document.getElementById('btnClearData')?.addEventListener('click', async () => {
      const target = Storage.isConnected() ? 'Supabase + localStorage' : 'localStorage';
      if (!confirm(`¿Seguro? Se eliminarán TODOS los leads y datos de ${target}.`)) return;
      await Storage.clearAll();
      toast('Datos eliminados. Recargando...', 'warning');
      setTimeout(() => location.reload(), 1200);
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', App.exportCSV);
  };

  /* ────────────────────────────────────────────────
     INSTAGRAM INBOX
  ──────────────────────────────────────────────── */
  const copyIgDm = (leadId) => {
    const lead = Storage.getLeads().find(l => l.id === leadId);
    if (!lead) return;
    const msg = Templates.renderById('instagram_dm', lead) || Templates.renderById('whatsapp_inicial', lead);
    navigator.clipboard.writeText(msg)
      .then(() => toast('DM de Instagram copiado', 'success'))
      .catch(() => toast('Error al copiar', 'error'));
  };

  const renderInbox = () => {
    const leads   = Storage.getLeads();
    const igLeads = leads.filter(l => l.instagram);
    const el      = document.getElementById('inboxContent');
    if (!el) return;

    const total     = igLeads.length;
    const contacted = igLeads.filter(l => ['contactado','respondio','propuesta_enviada','ganado','perdido'].includes(l.status)).length;
    const replied   = igLeads.filter(l => ['respondio','ganado'].includes(l.status)).length;

    if (!total) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24" style="opacity:.5">
              <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <div class="empty-state-title" style="font-family:'Syne',sans-serif;font-weight:700">Sin leads con Instagram</div>
          <div style="font-size:13px;color:var(--text-3)">Los leads con handle de Instagram aparecerán acá para gestionar sus DMs</div>
        </div>`;
      return;
    }

    const CONTACTED = ['contactado','respondio','propuesta_enviada','ganado','perdido'];
    const sorted = [...igLeads]
      .filter(l => CONTACTED.includes(l.status))
      .sort((a, b) => {
        const p = { respondio: 0, contactado: 1, propuesta_enviada: 2, ganado: 10, perdido: 11 };
        return (p[a.status] ?? 5) - (p[b.status] ?? 5);
      });

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div class="card" style="padding:18px 20px;text-align:center">
          <div style="font-size:28px;font-weight:800;font-family:'Syne',sans-serif;color:#E1306C">${total}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:3px">Con Instagram</div>
        </div>
        <div class="card" style="padding:18px 20px;text-align:center">
          <div style="font-size:28px;font-weight:800;font-family:'Syne',sans-serif;color:var(--warning)">${contacted}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:3px">Contactados</div>
        </div>
        <div class="card" style="padding:18px 20px;text-align:center">
          <div style="font-size:28px;font-weight:800;font-family:'Syne',sans-serif;color:var(--success)">${replied}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:3px">Respondieron</div>
        </div>
      </div>

      <div class="card" style="padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;border-color:rgba(225,48,108,0.2);background:rgba(225,48,108,0.04)">
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18" style="flex-shrink:0;color:#E1306C">
          <rect x="2" y="2" width="16" height="16" rx="4.5" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="14.2" cy="5.8" r="1" fill="currentColor"/>
        </svg>
        <div style="flex:1;font-size:12px;color:var(--text-3);line-height:1.5">
          Instagram no permite embeber su bandeja. Usá <strong style="color:var(--text-2)">Abrir chat</strong> en cada lead para ir directo a esa conversación en Instagram, o abrí la bandeja completa desde el botón de arriba.
        </div>
        <a href="https://www.instagram.com/direct/inbox/" target="_blank" rel="noopener"
           style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--r-sm);background:rgba(225,48,108,0.1);border:1px solid rgba(225,48,108,0.28);color:#E1306C;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;transition:var(--t)"
           onmouseover="this.style.background='rgba(225,48,108,0.22)'" onmouseout="this.style.background='rgba(225,48,108,0.1)'">
          <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><rect x="1.5" y="1.5" width="11" height="11" rx="3" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.1"/><circle cx="10.2" cy="3.8" r="0.7" fill="currentColor"/></svg>
          Abrir bandeja
        </a>
      </div>

      ${sorted.length === 0 ? `
        <div class="empty-state" style="margin-top:0">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24" style="opacity:.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="empty-state-title" style="font-family:'Syne',sans-serif;font-weight:700">Sin contactos por DM todavía</div>
          <div style="font-size:13px;color:var(--text-3)">Las cards aparecen cuando marcás un lead como <strong>Contactado</strong> o más avanzado</div>
        </div>` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${sorted.map(lead => {
          const handle      = lead.instagram.replace(/^@/, '').trim();
          const igChatHref  = `https://ig.me/m/${handle}`;
          const profileHref = `https://www.instagram.com/${handle}/`;
          const statusMeta  = Data.STATUS_META[lead.status] || Data.STATUS_META['nuevo'];
          return `
            <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                <div style="min-width:0">
                  <a href="${profileHref}" target="_blank" rel="noopener"
                     style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;background:rgba(225,48,108,0.1);border:1px solid rgba(225,48,108,0.25);color:#E1306C;font-size:11px;font-weight:600;text-decoration:none;margin-bottom:7px;max-width:100%">
                    <svg viewBox="0 0 10 10" fill="none" width="9" height="9" style="flex-shrink:0"><rect x="1" y="1" width="8" height="8" rx="2.2" stroke="currentColor" stroke-width="1.1"/><circle cx="5" cy="5" r="1.8" stroke="currentColor" stroke-width="1"/><circle cx="7.2" cy="2.8" r="0.5" fill="currentColor"/></svg>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">@${handle}</span>
                  </a>
                  <div style="font-size:13px;font-weight:700;font-family:'Syne',sans-serif;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lead.businessName}</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:2px">${lead.category} · ${lead.zone}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
                  ${scorePill(lead.opportunityScore)}
                  <span class="badge ${statusMeta.cls}" style="font-size:10px;white-space:nowrap">${statusMeta.label}</span>
                </div>
              </div>
              <div style="display:flex;gap:6px">
                <a href="${igChatHref}" target="_blank" rel="noopener"
                   style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:8px 10px;border-radius:var(--r-sm);background:rgba(225,48,108,0.1);border:1px solid rgba(225,48,108,0.25);color:#E1306C;font-size:12px;font-weight:600;text-decoration:none;transition:var(--t)"
                   onmouseover="this.style.background='rgba(225,48,108,0.2)'" onmouseout="this.style.background='rgba(225,48,108,0.1)'">
                  <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M10 3H4C2.9 3 2 3.9 2 5V9C2 10.1 2.9 11 4 11H5.5L7 12.5L8.5 11H10C11.1 11 12 10.1 12 9V5C12 3.9 11.1 3 10 3Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 6.5H9M5 8.5H7.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
                  Abrir chat
                </a>
                <button class="btn-secondary" style="padding:8px 10px;font-size:12px;flex-shrink:0"
                  onclick="UI.copyIgDm('${lead.id}')" title="Copiar DM de Instagram">
                  <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><rect x="3.5" y="2" width="7" height="9" rx="1.2" stroke="currentColor" stroke-width="1.2"/><path d="M2 4.5V12H9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                  Copiar DM
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`}
    `;
  };

  /* ────────────────────────────────────────────────
     NAV BADGE
  ──────────────────────────────────────────────── */
  const updateNavBadge = () => {
    const leads = Storage.getLeads();
    const el = document.getElementById('navLeadCount');
    if (el) el.textContent = leads.length;
    const igEl = document.getElementById('navIgCount');
    if (igEl) {
      const igCount = leads.filter(l => l.instagram).length;
      igEl.textContent = igCount;
      igEl.style.display = igCount ? '' : 'none';
    }
  };

  return {
    toast, statusBadge, priorityBadge, webQualityBadge, proposalBadge, scorePill, scoreBar,
    ratingHtml, formatDate,
    renderDashboard, renderSearchLoading, renderSearchResults,
    renderLeadsTable, renderKanban,
    openDrawer, closeDrawer, renderDrawer,
    openMapPanel, closeMapPanel,
    openAddModal, closeAddModal, getModalFormData,
    renderTemplates, insertTemplateVar, saveTemplates,
    renderSettings, updateNavBadge,
    renderInbox, copyIgDm,
  };
})();

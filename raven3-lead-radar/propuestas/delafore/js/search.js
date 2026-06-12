/* ═══════════════════════════════════════════════════════════
   DELAFORÉ BIENES RAÍCES — Motor de búsqueda + Formulario
   ───────────────────────────────────────────────────────────
   Funciones:
   1. Carga data/properties.json y filtra con los selectores del hero
   2. Actualiza opciones de precio según la tab activa
   3. Renderiza resultados en #results-grid con slider de fotos
   4. Renderiza propiedades destacadas en #featured-grid
   5. Envía el formulario de contacto a Formspree
   6. Chips de filtros activos, ordenamiento, favoritos
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ────────────────────────────────────
     OPCIONES DE PRECIO POR OPERACIÓN
  ──────────────────────────────────── */
  const PRECIO_OPTIONS = {
    venta: [
      ['',                  'Sin límite'],
      ['Hasta USD 100.000', 'Hasta USD 100.000'],
      ['Hasta USD 200.000', 'Hasta USD 200.000'],
      ['Hasta USD 350.000', 'Hasta USD 350.000'],
      ['Hasta USD 500.000', 'Hasta USD 500.000'],
      ['Hasta USD 750.000', 'Hasta USD 750.000'],
      ['Más de USD 750.000','Más de USD 750.000'],
    ],
    alquiler: [
      ['',                   'Sin límite'],
      ['Hasta $ 300.000',    'Hasta $ 300.000/mes'],
      ['Hasta $ 500.000',    'Hasta $ 500.000/mes'],
      ['Hasta $ 750.000',    'Hasta $ 750.000/mes'],
      ['Hasta $ 1.000.000',  'Hasta $ 1.000.000/mes'],
      ['Más de $ 1.000.000', 'Más de $ 1.000.000/mes'],
    ],
    temporal: [
      ['',                  'Sin límite'],
      ['Hasta USD 2.000',   'Hasta USD 2.000/mes'],
      ['Hasta USD 5.000',   'Hasta USD 5.000/mes'],
      ['Hasta USD 10.000',  'Hasta USD 10.000/mes'],
    ],
  };

  const BADGE_COLOR = { venta: 'bg-[#1A3C2E]', alquiler: 'bg-amber-700', temporal: 'bg-blue-700' };
  const BADGE_LABEL = { venta: 'Venta', alquiler: 'Alquiler', temporal: 'Temporal' };

  /* ────────────────────────────────────
     ESTADO LOCAL
  ──────────────────────────────────── */
  let allProperties = [];
  let lastResults   = [];
  let lastParams    = {};

  /* ────────────────────────────────────
     PARSERS DE FILTROS
  ──────────────────────────────────── */
  function parsePrecioFilter(value) {
    if (!value) return { min: 0, max: Infinity };
    const num = parseInt(value.replace(/[^\d]/g, ''), 10);
    if (isNaN(num)) return { min: 0, max: Infinity };
    return value.startsWith('Más de')
      ? { min: num, max: Infinity }
      : { min: 0, max: num };
  }

  function parseAmbientesMin(value) {
    if (!value) return 0;
    return parseInt(value, 10) || 0;
  }

  /* ────────────────────────────────────
     FILTRO PRINCIPAL
  ──────────────────────────────────── */
  function filterProperties({ operacion, tipo, zona, precioStr, ambientesStr }) {
    const pf  = parsePrecioFilter(precioStr);
    const amb = parseAmbientesMin(ambientesStr);

    return allProperties.filter(p => {
      if (operacion && p.operacion !== operacion) return false;
      if (tipo && p.tipo !== tipo)               return false;
      if (zona && p.zona !== zona)               return false;
      if (p.precio < pf.min || p.precio > pf.max) return false;
      if (amb > 0 && p.ambientes < amb)           return false;
      return true;
    });
  }

  /* ────────────────────────────────────
     ORDENAMIENTO
  ──────────────────────────────────── */
  function sortProperties(list, criterion) {
    const copy = [...list];
    switch (criterion) {
      case 'precio-asc':  return copy.sort((a, b) => a.precio - b.precio);
      case 'precio-desc': return copy.sort((a, b) => b.precio - a.precio);
      case 'sup-desc':    return copy.sort((a, b) => (b.sup_total || 0) - (a.sup_total || 0));
      default:            return copy.sort((a, b) => (b.destacada ? 1 : 0) - (a.destacada ? 1 : 0));
    }
  }

  /* ────────────────────────────────────
     RENDER DE TARJETA CON SLIDER
  ──────────────────────────────────── */
  function renderCard(p) {
    const badgeBg  = BADGE_COLOR[p.operacion]  || 'bg-gray-600';
    const badgeTxt = BADGE_LABEL[p.operacion]  || p.operacion;

    const precioBase = p.moneda === 'USD'
      ? `USD ${p.precio.toLocaleString('es-AR')}`
      : `$ ${p.precio.toLocaleString('es-AR')}`;

    const precioPeriodo = p.operacion !== 'venta'
      ? `${precioBase}<span class="text-sm font-sans font-normal text-[#6B7280]"> /mes</span>`
      : precioBase;

    /* Slider de imágenes */
    const imgs = (p.images && p.images.length) ? p.images : [p.img];

    const slidesHTML = imgs.map((src, i) =>
      `<img src="${src}" alt="${p.titulo} — foto ${i + 1}"
            class="slider-slide min-w-full h-full object-cover"
            loading="${i === 0 ? 'eager' : 'lazy'}"
            onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=60'">`
    ).join('');

    const dotsHTML = imgs.length > 1
      ? `<div class="slider-dots">
           ${imgs.map((_, i) => `<span class="slider-dot${i === 0 ? ' active' : ''}"></span>`).join('')}
         </div>`
      : '';

    const arrowsHTML = imgs.length > 1
      ? `<button class="slider-prev" aria-label="Foto anterior">
           <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
         </button>
         <button class="slider-next" aria-label="Siguiente foto">
           <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
         </button>`
      : '';

    const counterHTML = imgs.length > 1
      ? `<span class="photo-counter">1 / ${imgs.length}</span>`
      : '';

    const destacadaBadge = p.destacada
      ? '<span class="absolute top-3 right-10 bg-[#C9A96E] text-[#1A3C2E] text-[10px] font-bold px-2.5 py-1 tracking-wide z-10">Destacada</span>'
      : '';

    /* Specs */
    const specs = [];
    if (p.ambientes > 0) specs.push(`
      <span class="flex items-center gap-1.5" title="Ambientes">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M3 9L12 3l9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>
        </svg>
        ${p.ambientes} amb.
      </span>`);

    if (p.banos > 0) specs.push(`
      <span class="flex items-center gap-1.5" title="Baños">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M9 6V3.5a1.5 1.5 0 013 0V6M4 12h16v5a3 3 0 01-3 3H7a3 3 0 01-3-3v-5z"/>
        </svg>
        ${p.banos} ${p.banos === 1 ? 'baño' : 'baños'}
      </span>`);

    if (p.sup_cubierta > 0) specs.push(`
      <span class="flex items-center gap-1.5" title="Sup. cubierta">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="1"/>
        </svg>
        ${p.sup_cubierta} m²
      </span>`);

    if (p.sup_total > p.sup_cubierta) specs.push(`
      <span class="flex items-center gap-1.5 text-[#C9A96E] font-medium" title="Sup. total">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 21V9"/>
        </svg>
        ${p.sup_total} m² tot.
      </span>`);

    return `
      <article class="prop-card bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 cursor-pointer"
               data-slider="true" tabindex="0" aria-label="${p.titulo}">

        <!-- Área de imagen con slider -->
        <div class="card-img-wrap relative overflow-hidden" style="aspect-ratio:4/3">
          <div class="slider-track flex h-full">
            ${slidesHTML}
          </div>

          <!-- Badge operación -->
          <span class="absolute top-3 left-3 ${badgeBg} text-white text-[10px] font-bold px-3 py-1 tracking-widest uppercase z-10">${badgeTxt}</span>

          <!-- Badge destacada -->
          ${destacadaBadge}

          <!-- Botón favorito -->
          <button class="fav-btn" data-id="${p.id}" aria-label="Guardar en favoritos" title="Guardar en favoritos">
            <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>

          <!-- Flechas del slider -->
          ${arrowsHTML}

          <!-- Dots indicadores -->
          ${dotsHTML}

          <!-- Contador de fotos -->
          ${counterHTML}
        </div>

        <!-- Cuerpo de la tarjeta -->
        <div class="card-body p-5">
          <span class="font-serif text-2xl font-bold text-[#1A3C2E]">${precioPeriodo}</span>
          <h3 class="text-[#1E1E1E] font-semibold text-[15px] mt-2 mb-1">${p.titulo}</h3>
          <p class="text-[#6B7280] text-sm flex items-center gap-1.5 mb-4">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            ${p.zona}, ${p.municipio}
          </p>
          <div class="flex items-center gap-4 text-[#6B7280] text-xs border-t border-gray-100 pt-4 flex-wrap">
            ${specs.join('')}
          </div>
        </div>
      </article>`;
  }

  /* ────────────────────────────────────
     RENDER — PROPIEDADES DESTACADAS
  ──────────────────────────────────── */
  function renderFeatured() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    const destacadas = allProperties.filter(p => p.destacada).slice(0, 6);
    if (destacadas.length === 0) return;

    grid.innerHTML = destacadas.map(renderCard).join('');

    /* Inicializar sliders y favoritos */
    if (typeof window.initSliders === 'function') window.initSliders(grid);
    if (typeof window.initFavorites === 'function') window.initFavorites(grid);

    /* Fade-in para prop-cards */
    const cardObs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity   = '1';
          e.target.style.transform = 'translateY(0)';
          cardObs.unobserve(e.target);
        }
      }),
      { threshold: 0.08 }
    );
    grid.querySelectorAll('.prop-card').forEach(c => {
      c.style.opacity    = '0';
      c.style.transform  = 'translateY(22px)';
      c.style.transition = 'opacity 0.52s ease, transform 0.52s ease';
      cardObs.observe(c);
    });
  }

  /* ────────────────────────────────────
     RENDER — SECCIÓN RESULTADOS
  ──────────────────────────────────── */
  function showResults(properties, params) {
    const section = document.getElementById('resultados');
    const grid    = document.getElementById('results-grid');
    const countEl = document.getElementById('results-count');
    const queryEl = document.getElementById('results-query');
    if (!section || !grid) return;

    lastResults = properties;
    lastParams  = params;

    /* Resumen de búsqueda */
    if (queryEl) {
      const parts = [];
      if (params.operacion) parts.push(params.operacion.charAt(0).toUpperCase() + params.operacion.slice(1));
      if (params.tipo)      parts.push(params.tipo);
      if (params.zona)      parts.push(params.zona);
      queryEl.textContent = parts.length ? parts.join(' · ') : 'Todas las propiedades';
    }

    /* Contador */
    if (countEl) {
      const n = properties.length;
      countEl.textContent = n === 0
        ? 'Sin resultados'
        : `${n} propiedad${n !== 1 ? 'es' : ''} encontrada${n !== 1 ? 's' : ''}`;
    }

    /* Chips de filtros activos */
    renderFilterChips(params);

    /* Contenido del grid */
    if (properties.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-20">
          <svg class="mx-auto mb-4 text-gray-200" width="72" height="72" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <p class="text-[#1E1E1E] text-lg font-semibold mb-1">Sin resultados</p>
          <p class="text-[#6B7280] text-sm">Probá ampliando los filtros de búsqueda.</p>
        </div>`;
    } else {
      const sortVal = document.getElementById('sort-select')?.value || 'relevancia';
      const sorted  = sortProperties(properties, sortVal);
      grid.innerHTML = sorted.map(renderCard).join('');

      if (typeof window.initSliders === 'function') window.initSliders(grid);
      if (typeof window.initFavorites === 'function') window.initFavorites(grid);
    }

    section.classList.remove('hidden');
    const offset = 88;
    const top    = section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  /* ────────────────────────────────────
     CHIPS DE FILTROS ACTIVOS
  ──────────────────────────────────── */
  function renderFilterChips(params) {
    const container = document.getElementById('filter-chips');
    if (!container) return;

    const chips = [];
    if (params.operacion)    chips.push({ key: 'operacion', label: params.operacion.charAt(0).toUpperCase() + params.operacion.slice(1) });
    if (params.tipo)         chips.push({ key: 'tipo',       label: params.tipo });
    if (params.zona)         chips.push({ key: 'zona',       label: params.zona });
    if (params.precioStr)    chips.push({ key: 'precio',     label: params.precioStr });
    if (params.ambientesStr) chips.push({ key: 'ambientes',  label: params.ambientesStr });

    container.innerHTML = chips.map(chip => `
      <span class="filter-chip">
        ${chip.label}
        <button onclick="window._removeChip && window._removeChip('${chip.key}')" aria-label="Quitar filtro ${chip.label}">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </span>`).join('');
  }

  /* ────────────────────────────────────
     ACTUALIZAR OPCIONES DE PRECIO
     Nota: Esta función ahora está definida en index.html
     para evitar conflictos con los event listeners de tabs
  ──────────────────────────────────── */
  // Función stub — la verdadera está en index.html
  if (typeof window.updatePrecioOptions !== 'function') {
    window.updatePrecioOptions = function(tab) {
      const sel = document.getElementById('select-precio');
      if (!sel) return;
      const opts = PRECIO_OPTIONS[tab] || PRECIO_OPTIONS.venta;
      sel.innerHTML = opts
        .map(([v, l]) => `<option value="${v}">${l}</option>`)
        .join('');
    };
  }

  /* ────────────────────────────────────
     CARGA DE DATOS
  ──────────────────────────────────── */
  async function loadProperties() {
    if (allProperties.length) return;
    try {
      const res = await fetch('data/properties.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allProperties = await res.json();

      /* Actualizar stat y renderizar destacadas */
      const statEl = document.getElementById('stat-propiedades');
      if (statEl) statEl.textContent = '+' + allProperties.length;

      renderFeatured();
    } catch (err) {
      console.warn('[DLF] No se pudo cargar properties.json:', err.message);
    }
  }

  /* ────────────────────────────────────
     FORMULARIO — ENVÍO VÍA FORMSPREE
     ─────────────────────────────────
     CONFIGURACIÓN:
     1. Registrate en https://formspree.io
     2. Creá un form apuntando a info@delafore.com
     3. Pegá el Form ID en el action del <form>
  ──────────────────────────────────── */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const btn           = this.querySelector('button[type="submit"]');
      const originalText  = btn.textContent.trim();
      const originalClass = btn.className;

      btn.textContent = 'Enviando…';
      btn.disabled    = true;
      btn.classList.add('opacity-70', 'cursor-not-allowed');

      try {
        const response = await fetch(this.action, {
          method:  'POST',
          body:    new FormData(this),
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          btn.textContent = '✓ Mensaje enviado — te contactamos pronto';
          btn.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-[#1A3C2E]', 'hover:bg-[#2C5F45]');
          btn.classList.add('bg-green-600');
          this.reset();
          setTimeout(() => {
            btn.textContent = originalText;
            btn.className   = originalClass;
            btn.disabled    = false;
          }, 6000);
        } else {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }
      } catch (err) {
        btn.textContent = '✕ Error al enviar — intentá de nuevo';
        btn.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-[#1A3C2E]');
        btn.classList.add('bg-red-600');
        btn.disabled = false;
        setTimeout(() => {
          btn.textContent = originalText;
          btn.className   = originalClass;
        }, 5000);
      }
    });
  }

  /* ────────────────────────────────────
     BOOTSTRAP — espera DOMContentLoaded
  ──────────────────────────────────── */
  function bootstrap() {
    /* Carga proactiva del JSON */
    loadProperties();

    /* Inicializar los tabs (ahora en index.html — initTabsHandler) */
    if (typeof window.initTabsHandler === 'function') {
      window.initTabsHandler();
    }

    /* Botón "Buscar propiedades" */
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', async () => {
        await loadProperties();

        const activeTab = document.querySelector('.search-tab.is-active');
        const params = {
          operacion:    activeTab ? activeTab.dataset.tab : 'venta',
          tipo:         document.getElementById('select-tipo')?.value        || '',
          zona:         document.getElementById('select-zona')?.value        || '',
          precioStr:    document.getElementById('select-precio')?.value      || '',
          ambientesStr: document.getElementById('select-ambientes')?.value   || '',
        };

        /* Skeleton loader */
        const grid = document.getElementById('results-grid');
        if (grid) {
          grid.innerHTML = Array(3).fill('').map(() => `
            <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
              <div class="skeleton w-full" style="aspect-ratio:4/3"></div>
              <div class="p-5 space-y-3">
                <div class="skeleton h-7 w-2/3 rounded"></div>
                <div class="skeleton h-4 w-3/4 rounded"></div>
                <div class="skeleton h-3 w-1/2 rounded"></div>
              </div>
            </div>`).join('');
          document.getElementById('resultados')?.classList.remove('hidden');
        }

        const results = filterProperties(params);
        await new Promise(r => setTimeout(r, 280));
        showResults(results, params);
      });
    }

    /* Ordenamiento en tiempo real */
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        if (lastResults.length > 0) {
          const grid = document.getElementById('results-grid');
          if (!grid) return;
          const sorted = sortProperties(lastResults, sortSelect.value);
          grid.innerHTML = sorted.map(renderCard).join('');
          if (typeof window.initSliders === 'function') window.initSliders(grid);
          if (typeof window.initFavorites === 'function') window.initFavorites(grid);
        }
      });
    }

    /* Botón "Limpiar búsqueda" */
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.getElementById('resultados')?.classList.add('hidden');
        const chips = document.getElementById('filter-chips');
        if (chips) chips.innerHTML = '';
        lastResults = [];
        document.getElementById('propiedades')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    /* Quitar chip individual y re-buscar */
    window._removeChip = function(key) {
      const selectMap = {
        tipo:      'select-tipo',
        zona:      'select-zona',
        precio:    'select-precio',
        ambientes: 'select-ambientes',
      };
      if (key === 'operacion') {
        const tabs = document.querySelectorAll('.search-tab');
        tabs.forEach((t, i) => t.classList.toggle('is-active', i === 0));
      } else if (selectMap[key]) {
        const el = document.getElementById(selectMap[key]);
        if (el) el.value = '';
      }
      document.getElementById('search-btn')?.click();
    };

    /* Formulario de contacto */
    initContactForm();
  }

  /* Inicializar cuando el DOM esté listo */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    /* Si DOMContentLoaded ya ocurrió, ejecutar inmediatamente */
    bootstrap();
  }

})();

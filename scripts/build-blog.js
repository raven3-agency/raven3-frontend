#!/usr/bin/env node
/**
 * Genera el blog estático a partir de blog/data/posts.json y en/blog/data/posts-en.json.
 *
 * Por qué: los bots de IA (GPTBot, ClaudeBot, PerplexityBot…) no ejecutan JavaScript.
 * Con el render client-side de post.html?slug=… veían una página vacía. Este script
 * escribe un HTML completo por artículo, con contenido, metas y JSON-LD en el HTML.
 *
 * Uso:  node scripts/build-blog.js
 * Correrlo cada vez que se agrega o edita un post en los JSON. Sin dependencias.
 *
 * Genera / actualiza:
 *   blog/<slug>.html           → https://raven3.com.ar/blog/<slug>
 *   en/blog/<slug>.html        → https://raven3.com.ar/en/blog/<slug>.html
 *   blog/post.html, en/blog/post.html   → redirección de las URLs viejas (?slug=)
 *   blog/index.html, en/blog/index.html → JSON-LD del Blog + listado estático (<noscript>)
 *   sitemap.xml                → bloque entre <!-- BLOG:START --> y <!-- BLOG:END -->
 *   llms.txt                   → bloque entre <!-- BLOG:START --> y <!-- BLOG:END -->
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://raven3.com.ar';
const OG_IMAGE = `${SITE}/assets/img/og/raven3.png`;

// Posts con traducción al inglés: slug ES -> slug EN
const EN_TRANSLATION = {
  'cea-american-cadena-frio-web-corporativa': 'cea-american-cold-chain-corporate-website',
  'etienne-de-montebello-experiencia-editorial-interactiva': 'etienne-de-montebello-interactive-editorial-experience',
  'ndb-propiedades-integracion-tokko-broker': 'ndb-propiedades-tokko-broker-integration',
  'sgm-sitio-institucional-ecommerce-comunidad': 'sgm-institutional-site-ecommerce-community',
  'lassen-pharma-web-corporativa-seo-tecnico': 'lassen-pharma-corporate-website-technical-seo',
  'beforce-catalogo-digital-identidad-visual': 'beforce-digital-catalog-visual-identity',
  'okos-sitio-institucional-minimalista': 'okos-minimalist-institutional-website',
  'art1-web-corporativa-seo-accesibilidad': 'art1-corporate-website-seo-accessibility',
  'knots-ecommerce-tienda-nube-ux-producto': 'knots-ecommerce-product-ux',
  'core-web-vitals-2024-guia-practica': 'core-web-vitals-practical-guide',
  'tendencias-desarrollo-web-2026': 'web-development-trends-2026',
  'geo-generative-engine-optimization-argentina': 'geo-generative-engine-optimization-guide',
  'llms-txt-que-es-como-implementarlo': 'llms-txt-what-it-is-how-to-implement',
  'shopify-vs-woocommerce-vs-desarrollo-a-medida': 'shopify-vs-woocommerce-vs-custom-development',
  'design-systems-proyectos-web': 'design-systems-for-web-projects'
};
const ES_ORIGINAL = Object.fromEntries(Object.entries(EN_TRANSLATION).map(([es, en]) => [en, es]));

// ── URLs ───────────────────────────────────────────────────────────────────
// ES usa URLs sin extensión (como el resto del sitio en español); EN usa .html (como /en/).
const url = {
  es: { href: s => `/blog/${s}`, abs: s => `${SITE}/blog/${s}`, index: `${SITE}/blog/` },
  en: { href: s => `/en/blog/${s}.html`, abs: s => `${SITE}/en/blog/${s}.html`, index: `${SITE}/en/blog/` }
};
function altUrls(lang, slug) {
  // Devuelve { es, en } absolutas (o null si no hay traducción)
  if (lang === 'es') {
    const en = EN_TRANSLATION[slug];
    return { es: url.es.abs(slug), en: en ? url.en.abs(en) : null };
  }
  const es = ES_ORIGINAL[slug];
  return { es: es ? url.es.abs(es) : null, en: url.en.abs(slug) };
}

// ── Textos por idioma ──────────────────────────────────────────────────────
const T = {
  es: {
    dir: 'blog', data: 'blog/data/posts.json', template: 'scripts/templates/blog-post.es.html',
    tagLabels: { seo: 'SEO Técnico', performance: 'Performance', desarrollo: 'Desarrollo', ecommerce: 'E-Commerce', ux: 'UX / CRO' },
    services: {
      seo: ['SEO técnico', '/servicios/seo-tecnico'],
      performance: ['SEO técnico', '/servicios/seo-tecnico'],
      ecommerce: ['Tiendas online', '/servicios/tiendas-online'],
      desarrollo: ['Desarrollo web a medida', '/servicios/desarrollo-web-a-medida'],
      ux: ['Desarrollo web a medida', '/servicios/desarrollo-web-a-medida']
    },
    blogHref: '/blog/', home: `${SITE}/`,
    featured: 'Destacado', minRead: 'min de lectura', back: 'Volver al Blog', tags: 'Tags:', share: 'Compartir:',
    shareX: 'Compartir en X/Twitter', shareIn: 'Compartir en LinkedIn', copy: 'Copiar link', copied: '¡Copiado!',
    tocAria: 'Tabla de contenidos', toc: 'En este artículo', details: 'Detalles',
    ctaEyebrow: '¿Querés implementar esto?', ctaTitle: 'Trabajemos juntos en tu proyecto.',
    ctaSub: 'Auditamos tu sitio y te mostramos dónde está la oportunidad real.', ctaService: 'Ver servicio relacionado:',
    ctaAudit: ['Auditoría gratuita', '/auditoria-web-gratuita'], ctaCases: ['Ver casos', '/clientes'],
    related: 'Seguí leyendo', blogSuffix: 'Raven3 Blog', locale: 'es_AR',
    redirectTitle: 'Redirigiendo… — Raven3 Blog', redirectText: 'Este artículo cambió de dirección.', redirectLink: 'Ir al blog'
  },
  en: {
    dir: 'en/blog', data: 'en/blog/data/posts-en.json', template: 'scripts/templates/blog-post.en.html',
    tagLabels: { seo: 'Technical SEO', performance: 'Performance', desarrollo: 'Web Development', ecommerce: 'E-Commerce', ux: 'UX / CRO' },
    services: {
      seo: ['Technical SEO', '/en/services/technical-seo.html'],
      performance: ['Technical SEO', '/en/services/technical-seo.html'],
      ecommerce: ['Online Stores', '/en/services/online-stores.html'],
      desarrollo: ['Custom Web Development', '/en/services/custom-web-development.html'],
      ux: ['Custom Web Development', '/en/services/custom-web-development.html']
    },
    blogHref: '/en/blog/', home: `${SITE}/en/`,
    featured: 'Featured', minRead: 'min read', back: 'Back to Blog', tags: 'Tags:', share: 'Share:',
    shareX: 'Share on X/Twitter', shareIn: 'Share on LinkedIn', copy: 'Copy link', copied: 'Copied!',
    tocAria: 'Table of contents', toc: 'In this article', details: 'Details',
    ctaEyebrow: 'Want to implement this?', ctaTitle: "Let's work together on your project.",
    ctaSub: "We'll audit your site and show you where the real opportunity is.", ctaService: 'See related service:',
    ctaAudit: ['Free web audit', '/en/free-web-audit.html'], ctaCases: ['See our work', '/en/clients.html'],
    related: 'Keep reading', blogSuffix: 'Raven3 Blog', locale: 'en_US',
    redirectTitle: 'Redirecting… — Raven3 Blog', redirectText: 'This article has moved.', redirectLink: 'Go to the blog'
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────
// Lee normalizando a LF; write respeta el fin de línea que tenía el archivo (CRLF/LF)
const eolOf = {};
const read = p => {
  const raw = fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/^\uFEFF/, '');
  eolOf[p] = raw.includes('\r\n') ? '\r\n' : '\n';
  return raw.replace(/\r\n/g, '\n');
};
const write = (p, s) => {
  const full = path.join(ROOT, p);
  if (!(p in eolOf) && fs.existsSync(full)) read(p);
  fs.writeFileSync(full, eolOf[p] === '\r\n' ? s.replace(/\n/g, '\r\n') : s);
};
const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const jsonLd = obj => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '');

function slugify(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'seccion';
}

// Agrega ids a los h2/h3 del contenido y arma el índice (TOC)
function withHeadingIds(html) {
  const used = new Set();
  const toc = [];
  const out = html.replace(/<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/g, (m, tag, attrs = '', inner) => {
    const text = stripTags(inner);
    const existing = attrs.match(/\sid="([^"]+)"/);
    let id = existing ? existing[1] : slugify(text);
    if (!existing) { let n = 2; const base = id; while (used.has(id)) id = `${base}-${n++}`; }
    used.add(id);
    toc.push({ level: tag, id, text });
    return existing ? m : `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
  });
  return { html: out, toc };
}

function fill(template, vars) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`Placeholder sin valor: ${m}`);
    return vars[k];
  });
}

// ── Página de un post ──────────────────────────────────────────────────────
const ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const ICON_TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const TAG_CLASSES = { seo: 'tag', performance: 'tag tag--perf', desarrollo: 'tag tag--dev', ecommerce: 'tag tag--ecomm', ux: 'tag tag--ux' };
const tc = cat => TAG_CLASSES[cat] || 'tag';

function renderHead(lang, post) {
  const t = T[lang];
  const canonical = url[lang].abs(post.slug);
  const alt = altUrls(lang, post.slug);
  const title = `${post.title} — ${t.blogSuffix}`;
  const modified = post.dateModified || post.date;
  const hreflang = [
    alt.es && `  <link rel="alternate" hreflang="es" href="${alt.es}" />`,
    alt.en && `  <link rel="alternate" hreflang="en" href="${alt.en}" />`,
    `  <link rel="alternate" hreflang="x-default" href="${alt.es || alt.en}" />`
  ].filter(Boolean).join('\n');

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        headline: post.title,
        description: post.excerpt,
        inLanguage: lang,
        datePublished: post.date,
        dateModified: modified,
        url: canonical,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        image: OG_IMAGE,
        articleSection: t.tagLabels[post.category] || post.category,
        keywords: (post.tags || []).join(', '),
        wordCount: stripTags(post.content).split(/\s+/).filter(Boolean).length,
        author: { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Raven3', url: t.home },
        publisher: {
          '@type': 'Organization',
          '@id': `${SITE}/#organization`,
          name: 'Raven3',
          url: t.home,
          logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/logo2.png` }
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Blog', item: url[lang].index },
          { '@type': 'ListItem', position: 2, name: post.title, item: canonical }
        ]
      }
    ]
  };

  return `  <title>${e(title)}</title>
  <meta name="description" content="${e(post.excerpt)}" />
  <link rel="canonical" href="${canonical}" />
${hreflang}
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta name="theme-color" content="#04080E" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Raven3" />
  <meta property="og:locale" content="${t.locale}" />
  <meta property="og:title" content="${e(title)}" />
  <meta property="og:description" content="${e(post.excerpt)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="article:published_time" content="${post.date}" />
  <meta property="article:modified_time" content="${modified}" />
  <meta property="article:section" content="${e(t.tagLabels[post.category] || post.category)}" />
${(post.tags || []).map(tag => `  <meta property="article:tag" content="${e(tag)}" />`).join('\n')}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${e(title)}" />
  <meta name="twitter:description" content="${e(post.excerpt)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />

  <script type="application/ld+json">
${jsonLd(ld)}
  </script>`;
}

function renderMain(lang, post, related) {
  const t = T[lang];
  const tl = cat => t.tagLabels[cat] || cat;
  const canonical = url[lang].abs(post.slug);
  const { html: body, toc } = withHeadingIds(post.content);
  const tocHtml = toc.map(h => `<li class="toc-item toc-item--${h.level}"><a href="#${h.id}" data-id="${h.id}">${e(h.text)}</a></li>`).join('');
  const service = t.services[post.category];
  const shortTitle = post.title.length > 40 ? `${post.title.substring(0, 40)}…` : post.title;

  const relatedCards = related.map(r => `
          <a class="post-card" href="${url[lang].href(r.slug)}">
            <div class="pc-thumb"><div class="thumb-art ${e(r.thumbClass || 'thumb-art--seo')}"></div></div>
            <div class="pc-body">
              <span class="${e(tc(r.category))}" style="font-size:8px">${e(tl(r.category))}</span>
              <h3 class="pc-title">${e(r.title)}</h3>
              <div class="pc-footer"><span class="post-date">${e(r.dateFormatted)}</span><span class="read-time">${e(r.readTime)} min</span></div>
            </div>
          </a>`).join('');

  return `    <!-- HERO -->
    <section class="post-hero">
      <div class="post-hero__inner">
        <nav class="post-breadcrumb" aria-label="Breadcrumb">
          <a href="${t.blogHref}">Blog</a>
          <span aria-hidden="true">›</span>
          <a href="${t.blogHref}?filter=${encodeURIComponent(post.category)}">${e(tl(post.category))}</a>
          <span aria-hidden="true">›</span>
          <span style="color:var(--bt-m)">${e(shortTitle)}</span>
        </nav>

        <div class="post-eyebrow">
          <span class="${e(tc(post.category))}">${e(tl(post.category))}</span>
          ${post.featured ? `<span class="tag" style="background:rgba(0,229,200,0.12);border-color:rgba(0,229,200,0.3)">${t.featured}</span>` : ''}
        </div>

        <h1 class="post-hero__title">${e(post.title)}</h1>
        <p class="post-hero__excerpt">${e(post.excerpt)}</p>

        <div class="post-hero__meta">
          <div class="author-chip">
            <div class="author-avatar">${e(post.author.initials)}</div>
            <div><div class="author-name">${e(post.author.name)}</div><div class="author-role">${e(post.author.role)}</div></div>
          </div>
          <div class="post-meta-sep" aria-hidden="true"></div>
          <div class="post-meta-item">
            ${ICON_CAL}
            <time datetime="${post.date}">${e(post.dateFormatted)}</time>
          </div>
          <div class="post-meta-sep" aria-hidden="true"></div>
          <div class="post-meta-item">
            ${ICON_CLOCK}
            ${e(post.readTime)} ${t.minRead}
          </div>
        </div>
      </div>
    </section>

    <!-- COVER ART -->
    <div class="post-cover" aria-hidden="true">
      <div class="post-cover__art">
        <div class="post-cover__art-bg thumb-art ${e(post.thumbClass || 'thumb-art--seo')}"></div>
        <svg class="cover-glyph" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r="100" stroke-dasharray="4 8"/>
          <circle cx="120" cy="120" r="70" stroke-dasharray="2 6"/>
          <circle cx="120" cy="120" r="40" stroke-dasharray="6 12"/>
          <line x1="20" y1="120" x2="220" y2="120" stroke="rgba(0,229,200,0.3)" stroke-width="0.5"/>
          <line x1="120" y1="20" x2="120" y2="220" stroke="rgba(0,229,200,0.3)" stroke-width="0.5"/>
        </svg>
        <span class="cover-sys">SYS.BLOG // ${e(post.category.toUpperCase())} // ${e(post.slug.toUpperCase())}</span>
      </div>
    </div>

    <!-- LAYOUT: Content + Sidebar -->
    <div class="post-layout">
      <article class="post-content-col">
        <a href="${t.blogHref}" class="back-link" style="display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--ba-dim);text-decoration:none;margin-bottom:40px;transition:color .2s">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          ${t.back}
        </a>

        <div class="post-content" id="article-body">${body}</div>

        <div class="post-footer">
          <div class="post-tags">
            <span class="post-tags-label">${t.tags}</span>
            ${(post.tags || []).map(tag => `<span class="tag" style="font-size:9px">${e(tag)}</span>`).join('')}
          </div>
          <div class="post-share">
            <span class="share-label">${t.share}</span>
            <a class="share-btn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&amp;url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener" aria-label="${t.shareX}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Twitter
            </a>
            <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener" aria-label="${t.shareIn}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <button class="share-btn" id="copy-link-btn" type="button" data-url="${canonical}" aria-label="${t.copy}">
              ${ICON_COPY}
              ${t.copy}
            </button>
          </div>
        </div>
      </article>

      <aside class="post-sidebar" aria-label="${t.tocAria}">${tocHtml ? `
        <div class="toc">
          <p class="toc-title">${t.toc}</p>
          <ul class="toc-list" id="toc-list">${tocHtml}</ul>
        </div>` : ''}
        <div class="sidebar-info" style="margin-top:${tocHtml ? '20px' : '0'}">
          <p class="sidebar-info__label">${t.details}</p>
          <p class="sidebar-info__date">${ICON_CAL}${e(post.dateFormatted)}</p>
          <p class="sidebar-info__time">${ICON_CLOCK}${e(post.readTime)} ${t.minRead}</p>
          <p class="sidebar-info__cat">${ICON_TAG}<span class="${e(tc(post.category))}" style="font-size:8px">${e(tl(post.category))}</span></p>
        </div>
      </aside>
    </div>

    <!-- CTA -->
    <div class="post-cta">
      <div class="cta-banner">
        <div class="cta-banner__copy">
          <p class="cta-banner__eyebrow">${t.ctaEyebrow}</p>
          <h2 class="cta-banner__title">${t.ctaTitle}</h2>
          <p class="cta-banner__sub">${t.ctaSub}</p>${service ? `
          <p class="cta-banner__sub" style="margin-top:10px"><a href="${service[1]}" style="color:var(--ba);border-bottom:1px solid rgba(0,229,200,0.3)">${t.ctaService} ${e(service[0])} →</a></p>` : ''}
        </div>
        <div class="cta-banner__btns">
          <a class="btn primary" href="${t.ctaAudit[1]}">${t.ctaAudit[0]}</a>
          <a class="btn" href="${t.ctaCases[1]}">${t.ctaCases[0]}</a>
        </div>
      </div>
    </div>
${related.length ? `
    <!-- Related -->
    <section class="related-section" style="margin-top:60px">
      <div class="related-inner">
        <p class="related-label">${t.related}</p>
        <div class="related-grid">${relatedCards}
        </div>
      </div>
    </section>` : ''}`;
}

function renderScript(lang) {
  const t = T[lang];
  return `    document.getElementById('year').textContent = new Date().getFullYear();

    // Reading progress bar
    window.addEventListener('scroll', () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
      document.getElementById('progress-bar').style.width = Math.min(scrolled, 100) + '%';
    }, { passive: true });

    // Active TOC on scroll + smooth scroll
    const tocLinks = document.querySelectorAll('#toc-list a');
    if (tocLinks.length) {
      const tocObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(l => l.classList.toggle('active', l.dataset.id === entry.target.id));
        });
      }, { rootMargin: '-80px 0px -70% 0px' });
      document.querySelectorAll('#article-body h2[id], #article-body h3[id]').forEach(h => tocObserver.observe(h));

      tocLinks.forEach(link => {
        link.addEventListener('click', ev => {
          const target = document.getElementById(link.dataset.id);
          if (!target) return;
          ev.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', '#' + link.dataset.id);
        });
      });
    }

    // Copy link button
    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
      const idle = copyBtn.innerHTML;
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(copyBtn.dataset.url).then(() => {
          copyBtn.textContent = '${t.copied}';
          setTimeout(() => { copyBtn.innerHTML = idle; }, 2000);
        });
      });
    }`;
}

function pickRelated(post, posts) {
  const others = posts.filter(p => p.slug !== post.slug);
  const same = others.filter(p => p.category === post.category).slice(0, 3);
  return same.length ? same : others.slice(0, 3);
}

// ── Redirección de las URLs viejas post.html?slug=… ────────────────────────
function renderRedirect(lang, posts) {
  const t = T[lang];
  const slugs = posts.map(p => p.slug);
  const target = lang === 'es' ? "'/blog/' + s" : "'/en/blog/' + s + '.html'";
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <!-- Archivo generado por scripts/build-blog.js. Redirige las URLs viejas post.html?slug=… a las páginas estáticas. -->
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t.redirectTitle}</title>
  <meta name="robots" content="noindex,follow" />
  <script>
    (function () {
      var slugs = ${JSON.stringify(slugs)};
      var s = new URLSearchParams(location.search).get('slug');
      location.replace(s && slugs.indexOf(s) !== -1 ? ${target} + location.hash : '${t.blogHref}');
    })();
  </script>
  <style>body{background:#04080E;color:#c8dce6;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}a{color:#00E5C8}</style>
</head>
<body>
  <p>${t.redirectText} <a href="${t.blogHref}">${t.redirectLink}</a></p>
</body>
</html>
`;
}

// ── Índice del blog: JSON-LD + listado estático ───────────────────────────
function shortDate(lang, iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (lang === 'es') {
    const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d} ${M[m - 1]} ${y}`;
  }
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${M[m - 1]} ${d}, ${y}`;
}

function updateIndex(lang, posts) {
  const t = T[lang];
  const file = `${t.dir}/index.html`;
  let html = read(file);
  const sorted = [...posts].sort(byDateDesc);

  // 1) blogPost[] dentro del JSON-LD de tipo Blog
  const blogLd = html.match(/<script type="application\/ld\+json">\s*(\{[\s\S]*?"@type":\s*"Blog"[\s\S]*?\})\s*<\/script>/);
  if (!blogLd) throw new Error(`${file}: no se encontró el JSON-LD de tipo Blog`);
  const data = JSON.parse(blogLd[1]);
  data.blogPost = sorted.map(p => ({
    '@type': 'BlogPosting', headline: p.title, url: url[lang].abs(p.slug), datePublished: p.date,
    author: { '@type': 'Organization', name: 'Raven3' }
  }));
  const blogPostLines = data.blogPost.map(b => '    ' + JSON.stringify(b)).join(',\n');
  const ldText = JSON.stringify({ ...data, blogPost: '__POSTS__' }, null, 2).replace('"__POSTS__"', `[\n${blogPostLines}\n  ]`);
  html = html.replace(blogLd[1], () => ldText);

  // 2) Listado estático dentro del <noscript>
  const list = sorted.map(p =>
    `        <li><a href="${url[lang].href(p.slug)}"><span>${e(t.tagLabels[p.category] || p.category)} · ${shortDate(lang, p.date)}</span> — <strong>${e(p.title)}</strong></a></li>`
  ).join('\n');
  const ulRe = /(<noscript>[\s\S]*?<ul[^>]*>\n)[\s\S]*?(\n\s*<\/ul>[\s\S]*?<\/noscript>)/;
  if (!ulRe.test(html)) throw new Error(`${file}: no se encontró la lista dentro de <noscript>`);
  html = html.replace(ulRe, (m, a, b) => a + list + b);

  // 3) Links de las cards renderizadas por JS
  html = html.replace(/href="post\.html\?slug=\$\{(\w+)\.slug\}"/g, (m, v) =>
    lang === 'es' ? `href="/blog/\${${v}.slug}"` : `href="/en/blog/\${${v}.slug}.html"`);

  write(file, html);
}

// ── Bloques con marcadores en sitemap.xml y llms.txt ──────────────────────
function replaceMarked(text, start, end, block, fallback) {
  const i = text.indexOf(start), j = text.indexOf(end);
  if (i !== -1 && j !== -1) return text.slice(0, i) + block + text.slice(j + end.length);
  return fallback(text);
}

function updateSitemap(postsByLang) {
  const file = 'sitemap.xml';
  let xml = read(file);

  // Prioridades existentes (se conservan si el post ya estaba)
  const prio = {};
  for (const m of xml.matchAll(/<loc>[^<]*?(?:slug=|\/blog\/)([a-z0-9-]+?)(?:\.html)?<\/loc>[\s\S]*?<priority>([\d.]+)<\/priority>/g)) prio[m[1]] = m[2];

  const entry = (lang, p) => {
    const alt = altUrls(lang, p.slug);
    // hreflang solo para posts con traducción (igual que antes)
    const links = !(alt.es && alt.en) ? '' : [
      alt.es && `    <xhtml:link rel="alternate" hreflang="es" href="${alt.es}" />`,
      alt.en && `    <xhtml:link rel="alternate" hreflang="en" href="${alt.en}" />`,
      (alt.es && alt.en) && `    <xhtml:link rel="alternate" hreflang="x-default" href="${alt.es}" />`
    ].filter(Boolean).join('\n');
    return `  <url>
    <loc>${url[lang].abs(p.slug)}</loc>
${links ? links + '\n' : ''}    <lastmod>${p.dateModified || p.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${prio[p.slug] || '0.70'}</priority>
  </url>`;
  };
  const header = title => `  <!-- ══════════════════════════════════════════
       ${title}
  ══════════════════════════════════════════ -->`;

  const block = `<!-- BLOG:START — generado por scripts/build-blog.js -->
${header('BLOG POSTS — ES (newest first)')}

${[...postsByLang.es].sort(byDateDesc).map(p => entry('es', p)).join('\n\n')}


${header('BLOG POSTS — EN (translated subset)')}

${[...postsByLang.en].sort(byDateDesc).map(p => entry('en', p)).join('\n\n')}
  <!-- BLOG:END -->`;

  xml = replaceMarked(xml, '<!-- BLOG:START', '<!-- BLOG:END -->', block, x => {
    // Primera corrida: reemplaza desde el encabezado "BLOG POSTS — ES" hasta el encabezado siguiente al último post
    const startHdr = x.lastIndexOf('<!-- ═', x.indexOf('BLOG POSTS — ES'));
    const lastPost = x.lastIndexOf('post.html?slug=');
    const nextHdr = x.indexOf('<!-- ═', lastPost);
    if (startHdr < 0 || lastPost < 0 || nextHdr < 0) throw new Error('sitemap.xml: no se encontró la sección del blog');
    return x.slice(0, startHdr) + block + '\n\n\n  ' + x.slice(nextHdr);
  });
  write(file, xml);
}

function updateLlms(postsByLang) {
  const file = 'llms.txt';
  let txt = read(file);
  const line = (lang, p) => `- [${p.title}](${url[lang].abs(p.slug)}): ${p.excerpt}`;
  const block = `<!-- BLOG:START — generado por scripts/build-blog.js -->
## Blog — artículos

Artículos técnicos de Raven3 sobre desarrollo web, SEO técnico, GEO (visibilidad en buscadores con IA), performance, e-commerce y UX, más casos de estudio de proyectos reales. Índice: [Blog](${SITE}/blog/).

${[...postsByLang.es].sort(byDateDesc).map(p => line('es', p)).join('\n')}

### Blog — English articles

${[...postsByLang.en].sort(byDateDesc).map(p => line('en', p)).join('\n')}
<!-- BLOG:END -->`;

  txt = replaceMarked(txt, '<!-- BLOG:START', '<!-- BLOG:END -->', block, x => {
    const anchor = x.indexOf('\n## Casos de uso recomendados');
    if (anchor < 0) throw new Error('llms.txt: no se encontró dónde insertar la sección del blog');
    return x.slice(0, anchor + 1) + block + '\n\n' + x.slice(anchor + 1);
  });
  write(file, txt);
}

// ── Main ───────────────────────────────────────────────────────────────────
function main() {
  const postsByLang = {};
  for (const lang of ['es', 'en']) {
    const t = T[lang];
    const raw = JSON.parse(read(t.data));
    const posts = Array.isArray(raw) ? raw : raw.posts;
    postsByLang[lang] = posts;

    const slugs = new Set();
    for (const p of posts) {
      if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`[${lang}] slug inválido: ${p.slug}`);
      if (['index', 'post'].includes(p.slug) || slugs.has(p.slug)) throw new Error(`[${lang}] slug reservado o duplicado: ${p.slug}`);
      slugs.add(p.slug);
    }

    const template = read(t.template);
    for (const post of posts) {
      const alt = altUrls(lang, post.slug);
      const html = fill(template, {
        HEAD: renderHead(lang, post),
        MAIN: renderMain(lang, post, pickRelated(post, posts)),
        SCRIPT: renderScript(lang),
        URL_ES: alt.es ? alt.es.replace(SITE, '') : '/blog/',
        URL_EN: alt.en ? alt.en.replace(SITE, '') : '/en/blog/'
      });
      write(`${t.dir}/${post.slug}.html`, html);
    }
    write(`${t.dir}/post.html`, renderRedirect(lang, posts));
    updateIndex(lang, posts);
    console.log(`[${lang}] ${posts.length} posts generados en ${t.dir}/`);
  }

  // Validar el mapa de traducciones
  const esSlugs = new Set(postsByLang.es.map(p => p.slug)), enSlugs = new Set(postsByLang.en.map(p => p.slug));
  for (const [es, en] of Object.entries(EN_TRANSLATION)) {
    if (!esSlugs.has(es)) throw new Error(`EN_TRANSLATION: no existe el post ES ${es}`);
    if (!enSlugs.has(en)) throw new Error(`EN_TRANSLATION: no existe el post EN ${en}`);
  }
  for (const s of enSlugs) if (!ES_ORIGINAL[s]) console.warn(`Aviso: el post EN ${s} no tiene original ES en EN_TRANSLATION`);

  updateSitemap(postsByLang);
  updateLlms(postsByLang);
  console.log('sitemap.xml y llms.txt actualizados.');
}

main();

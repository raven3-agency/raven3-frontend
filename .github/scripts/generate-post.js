/**
 * Generador automático de posts para el blog de Raven3
 * Se ejecuta cada lunes via GitHub Actions
 *
 * Texto → Google Gemini 2.0 Flash (tier GRATUITO, sin tarjeta)
 * Thumbnails via CSS fallback (sin generación de imagen)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');

// ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Rotación de categorías (una por semana, ciclo de 5 semanas)
const CATEGORY_ROTATION = ['desarrollo', 'seo', 'ecommerce', 'ux', 'performance'];

const CAT_META = {
  desarrollo: {
    label:      'Desarrollo Web',
    thumbClass: 'thumb-art--dev',
    role:       'Desarrollo Web · Raven3',
    topics: [
      'arquitectura de sitios web modernos',
      'JavaScript avanzado para desarrolladores web',
      'accesibilidad web y estándares WCAG',
      'seguridad en desarrollo web front-end',
      'animaciones CSS y web performance',
      'Progressive Web Apps (PWA)',
      'testing en proyectos web',
      'APIs REST y consumo desde el front-end',
      'Git y flujo de trabajo profesional',
      'variables CSS y design tokens'
    ]
  },
  seo: {
    label:      'SEO Técnico',
    thumbClass: 'thumb-art--seo',
    role:       'SEO Técnico · Raven3',
    topics: [
      'cómo funciona el algoritmo de Google en 2025',
      'link building estratégico para pymes',
      'SEO para e-commerce: categorías y fichas de producto',
      'contenido E-E-A-T y cómo aplicarlo',
      'search intent y cómo escribir para posicionar',
      'SEO para imágenes y búsqueda visual',
      'featured snippets y cómo obtenerlos',
      'Core Web Vitals como factor de posicionamiento',
      'SEO internacional y hreflang',
      'Search Console: cómo leer e interpretar los datos'
    ]
  },
  ecommerce: {
    label:      'E-Commerce',
    thumbClass: 'thumb-art--ecom',
    role:       'E-Commerce · Raven3',
    topics: [
      'email marketing para recuperar clientes',
      'estrategias de pricing para tiendas online',
      'fotografía de producto que convierte',
      'logística y envíos: cómo no perder clientes en la entrega',
      'temporadas y fechas clave: cómo preparar tu tienda',
      'métricas clave del e-commerce que debés medir',
      'marketplace vs tienda propia: ventajas y desventajas',
      'fidelización de clientes en e-commerce',
      'descripciones de producto que venden',
      'pagos y medios de cobro en Argentina'
    ]
  },
  ux: {
    label:      'UX / CRO',
    thumbClass: 'thumb-art--ux',
    role:       'UX · CRO · Raven3',
    topics: [
      'psicología del color aplicada al diseño web',
      'A/B testing: cómo hacerlo bien desde cero',
      'micro-interacciones que mejoran la experiencia',
      'formularios que convierten: principios y ejemplos',
      'tipografía web y legibilidad',
      'diseño de error states y empty states',
      'cómo hacer pruebas de usabilidad sin presupuesto',
      'dark patterns: qué son y por qué evitarlos',
      'sistemas de diseño para proyectos web',
      'eye tracking y patrones de lectura en pantalla'
    ]
  },
  performance: {
    label:      'Performance',
    thumbClass: 'thumb-art--perf',
    role:       'Performance Web · Raven3',
    topics: [
      'caché del navegador: guía práctica',
      'cómo elegir el hosting correcto para tu sitio',
      'imágenes responsivas con srcset y sizes',
      'JavaScript bloqueante: diagnóstico y solución',
      'HTTP/2 y HTTP/3: qué cambia para el desarrollador',
      'Service Workers y estrategias de caché offline',
      'prefetch y preload: cuándo usar cada uno',
      'monitoreo de performance en producción',
      'optimización de fuentes web en 2025',
      'Lighthouse CI: automatizar auditorías de performance'
    ]
  }
};

// ── UTILIDADES ────────────────────────────────────────────────────────────────

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function formatDateES(date) {
  return date.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── SELECCIÓN DE CATEGORÍA Y TEMA ─────────────────────────────────────────────

function getNextCategoryAndTopic(posts) {
  const weekNum = getWeekNumber(new Date());
  const category = CATEGORY_ROTATION[weekNum % CATEGORY_ROTATION.length];
  const meta = CAT_META[category];

  const usedTopics = posts
    .filter(p => p.category === category && p._generatedTopic)
    .map(p => p._generatedTopic);

  const availableTopics = meta.topics.filter(t => !usedTopics.includes(t));
  const topicPool = availableTopics.length > 0 ? availableTopics : meta.topics;
  const topic = topicPool[weekNum % topicPool.length];

  return { category, meta, topic };
}

// ── GENERACIÓN DE TEXTO CON GEMINI (GRATIS) ───────────────────────────────────

async function generatePostContent(category, meta, topic) {
  const prompt = `Sos el equipo de contenidos de Raven3, una agencia de desarrollo web y marketing digital argentina. Escribís posts educativos de alta calidad para el blog de la agencia.

Tu tarea es generar un artículo de blog completo, profundo y valioso sobre: "${topic}"
Categoría: ${meta.label}

OBJETIVO DEL ARTÍCULO:
Este artículo debe ser el mejor recurso en español sobre el tema. Alguien que lo lea tiene que sentir que aprendió algo concreto y útil que puede aplicar hoy. Debe ser el tipo de contenido que la gente guarda, comparte y vuelve a leer.

REQUISITOS DE CONTENIDO:
- Título atractivo con la keyword principal, orientado a búsquedas en Google
- Bajada/excerpt de 2-3 oraciones que enganche al lector y resuma el valor
- Entre 8 y 12 tags relevantes con keywords de búsqueda (long-tail incluidas)
- Longitud: 2000 a 3000 palabras de contenido visible (artículo extenso y completo)
- Tono profesional pero cercano, en español rioplatense (Argentina)
- Orientado a dueños de pymes, emprendedores, profesionales y equipos de marketing argentinos

REQUISITOS DE CALIDAD:
- Incluir datos concretos, estadísticas o referencias cuando sea relevante (ej: "según Google, el 53% de los usuarios abandona un sitio que tarda más de 3 segundos")
- Ejemplos reales y prácticos que el lector pueda aplicar directamente
- Comparativas o tablas cuando corresponda (ej: herramienta A vs B)
- Al menos una sección de "errores comunes" o "mitos" sobre el tema
- Conclusión accionable con pasos concretos que el lector puede seguir
- Incluir keywords secundarias y variaciones semánticas de forma natural a lo largo del texto
- Cada sección debe aportar valor real, no ser relleno

ESTRUCTURA REQUERIDA:
- Introducción que enganche y plantee el problema/oportunidad
- Secciones temáticas claras con h2 y h3
- Listas, comparativas y ejemplos intercalados
- Sección de errores comunes o mitos
- Conclusión con checklist o pasos a seguir

FORMATO DEL CONTENIDO HTML:
- Solo usar etiquetas: h2, h3, p, ul, li, ol, strong, em
- IMPORTANTE: todos los atributos HTML deben ir con comillas SIMPLES (no dobles)
- No incluir imágenes ni iframes
- No incluir la etiqueta h1 (el título va aparte)

Respondé ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:

{
  "title": "Título del post",
  "excerpt": "Bajada corta del post",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "readTime": 12,
  "content": "<h2>...</h2><p>...</p>"
}

El campo "readTime" es un número entero de minutos estimados de lectura.
El campo "content" es HTML válido en una sola línea sin saltos de línea.`;

  console.log(`🤖 Llamando a Gemini 2.0 Flash para generar post sobre: "${topic}"`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
      temperature: 0.7
    }
  });

  let result;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      const wait = attempt * 35000;
      console.log(`⏳ Rate limit (intento ${attempt}/3), reintentando en ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  const rawText = result.response.text().trim();

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini no devolvió un JSON válido:\n' + rawText.substring(0, 300));

  const parsed = JSON.parse(jsonMatch[0]);
  const required = ['title', 'excerpt', 'tags', 'readTime', 'content'];
  for (const field of required) {
    if (!parsed[field]) throw new Error(`Campo requerido faltante en la respuesta: ${field}`);
  }

  return parsed;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando generador de post semanal Raven3...\n');

  const postsPath = path.join(process.cwd(), 'blog/data/posts.json');
  const rawData = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
  const posts = Array.isArray(rawData) ? rawData : rawData.posts;

  console.log(`📚 Posts actuales: ${posts.length}`);

  const { category, meta, topic } = getNextCategoryAndTopic(posts);
  console.log(`📂 Categoría de esta semana: ${meta.label}`);
  console.log(`💡 Tema seleccionado: ${topic}\n`);

  const existingSlugs = posts.map(p => p.slug);

  // 1. Generar texto con Gemini (gratis)
  const generated = await generatePostContent(category, meta, topic);

  // Construir slug único
  let slug = slugify(generated.title);
  let slugCandidate = slug;
  let slugSuffix = 2;
  while (existingSlugs.includes(slugCandidate)) {
    slugCandidate = `${slug}-${slugSuffix++}`;
  }
  slug = slugCandidate;

  // 2. Construir el post
  const today = new Date();
  const newId = Math.max(...posts.map(p => p.id)) + 1;

  const newPost = {
    id:            newId,
    slug,
    title:         generated.title,
    excerpt:       generated.excerpt,
    category,
    tags:          generated.tags,
    date:          today.toISOString().split('T')[0],
    dateFormatted: formatDateES(today),
    readTime:      generated.readTime,
    featured:      false,
    thumbClass:    meta.thumbClass,
    author: {
      name:     'Equipo Raven3',
      role:     meta.role,
      initials: 'R3'
    },
    _generatedTopic: topic,
    content: generated.content
  };

  console.log(`\n✅ Post generado:`);
  console.log(`   ID:      ${newPost.id}`);
  console.log(`   Slug:    ${newPost.slug}`);
  console.log(`   Título:  ${newPost.title}`);
  console.log(`   Lectura: ${newPost.readTime} min`);
  console.log(`   Imagen:  (CSS fallback)\n`);

  posts.push(newPost);

  const output = Array.isArray(rawData) ? posts : { ...rawData, posts };
  fs.writeFileSync(postsPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`💾 posts.json actualizado con ${posts.length} posts en total`);
  console.log('🎉 ¡Listo! El post fue generado y guardado correctamente.');
}

main().catch(err => {
  console.error('❌ Error generando el post:', err.message);
  process.exit(1);
});

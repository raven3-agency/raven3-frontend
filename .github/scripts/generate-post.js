/**
 * Generador automático de posts para el blog de Raven3
 * Se ejecuta cada lunes via GitHub Actions
 * Usa la API de Claude para generar contenido educativo de calidad
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ── CONFIGURACIÓN ─────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// ── SELECCIÓN DE CATEGORÍA Y TEMA ─────────────────────────────────────────────

function getNextCategoryAndTopic(posts) {
  const today = new Date();
  const weekNum = getWeekNumber(today);

  // Categoría según semana del año
  const category = CATEGORY_ROTATION[weekNum % CATEGORY_ROTATION.length];
  const meta = CAT_META[category];

  // Obtener temas ya usados para esta categoría
  const usedTopics = posts
    .filter(p => p.category === category && p._generatedTopic)
    .map(p => p._generatedTopic);

  // Elegir tema disponible (evitar repetir)
  const availableTopics = meta.topics.filter(t => !usedTopics.includes(t));
  const topicPool = availableTopics.length > 0 ? availableTopics : meta.topics;
  const topic = topicPool[weekNum % topicPool.length];

  return { category, meta, topic };
}

// ── GENERACIÓN CON CLAUDE ─────────────────────────────────────────────────────

async function generatePostContent(category, meta, topic, existingSlugs) {
  const prompt = `Sos el equipo de contenidos de Raven3, una agencia de desarrollo web y marketing digital argentina. Escribís posts educativos para el blog de la agencia.

Tu tarea es generar un post de blog completo sobre: "${topic}"
Categoría: ${meta.label}

REQUISITOS DEL POST:
- Título atractivo, con keyword principal incluida, orientado a búsquedas
- Bajada/excerpt de 1-2 oraciones que resuma el valor del artículo
- Entre 5 y 8 tags relevantes con palabras clave de búsqueda
- Contenido educativo, práctico, con ejemplos concretos
- Tono profesional pero cercano, en español rioplatense (Argentina)
- Longitud: 900 a 1400 palabras de contenido visible
- Estructura clara con h2 y h3
- Debe incluir listas, ejemplos y conclusiones accionables
- Orientado a dueños de pymes, emprendedores y profesionales argentinos

FORMATO DEL CONTENIDO HTML:
- Solo usar etiquetas: h2, h3, p, ul, li, ol, strong
- IMPORTANTE: todos los atributos HTML deben ir con comillas SIMPLES (no dobles)
- No incluir imágenes ni iframes
- No incluir la etiqueta h1 (el título va aparte)

Respondé ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (sin texto adicional antes ni después):

{
  "title": "Título del post",
  "excerpt": "Bajada corta del post",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "readTime": 8,
  "content": "<h2>...</h2><p>...</p>"
}

El campo "readTime" debe ser un número entero estimado de minutos de lectura.
El campo "content" debe ser HTML válido en una sola línea (sin saltos de línea dentro del string JSON).`;

  console.log(`🤖 Llamando a Claude para generar post sobre: "${topic}"`);

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });

  const rawText = message.content[0].text.trim();

  // Extraer el JSON de la respuesta (por si Claude agrega texto extra)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('La respuesta de Claude no contiene un JSON válido:\n' + rawText.substring(0, 500));
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validar campos requeridos
  const required = ['title', 'excerpt', 'tags', 'readTime', 'content'];
  for (const field of required) {
    if (!parsed[field]) throw new Error(`Campo requerido faltante: ${field}`);
  }

  return parsed;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando generador de post semanal Raven3...\n');

  // Leer posts.json actual
  const postsPath = path.join(process.cwd(), 'blog/data/posts.json');
  const rawData = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
  const posts = Array.isArray(rawData) ? rawData : rawData.posts;

  console.log(`📚 Posts actuales: ${posts.length}`);

  // Determinar categoría y tema
  const { category, meta, topic } = getNextCategoryAndTopic(posts);
  console.log(`📂 Categoría de esta semana: ${meta.label}`);
  console.log(`💡 Tema seleccionado: ${topic}\n`);

  // Slugs existentes para evitar duplicados
  const existingSlugs = posts.map(p => p.slug);

  // Generar contenido con Claude
  const generated = await generatePostContent(category, meta, topic, existingSlugs);

  // Construir el nuevo post
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const newId = Math.max(...posts.map(p => p.id)) + 1;
  let slug = slugify(generated.title);

  // Asegurar slug único
  let slugCandidate = slug;
  let slugSuffix = 2;
  while (existingSlugs.includes(slugCandidate)) {
    slugCandidate = `${slug}-${slugSuffix++}`;
  }
  slug = slugCandidate;

  const newPost = {
    id: newId,
    slug,
    title: generated.title,
    excerpt: generated.excerpt,
    category,
    tags: generated.tags,
    date: dateStr,
    dateFormatted: formatDateES(today),
    readTime: generated.readTime,
    featured: false,
    thumbClass: meta.thumbClass,
    author: {
      name: 'Equipo Raven3',
      role: meta.role,
      initials: 'R3'
    },
    _generatedTopic: topic,   // Guardamos el tema para evitar repetirlo
    content: generated.content
  };

  console.log(`✅ Post generado:`);
  console.log(`   ID:    ${newPost.id}`);
  console.log(`   Slug:  ${newPost.slug}`);
  console.log(`   Título: ${newPost.title}`);
  console.log(`   Lectura: ${newPost.readTime} min\n`);

  // Agregar al array de posts
  posts.push(newPost);

  // Mantener la estructura original del JSON
  const output = Array.isArray(rawData)
    ? posts
    : { ...rawData, posts };

  // Escribir el archivo actualizado
  fs.writeFileSync(postsPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`💾 posts.json actualizado con ${posts.length} posts en total`);
  console.log('🎉 ¡Listo! El post fue generado y guardado correctamente.');
}

main().catch(err => {
  console.error('❌ Error generando el post:', err.message);
  process.exit(1);
});

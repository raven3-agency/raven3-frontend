/**
 * Generador automático de posts para el blog de Raven3
 * Se ejecuta cada lunes via GitHub Actions
 *
 * Texto  → Google Gemini 1.5 Flash (tier GRATUITO, sin tarjeta)
 * Imagen → Pollinations.ai         (100% gratis, sin cuenta ni API key)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

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

function downloadUrl(url, destPath, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    const req = protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(destPath, () => {});
        return downloadUrl(res.headers.location, destPath, timeoutMs)
          .then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode} al descargar imagen`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      file.close();
      fs.unlink(destPath, () => {});
      reject(new Error('Timeout descargando imagen'));
    });
    req.on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
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

Respondé ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:

{
  "title": "Título del post",
  "excerpt": "Bajada corta del post",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "readTime": 8,
  "content": "<h2>...</h2><p>...</p>"
}

El campo "readTime" es un número entero de minutos estimados de lectura.
El campo "content" es HTML válido en una sola línea sin saltos de línea.`;

  console.log(`🤖 Llamando a Gemini 1.5 Flash para generar post sobre: "${topic}"`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
      temperature: 0.7
    }
  });

  const result = await model.generateContent(prompt);
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

// ── GENERACIÓN DE IMAGEN CON POLLINATIONS.AI (GRATIS, SIN API KEY) ────────────

const CAT_VISUAL = {
  desarrollo:  'software code architecture, programming, dark blue tech aesthetic',
  seo:         'search engine data visualization, analytics, digital signals',
  ecommerce:   'online shopping, product conversion, digital commerce',
  ux:          'user interface design, interaction patterns, digital experience',
  performance: 'web performance speed, optimization, loading metrics'
};

async function generatePostImage(topic, category, slug) {
  const visual = CAT_VISUAL[category] || 'digital technology abstract';

  const imagePrompt = [
    `Editorial blog thumbnail illustration.`,
    `Topic: ${topic}. Theme: ${visual}.`,
    `Style: dark navy background, vibrant cyan teal glowing accents,`,
    `abstract geometric grid pattern, cinematic lighting, minimalist tech aesthetic.`,
    `High contrast, professional, no text, no people, no faces.`
  ].join(' ');

  // Pollinations.ai: gratis, sin autenticación, genera la imagen al hacer GET
  const seed = getWeekNumber(new Date()) * 1000 + Math.floor(Math.random() * 999);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1792&height=1024&seed=${seed}&nologo=true&enhance=true`;

  console.log(`🎨 Generando imagen con Pollinations.ai (gratis)...`);

  const imagesDir = path.join(process.cwd(), 'blog/data/images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const imagePath = path.join(imagesDir, `${slug}.jpg`);

  // Pollinations puede tardar hasta 30-60s en generar la imagen
  await downloadUrl(pollinationsUrl, imagePath, 90000);

  console.log(`✅ Imagen guardada: blog/data/images/${slug}.jpg`);
  return `/blog/data/images/${slug}.jpg`;
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

  // 2. Generar imagen con Pollinations.ai (gratis)
  let imageUrl = null;
  try {
    imageUrl = await generatePostImage(topic, category, slug);
  } catch (imgErr) {
    console.warn(`⚠️  No se pudo generar la imagen: ${imgErr.message}`);
    console.warn(`   El post se guardará con el thumbnail CSS de fallback.`);
  }

  // 3. Construir el post
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
    ...(imageUrl && { imageUrl }),
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
  console.log(`   Imagen:  ${imageUrl || '(CSS fallback)'}\n`);

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

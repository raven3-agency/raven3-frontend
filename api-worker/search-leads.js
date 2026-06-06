const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const FREE_BUILDER_RE =
  /wix\.com|wixsite\.com|negocio\.site|business\.site|blogspot\.com|weebly\.com|jimdo\.com|wordpress\.com|squarespace\.com|tiendanube\.com|mitienda\.com/;

const INSTAGRAM_RE =
  /instagram\.com\/(?!(?:p|reel|reels|stories|explore|tv|direct|accounts|highlights)\/)([a-zA-Z0-9_.]{1,30})(?:[/?#"'\s<]|$)/i;

const WHATSAPP_LINK_RE =
  /(?:wa\.me\/|whatsapp\.com\/send[^"'<\s]*phone=)(\+?[\d]{7,15})/i;

function detectWebsiteQuality(url) {
  if (!url) return 'none';
  return FREE_BUILDER_RE.test(url.toLowerCase()) ? 'poor' : 'average';
}

async function scrapeWebsiteForSocials(websiteUrl) {
  try {
    const res = await fetch(websiteUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (!res.ok) return {};
    const html = await res.text();

    const igMatch = html.match(INSTAGRAM_RE);
    const waMatch = html.match(WHATSAPP_LINK_RE);

    return {
      instagram: igMatch ? `@${igMatch[1]}` : null,
      whatsapp: waMatch ? waMatch[1].replace(/^\+/, '') : null,
    };
  } catch {
    return {};
  }
}

function inferWhatsAppFromPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('54')) return digits;
  if (digits.startsWith('0')) return `549${digits.slice(1)}`;
  return `549${digits}`;
}

function mapPlace(place, category, zone) {
  const website = place.websiteUri || null;
  const oh = place.regularOpeningHours;
  return {
    id: `gp_${place.id}`,
    businessName: place.displayName?.text || 'Sin nombre',
    category,
    zone,
    address: place.formattedAddress || '',
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    rating: place.rating || 0,
    reviewsCount: place.userRatingCount || 0,
    website,
    hasWebsite: !!website,
    websiteQuality: detectWebsiteQuality(website),
    instagram: null,
    whatsapp: null,
    photos: (place.photos || []).slice(0, 3).map(p => p.name),
    openingHours: oh ? {
      openNow: oh.openNow || false,
      weekdayDescriptions: oh.weekdayDescriptions || [],
    } : null,
    source: 'Google Places API',
    status: 'nuevo',
    notes: '',
    diagnosis: '',
    recommendedPitch: '',
    lastContactDate: null,
    nextActionDate: null,
    activityLog: [{ type: 'created', text: 'Lead importado desde Google Places', ts: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function enrichLead(lead) {
  const socials = lead.website ? await scrapeWebsiteForSocials(lead.website) : {};
  const whatsapp = socials.whatsapp || inferWhatsAppFromPhone(lead.phone);
  return {
    ...lead,
    instagram: socials.instagram || null,
    whatsapp: whatsapp || null,
  };
}

/* ── Route: GET /photo?name=places/.../photos/... ── */
async function handlePhoto(request, env, url) {
  const name = url.searchParams.get('name');
  if (!name) {
    return new Response(JSON.stringify({ error: 'name requerido' }), { status: 400, headers: CORS });
  }
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 503, headers: CORS });
  }
  try {
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=600&key=${apiKey}`,
      { redirect: 'follow', signal: AbortSignal.timeout(8000) }
    );
    if (!photoRes.ok) return new Response(null, { status: photoRes.status });
    const img = await photoRes.arrayBuffer();
    return new Response(img, {
      headers: {
        'Content-Type': photoRes.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

/* ── Route: GET /check?url=https://... ── */
async function handleCheck(request, env, url) {
  const siteUrl = url.searchParams.get('url');
  if (!siteUrl) {
    return new Response(JSON.stringify({ error: 'url requerido' }), { status: 400, headers: CORS });
  }
  const t0 = Date.now();
  try {
    const res = await fetch(siteUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Raven3Bot/1.0)' },
    });
    return new Response(
      JSON.stringify({ online: res.status < 500, status: res.status, ms: Date.now() - t0 }),
      { headers: CORS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ online: false, status: 0, ms: Date.now() - t0, error: err.message }),
      { headers: CORS }
    );
  }
}

/* ── Route: POST / (search leads) ── */
async function handleSearch(request, env) {
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'GOOGLE_PLACES_API_KEY no configurada. Ir a Workers → Settings → Variables → Add secret.',
      }),
      { status: 503, headers: CORS }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: CORS });
  }

  const { category, zone, limit = 10 } = body;
  if (!category || !zone) {
    return new Response(
      JSON.stringify({ error: '"category" y "zone" son requeridos' }),
      { status: 400, headers: CORS }
    );
  }

  const maxResultCount = Math.max(1, Math.min(Number(limit) || 10, 20));

  let placesRes;
  try {
    placesRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.internationalPhoneNumber',
          'places.rating',
          'places.userRatingCount',
          'places.websiteUri',
          'places.businessStatus',
          'places.photos',
          'places.regularOpeningHours',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: `${category} en ${zone}`,
        maxResultCount,
        languageCode: 'es',
        regionCode: 'AR',
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Error de red al contactar Google: ${err.message}` }),
      { status: 502, headers: CORS }
    );
  }

  if (!placesRes.ok) {
    let errMsg = `Google Places API error ${placesRes.status}`;
    try {
      const errJson = await placesRes.json();
      errMsg = errJson.error?.message || errMsg;
    } catch {}
    return new Response(JSON.stringify({ error: errMsg }), {
      status: placesRes.status >= 500 ? 502 : placesRes.status,
      headers: CORS,
    });
  }

  const data = await placesRes.json();
  const leads = (data.places || []).map((p) => mapPlace(p, category, zone));
  const enrichedLeads = await Promise.all(leads.map(enrichLead));

  return new Response(JSON.stringify({ leads: enrichedLeads }), { status: 200, headers: CORS });
}

/* ── Main entry point ── */
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/photo') {
      return handlePhoto(request, env, url);
    }

    if (request.method === 'GET' && url.pathname === '/check') {
      return handleCheck(request, env, url);
    }

    if (request.method === 'POST') {
      return handleSearch(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: CORS });
  },
};

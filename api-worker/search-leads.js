const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const FREE_BUILDER_RE =
  /wix\.com|wixsite\.com|negocio\.site|business\.site|blogspot\.com|weebly\.com|jimdo\.com|wordpress\.com|squarespace\.com|tiendanube\.com|mitienda\.com/;

function detectWebsiteQuality(url) {
  if (!url) return 'none';
  return FREE_BUILDER_RE.test(url.toLowerCase()) ? 'poor' : 'average';
}

function mapPlace(place, category, zone) {
  const website = place.websiteUri || null;
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
    source: 'Google Places API',
    status: 'nuevo',
    notes: '',
    diagnosis: '',
    recommendedPitch: '',
    lastContactDate: null,
    nextActionDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed' }),
        { status: 405, headers: CORS }
      );
    }

    const apiKey = env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'GOOGLE_PLACES_API_KEY no configurada. Ir a Workers → Settings → Variables → Add secret.',
        }),
        { status: 503, headers: CORS }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON inválido' }),
        { status: 400, headers: CORS }
      );
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
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: placesRes.status >= 500 ? 502 : placesRes.status, headers: CORS }
      );
    }

    const data = await placesRes.json();
    const leads = (data.places || []).map((p) => mapPlace(p, category, zone));

    return new Response(
      JSON.stringify({ leads }),
      { status: 200, headers: CORS }
    );
  },
};

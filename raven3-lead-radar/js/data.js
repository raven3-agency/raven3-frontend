/* ═══════════════════════════════════════════════════
   DATA — Seed data & mock lead generator
   ═══════════════════════════════════════════════════ */

const Data = (() => {

  /* ── STATUS META ── */
  const STATUS_META = {
    nuevo:            { label: 'Nuevo',            cls: 'badge-nuevo',      color: '#4E9CFF' },
    investigar:       { label: 'Investigar',       cls: 'badge-investigar', color: '#6C5CE7' },
    sin_web:          { label: 'Sin web',           cls: 'badge-sin-web',    color: '#E05454' },
    web_mejorable:    { label: 'Web mejorable',    cls: 'badge-web-mejorable', color: '#F4C842' },
    contactado:       { label: 'Contactado',       cls: 'badge-contactado', color: '#00B9FF' },
    respondio:        { label: 'Respondió',        cls: 'badge-respondio',  color: '#00C896' },
    propuesta_enviada:{ label: 'Propuesta enviada',cls: 'badge-propuesta',  color: '#00E5C8' },
    ganado:           { label: 'Ganado',           cls: 'badge-ganado',     color: '#00C896' },
    perdido:          { label: 'Perdido',          cls: 'badge-perdido',    color: '#556670' },
  };

  const PRIORITY_META = {
    alta:  { label: 'Alta',  cls: 'badge priority-alta' },
    media: { label: 'Media', cls: 'badge priority-media' },
    baja:  { label: 'Baja',  cls: 'badge priority-baja' },
  };

  const WEB_QUALITY_META = {
    none:    { label: 'Sin web',   cls: 'badge-sin-web',        color: '#E05454' },
    poor:    { label: 'Deficiente',cls: 'badge-web-mejorable',  color: '#F4C842' },
    average: { label: 'Promedio',  cls: 'badge-contactado',     color: '#00B9FF' },
    good:    { label: 'Buena',     cls: 'badge-ganado',         color: '#00C896' },
  };

  /* ── KANBAN COLUMNS ── */
  const KANBAN_COLUMNS = [
    { id: 'nuevo',             label: 'Nuevo',             color: '#4E9CFF' },
    { id: 'investigar',        label: 'Investigar',        color: '#6C5CE7' },
    { id: 'sin_web',           label: 'Sin web',           color: '#E05454' },
    { id: 'web_mejorable',     label: 'Web mejorable',     color: '#F4C842' },
    { id: 'contactado',        label: 'Contactado',        color: '#00B9FF' },
    { id: 'respondio',         label: 'Respondió',         color: '#00C896' },
    { id: 'propuesta_enviada', label: 'Propuesta enviada', color: '#00E5C8' },
    { id: 'ganado',            label: 'Ganado',            color: '#00C896' },
    { id: 'perdido',           label: 'Perdido',           color: '#556670' },
  ];

  /* ── NAME POOLS BY CATEGORY ── */
  const NAME_POOLS = {
    Restaurante:    ['El Rancho','Don Fermín','La Estancia','Comedor La Esquina','El Asadito','La Parrilla de Juan','Sabores del Sur','La Fonda Criolla','El Bodegón de Miguel','Rincón Porteño','Los Trigales','La Cantina','El Fogón','Casa de Campo','El Quincho'],
    Bar:            ['Bar El Federal','La Biela','El Preferido','Bar Sur','La Cigale','El Toro','Barra 10','The Craft','Bar Notturno','El Reloj','Subsuelo Bar','La Cervecería','El Viejo Almacén','Bar Palermo','Bodega Norte'],
    Cafetería:      ['Café Tortoni','El Gato Negro','Café Literario','La Baguette','Café del Sol','Roasting Room','La Taza','Café Noir','El Rincón Café','Dulce Amargo','Brew & Co','Café Lunes','La Petit','Morning Bean','Café Puro'],
    Peluquería:     ['Barber Kings','Hair Studio BA','Tijeras & Arte','El Peluquero','Studio 9','Cuts & Style','Urban Barbers','La Navaja','El Clásico','Gentleman Barber','Style Lab','Top Cut','Barber House','Fades & Co','Royal Cuts'],
    Veterinaria:    ['Vet Amigos','Clínica Mascota Feliz','Dr. Patitas','VetCenter','Huellitas','PetCare Vet','Veterinaria del Parque','Animal House','Green Paws','Dr. Animalito','VetMed','La Clínica de tu Mascota','Pets & Vets','BioVet','Patas y Colas'],
    Ferretería:     ['Ferretería El Tornillo','Don Herramientas','Ferretería Central','La Casa del Constructor','Todo en Hierro','Construmax','El Clavo','Ferretería Norte','Herramientas Plus','El Depósito','Ferre-Todo','La Ferretería de Juan','Constructor Pro','Metal & Más','La Base'],
    Panadería:      ['Pan de Casa','La Boulangerie','El Horno de Oro','Panadería Roma','Dulce Tentación','Masas Artesanales','Pan & Arte','La Cruasán','Bollería Francesa','El Trigo','Pan Caliente','La Pastelería','Sabor a Pan','Confitería Sur','Las Masas'],
    Odontología:    ['Sonrisa Perfecta','Dr. Méndez Odontología','OdontoCenter','Clínica Dental Norte','SmilePro','DentArt','Consultorio Dental','Odontología Integral','Brillo Dental','Dr. Sosa & Asociados','Centro Odontológico','BlancSonrisa','DentalPlus','Sonrisas & Salud','Cuidado Dental'],
    Gimnasio:       ['FitCenter','PowerGym','CrossFit Norte','Bodywork','Studio Fit','ActiveBody','Olimpo Gym','Iron House','FitLife','Muscle Club','Sport Center','Training Box','Vitalfit','Motion Gym','Zone Fitness'],
    Farmacia:       ['Farmacia del Centro','Farmacity Norte','Dr. Ahorro','FarmaPlus','Farmacia La Salud','Botica del Barrio','Farmacia 24','Salud & Vida','Farmacia Norte','Droguería Central','Farmacia Familiar','BioFarma','Farmacia Sul','MedFarma','Tu Farmacia'],
    Mecánica:       ['Taller El Mecánico','AutoService','Mecánica Norte','Servicio Rápido','Taller Del Valle','Auto Clinic','MotoFix','El Mecánico de Confianza','Service Center','Taller San Jorge','Auto Parts','Mecánica Integral','Motor Pro','El Taller','Rueda & Motor'],
    Hotel:          ['Hotel Boutique Sur','Plaza Hotel','Apart Hotel Norte','Hotel Central','Suite Dreams','Hotel del Valle','The Lodge','Hotel Palermo','Casa Suites','Urban Hotel','Hotel Mirador','Boutique Inn','Hotel Clásico','Suite Norte','Hotel Moderno'],
    Estética:       ['Beauty Studio','Spa Zen','Centro de Estética','Glam Studio','Nails & Beauty','Pure Beauty','Espacio Wellness','Studio Belle','Centro Spa','Beauty Room','La Estética','Relax & Beauty','Glow Studio','Beauty Lab','Estética Moderna'],
    Psicología:     ['Consultorio Psicológico','Centro Terapéutico','Psic. Ana García','Espacio Mental','Terapia Integral','Centro de Bienestar','Dr. Psicología','Mente Sana','Psicología Clínica','Centro Psico','Terapia Norte','Bienestar Mental','Psic. María López','Equilibrio Mental','Espacio Terapéutico'],
    Inmobiliaria:   ['InmoPro','Propiedades Norte','Real Estate BA','InmoCenter','La Casa','Propiedades del Sur','Gestión Inmobiliaria','InmoPlus','Tu Propiedad','Rentamax','Propiedades Centrales','InmoBaires','Casa & Campo','Horizonte Inmobiliario','Alquileres & Más'],
    Arquitectura:   ['Estudio Arquitectura BA','Diseño & Espacio','ArqPro Studio','Habitat Diseño','Arquitectura Norte','Studio Arq','Forma & Función','Proyecto Sur','Diseño Interior','Arquitectos Asociados','SpaceDesign','Build & Design','Arq Studio','Creando Espacios','Diseño Total'],
    Contabilidad:   ['Estudio Contable Norte','Asesoría Fiscal','Contador Asociados','ContaCenter','Gestión Contable','Estudio García','Fiscal Pro','Impuestos & Más','ContaSur','Contabilidad Integral','Asesoría Contable','Estudio ABC','ContaPlus','Gestión Fiscal','Asesores Contables'],
    Abogado:        ['Estudio Jurídico Norte','Dr. García & Asoc.','Legales Pro','Bufete Asociados','Consultora Jurídica','Derecho & Más','Estudio Legal','AbogadosPro','Jurídico Centro','Consultores Legales','Estudio Martínez','LegalGroup','Derechos & Gestión','Abogados Sur','Estudio Integral'],
    Clínica:        ['Centro Médico Norte','Clínica del Barrio','Salud Integral','Centro de Salud','MedCenter','Clínica Norte','Instituto Médico','Salud & Bienestar','Centro Clínico','Policlínico Sur','Clínica Familiar','MedPlus','Centro Asistencial','Salud Total','Clínica Moderna'],
    Otro:           ['Negocio Local A','Negocio Local B','Emprendimiento Norte','Comercio Sur','Servicio Local','El Emprendimiento','Negocio del Barrio','Local Comercial','Servicios Norte','El Comercio'],
  };

  const ZONES = ['Palermo','Belgrano','Recoleta','San Telmo','Flores','Almagro','Caballito','Barracas','Villa Crespo','Núñez','Rosario Centro','Córdoba Capital','Mendoza Centro','Mar del Plata','La Plata','San Isidro','Tigre','Quilmes','Lanús','Morón','Villa Ballester','Ramos Mejía','Lomas de Zamora','Bahía Blanca'];

  /* ── UUID ── */
  const uid = () => `ld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

  /* ── SEEDED LEADS ── */
  const SEED_LEADS = [
    {
      id: 'seed_001', businessName: 'Panadería Roma', category: 'Panadería',
      zone: 'Flores', address: 'Av. Rivadavia 6234, Flores', phone: '+54 11 4631-2200',
      rating: 4.7, reviewsCount: 183, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: '@panaderiaroma', whatsapp: '+54 11 4631-2200',
      source: 'Google Maps (mock)', status: 'sin_web', notes: '', lastContactDate: null, nextActionDate: null,
      createdAt: ago(12), updatedAt: ago(12),
    },
    {
      id: 'seed_002', businessName: 'Barber Kings', category: 'Peluquería',
      zone: 'Palermo', address: 'Thames 1842, Palermo', phone: '+54 11 4831-9900',
      rating: 4.5, reviewsCount: 97, website: 'barberkings.wixsite.com', hasWebsite: true,
      websiteQuality: 'poor', instagram: '@barberkingsba', whatsapp: '+54 9 11 4831-9900',
      source: 'Google Maps (mock)', status: 'investigar', notes: 'Web hecha en Wix, muy lenta.', lastContactDate: null, nextActionDate: null,
      createdAt: ago(10), updatedAt: ago(10),
    },
    {
      id: 'seed_003', businessName: 'Vet Amigos', category: 'Veterinaria',
      zone: 'Belgrano', address: 'Cabildo 2301, Belgrano', phone: '+54 11 4783-5500',
      rating: 4.8, reviewsCount: 241, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: '@vetamigos', whatsapp: null,
      source: 'Google Maps (mock)', status: 'nuevo', notes: '', lastContactDate: null, nextActionDate: null,
      createdAt: ago(8), updatedAt: ago(8),
    },
    {
      id: 'seed_004', businessName: 'Ferretería El Tornillo', category: 'Ferretería',
      zone: 'Almagro', address: 'Corrientes 3800, Almagro', phone: '+54 11 4862-1100',
      rating: 4.2, reviewsCount: 45, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: null, whatsapp: '+54 9 11 4862-1100',
      source: 'Google Maps (mock)', status: 'contactado', notes: 'Hablar con el dueño, Mario. Muy interesado.', lastContactDate: ago(3), nextActionDate: tomorrow(4),
      createdAt: ago(7), updatedAt: ago(3),
    },
    {
      id: 'seed_005', businessName: 'AutoService Norte', category: 'Mecánica',
      zone: 'Núñez', address: 'Av. del Libertador 7100, Núñez', phone: '+54 11 4702-3344',
      rating: 4.6, reviewsCount: 128, website: 'autoservice.com.ar', hasWebsite: true,
      websiteQuality: 'poor', instagram: '@autoservicenorte', whatsapp: '+54 9 11 4702-3344',
      source: 'Google Maps (mock)', status: 'propuesta_enviada', notes: 'Enviamos propuesta el martes. Esperando respuesta.', lastContactDate: ago(2), nextActionDate: tomorrow(7),
      createdAt: ago(14), updatedAt: ago(2),
    },
    {
      id: 'seed_006', businessName: 'Café Tortoni Centro', category: 'Cafetería',
      zone: 'San Telmo', address: 'Av. de Mayo 825, San Telmo', phone: '+54 11 4342-4328',
      rating: 4.4, reviewsCount: 1892, website: 'cafetortoni.com.ar', hasWebsite: true,
      websiteQuality: 'average', instagram: '@cafetortoni_oficial', whatsapp: null,
      source: 'Google Maps (mock)', status: 'respondio', notes: 'Gerente respondió, quieren una reunión.', lastContactDate: ago(1), nextActionDate: tomorrow(3),
      createdAt: ago(9), updatedAt: ago(1),
    },
    {
      id: 'seed_007', businessName: 'Clínica Dental Norte', category: 'Odontología',
      zone: 'Villa Crespo', address: 'Av. Corrientes 5200, Villa Crespo', phone: '+54 11 4854-2200',
      rating: 4.9, reviewsCount: 312, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: '@clinicadentalnorte', whatsapp: '+54 9 11 4854-2200',
      source: 'Google Maps (mock)', status: 'nuevo', notes: '', lastContactDate: null, nextActionDate: null,
      createdAt: ago(5), updatedAt: ago(5),
    },
    {
      id: 'seed_008', businessName: 'FitCenter Palermo', category: 'Gimnasio',
      zone: 'Palermo', address: 'Santa Fe 3600, Palermo', phone: '+54 11 4826-7700',
      rating: 4.3, reviewsCount: 74, website: 'fitcenterpalermo.negocio.site', hasWebsite: true,
      websiteQuality: 'poor', instagram: '@fitcenterba', whatsapp: '+54 9 11 4826-7700',
      source: 'Google Maps (mock)', status: 'web_mejorable', notes: 'Web en Google Sites. Sin SSL.', lastContactDate: null, nextActionDate: null,
      createdAt: ago(6), updatedAt: ago(6),
    },
    {
      id: 'seed_009', businessName: 'Boutique Hotel Sur', category: 'Hotel',
      zone: 'San Telmo', address: 'Defensa 1195, San Telmo', phone: '+54 11 4300-1188',
      rating: 4.7, reviewsCount: 456, website: 'hotelsur.com', hasWebsite: true,
      websiteQuality: 'good', instagram: '@hotelbouttiquesur', whatsapp: null,
      source: 'Google Maps (mock)', status: 'perdido', notes: 'Ya tienen agencia. No interesados.', lastContactDate: ago(20), nextActionDate: null,
      createdAt: ago(22), updatedAt: ago(20),
    },
    {
      id: 'seed_010', businessName: 'Spa Zen Recoleta', category: 'Estética',
      zone: 'Recoleta', address: 'Callao 1800, Recoleta', phone: '+54 11 4811-3300',
      rating: 4.6, reviewsCount: 88, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: '@spazenrecoleta', whatsapp: '+54 9 11 4811-3300',
      source: 'Google Maps (mock)', status: 'nuevo', notes: '', lastContactDate: null, nextActionDate: null,
      createdAt: ago(4), updatedAt: ago(4),
    },
    {
      id: 'seed_011', businessName: 'Estudio Contable García', category: 'Contabilidad',
      zone: 'Microcentro', address: 'Av. Corrientes 330 Piso 4, Microcentro', phone: '+54 11 4394-2200',
      rating: 4.5, reviewsCount: 32, website: 'estudiogarciacpn.com.ar', hasWebsite: true,
      websiteQuality: 'poor', instagram: null, whatsapp: '+54 9 11 15-4394-2200',
      source: 'Google Maps (mock)', status: 'contactado', notes: 'Primer mail enviado.', lastContactDate: ago(5), nextActionDate: tomorrow(5),
      createdAt: ago(11), updatedAt: ago(5),
    },
    {
      id: 'seed_012', businessName: 'Don Fermín Parrilla', category: 'Restaurante',
      zone: 'Caballito', address: 'Av. Rivadavia 5001, Caballito', phone: '+54 11 4903-5500',
      rating: 4.8, reviewsCount: 567, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: '@donferminparrilla', whatsapp: '+54 9 11 4903-5500',
      source: 'Google Maps (mock)', status: 'ganado', notes: '¡Cliente! Firmamos contrato el 15/01.', lastContactDate: ago(15), nextActionDate: null,
      createdAt: ago(30), updatedAt: ago(15),
    },
    {
      id: 'seed_013', businessName: 'Inmobiliaria Horizonte', category: 'Inmobiliaria',
      zone: 'Rosario Centro', address: 'Córdoba 1250, Rosario', phone: '+54 341 422-3300',
      rating: 4.2, reviewsCount: 28, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: null, whatsapp: '+54 9 341 422-3300',
      source: 'Google Maps (mock)', status: 'investigar', notes: '', lastContactDate: null, nextActionDate: null,
      createdAt: ago(3), updatedAt: ago(3),
    },
    {
      id: 'seed_014', businessName: 'Centro Médico Familiar', category: 'Clínica',
      zone: 'Lomas de Zamora', address: 'Gorriti 220, Lomas de Zamora', phone: '+54 11 4292-1100',
      rating: 4.4, reviewsCount: 119, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: '@centromedicofamiliar', whatsapp: '+54 9 11 4292-1100',
      source: 'Google Maps (mock)', status: 'nuevo', notes: '', lastContactDate: null, nextActionDate: null,
      createdAt: ago(2), updatedAt: ago(2),
    },
    {
      id: 'seed_015', businessName: 'Urban Barbers', category: 'Peluquería',
      zone: 'Palermo', address: 'Honduras 4900, Palermo', phone: '+54 11 4833-6600',
      rating: 4.9, reviewsCount: 203, website: null, hasWebsite: false,
      websiteQuality: 'none', instagram: '@urbanbarbers_ba', whatsapp: '+54 9 11 4833-6600',
      source: 'Google Maps (mock)', status: 'sin_web', notes: 'Perfil de Google impecable. Sin web.', lastContactDate: null, nextActionDate: null,
      createdAt: ago(1), updatedAt: ago(1),
    },
  ];

  /* ── HELPER: dates ── */
  function ago(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }
  function tomorrow(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /* ── SEED LEADS (enrich with scoring) ── */
  const getSeedLeads = () => SEED_LEADS.map(l => Scoring.enrich(l));

  /* ── MOCK SEARCH GENERATOR ── */
  const generateSearchResults = (category, zone, limit, filter) => {
    const pool = NAME_POOLS[category] || NAME_POOLS['Otro'];
    const z = zone || 'Buenos Aires';
    const results = [];

    for (let i = 0; i < Math.min(limit, pool.length); i++) {
      const r = pseudoRand(category + zone + i);
      const hasWebsite = r(0.45) > 0.45;
      let wq = 'none';
      if (hasWebsite) {
        const q = r(1);
        wq = q < 0.35 ? 'poor' : q < 0.65 ? 'average' : 'good';
      }
      const reviewsCount = Math.round(r(1) * 400 + 10);
      const rating = Math.round((r(1) * 1.8 + 3.2) * 10) / 10;
      const hasPhone = r(1) > 0.2;
      const hasInsta = r(1) > 0.35;
      const hasWa    = r(1) > 0.4;

      const raw = {
        id: uid(),
        businessName: pool[i],
        category,
        zone: z,
        address: `${randomStreet(r)} ${Math.round(r(1)*4000+100)}, ${z}`,
        phone: hasPhone ? genPhone(r) : null,
        rating,
        reviewsCount,
        website: hasWebsite ? genWebsite(pool[i], r) : null,
        hasWebsite,
        websiteQuality: wq,
        instagram: hasInsta ? '@' + pool[i].toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') : null,
        whatsapp: hasWa ? genPhone(r) : null,
        source: 'Google Maps (mock)',
        status: 'nuevo',
        notes: '',
        diagnosis: '',
        recommendedPitch: '',
        lastContactDate: null,
        nextActionDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const enriched = Scoring.enrich(raw);

      // Apply filter
      if (filter === 'no_website'   && enriched.hasWebsite) continue;
      if (filter === 'poor_website' && enriched.websiteQuality !== 'poor') continue;
      if (filter === 'has_instagram'&& !enriched.instagram) continue;
      if (filter === 'high_score'   && enriched.opportunityScore < 70) continue;

      results.push(enriched);
    }
    return results.sort((a,b) => b.opportunityScore - a.opportunityScore);
  };

  /* simple pseudo-random seeded with string */
  function pseudoRand(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    const x = Math.sin(h + 1) * 10000;
    return (salt) => {
      const y = Math.sin(h + salt * 9999.7) * 10000;
      return y - Math.floor(y);
    };
  }

  function randomStreet(r) {
    const streets = ['Av. Corrientes','Av. Rivadavia','Av. Santa Fe','Av. Callao','Gorriti','Thames','Honduras','Serrano','Armenia','Av. Cabildo','Av. del Libertador','Defensa','Maipú','Reconquista','Suipacha'];
    return streets[Math.floor(r(1) * streets.length)];
  }

  function genPhone(r) {
    return `+54 ${Math.floor(r(1)*2+10)} ${Math.floor(r(2)*9000+1000)}-${Math.floor(r(3)*9000+1000)}`;
  }

  function genWebsite(name, r) {
    const slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const suffixes = ['.com.ar','.negocio.site','.wixsite.com/'+slug,'web.app','.business.site'];
    return slug + suffixes[Math.floor(r(1)*suffixes.length)];
  }

  return {
    STATUS_META, PRIORITY_META, WEB_QUALITY_META,
    KANBAN_COLUMNS,
    getSeedLeads, generateSearchResults,
  };
})();

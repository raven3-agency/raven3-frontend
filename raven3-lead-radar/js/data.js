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

  /* ── NAME POOLS (used by mock search generator when no real API is configured) ── */
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

  /* ── MOCK SEARCH GENERATOR (used when no Google Places API is configured) ── */
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
    generateSearchResults,
  };
})();

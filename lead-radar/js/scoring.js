/* ═══════════════════════════════════════════════════
   SCORING — Opportunity score engine
   ═══════════════════════════════════════════════════ */

const Scoring = (() => {

  const calculate = (lead) => {
    let score = 0;
    if (!lead.hasWebsite)                     score += 40;
    if (lead.websiteQuality === 'poor')        score += 25;
    if (lead.websiteQuality === 'average')     score += 10;
    if (lead.websiteQuality === 'good')        score -= 15;
    if (lead.reviewsCount > 100)              score += 20;
    else if (lead.reviewsCount >= 30)          score += 15;
    if (lead.rating >= 4.3)                    score += 15;
    if (lead.phone)                            score += 10;
    if (lead.instagram)                        score += 10;
    if (lead.whatsapp)                         score += 10;
    return Math.max(0, Math.min(100, score));
  };

  const getPriority = (score) => {
    if (score >= 75) return 'alta';
    if (score >= 45) return 'media';
    return 'baja';
  };

  const getBreakdown = (lead) => {
    const items = [];
    if (!lead.hasWebsite)                     items.push({ label: 'Sin sitio web',         pts: +40 });
    if (lead.websiteQuality === 'poor')        items.push({ label: 'Web deficiente',         pts: +25 });
    if (lead.websiteQuality === 'average')     items.push({ label: 'Web mejorable',          pts: +10 });
    if (lead.websiteQuality === 'good')        items.push({ label: 'Web de buena calidad',   pts: -15 });
    if (lead.reviewsCount > 100)              items.push({ label: `${lead.reviewsCount} reseñas (>100)`, pts: +20 });
    else if (lead.reviewsCount >= 30)          items.push({ label: `${lead.reviewsCount} reseñas (30-100)`, pts: +15 });
    if (lead.rating >= 4.3)                    items.push({ label: `Rating ${lead.rating}★`,  pts: +15 });
    if (lead.phone)                            items.push({ label: 'Tiene teléfono',          pts: +10 });
    if (lead.instagram)                        items.push({ label: 'Tiene Instagram',         pts: +10 });
    if (lead.whatsapp)                         items.push({ label: 'Tiene WhatsApp',          pts: +10 });
    return items;
  };

  const getDiagnosis = (lead) => {
    const parts = [];
    if (!lead.hasWebsite)                     parts.push('No tiene sitio web');
    else if (lead.websiteQuality === 'poor')   parts.push('Sitio web desactualizado y lento');
    else if (lead.websiteQuality === 'average')parts.push('Sitio web con oportunidades de mejora');
    if (lead.reviewsCount > 50)               parts.push(`${lead.reviewsCount} reseñas — negocio activo en Google`);
    if (lead.rating >= 4.3)                    parts.push(`Calificación de ${lead.rating}★ — reputación sólida`);
    if (!lead.instagram)                       parts.push('Sin presencia en Instagram');
    if (!lead.whatsapp)                        parts.push('Sin WhatsApp de contacto visible');
    if (!parts.length) parts.push('Negocio establecido con presencia digital básica');
    return parts.join('. ') + '.';
  };

  const getPitch = (lead) => {
    if (!lead.hasWebsite)
      return 'Crear un sitio web profesional desde cero optimizado para búsquedas locales, Google Maps y conversión.';
    if (lead.websiteQuality === 'poor')
      return 'Rediseño completo con foco en velocidad (Core Web Vitals), diseño moderno y SEO local.';
    if (lead.websiteQuality === 'average')
      return 'Optimización técnica del sitio: velocidad, SEO local, Core Web Vitals y mejoras de conversión.';
    return 'Estrategia de SEO técnico y presencia digital para maximizar visibilidad en búsquedas locales.';
  };

  /* Enrich a raw lead object with calculated fields */
  const enrich = (lead) => {
    const score = calculate(lead);
    return {
      ...lead,
      opportunityScore: score,
      priority: getPriority(score),
      diagnosis: getDiagnosis(lead),
      recommendedPitch: getPitch(lead),
    };
  };

  return { calculate, getPriority, getBreakdown, getDiagnosis, getPitch, enrich };
})();

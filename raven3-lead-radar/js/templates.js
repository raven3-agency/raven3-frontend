/* ═══════════════════════════════════════════════════
   TEMPLATES — Message templates with variable substitution
   ═══════════════════════════════════════════════════ */

const Templates = (() => {

  const DEFAULT_TEMPLATES = [
    {
      id: 'whatsapp_inicial',
      title: 'WhatsApp Inicial',
      type: 'whatsapp',
      body: `Hola, ¿cómo están? 👋 Soy Patricio de Raven3.

Vi que {{businessName}} tiene muy buena presencia en Google ({{reviewsCount}} reseñas y {{rating}}★), pero detecté una oportunidad importante para mejorar su presencia web: {{diagnosis}}

Desde Raven3 podemos ayudarlos con {{recommendedPitch}}

¿Les puedo compartir una idea concreta sin compromiso? 🚀`,
    },
    {
      id: 'email_inicial',
      title: 'Email Inicial',
      type: 'email',
      body: `Asunto: Oportunidad web para {{businessName}} en {{zone}}

Hola equipo de {{businessName}},

Mi nombre es Patricio, soy cofundador de Raven3, una agencia digital especializada en web, SEO local y presencia digital para negocios en Argentina.

Encontré {{businessName}} mientras investigaba negocios exitosos en {{zone}} en el rubro {{category}}, y vi que tienen excelente reputación ({{rating}}★ y {{reviewsCount}} reseñas en Google).

Sin embargo, noté lo siguiente: {{diagnosis}}

Esto representa una oportunidad concreta: {{recommendedPitch}}

¿Tienen 15 minutos esta semana para una llamada donde les comparto ideas concretas y resultados de clientes similares?

Saludos,
Patricio
Raven3 — raven3.dev`,
    },
    {
      id: 'followup_1',
      title: 'Follow-up #1',
      type: 'followup',
      body: `Hola {{businessName}}, ¿cómo están?

Les escribo nuevamente de Raven3. La semana pasada les compartí una idea para mejorar su presencia digital en {{zone}}.

Quería saber si tuvieron la oportunidad de verlo. El potencial que veo es: {{diagnosis}}

¿Tienen 10 minutos esta semana? Sin compromiso. 🙌`,
    },
    {
      id: 'followup_2',
      title: 'Follow-up #2',
      type: 'followup',
      body: `Hola {{businessName}} 👋

Último mensaje de mi parte — no quiero ser molesto.

Trabajo con {{category}}s en {{zone}} y los resultados son concretos: más visibilidad en Google Maps, más consultas y más clientes.

En su caso específico: {{recommendedPitch}}

Si en algún momento les interesa, estoy disponible. Que les vaya muy bien 🙏

Patricio · Raven3`,
    },
  ];

  const VARS = ['{{businessName}}', '{{category}}', '{{zone}}', '{{diagnosis}}', '{{recommendedPitch}}', '{{rating}}', '{{reviewsCount}}'];

  const getAll = () => {
    const saved = Storage.getTemplates();
    if (!saved) return DEFAULT_TEMPLATES;
    return saved;
  };

  const saveAll = (tpls) => Storage.saveTemplates(tpls);

  const render = (body, lead) => {
    if (!lead) return body;
    return body
      .replace(/\{\{businessName\}\}/g,     lead.businessName    || '')
      .replace(/\{\{category\}\}/g,          lead.category        || '')
      .replace(/\{\{zone\}\}/g,              lead.zone            || '')
      .replace(/\{\{diagnosis\}\}/g,         lead.diagnosis       || '')
      .replace(/\{\{recommendedPitch\}\}/g,  lead.recommendedPitch|| '')
      .replace(/\{\{rating\}\}/g,            lead.rating          || '')
      .replace(/\{\{reviewsCount\}\}/g,      lead.reviewsCount    || '');
  };

  const renderById = (id, lead) => {
    const tpl = getAll().find(t => t.id === id);
    return tpl ? render(tpl.body, lead) : '';
  };

  const TYPE_META = {
    whatsapp: { label: 'WhatsApp', cls: 'type-whatsapp' },
    email:    { label: 'Email',    cls: 'type-email'    },
    followup: { label: 'Follow-up',cls: 'type-followup' },
  };

  return { getAll, saveAll, render, renderById, VARS, TYPE_META, DEFAULT_TEMPLATES };
})();

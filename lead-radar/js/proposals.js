/* ═══════════════════════════════════════════════════
   PROPOSALS — Manifest loader & matcher
   ═══════════════════════════════════════════════════ */

const Proposals = (() => {
  let _list = null;

  /* Remove accents and non-alphanumeric chars for fuzzy matching */
  const _slug = (s) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const load = async () => {
    if (_list !== null) return;
    try {
      const r = await fetch('propuestas/manifest.json');
      _list = r.ok ? await r.json() : [];
    } catch {
      _list = [];
    }
  };

  /* Returns the matching proposal entry or null */
  const find = (businessName) => {
    if (!_list?.length) return null;
    const nameSlug = _slug(businessName);
    return _list.find(p => {
      const ps = _slug(p.slug);
      const ns = p.name ? _slug(p.name) : '';
      return nameSlug === ps || nameSlug.includes(ps) || ps.includes(nameSlug)
        || (ns && (nameSlug === ns || nameSlug.includes(ns) || ns.includes(nameSlug)));
    }) || null;
  };

  const getAll = () => _list || [];

  return { load, find, getAll };
})();

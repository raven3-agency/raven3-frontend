    (() => {
      'use strict';

      const state = {
        url: '', business: '', type: '', goal: '',
        answers: {}, name: '', email: '', phone: '',
        scores: null, cwv: null, apiUsed: false,
      };

      /* ── Utilities ── */
      function norm(raw) {
        let u = raw.trim();
        if (!u) return null;
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        try { new URL(u); return u; } catch { return null; }
      }
      function show(id) {
        document.querySelectorAll('.aw-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(id).classList.add('active');
      }
      function setStep(n) {
        document.querySelectorAll('.aw-step-node').forEach(nd => {
          const i = +nd.dataset.node;
          nd.classList.toggle('active', i === n);
          nd.classList.toggle('done', i < n);
        });
        document.getElementById('awLine1').classList.toggle('done', n > 1);
        document.getElementById('awLine2').classList.toggle('done', n > 2);
      }
      function sc(s) { return s >= 75 ? 's-good' : s >= 50 ? 's-ok' : 's-bad'; }
      function fc(s) { return s >= 75 ? 'f-good' : s >= 50 ? 'f-ok' : 'f-bad'; }
      function gc(s) { return s >= 75 ? '#00e5c8' : s >= 50 ? '#e9a022' : '#e05555'; }

      /* ── Step 1 ── */
      document.getElementById('awNext1').addEventListener('click', () => {
        let ok = true;
        const u = norm(document.getElementById('awUrl').value);
        if (!u) { document.getElementById('awUrlErr').classList.add('on'); ok = false; }
        else { document.getElementById('awUrlErr').classList.remove('on'); state.url = u; }
        const b = document.getElementById('awBusiness').value.trim();
        if (!b) { document.getElementById('awBizErr').classList.add('on'); ok = false; }
        else { document.getElementById('awBizErr').classList.remove('on'); state.business = b; }
        state.type = document.getElementById('awType').value;
        state.goal = document.getElementById('awGoal').value;
        if (!ok) return;
        setStep(2); show('awStep2');
      });

      /* ── Checklist ── */
      document.querySelectorAll('.aw-question').forEach(q => {
        const key = q.dataset.q;
        q.querySelectorAll('.aw-opt').forEach(opt => {
          opt.addEventListener('click', () => {
            q.querySelectorAll('.aw-opt').forEach(o => o.classList.remove('sel','sel-mid','sel-bad'));
            opt.classList.add(opt.dataset.cls);
            state.answers[key] = parseFloat(opt.dataset.val);
            q.classList.add('answered');
          });
        });
      });

      document.getElementById('awBack1').addEventListener('click', () => { setStep(1); show('awStep1'); });

      document.getElementById('awNext2').addEventListener('click', () => {
        if (Object.keys(state.answers).length < 10) {
          const errEl = document.getElementById('awQErr');
          errEl.classList.add('on');
          const first = document.querySelector('.aw-question:not(.answered)');
          if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        document.getElementById('awQErr').classList.remove('on');
        setStep(3); show('awStep3');
      });

      /* ── Step 3 ── */
      document.getElementById('awBack2').addEventListener('click', () => { setStep(2); show('awStep2'); });

      document.getElementById('awRunAudit').addEventListener('click', async () => {
        let ok = true;
        const nm = document.getElementById('awName').value.trim();
        if (!nm) { document.getElementById('awNameErr').classList.add('on'); ok = false; }
        else { document.getElementById('awNameErr').classList.remove('on'); state.name = nm; }
        const em = document.getElementById('awEmail').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { document.getElementById('awEmailErr').classList.add('on'); ok = false; }
        else { document.getElementById('awEmailErr').classList.remove('on'); state.email = em; }
        state.phone = document.getElementById('awPhone').value.trim();
        if (!ok) return;
        show('awLoading');
        document.getElementById('awLoadUrl').textContent = state.url;
        await runAudit();
      });

      /* ── Audit engine ── */
      async function runAudit() {
        const fill = document.getElementById('awProgFill');
        const status = document.getElementById('awLoadStatus');
        const msgs = [
          'Verificando conectividad...',
          'Analizando velocidad de carga...',
          'Evaluando optimización SEO...',
          'Revisando experiencia mobile...',
          'Calculando Core Web Vitals...',
          'Procesando resultados...',
        ];
        let prog = 0, mi = 0;
        function adv(to, ms) {
          return new Promise(res => {
            const t = setInterval(() => {
              prog = Math.min(prog + 1, to);
              fill.style.width = prog + '%';
              if (prog >= to) { clearInterval(t); res(); }
            }, ms);
          });
        }
        status.textContent = msgs[mi++];
        await adv(12, 40);
        status.textContent = msgs[mi++];

        let ps = null;
        try {
          const r = await Promise.race([
            fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(state.url)}&strategy=mobile&category=performance&category=seo&category=best-practices`),
            new Promise((_, rj) => setTimeout(() => rj(new Error('timeout')), 13000))
          ]);
          if (r.ok) {
            const d = await r.json();
            const lhr = d.lighthouseResult;
            if (lhr) {
              const a = lhr.audits || {};
              ps = {
                perf: lhr.categories?.performance?.score ?? null,
                seo:  lhr.categories?.seo?.score ?? null,
                bp:   lhr.categories?.['best-practices']?.score ?? null,
                fcp:  a['first-contentful-paint']?.displayValue ?? null, fcpS: a['first-contentful-paint']?.score ?? null,
                lcp:  a['largest-contentful-paint']?.displayValue ?? null, lcpS: a['largest-contentful-paint']?.score ?? null,
                tbt:  a['total-blocking-time']?.displayValue ?? null, tbtS: a['total-blocking-time']?.score ?? null,
                cls:  a['cumulative-layout-shift']?.displayValue ?? null, clsS: a['cumulative-layout-shift']?.score ?? null,
              };
              state.apiUsed = true;
            }
          }
        } catch (_) { state.apiUsed = false; }

        await adv(50, 22);
        status.textContent = msgs[mi++];
        await adv(72, 28);
        status.textContent = msgs[mi++];
        await adv(88, 32);
        status.textContent = msgs[mi++];
        await adv(100, 18);

        state.scores = calc(state.answers, ps);
        state.cwv = ps;
        await new Promise(r => setTimeout(r, 350));

        render();
        show('awResults');
        sendLead(state.scores).catch(() => {});

        if (typeof gtag !== 'undefined') {
          gtag('event', 'audit_completed', { audit_url: state.url, overall_score: state.scores.overall, api_used: state.apiUsed });
        }
      }

      function calc(a, ps) {
        const g = k => a[k] ?? 0.5;
        const vel  = (g('q1') + g('q7')) / 2 * 100;
        const mob  = g('q2') * 100;
        const seo  = (g('q4') + g('q5')) / 2 * 100;
        const conv = (g('q8') + g('q9')) / 2 * 100;
        const tec  = (g('q3') + g('q6') + g('q10')) / 3 * 100;
        let velocidad, seoScore, mobile, conversion, tecnico;
        if (ps && ps.perf !== null) {
          velocidad  = Math.round(ps.perf * 100 * .65 + vel * .35);
          seoScore   = Math.round(ps.seo  * 100 * .60 + seo * .40);
          mobile     = Math.round(ps.perf * 100 * .70 + mob * .30);
          conversion = Math.round(conv);
          tecnico    = Math.round((ps.bp ?? .7) * 100 * .50 + tec * .50);
        } else {
          velocidad = Math.round(vel); seoScore = Math.round(seo);
          mobile = Math.round(mob); conversion = Math.round(conv); tecnico = Math.round(tec);
        }
        const overall = Math.round(velocidad*.25 + seoScore*.25 + mobile*.20 + conversion*.15 + tecnico*.15);
        return { velocidad, seo: seoScore, mobile, conversion, tecnico, overall };
      }

      function render() {
        const s = state.scores, cwv = state.cwv;

        try { document.getElementById('rptUrl').textContent = new URL(state.url).hostname; }
        catch { document.getElementById('rptUrl').textContent = state.url; }
        document.getElementById('rptDate').textContent = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

        requestAnimationFrame(() => setTimeout(() => {
          const circ = 226;
          const gf = document.getElementById('rptGaugeFill');
          gf.style.strokeDashoffset = circ - (s.overall / 100) * circ;
          gf.style.stroke = gc(s.overall);
          let c = 0;
          const el = document.getElementById('rptScore');
          const t = setInterval(() => { c = Math.min(c + 2, s.overall); el.textContent = c; if (c >= s.overall) clearInterval(t); }, 18);
        }, 180));

        const labels = { 85: 'Tu web tiene una base sólida', 70: 'Tu web está en buen camino', 50: 'Oportunidades de mejora detectadas', 0: 'Problemas críticos detectados' };
        document.getElementById('rptVerdict').textContent = Object.entries(labels).reverse().find(([k]) => s.overall >= +k)?.[1] ?? '';

        setTimeout(() => {
          [['barVel','sVel',s.velocidad],['barSeo','sSeo',s.seo],['barMob','sMob',s.mobile],['barConv','sConv',s.conversion],['barTec','sTec',s.tecnico]].forEach(([bid, sid, score]) => {
            const bar = document.getElementById(bid), sel = document.getElementById(sid);
            bar.style.width = score + '%'; bar.className = 'aw-cat-fill ' + fc(score);
            sel.textContent = score; sel.className = 'aw-cat-score ' + sc(score);
          });
        }, 280);

        if (cwv && cwv.fcp) {
          [['cwvFcp',cwv.fcp,cwv.fcpS],['cwvLcp',cwv.lcp,cwv.lcpS],['cwvTbt',cwv.tbt,cwv.tbtS],['cwvCls',cwv.cls,cwv.clsS]].forEach(([id,val,score]) => {
            const el = document.getElementById(id);
            el.textContent = val ?? '—';
            el.className = 'aw-cwv-metric ' + sc(score !== null ? Math.round(score * 100) : 50);
          });
        } else {
          document.getElementById('cwvBlock').style.display = 'none';
          document.getElementById('awApiNote').classList.add('on');
        }

        document.getElementById('rptFindings').innerHTML = findings(s, cwv, state.answers).slice(0,5).map(f =>
          `<div class="aw-finding ${f.t}"><div class="aw-finding-icon">${f.i}</div><div class="aw-finding-body"><strong>${f.title}</strong>${f.text}</div></div>`
        ).join('');
      }

      function findings(s, cwv, a) {
        const r = [];
        if (s.velocidad < 50) r.push({ t:'critical', i:'🔴', title:'Velocidad crítica', text:'Tu web carga lento. Perdés hasta un 40% de visitantes antes de que vean tu contenido, y Google te penaliza en el ranking.' });
        if (s.seo < 50)       r.push({ t:'critical', i:'🔴', title:'SEO insuficiente', text:'Tu sitio no está optimizado para motores de búsqueda. Perdés tráfico orgánico todos los días frente a competidores mejor posicionados.' });
        if (s.mobile < 50)    r.push({ t:'critical', i:'🔴', title:'Experiencia mobile deficiente', text:'Más del 70% del tráfico web viene de celulares. Una mala experiencia mobile afecta tanto el posicionamiento como la conversión.' });
        if (s.conversion < 50) r.push({ t:'critical', i:'🔴', title:'Baja conversión', text:'Tu web no está orientada a convertir visitantes en clientes. Faltan llamados a la acción claros y elementos de contacto visibles.' });
        if (s.tecnico < 50)   r.push({ t:'critical', i:'🔴', title:'Problemas técnicos', text:'Hay problemas de base técnica (seguridad, analítica, antigüedad) que afectan la confianza y la capacidad de indexación del sitio.' });
        if (s.velocidad >= 50 && s.velocidad < 75) r.push({ t:'warning', i:'🟡', title:'Velocidad mejorable', text:'Hay margen para optimizar la carga. Imágenes sin comprimir, scripts bloqueantes o hosting lento son causas frecuentes con solución directa.' });
        if (s.seo >= 50 && s.seo < 75)             r.push({ t:'warning', i:'🟡', title:'SEO con margen de mejora', text:'El SEO está parcialmente implementado. Podés escalar trabajando keywords específicas, mejorando el contenido y los metadatos.' });
        if (s.mobile >= 50 && s.mobile < 75)        r.push({ t:'warning', i:'🟡', title:'Mobile con oportunidades', text:'La versión mobile funciona pero tiene margen de mejora. Ajustes simples pueden mejorar la experiencia y el posicionamiento.' });
        if (s.conversion >= 50 && s.conversion < 75) r.push({ t:'warning', i:'🟡', title:'Conversión optimizable', text:'Los elementos de conversión existen pero podrían ser más claros, visibles y con más urgencia para guiar al usuario al contacto.' });
        if (cwv && cwv.lcpS !== null && cwv.lcpS < 0.5) r.push({ t:'warning', i:'🟡', title:`LCP elevado: ${cwv.lcp}`, text:'El Largest Contentful Paint supera el umbral recomendado. Los usuarios esperan demasiado para ver el contenido principal, lo que afecta el ranking.' });
        if (s.velocidad >= 80) r.push({ t:'good', i:'✅', title:'Buena velocidad de carga', text:'Tu web carga rápido, lo que mejora la experiencia y es un factor positivo para el posicionamiento orgánico.' });
        if (s.mobile >= 80)    r.push({ t:'good', i:'✅', title:'Buena experiencia mobile', text:'Tu web está bien adaptada a dispositivos móviles. Punto a favor para el posicionamiento en Google (mobile-first indexing).' });
        if (a.q3 === 1)        r.push({ t:'good', i:'✅', title:'HTTPS activo', text:'Tu web tiene certificado SSL. Es un factor de confianza para los usuarios y un requisito básico para Google.' });
        return r;
      }

      async function sendLead(scores) {
        const body = {
          name: state.name, email: state.email,
          telefono: state.phone || 'No informado',
          url_auditada: state.url, negocio: state.business,
          tipo: state.type, objetivo: state.goal,
          puntaje_global: scores.overall,
          velocidad: scores.velocidad, seo: scores.seo,
          mobile: scores.mobile, conversion: scores.conversion,
          tecnico: scores.tecnico,
          analisis_automatico: state.apiUsed ? 'Sí (PageSpeed API)' : 'No (solo cuestionario)',
          _subject: `Auditoría web gratuita — ${state.business} · ${scores.overall}/100`,
          form_source: 'auditoria-web-gratuita',
        };
        await fetch('https://formspree.io/f/mvoykeyq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
      }

    })();

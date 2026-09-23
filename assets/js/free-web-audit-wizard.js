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
          'Checking connectivity...',
          'Analyzing load speed...',
          'Evaluating SEO optimization...',
          'Reviewing mobile experience...',
          'Calculating Core Web Vitals...',
          'Processing results...',
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
        document.getElementById('rptDate').textContent = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        requestAnimationFrame(() => setTimeout(() => {
          const circ = 226;
          const gf = document.getElementById('rptGaugeFill');
          gf.style.strokeDashoffset = circ - (s.overall / 100) * circ;
          gf.style.stroke = gc(s.overall);
          let c = 0;
          const el = document.getElementById('rptScore');
          const t = setInterval(() => { c = Math.min(c + 2, s.overall); el.textContent = c; if (c >= s.overall) clearInterval(t); }, 18);
        }, 180));

        const labels = { 85: 'Your site has a solid foundation', 70: 'Your site is on the right track', 50: 'Improvement opportunities detected', 0: 'Critical issues detected' };
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
        if (s.velocidad < 50) r.push({ t:'critical', i:'🔴', title:'Critical speed issue', text:'Your site loads slowly. You could be losing up to 40% of visitors before they even see your content, and Google penalizes your ranking for it.' });
        if (s.seo < 50)       r.push({ t:'critical', i:'🔴', title:'Insufficient SEO', text:"Your site isn't optimized for search engines. You're losing organic traffic every day to better-positioned competitors." });
        if (s.mobile < 50)    r.push({ t:'critical', i:'🔴', title:'Poor mobile experience', text:'Over 70% of web traffic comes from phones. A poor mobile experience hurts both ranking and conversion.' });
        if (s.conversion < 50) r.push({ t:'critical', i:'🔴', title:'Low conversion', text:"Your site isn't set up to turn visitors into customers. It's missing clear calls to action and visible contact options." });
        if (s.tecnico < 50)   r.push({ t:'critical', i:'🔴', title:'Technical issues', text:'There are underlying technical problems (security, analytics, domain age) affecting trust and the site\'s ability to be indexed.' });
        if (s.velocidad >= 50 && s.velocidad < 75) r.push({ t:'warning', i:'🟡', title:'Speed could improve', text:'There\'s room to optimize load times. Uncompressed images, blocking scripts or slow hosting are common causes with a straightforward fix.' });
        if (s.seo >= 50 && s.seo < 75)             r.push({ t:'warning', i:'🟡', title:'SEO has room to grow', text:'SEO is partially implemented. You can scale it up by targeting specific keywords and improving content and metadata.' });
        if (s.mobile >= 50 && s.mobile < 75)        r.push({ t:'warning', i:'🟡', title:'Mobile has room to improve', text:'The mobile version works but has room to improve. Simple adjustments can boost the experience and ranking.' });
        if (s.conversion >= 50 && s.conversion < 75) r.push({ t:'warning', i:'🟡', title:'Conversion can be optimized', text:'Conversion elements exist but could be clearer, more visible, and create more urgency to guide users to contact you.' });
        if (cwv && cwv.lcpS !== null && cwv.lcpS < 0.5) r.push({ t:'warning', i:'🟡', title:`High LCP: ${cwv.lcp}`, text:'Largest Contentful Paint exceeds the recommended threshold. Users wait too long to see the main content, which affects ranking.' });
        if (s.velocidad >= 80) r.push({ t:'good', i:'✅', title:'Good load speed', text:'Your site loads fast, which improves the experience and is a positive factor for organic ranking.' });
        if (s.mobile >= 80)    r.push({ t:'good', i:'✅', title:'Good mobile experience', text:"Your site is well adapted to mobile devices. A plus for Google's ranking (mobile-first indexing)." });
        if (a.q3 === 1)        r.push({ t:'good', i:'✅', title:'HTTPS active', text:'Your site has an SSL certificate. It builds trust with users and is a baseline requirement for Google.' });
        return r;
      }

      async function sendLead(scores) {
        const body = {
          name: state.name, email: state.email,
          telefono: state.phone || 'Not provided',
          url_auditada: state.url, negocio: state.business,
          tipo: state.type, objetivo: state.goal,
          puntaje_global: scores.overall,
          velocidad: scores.velocidad, seo: scores.seo,
          mobile: scores.mobile, conversion: scores.conversion,
          tecnico: scores.tecnico,
          analisis_automatico: state.apiUsed ? 'Yes (PageSpeed API)' : 'No (questionnaire only)',
          _subject: `Free web audit — ${state.business} · ${scores.overall}/100`,
          form_source: 'free-web-audit',
        };
        await fetch('https://formspree.io/f/mvoykeyq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
      }

    })();

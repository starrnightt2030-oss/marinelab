// Station: reading isometric piping drawings — several ship systems (+ a crude-oil line) drawn by one isometric engine,
// with auto-generated questions on symbols, quantities, cut lengths and line data; plus a symbols study mode.
import { sfx } from '../audio.js';
import { $, $$, gsap, I, playLine, sayText, fb, startSession, penalize, scoreNow, renderResult, shuffle, SES, fmt, elapsed } from '../ui.js';
import { SYM, symbolSVG } from '../symbols.js';

import { DRAWINGS, DRAW_SCEN, CE, build, proj, ang, readable, lerp, questions } from '../drawing-data.js';
export { DRAWINGS, DRAW_SCEN };

export function drawingSVG(D, G) {
  const all = [...G.main, ...G.branches.flatMap(b => b.pts)].map(proj);
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const pad = 110, minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const W = Math.max(900, maxX - minX), H = maxY - minY, TB = 90;
  const ox = -minX + (W - (maxX - minX)) / 2, oy = -minY;
  const P = w => { const p = proj(w); return [p[0] + ox, p[1] + oy]; };
  const line = pts => pts.map(P).map(p => p.join(',')).join(' ');
  let s = '';
  s += `<polyline points="${line(G.main)}" fill="none" stroke="#1B1D20" stroke-width="3.4" stroke-linejoin="round"/>`;
  G.branches.forEach(b => { s += `<polyline points="${line(b.pts)}" fill="none" stroke="#1B1D20" stroke-width="3" stroke-linejoin="round"/>`; const o = P(b.o); s += `<circle cx="${o[0]}" cy="${o[1]}" r="4" fill="#1B1D20"/>`; });
  const elbows = [...G.main.slice(1, -1), ...G.branches.flatMap(b => b.pts.slice(1, -1))];
  elbows.forEach(e => { const p = P(e); s += `<circle cx="${p[0]}" cy="${p[1]}" r="4.6" fill="#1B1D20"/><circle class="hit" data-sym="elbow" cx="${p[0]}" cy="${p[1]}" r="16"/>`; });
  G.branches.forEach(b => { const o = P(b.o); s += `<circle class="hit" data-sym="tee" cx="${o[0]}" cy="${o[1]}" r="16"/>`; });
  // dimensions on main segments
  const cen = all.reduce((c, p) => [c[0] + p[0] / all.length, c[1] + p[1] / all.length], [0, 0]).map((v, i) => v + (i ? oy : ox));
  G.segs.forEach((sg, i) => {
    const A = P(sg.a), Bp = P(sg.b), a = Math.atan2(Bp[1] - A[1], Bp[0] - A[0]); let nx = -Math.sin(a), ny = Math.cos(a); const off = 40;
    const mid = [(A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2]; if ((mid[0] - cen[0]) * nx + (mid[1] - cen[1]) * ny < 0) { nx = -nx; ny = -ny; }
    const m = [mid[0] + nx * (off + 13), mid[1] + ny * (off + 13)];
    s += `<line x1="${A[0] + nx * off}" y1="${A[1] + ny * off}" x2="${Bp[0] + nx * off}" y2="${Bp[1] + ny * off}" stroke="#B23A2E" stroke-width="1"/>`;
    [A, Bp].forEach(q => { s += `<line x1="${q[0] + nx * 8}" y1="${q[1] + ny * 8}" x2="${q[0] + nx * (off + 6)}" y2="${q[1] + ny * (off + 6)}" stroke="#B23A2E" stroke-width=".7"/><circle cx="${q[0] + nx * off}" cy="${q[1] + ny * off}" r="2.2" fill="#B23A2E"/>`; });
    s += `<text transform="translate(${m[0]} ${m[1]}) rotate(${readable(a * 180 / Math.PI)})" text-anchor="middle" dominant-baseline="middle" font-family="JetBrains Mono" font-size="14" font-weight="700" fill="#B23A2E">${sg.len}</text>`;
  });
  // flow arrow on the longest main segment without items
  const free = G.segs.map((sg, i) => ({ sg, i })).filter(({ i }) => !G.items.some(it => it.seg === i && it.s.main)).sort((a, b) => b.sg.len - a.sg.len)[0] || { sg: G.segs[0] };
  { const p = P(lerp(free.sg.a, free.sg.b, 0.5)); s += `<g transform="translate(${p[0]} ${p[1]}) rotate(${ang(free.sg)})">${SYM.flow.g()}</g><circle class="hit" data-sym="flow" cx="${p[0]}" cy="${p[1]}" r="14"/>`; }
  // items
  G.items.forEach(it => {
    const p = P(it.p), def = SYM[it.sym], a = ang(it.s);
    const rot = def.inst || def.eq ? 0 : (def === SYM.support || def === SYM.anchor || def === SYM.guide) ? 0 : a;
    s += `<g transform="translate(${p[0]} ${p[1]}) rotate(${rot})">${def.g()}</g>`;
    if (it.tag) { const n = [-Math.sin(a * Math.PI / 180), Math.cos(a * Math.PI / 180)], k = def.inst ? -46 : -30; s += `<text x="${p[0] + (def.inst ? 22 : n[0] * k)}" y="${p[1] + (def.inst ? -38 : n[1] * k)}" text-anchor="${def.inst ? 'start' : 'middle'}" font-family="JetBrains Mono" font-size="12" font-weight="600" fill="#1B1D20">${it.tag}</text>`; }
    if (!['support', 'anchor', 'guide', 'flange'].includes(it.sym)) s += `<circle class="hit" data-sym="${it.sym}" cx="${p[0]}" cy="${p[1] - (def.inst ? 20 : 0)}" r="${def.eq ? 30 : 22}"/>`;
  });
  // equipment at start / end, and branch ends
  const endAt = (w, e, segDir, out) => {
    const p = P(w), def = SYM[e.sym];
    const rot = def.eq ? 0 : segDir + (out ? 0 : 180);
    const shift = def.eq ? (e.sym === 'seachest' || e.sym === 'well' ? [0, 26] : e.sym === 'tank' ? [0, -6] : [0, 0]) : [0, 0];
    s += `<g transform="translate(${p[0] + shift[0]} ${p[1] + shift[1]}) rotate(${rot})">${def.g()}</g>`;
    if (e.tag) s += `<text x="${p[0] + 40}" y="${p[1] - 26}" font-family="JetBrains Mono" font-size="12" font-weight="700" fill="#1B1D20">${e.tag}</text>`;
    s += `<circle class="hit" data-sym="${e.sym}" cx="${p[0] + shift[0]}" cy="${p[1] + shift[1]}" r="${def.eq ? 34 : 22}"/>`;
  };
  if (D.startEq) endAt(G.main[0], D.startEq, ang(G.segs[0]), false);
  if (D.endEq) endAt(G.main[G.main.length - 1], D.endEq, ang(G.segs[G.segs.length - 1]), true);
  if (D.end) endAt(G.main[G.main.length - 1], D.end, ang(G.segs[G.segs.length - 1]), true);
  G.branches.forEach(b => { if (b.end) endAt(b.pts[b.pts.length - 1], b.end, ang(b.bs[b.bs.length - 1]), true); });
  const y0 = H;
  return `<svg viewBox="0 0 ${W} ${H + TB}" class="iso" style="direction:ltr" role="img" aria-label="رسم أيزومتري: ${D.t}">
    <defs><pattern id="isog" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="matrix(0.866 0.5 -0.866 0.5 0 0)"><path d="M0 0H22M0 0V22" stroke="#E3E0D7" stroke-width=".8"/></pattern></defs>
    <rect width="${W}" height="${H + TB}" fill="#F4F2EC"/><rect width="${W}" height="${H}" fill="url(#isog)"/>
    ${s}
    <g transform="translate(${W - 70} ${H - 40})" stroke="#1B1D20" stroke-width="1.4" fill="none"><line x1="0" y1="0" x2="30" y2="-17"/><line x1="0" y1="0" x2="0" y2="-34"/><line x1="0" y1="0" x2="-30" y2="-17"/></g>
    <text x="${W - 36}" y="${H - 58}" font-family="JetBrains Mono" font-size="11" fill="#1B1D20">FWD</text><text x="${W - 76}" y="${H - 80}" font-family="JetBrains Mono" font-size="11" fill="#1B1D20">UP</text>
    <g font-family="Readex Pro" font-size="12" fill="#1B1D20"><rect x="0" y="${y0}" width="${W}" height="${TB}" fill="#F4F2EC" stroke="#1B1D20" stroke-width="2"/>
      ${[1, 2, 3].map(k => `<line x1="${W * k / 4}" y1="${y0}" x2="${W * k / 4}" y2="${y0 + TB}" stroke="#1B1D20"/>`).join('')}
      <text x="${W - 10}" y="${y0 + 24}" text-anchor="end" fill="#555">رقم الخط</text><text x="${W - 10}" y="${y0 + 54}" text-anchor="end" font-family="JetBrains Mono" font-weight="700" font-size="15" direction="ltr">${D.line}</text>
      <text x="${W * 3 / 4 - 10}" y="${y0 + 24}" text-anchor="end" fill="#555">الخدمة</text><text x="${W * 3 / 4 - 10}" y="${y0 + 54}" text-anchor="end" font-weight="700" font-size="15">${D.service}</text>
      <text x="${W / 2 - 10}" y="${y0 + 24}" text-anchor="end" fill="#555">التصنيف · ضغط الاختبار</text><text x="${W / 2 - 10}" y="${y0 + 54}" text-anchor="end" font-family="JetBrains Mono" font-weight="700" font-size="14" direction="ltr">${D.cls} · ${D.test}</text>
      <text x="${W / 4 - 10}" y="${y0 + 24}" text-anchor="end" fill="#555">الأبعاد · المقياس</text><text x="${W / 4 - 10}" y="${y0 + 54}" text-anchor="end" font-family="JetBrains Mono" font-weight="700" font-size="14" direction="ltr">mm · NTS</text>
      <text x="${W / 2}" y="${y0 + 80}" text-anchor="middle" fill="#8a5a00" font-size="11">رسم تدريبي بأبعاد توضيحية — ليس رسمًا هندسيًا معتمدًا</text></g>
  </svg>`;
}

// ---------------- runner ----------------
let Q = null, timerI = 0;
function legendHTML(D, G) {
  const used = [...new Set([...G.items.map(i => i.sym), D.startEq?.sym, D.endEq?.sym, D.end?.sym, ...G.branches.map(b => b.end?.sym), 'elbow', 'flow', G.branches.length ? 'tee' : null].filter(Boolean))];
  return `<details class="legend"><summary>مفتاح الرموز في الرسم (${used.length})</summary><ul>${used.map(k => `<li>${symbolSVG(k, 40)}<span>${SYM[k].t}</span></li>`).join('')}</ul></details>`;
}
function renderQ() {
  const q = Q.list[Q.i], n = Q.list.length;
  const dots = Q.list.map((_, k) => `<i class="${k < Q.i ? 'done' : k === Q.i ? 'now' : ''}"></i>`).join('');
  let body = '';
  if (q.type === 'mcq') body = `<div class="qopts">${shuffle(q.opts).map(o => `<button class="choice" data-v="${o}">${o}</button>`).join('')}</div>`;
  if (q.type === 'num') body = `<form class="qnum" id="qForm"><label for="qIn" class="muted">الإجابة (${q.unit})</label><div><input id="qIn" inputmode="numeric" autocomplete="off" dir="ltr"><button class="btn btn--primary" type="submit">تحقق</button></div></form>`;
  if (q.type === 'tap') body = `<p class="qtap">${I.search}<span>اضغط على الرمز في الرسم</span></p>`;
  $('#drPanel').innerHTML = `<div class="qhead"><span class="eyebrow">سؤال ${Q.i + 1} من ${n}</span><div class="qdots">${dots}</div></div>
    <h3 class="qtext">${q.q}</h3>${body}<div class="qfb" id="qFb" hidden></div>${Q.legend}`;
  sayText(q.q);
  gsap.fromTo('#drPanel .qtext', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .35 });
  Q.tries = 0;
  $$('#drPanel .choice').forEach(b => b.addEventListener('click', () => answer(b.dataset.v, b)));
  const f = $('#qForm'); if (f) { f.addEventListener('submit', e => { e.preventDefault(); const v = parseFloat(($('#qIn').value || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); if (!isNaN(v)) answer(v); }); setTimeout(() => $('#qIn')?.focus(), 200); }
}
function answer(v, el) {
  const q = Q.list[Q.i]; if (Q.locked) return;
  const ok = q.type === 'num' ? Math.abs(v - q.a) < 0.5 : v === q.a;
  const fbEl = $('#qFb'); fbEl.hidden = false;
  if (ok) {
    Q.locked = true; sfx.ok(); sayText(q.why);
    fbEl.className = 'qfb is-ok'; fbEl.innerHTML = `${I.ok}<span>${q.why}</span>`;
    if (el) el.classList.add('is-right'); mark(q.a, true); next(Math.min(7000, 1200 + q.why.length * 65));
  } else {
    Q.tries++; sfx.error();
    if (el) { el.classList.add('is-wrong'); el.disabled = true; }
    if (Q.tries === 1) { penalize(q.k, 3, 'خطأ في: ' + q.q.replace(/<[^>]+>/g, '').slice(0, 60)); fbEl.className = 'qfb is-err'; fbEl.innerHTML = `${I.warn}<span>إجابة غلط. ركّز في الرسم وجرّب تاني.</span>`; fb('draw_wrong'); }
    else { Q.locked = true; penalize(q.k, 4, 'لم يحدد الإجابة الصحيحة: ' + q.q.replace(/<[^>]+>/g, '').slice(0, 60)); fbEl.className = 'qfb is-err'; fbEl.innerHTML = `${I.info}<span>الإجابة الصحيحة: <b>${q.type === 'num' ? q.a + ' ' + q.unit : q.type === 'tap' ? 'الرمز المنوّر في الرسم' : q.a}</b>. ${q.why}</span>`; mark(q.a, false); sayText(q.why); next(Math.min(7000, 1800 + q.why.length * 65)); }
  }
  $('#drScore').textContent = scoreNow();
}
function mark(sym, ok) { if (Q.list[Q.i].type !== 'tap') return; $$(`#drSheet [data-sym="${sym}"]`).forEach(c => { c.classList.add(ok ? 'is-right' : 'is-show'); setTimeout(() => c.classList.remove('is-right', 'is-show'), 2400); }); }
function next(ms = 1700) { setTimeout(() => { if (!Q) return; Q.locked = false; Q.i++; if (Q.i >= Q.list.length) return finish(); renderQ(); }, ms); }
function finish() {
  clearInterval(timerI);
  const tips = [];
  if (SES.ded.symbols) tips.push('افتح «مكتبة الرموز» وذاكر الرموز قبل الرسومات.');
  if (SES.ded.quant) tips.push('في طول القطع اطرح طول الكوع من المركز للطرف من الناحيتين، وعدّ الأكواع من النقط المرسومة.');
  if (SES.ded.knowledge) tips.push('ركّز على خانة بيانات الخط وألوان التعريف ووظيفة كل صمام.');
  renderResult(drawingStation, { badges: [scoreNow() >= 90 && 'reader'], tips }); Q = null;
}

// ---------------- symbols study + quiz ----------------
function startSymbols(level) {
  const keys = Object.keys(SYM).filter(k => k !== 'flow');
  $('#drTitle').textContent = 'مكتبة رموز المواسير'; $('#drSub').textContent = 'اضغط على الرمز علشان تسمع اسمه، وبعدين اختبر نفسك';
  $('#drSheet').innerHTML = `<div class="symgrid">${keys.map(k => `<button class="symcard" data-k="${k}">${symbolSVG(k, 72)}<b>${SYM[k].t}</b><small dir="ltr">${SYM[k].en}</small></button>`).join('')}</div>`;
  $('#drSheet').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; sfx.tap(); $$('.symcard').forEach(x => x.classList.toggle('is-on', x === b)); sayText(SYM[b.dataset.k].t); };
  const n = level === 'easy' ? 8 : level === 'mid' ? 12 : 16;
  const list = shuffle(keys).slice(0, n).map(k => ({ k: 'symbols', type: 'mcq', q: `الرمز ده معناه إيه؟<div class="qsym">${symbolSVG(k, 110)}</div>`, opts: [SYM[k].t, ...shuffle(keys.filter(x => x !== k)).slice(0, 3).map(x => SYM[x].t)], a: SYM[k].t, why: `${SYM[k].t} — ${SYM[k].en}.` }));
  Q = { list, i: 0, tries: 0, locked: false, legend: '<p class="muted">ذاكر الرموز في الشبكة على الشمال وارجعلها في أي وقت.</p>' };
  renderQ();
}

export const drawingStation = {
  id: 'drawing', title: 'قراءة الرسومات الهندسية',
  start({ mode = 'test', level = 'mid', scenario = 'sw' } = {}) {
    this.last = { mode, level, scenario };
    if (scenario === 'symbols') {
      startSession({ id: 'drawing', title: 'مكتبة الرموز', sub: 'رموز الرسومات الأيزومترية', mode, level, cats: { symbols: ['التعرف على الرموز', 100] } });
      startSymbols(level);
    } else {
      const D = DRAWINGS[scenario] || DRAWINGS.sw, G = build(D);
      startSession({ id: 'drawing', title: D.t, sub: D.sub, mode, level, cats: { symbols: ['قراءة الرموز', 30], quant: ['الكميات والأبعاد', 45], knowledge: ['المعرفة الفنية', 25] } });
      $('#drTitle').textContent = 'قراءة الرسومات · ' + D.t; $('#drSub').textContent = D.sub;
      $('#drSheet').innerHTML = drawingSVG(D, G);
      Q = { list: questions(D, G, level), i: 0, tries: 0, locked: false, legend: mode === 'learn' ? legendHTML(D, G) : '' };
      $('#drSheet').onclick = e => { const c = e.target.closest('[data-sym]'); if (!c || !Q) return; const q = Q.list[Q.i]; if (q.type !== 'tap') return; answer(c.dataset.sym, null); };
      renderQ();
    }
    $('#drScore').textContent = scoreNow();
    clearInterval(timerI); timerI = setInterval(() => { $('#drTimer').textContent = fmt(elapsed()); }, 500);
    playLine('draw_intro');
  },
  again() { this.start(this.last); },
  stop() { clearInterval(timerI); Q = null; },
};

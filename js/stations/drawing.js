// Station: reading isometric piping drawings — several ship systems (+ a crude-oil line) drawn by one isometric engine,
// with auto-generated questions on symbols, quantities, cut lengths and line data; plus a symbols study mode.
import { sfx } from '../audio.js';
import { $, $$, gsap, I, playLine, fb, startSession, penalize, scoreNow, renderResult, shuffle, SES, fmt, elapsed } from '../ui.js';
import { SYM, symbolSVG } from '../symbols.js';

const CE = { 50: 76, 80: 114, 100: 152, 150: 229 };   // LR elbow centre-to-end (mm), ASME B16.9
export const DRAWINGS = {
  sw: {
    t: 'سحب وتصريف طلمبة مياه البحر', sub: 'سفينة · غرفة الماكينات · نظام التبريد', line: 'SW-101 · DN150', service: 'مياه البحر', cls: 'PN10', test: '10 bar', dn: 150,
    start: [0, 0, 0], startEq: { sym: 'seachest', tag: 'SC-01' }, endEq: { sym: 'hx', tag: 'HX-01' },
    path: [['z', 800], ['x', 2000], ['y', -1600], ['x', 1800], ['z', 700], ['y', -1500]],
    items: [{ seg: 0, t: .5, sym: 'butterfly', tag: 'V-01' }, { seg: 1, t: .22, sym: 'mudbox', tag: 'F-01' }, { seg: 1, t: .5, sym: 'bellows', tag: 'EJ-01' }, { seg: 1, t: .8, sym: 'gate', tag: 'V-02' },
      { seg: 2, t: .3, sym: 'reducerE', tag: 'R-01' }, { seg: 2, t: .72, sym: 'pump', tag: 'P-01' }, { seg: 3, t: .25, sym: 'check', tag: 'V-03' }, { seg: 3, t: .58, sym: 'globe', tag: 'V-04' },
      { seg: 3, t: .85, sym: 'gauge', tag: 'PI-01' }, { seg: 4, t: .5, sym: 'thermo', tag: 'TI-01' }, { seg: 5, t: .4, sym: 'support' }, { seg: 1, t: .65, sym: 'support' }],
    know: [
      { q: 'خطوط مياه البحر على السفينة بتتعلّم بأنهي لون (ISO 14726)؟', opts: ['أخضر', 'بني', 'أحمر', 'أزرق'], a: 'أخضر', why: 'الأخضر = مياه البحر.' },
      { q: 'ليه المسلوب R-01 قبل الطلمبة غير متحد المركز (FOT)؟', opts: ['علشان مايتكوّنش جيب هوا في سحب الطلمبة', 'علشان يزوّد الضغط', 'علشان يسهّل اللحام', 'علشان يقلل الوزن'], a: 'علشان مايتكوّنش جيب هوا في سحب الطلمبة', why: 'الجانب المستوي لفوق (Flat On Top) بيمنع تجمع الهوا اللي يعمل تكهف في الطلمبة.' },
      { q: 'وظيفة وصلة التمدد EJ-01 بعد الصندوق البحري إيه؟', opts: ['امتصاص الاهتزاز والتمدد بين الخط والجسم', 'تصفية المياه', 'قفل الخط', 'قياس الضغط'], a: 'امتصاص الاهتزاز والتمدد بين الخط والجسم', why: 'الـ Bellows بيفصل اهتزاز الطلمبة وحركة البدن عن الخط.' },
    ],
  },
  fire: {
    t: 'الخط الرئيسي لإطفاء الحريق', sub: 'سفينة · من طلمبة الحريق لحنفيات السطح', line: 'FF-201 · DN100', service: 'إطفاء الحريق', cls: 'PN16', test: '16 bar', dn: 100,
    start: [0, 0, 0], startEq: { sym: 'pump', tag: 'P-02' }, end: { sym: 'blind', tag: 'BF-01' },
    path: [['x', 1600], ['z', 1800], ['y', -2000], ['x', 3400]],
    items: [{ seg: 0, t: .38, sym: 'check', tag: 'V-11' }, { seg: 0, t: .72, sym: 'gate', tag: 'V-12' }, { seg: 1, t: .85, sym: 'gauge', tag: 'PI-11' }, { seg: 1, t: .2, sym: 'flange' },
      { seg: 2, t: .55, sym: 'support' }, { seg: 3, t: .15, sym: 'anchor' }, { seg: 3, t: .9, sym: 'support' }],
    branches: [{ seg: 3, t: .35, path: [['z', 500]], end: { sym: 'hydrant', tag: 'H-01' } }, { seg: 3, t: .7, path: [['z', 500]], end: { sym: 'hydrant', tag: 'H-02' } },
      { seg: 1, t: .55, path: [['x', -700]], items: [{ seg: 0, t: .5, sym: 'relief', tag: 'V-13' }], end: { sym: 'drain' } }],
    know: [
      { q: 'خطوط الحريق على السفينة لونها إيه؟', opts: ['أحمر', 'أخضر', 'فضي', 'بني'], a: 'أحمر', why: 'الأحمر = إطفاء الحريق.' },
      { q: 'ليه آخر الخط مقفول بفلانشة عمياء BF-01 بدل غطاء ملحوم؟', opts: ['علشان ينفع يتفتح للتوسعة والاختبار والتنظيف', 'لأنها أرخص', 'علشان تخفف الضغط', 'علشان تمنع الصدأ'], a: 'علشان ينفع يتفتح للتوسعة والاختبار والتنظيف', why: 'الفلانشة العمياء نقطة فك سهلة للاختبار والتوسعة.' },
      { q: 'إيه وظيفة الصمام V-13 على الفرع ده؟', opts: ['يحمي الخط من زيادة الضغط', 'يمنع رجوع المياه', 'يقفل الخط بسرعة', 'يقيس السريان'], a: 'يحمي الخط من زيادة الضغط', why: 'صمام الأمان بيفتح لوحده لو الضغط عدّى القيمة المضبوطة.' },
    ],
  },
  fuel: {
    t: 'خط نقل الوقود', sub: 'سفينة · من خزان الترسيب لخزان الخدمة', line: 'FO-301 · DN50', service: 'وقود', cls: 'PN16', test: '10 bar', dn: 50,
    start: [0, 0, 0], startEq: { sym: 'tank', tag: 'T-01' }, endEq: { sym: 'tank', tag: 'T-02' },
    path: [['z', -700], ['x', 2200], ['y', -1400], ['x', 1800], ['z', 1600]],
    items: [{ seg: 0, t: .5, sym: 'qcv', tag: 'V-21' }, { seg: 1, t: .25, sym: 'strainerY', tag: 'F-21' }, { seg: 1, t: .62, sym: 'pump', tag: 'P-21' }, { seg: 2, t: .55, sym: 'ball', tag: 'V-22' },
      { seg: 3, t: .3, sym: 'hose', tag: 'FH-01' }, { seg: 3, t: .72, sym: 'sight', tag: 'SG-01' }, { seg: 4, t: .45, sym: 'thermo', tag: 'TI-21' }, { seg: 1, t: .88, sym: 'support' }],
    branches: [{ seg: 2, t: .2, path: [['y', -600]], items: [{ seg: 0, t: .5, sym: 'relief', tag: 'V-23' }], end: { sym: 'cap' } }],
    know: [
      { q: 'خطوط الوقود على السفينة لونها إيه؟', opts: ['بني', 'أصفر', 'أخضر', 'أزرق'], a: 'بني', why: 'البني = الوقود، والأصفر للزيت.' },
      { q: 'محبس القفل السريع V-21 بيتقفل إزاي في الطوارئ؟', opts: ['من مكان بعيد خارج المكان بالسلك أو الهوا', 'باليد من جنبه بس', 'بيتقفل لوحده لو الحرارة زادت', 'مابيتقفلش'], a: 'من مكان بعيد خارج المكان بالسلك أو الهوا', why: 'في الحريق لازم يتقفل الوقود عن بعد من غير ما حد يدخل المكان.' },
      { q: 'ليه فيه خرطوم مرن FH-01 في الخط؟', opts: ['يمتص الاهتزاز والحركة بين الأجزاء', 'يصفّي الوقود', 'يسخّن الوقود', 'يقلل الضغط'], a: 'يمتص الاهتزاز والحركة بين الأجزاء', why: 'الخرطوم المرن بيعزل الاهتزاز بين المعدات والخط الثابت.' },
    ],
  },
  bilge: {
    t: 'خط تصفية السينتينة (Bilge)', sub: 'سفينة · من بئر السينتينة للخروج للبحر', line: 'BG-401 · DN80', service: 'سينتينة', cls: 'PN10', test: '6 bar', dn: 80,
    start: [0, 0, 0], startEq: { sym: 'well', tag: 'BW-01' }, endEq: { sym: 'overboard', tag: 'OB-01' },
    path: [['z', 600], ['x', 1700], ['y', -1000], ['x', 1700], ['z', 1400], ['y', -1400]],
    items: [{ seg: 1, t: .3, sym: 'mudbox', tag: 'F-31' }, { seg: 1, t: .72, sym: 'sdnr', tag: 'V-31' }, { seg: 2, t: .5, sym: 'union' }, { seg: 3, t: .35, sym: 'pump', tag: 'P-31' }, { seg: 3, t: .75, sym: 'check', tag: 'V-32' },
      { seg: 4, t: .35, sym: 'spectacle', tag: 'SB-01' }, { seg: 4, t: .7, sym: 'gauge', tag: 'PI-31' }, { seg: 5, t: .55, sym: 'sdnr', tag: 'V-33' }, { seg: 3, t: .55, sym: 'support' }],
    know: [
      { q: 'ليه المحبس V-33 قبل الخروج للبحر من نوع SDNR؟', opts: ['يمنع دخول مياه البحر للسفينة ويتقفل كمان باليد', 'يزوّد سرعة الطلمبة', 'يصفّي الزيت', 'يقيس الضغط'], a: 'يمنع دخول مياه البحر للسفينة ويتقفل كمان باليد', why: 'SDNR = عدم رجوع + قفل يدوي: حماية مزدوجة لفتحة في البدن.' },
      { q: 'المياه الزيتية من السينتينة قبل ما تتصرف للبحر لازم تعدي على إيه حسب ماربول (MARPOL)؟', opts: ['فاصل زيت ومياه (OWS)', 'مبادل حراري', 'خزان وقود', 'ولا حاجة'], a: 'فاصل زيت ومياه (OWS)', why: 'ممنوع تصريف زيت للبحر: الفاصل بيطلّع المياه بنسبة زيت أقل من 15 جزء في المليون.' },
      { q: 'فلانشة النظارة SB-01 بتستخدم في إيه؟', opts: ['عزل الخط بشكل مؤكد للصيانة بقلب القرص المقفول', 'تقليل القطر', 'قياس السريان', 'امتصاص الاهتزاز'], a: 'عزل الخط بشكل مؤكد للصيانة بقلب القرص المقفول', why: 'نص مفتوح ونص مقفول: تقلبها على المقفول فتعزل الخط تمامًا.' },
    ],
  },
  oil: {
    t: 'خط نقل زيت خام', sub: 'محطة معالجة بترول · من الخزان للطلمبة', line: '4"-CO-1201-B1A', service: 'زيت خام', cls: 'Class 300', test: '75 bar', dn: 100,
    start: [0, 0, 0], startEq: { sym: 'tank', tag: 'TK-01' }, endEq: { sym: 'pump', tag: 'P-1201' },
    path: [['x', 2000], ['z', 900], ['y', -1800], ['x', 2000], ['z', -900]],
    items: [{ seg: 0, t: .35, sym: 'gate', tag: 'XV-01' }, { seg: 0, t: .7, sym: 'spectacle', tag: 'SB-01' }, { seg: 2, t: .3, sym: 'strainerY', tag: 'Y-01' }, { seg: 2, t: .7, sym: 'ball', tag: 'V-02' },
      { seg: 3, t: .4, sym: 'check', tag: 'V-03' }, { seg: 3, t: .75, sym: 'gauge', tag: 'PI-01' }, { seg: 4, t: .3, sym: 'reducerE', tag: 'R-01' }, { seg: 2, t: .5, sym: 'support' }],
    branches: [{ seg: 1, t: .5, path: [['y', -500]], items: [{ seg: 0, t: .5, sym: 'globe', tag: 'V-04' }], end: { sym: 'drain' } }],
    know: [
      { q: 'في رقم الخط 4"-CO-1201-B1A، الحروف CO معناها إيه؟', opts: ['زيت خام (Crude Oil)', 'ثاني أكسيد الكربون', 'مياه تبريد', 'هواء مضغوط'], a: 'زيت خام (Crude Oil)', why: 'رمز الخدمة في رقم الخط بيوضح نوع السائل.' },
      { q: 'الجزء B1A في آخر رقم الخط بيدل على إيه غالبًا؟', opts: ['مواصفة المواسير (Piping class)', 'رقم الطلمبة', 'طول الخط', 'اسم المصمم'], a: 'مواصفة المواسير (Piping class)', why: 'كود المواصفة بيحدد المادة والتصنيف والحشيات.' },
    ],
  },
};
export const DRAW_SCEN = { sw: { t: 'مياه البحر', d: 'سحب وتصريف طلمبة التبريد' }, fire: { t: 'الحريق', d: 'الخط الرئيسي والحنفيات' }, fuel: { t: 'الوقود', d: 'نقل الوقود بين الخزانات' }, bilge: { t: 'السينتينة', d: 'التصفية والخروج للبحر' }, oil: { t: 'بترول', d: 'خط زيت خام' }, symbols: { t: 'مكتبة الرموز', d: 'اتعلّم كل الرموز واختبر نفسك' } };

// ---------------- isometric engine ----------------
const S0 = 0.11;   // px per mm
const proj = ([x, y, z]) => [(x - y) * 0.866 * S0, -(x + y) * 0.5 * S0 - z * S0];
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
function walk(start, moves) {
  const pts = [start.slice()];
  moves.forEach(([a, L]) => { const p = pts[pts.length - 1].slice(); const v = AX[a]; p[0] += v[0] * L; p[1] += v[1] * L; p[2] += v[2] * L; pts.push(p); });
  return pts;
}
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function build(D) {
  const main = walk(D.start, D.path);
  const segs = [], items = [], branches = [];
  for (let i = 0; i < main.length - 1; i++) segs.push({ a: main[i], b: main[i + 1], len: Math.abs(D.path[i][1]), main: true });
  (D.items || []).forEach(it => items.push({ ...it, p: lerp(segs[it.seg].a, segs[it.seg].b, it.t), s: segs[it.seg] }));
  (D.branches || []).forEach(br => {
    const o = lerp(segs[br.seg].a, segs[br.seg].b, br.t), pts = walk(o, br.path), bs = [];
    for (let i = 0; i < pts.length - 1; i++) bs.push({ a: pts[i], b: pts[i + 1], len: Math.abs(br.path[i][1]) });
    (br.items || []).forEach(it => items.push({ ...it, p: lerp(bs[it.seg].a, bs[it.seg].b, it.t), s: bs[it.seg] }));
    branches.push({ o, pts, bs, end: br.end });
  });
  return { main, segs, items, branches };
}
const ang = (s) => { const A = proj(s.a), Bp = proj(s.b); return Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) * 180 / Math.PI; };
const readable = a => (a > 90 || a < -90) ? a + 180 : a;

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

// ---------------- questions ----------------
function questions(D, G, level) {
  const qs = [];
  const tappable = [...new Set(G.items.map(i => i.sym).filter(s => !['support', 'anchor', 'guide', 'flange', 'flow'].includes(s)))];
  shuffle(tappable).slice(0, level === 'easy' ? 3 : 4).forEach(sym => qs.push({ k: 'symbols', type: 'tap', q: `اضغط على رمز «${SYM[sym].t}» في الرسم.`, a: sym, why: `ده رمز ${SYM[sym].t} (${SYM[sym].en}).` }));
  const nElb = G.main.length - 2 + G.branches.reduce((n, b) => n + b.pts.length - 2, 0);
  qs.push({ k: 'quant', type: 'num', q: 'كام كوع في الرسم كله (الخط الرئيسي والفروع)؟', a: nElb, unit: 'كوع', why: 'كل تغيير اتجاه مرسوم بنقطة = كوع.' });
  const nV = G.items.filter(i => SYM[i.sym].valve).length + [D.end, ...G.branches.map(b => b.end)].filter(e => e && SYM[e.sym]?.valve).length;
  qs.push({ k: 'quant', type: 'num', q: 'كام صمام/محبس (بكل أنواعه) في الرسم؟', a: nV, unit: 'صمام', why: 'عدّ كل رموز الصمامات بما فيها صمام الأمان والحنفيات.' });
  const freeSeg = G.segs.map((sg, i) => ({ sg, i })).filter(({ i }) => i > 0 && i < G.segs.length - 1 && !G.items.some(it => it.seg === i && it.s.main && !['support', 'anchor', 'guide'].includes(it.sym)) && !G.branches.some(b => b.o && G.segs.indexOf(G.segs[i]) === i && false));
  if (freeSeg.length) { const { sg } = freeSeg[0]; const c = CE[D.dn]; qs.push({ k: 'quant', type: 'num', q: `المسافة بين مركزي الكوعين على الخط اللي طوله ${sg.len} مم، وطول الكوع DN${D.dn} من المركز للطرف ${c} مم. طول قطعة الماسورة كام؟`, a: sg.len - 2 * c, unit: 'مم', why: `${sg.len} − (2 × ${c}) = ${sg.len - 2 * c} مم.` }); }
  if (level !== 'easy') { const tot = G.segs.reduce((n, s) => n + s.len, 0); qs.push({ k: 'quant', type: 'num', q: 'إجمالي طول محاور الخط الرئيسي (مجموع أبعاده) كام؟', a: tot, unit: 'مم', why: G.segs.map(s => s.len).join(' + ') + ` = ${tot} مم.` }); }
  const from = D.startEq?.tag, to = (D.endEq || D.end)?.tag;
  qs.push({ k: 'quant', type: 'mcq', q: 'إيه اتجاه السريان حسب السهم في الرسم؟', opts: [`من ${from} إلى ${to}`, `من ${to} إلى ${from}`, 'في الاتجاهين', 'مش محدد'], a: `من ${from} إلى ${to}`, why: 'السهم المرسوم على الخط بيحدد اتجاه السريان.' });
  qs.push({ k: 'knowledge', type: 'mcq', q: 'كلمة NTS في خانة المقياس معناها إيه؟', opts: ['الرسم بدون مقياس، والأبعاد المكتوبة هي المعتمدة', 'المقياس 1:10', 'الأبعاد بالبوصة', 'الرسم مبدئي ومش للتنفيذ'], a: 'الرسم بدون مقياس، والأبعاد المكتوبة هي المعتمدة', why: 'NTS = Not To Scale.' });
  // symbol recognition from the general library
  shuffle(Object.keys(SYM).filter(k => !['flow', 'elbow', 'tee'].includes(k) && !tappable.includes(k))).slice(0, 2).forEach(k => {
    const wrong = shuffle(Object.keys(SYM).filter(x => x !== k && !['flow'].includes(x))).slice(0, 3).map(x => SYM[x].t);
    qs.push({ k: 'symbols', type: 'mcq', q: `الرمز ده معناه إيه؟<div class="qsym">${symbolSVG(k, 96)}</div>`, opts: [SYM[k].t, ...wrong], a: SYM[k].t, why: `${SYM[k].t} — ${SYM[k].en}.` });
  });
  D.know.forEach(k => qs.push({ k: 'knowledge', type: 'mcq', ...k }));
  return qs;
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
    Q.locked = true; sfx.ok(); fb('draw_ok', 'ok');
    fbEl.className = 'qfb is-ok'; fbEl.innerHTML = `${I.ok}<span>${q.why}</span>`;
    if (el) el.classList.add('is-right'); mark(q.a, true); next();
  } else {
    Q.tries++; sfx.error();
    if (el) { el.classList.add('is-wrong'); el.disabled = true; }
    if (Q.tries === 1) { penalize(q.k, 3, 'خطأ في: ' + q.q.replace(/<[^>]+>/g, '').slice(0, 60)); fbEl.className = 'qfb is-err'; fbEl.innerHTML = `${I.warn}<span>إجابة غلط. ركّز في الرسم وجرّب تاني.</span>`; fb('draw_wrong'); }
    else { Q.locked = true; penalize(q.k, 4, 'لم يحدد الإجابة الصحيحة: ' + q.q.replace(/<[^>]+>/g, '').slice(0, 60)); fbEl.className = 'qfb is-err'; fbEl.innerHTML = `${I.info}<span>الإجابة الصحيحة: <b>${q.type === 'num' ? q.a + ' ' + q.unit : q.type === 'tap' ? 'الرمز المنوّر في الرسم' : q.a}</b>. ${q.why}</span>`; mark(q.a, false); next(2800); }
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
  $('#drSheet').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; sfx.tap(); $$('.symcard').forEach(x => x.classList.toggle('is-on', x === b)); try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(SYM[b.dataset.k].t); u.lang = 'ar-EG'; speechSynthesis.speak(u); } catch { /* no speech */ } };
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

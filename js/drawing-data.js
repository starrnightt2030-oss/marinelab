// Pure data + logic for the drawings station (no DOM), shared with the voice generator.
import { SYM, symbolSVG } from './symbols.js';
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const CE = { 50: 76, 80: 114, 100: 152, 150: 229 };   // LR elbow centre-to-end (mm), ASME B16.9
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
export const proj = ([x, y, z]) => [(x - y) * 0.866 * S0, -(x + y) * 0.5 * S0 - z * S0];
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
function walk(start, moves) {
  const pts = [start.slice()];
  moves.forEach(([a, L]) => { const p = pts[pts.length - 1].slice(); const v = AX[a]; p[0] += v[0] * L; p[1] += v[1] * L; p[2] += v[2] * L; pts.push(p); });
  return pts;
}
export const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export function build(D) {
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
export const ang = (s) => { const A = proj(s.a), Bp = proj(s.b); return Math.atan2(Bp[1] - A[1], Bp[0] - A[0]) * 180 / Math.PI; };
export const readable = a => (a > 90 || a < -90) ? a + 180 : a;
// ---------------- questions ----------------
export function questions(D, G, level) {
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


/** Every sentence the drawings station can say (questions + explanations), for the voice generator. */
export function allDrawingTexts() {
  const out = new Set();
  for (const D of Object.values(DRAWINGS)) {
    const G = build(D);
    for (let r = 0; r < 12; r++) for (const lv of ['easy', 'mid', 'pro']) questions(D, G, lv).forEach(q => { out.add(q.q); out.add(q.why); });
    G.items.forEach(it => { const t = SYM[it.sym]; if (t) { out.add(`اضغط على رمز «${t.t}» في الرسم.`); out.add(`ده رمز ${t.t} (${t.en}).`); } });
  }
  Object.values(SYM).forEach(s => { out.add(`${s.t} — ${s.en}.`); out.add(s.t); });
  out.add('الرمز ده معناه إيه؟');
  return [...out];
}

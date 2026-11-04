// Station: reading isometric piping drawings (marine sea-water line / crude-oil line).
import { sfx } from '../audio.js';
import { $, $$, gsap, I, say, fb, startSession, penalize, scoreNow, renderResult, shuffle, SES, fmt, elapsed } from '../ui.js';

// isometric axes on screen: dir1 = (0.866,-0.5), dir2 = (0.866,0.5), up = (0,-1)
const P = { A: [140, 430], B: [452, 250], C: [452, 100], D: [677, 230], H: [677, 340] };
const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const VARIANTS = {
  ship: {
    title: 'خط تصريف طلمبة مياه البحر', sub: 'غرفة الماكينات · رسم أيزومتري تدريبي', line: 'SW-104 · DN100', service: 'مياه البحر', cls: 'PN16', test: '16 bar', colorNote: 'أخضر',
    qKnow: [
      { k: 'knowledge', type: 'mcq', q: 'حسب ألوان التعريف على السفن (ISO 14726)، الخط ده هيتدهن أو يتعلّم بأنهي لون؟', opts: ['أخضر', 'بني', 'أحمر', 'فضي'], a: 'أخضر', why: 'الأخضر هو لون تعريف خطوط مياه البحر.' },
      { k: 'knowledge', type: 'mcq', q: 'ليه صمام عدم الرجوع (Check valve) متركب بعد الطلمبة مباشرة؟', opts: ['يمنع رجوع المياه للطلمبة لما تقف', 'ينظم كمية السريان', 'يخفف الضغط', 'يصرّف الخط'], a: 'يمنع رجوع المياه للطلمبة لما تقف', why: 'صمام عدم الرجوع يسمح بالسريان في اتجاه واحد فقط.' },
    ],
  },
  oil: {
    title: 'خط نقل زيت خام', sub: 'محطة معالجة بترول · رسم أيزومتري تدريبي', line: '4"-CO-1201-B1A', service: 'زيت خام', cls: 'Class 300', test: '75 bar', colorNote: '—',
    qKnow: [
      { k: 'knowledge', type: 'mcq', q: 'في رقم الخط 4"-CO-1201-B1A، الحروف CO معناها إيه؟', opts: ['زيت خام (Crude Oil)', 'ثاني أكسيد الكربون', 'مياه تبريد', 'هواء مضغوط'], a: 'زيت خام (Crude Oil)', why: 'رمز الخدمة في رقم الخط بيوضح نوع السائل: CO = Crude Oil.' },
      { k: 'knowledge', type: 'mcq', q: 'الجزء B1A في آخر رقم الخط بيدل على إيه غالبًا؟', opts: ['مواصفة المواسير (Piping class)', 'رقم الطلمبة', 'طول الخط', 'اسم المصمم'], a: 'مواصفة المواسير (Piping class)', why: 'آخر جزء في رقم الخط هو كود مواصفة المواسير اللي بيحدد المادة والتصنيف والحشيات.' },
    ],
  },
};

function drawingSVG(v) {
  const L1 = (t) => along(P.A, P.B, t);
  const rd = L1(0.12), ck = L1(0.4), gv = L1(0.66), tee = along(P.C, P.D, 0.45), drn = [tee[0], tee[1] + 70];
  const flange = (p, rot) => `<g transform="translate(${p[0]} ${p[1]}) rotate(${rot})"><line x1="0" y1="-10" x2="0" y2="10"/></g>`;
  const valve = (p, rot) => `<g transform="translate(${p[0]} ${p[1]}) rotate(${rot})"><polygon points="-14,-9 14,9 14,-9 -14,9" fill="#F4F2EC"/><line x1="0" y1="0" x2="0" y2="-24"/><line x1="-8" y1="-24" x2="8" y2="-24"/><line x1="-19" y1="-10" x2="-19" y2="10"/><line x1="19" y1="-10" x2="19" y2="10"/></g>`;
  const check = (p, rot) => `<g transform="translate(${p[0]} ${p[1]}) rotate(${rot})"><polygon points="-14,-9 14,9 14,-9 -14,9" fill="#F4F2EC"/><line x1="-14" y1="9" x2="14" y2="-9" stroke-width="3"/><path d="M-6 -16 L8 -16 M4 -20 L8 -16 L4 -12"/><line x1="-19" y1="-10" x2="-19" y2="10"/><line x1="19" y1="-10" x2="19" y2="10"/></g>`;
  const hitc = (id, p, r = 24) => `<circle class="hit" data-sym="${id}" cx="${p[0]}" cy="${p[1]}" r="${r}"/>`;
  return `<svg viewBox="0 0 900 560" class="iso" role="img" aria-label="رسم أيزومتري لخط ${v.service}">
  <defs><pattern id="isog" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="matrix(0.866 0.5 -0.866 0.5 0 0)"><path d="M0 0H20M0 0V20" stroke="#E3E0D7" stroke-width=".8"/></pattern></defs>
  <rect width="900" height="560" fill="#F4F2EC"/><rect width="900" height="470" fill="url(#isog)"/>
  <g stroke="#1B1D20" stroke-width="2" fill="none" stroke-linecap="round">
    <!-- pump -->
    <rect x="58" y="452" width="96" height="12" /><circle cx="104" cy="438" r="30" fill="#F4F2EC"/><path d="M90 424 L122 438 L90 452 Z"/>
    <!-- main run -->
    <polyline points="${P.A} ${P.B} ${P.C} ${P.D} ${P.H}" stroke-width="3.4" stroke-linejoin="round"/>
    <line x1="${tee[0]}" y1="${tee[1]}" x2="${drn[0]}" y2="${drn[1] - 14}" stroke-width="3"/>
    ${flange(L1(0.02), -30)}
    <g transform="translate(${rd[0]} ${rd[1]}) rotate(-30)"><polygon points="-12,-6 12,-10 12,10 -12,6" fill="#F4F2EC"/></g>
    ${check(ck, -30)}${valve(gv, -30)}
    <g transform="translate(${drn[0]} ${drn[1]}) rotate(90)"><polygon points="-12,-8 12,8 12,-8 -12,8" fill="#F4F2EC"/><line x1="0" y1="0" x2="0" y2="-20"/><line x1="-6" y1="-20" x2="6" y2="-20"/><line x1="-16" y1="-9" x2="-16" y2="9"/></g>
    <circle cx="${P.B[0]}" cy="${P.B[1]}" r="4.5" fill="#1B1D20"/><circle cx="${P.C[0]}" cy="${P.C[1]}" r="4.5" fill="#1B1D20"/><circle cx="${P.D[0]}" cy="${P.D[1]}" r="4.5" fill="#1B1D20"/>
    <circle cx="${tee[0]}" cy="${tee[1]}" r="4" fill="#1B1D20"/>
    <!-- heat exchanger / receiver -->
    ${flange([P.H[0], P.H[1] - 4], 90)}
    <g transform="translate(${P.H[0]} ${P.H[1] + 22}) rotate(-30)"><rect x="-90" y="-24" width="190" height="48" rx="24" fill="#F4F2EC"/><line x1="-60" y1="-24" x2="-60" y2="24" stroke-width="1.2"/><line x1="70" y1="-24" x2="70" y2="24" stroke-width="1.2"/></g>
    <!-- flow arrow + supports -->
    <g transform="translate(${L1(0.84)[0]} ${L1(0.84)[1]}) rotate(-30)"><polygon points="0,-6 12,0 0,6" fill="#1B1D20"/></g>
    <path d="M${L1(0.52)[0]} ${L1(0.52)[1] + 6} l-8 14 h16 z"/><path d="M${along(P.C, P.D, 0.78)[0]} ${along(P.C, P.D, 0.78)[1] + 6} l-8 14 h16 z"/>
  </g>
  <g stroke="#B23A2E" stroke-width="1" fill="none">
    <line x1="${P.A[0] + 14}" y1="${P.A[1] + 26}" x2="${P.B[0] + 14}" y2="${P.B[1] + 26}"/>
    <line x1="${P.B[0] - 28}" y1="${P.B[1]}" x2="${P.C[0] - 28}" y2="${P.C[1]}"/>
    <line x1="${P.C[0] + 12}" y1="${P.C[1] - 22}" x2="${P.D[0] + 12}" y2="${P.D[1] - 22}"/>
    <line x1="${P.D[0] + 26}" y1="${P.D[1]}" x2="${P.H[0] + 26}" y2="${P.H[1]}"/>
  </g>
  <g fill="#B23A2E" font-family="JetBrains Mono" font-size="15" font-weight="700" text-anchor="middle">
    <text transform="translate(${(P.A[0] + P.B[0]) / 2 + 30} ${(P.A[1] + P.B[1]) / 2 + 44}) rotate(-30)">2400</text>
    <text transform="translate(${P.B[0] - 40} ${(P.B[1] + P.C[1]) / 2}) rotate(-90)">1000</text>
    <text transform="translate(${(P.C[0] + P.D[0]) / 2 + 2} ${(P.C[1] + P.D[1]) / 2 - 38}) rotate(30)">1800</text>
    <text transform="translate(${P.D[0] + 40} ${(P.D[1] + P.H[1]) / 2}) rotate(-90)">750</text>
  </g>
  <g fill="#1B1D20" font-family="JetBrains Mono" font-size="12" font-weight="600">
    <text x="78" y="494">P-01</text><text x="${rd[0] - 34}" y="${rd[1] - 14}">R-01</text><text x="${ck[0] - 20}" y="${ck[1] - 30}">V-01</text>
    <text x="${gv[0] - 16}" y="${gv[1] - 34}">V-02</text><text x="${drn[0] + 18}" y="${drn[1] + 4}">V-03</text>
    <text x="${P.B[0] + 10}" y="${P.B[1] + 18}">E-01</text><text x="${P.C[0] - 46}" y="${P.C[1] - 6}">E-02</text><text x="${P.D[0] + 10}" y="${P.D[1] - 8}">E-03</text>
    <text x="${tee[0] - 8}" y="${tee[1] - 14}">T-01</text><text x="${P.H[0] + 40}" y="${P.H[1] + 52}">HX-01</text>
  </g>
  <g transform="translate(820 400)" stroke="#1B1D20" stroke-width="1.4" fill="none"><line x1="0" y1="0" x2="34" y2="-20"/><line x1="0" y1="0" x2="0" y2="-38"/><line x1="0" y1="0" x2="34" y2="20"/></g>
  <text x="858" y="382" font-family="JetBrains Mono" font-size="11" fill="#1B1D20">N</text><text x="814" y="356" font-family="JetBrains Mono" font-size="11" fill="#1B1D20">UP</text>
  <!-- title block -->
  <g font-family="Readex Pro" font-size="12" fill="#1B1D20"><rect x="0" y="470" width="900" height="90" fill="#F4F2EC" stroke="#1B1D20" stroke-width="2"/>
    <line x1="225" y1="470" x2="225" y2="560" stroke="#1B1D20"/><line x1="450" y1="470" x2="450" y2="560" stroke="#1B1D20"/><line x1="675" y1="470" x2="675" y2="560" stroke="#1B1D20"/>
    <text x="890" y="494" text-anchor="end" fill="#555">رقم الخط</text><text x="890" y="524" text-anchor="end" font-family="JetBrains Mono" font-weight="700" font-size="15" direction="ltr">${v.line}</text>
    <text x="665" y="494" text-anchor="end" fill="#555">الخدمة</text><text x="665" y="524" text-anchor="end" font-weight="700" font-size="15">${v.service}</text>
    <text x="440" y="494" text-anchor="end" fill="#555">التصنيف · ضغط الاختبار</text><text x="440" y="524" text-anchor="end" font-family="JetBrains Mono" font-weight="700" font-size="14" direction="ltr">${v.cls} · ${v.test}</text>
    <text x="215" y="494" text-anchor="end" fill="#555">الأبعاد · المقياس</text><text x="215" y="524" text-anchor="end" font-family="JetBrains Mono" font-weight="700" font-size="14" direction="ltr">mm · NTS</text>
    <text x="450" y="550" text-anchor="middle" fill="#8a5a00" font-size="11">رسم تدريبي بأبعاد توضيحية — ليس رسمًا هندسيًا معتمدًا</text></g>
  <g class="hits">${hitc('check', ck)}${hitc('gate', gv)}${hitc('reducer', rd, 20)}${hitc('tee', tee, 18)}${hitc('drain', drn, 20)}${hitc('elbow', P.B, 18)}${hitc('elbow', P.C, 18)}${hitc('elbow', P.D, 18)}${hitc('pump', [104, 440], 32)}${hitc('hx', [P.H[0], P.H[1] + 22], 40)}</g>
</svg>`;
}

function questions(v) {
  const base = [
    { k: 'symbols', type: 'tap', q: 'اضغط على رمز صمام عدم الرجوع (Check valve) في الرسم.', a: 'check', why: 'رمز صمام عدم الرجوع: مثلثين متقابلين بخط مائل وسهم يوضح اتجاه السريان (V-01).' },
    { k: 'symbols', type: 'tap', q: 'اضغط على المُسلوب (Reducer) اللي بعد الطلمبة.', a: 'reducer', why: 'المسلوب مرسوم شبه منحرف: طرف عريض وطرف ضيق (R-01).' },
    { k: 'symbols', type: 'tap', q: 'اضغط على وصلة الـ T اللي طالع منها فرع التصريف.', a: 'tee', why: 'وصلة T عند النقطة T-01، والفرع النازل منها رايح لمحبس التصريف V-03.' },
    { k: 'quant', type: 'mcq', q: 'إيه اتجاه السريان في الخط حسب الرسم؟', opts: ['من الطلمبة P-01 للمبادل HX-01', 'من المبادل HX-01 للطلمبة P-01', 'من محبس التصريف للطلمبة', 'مش محدد في الرسم'], a: 'من الطلمبة P-01 للمبادل HX-01', why: 'سهم السريان على الخط الأول متجه بعيد عن الطلمبة.' },
    { k: 'quant', type: 'num', q: 'كام كوع 90° في الخط الرئيسي؟', a: 3, unit: 'كوع', why: 'E-01 و E-02 و E-03.' },
    { k: 'quant', type: 'num', q: 'كام حشية محتاج للوصلات المفلنجة في الرسم؟ (كل خطين صغيرين متوازيين = وصلة فلانشة)', a: 7, unit: 'حشية', why: 'مخرج الطلمبة (1) + V-01 (2) + V-02 (2) + V-03 (1) + مدخل المبادل (1) = 7.' },
    { k: 'quant', type: 'num', q: 'المسافة بين مركزي الكوعين E-01 و E-02 هي 1000 مم، وطول الكوع من المركز للطرف 152 مم. طول قطعة الماسورة الرأسية كام؟', a: 696, unit: 'مم', why: '1000 − (2 × 152) = 696 مم.' },
    { k: 'quant', type: 'num', q: 'إجمالي طول خط المحاور من مخرج الطلمبة لمدخل المبادل (مجموع الأبعاد) كام؟', a: 5950, unit: 'مم', why: '2400 + 1000 + 1800 + 750 = 5950 مم.' },
    { k: 'knowledge', type: 'mcq', q: 'كلمة NTS في خانة المقياس معناها إيه؟', opts: ['الرسم بدون مقياس، والأبعاد المكتوبة هي المعتمدة', 'المقياس 1:10', 'الأبعاد بالبوصة', 'الرسم مبدئي ومش للتنفيذ'], a: 'الرسم بدون مقياس، والأبعاد المكتوبة هي المعتمدة', why: 'NTS = Not To Scale: ماتقيسش بالمسطرة على الورقة، اعتمد على الأرقام.' },
    ...v.qKnow,
  ];
  return base;
}

let Q = null, timerI = 0;
function renderQ() {
  const q = Q.list[Q.i];
  const n = Q.list.length;
  const dots = Q.list.map((_, k) => `<i class="${k < Q.i ? 'done' : k === Q.i ? 'now' : ''}"></i>`).join('');
  let body = '';
  if (q.type === 'mcq') body = `<div class="qopts">${shuffle(q.opts).map(o => `<button class="choice" data-v="${o}">${o}</button>`).join('')}</div>`;
  if (q.type === 'num') body = `<form class="qnum" id="qForm"><label for="qIn" class="muted">الإجابة (${q.unit})</label><div><input id="qIn" inputmode="numeric" pattern="[0-9]*" autocomplete="off" dir="ltr"><button class="btn btn--primary" type="submit">تحقق</button></div></form>`;
  if (q.type === 'tap') body = `<p class="qtap">${I.search}<span>اضغط على الرمز في الرسم</span></p>`;
  $('#drPanel').innerHTML = `
    <div class="qhead"><span class="eyebrow">سؤال ${Q.i + 1} من ${n}</span><div class="qdots">${dots}</div></div>
    <h3 class="qtext">${q.q}</h3>${body}<div class="qfb" id="qFb" hidden></div>
    <div class="legend"><b>مفتاح الرموز</b><ul><li><span class="sw sw-v"></span>محبس بوابة</li><li><span class="sw sw-c"></span>صمام عدم رجوع</li><li><span class="sw sw-f"></span>وصلة فلانشة</li><li><span class="sw sw-e"></span>كوع / T</li><li><span class="sw sw-s"></span>ركيزة</li></ul></div>`;
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
    if (el) el.classList.add('is-right');
    mark(q.a, true);
    next();
  } else {
    Q.tries++; sfx.error();
    if (el) { el.classList.add('is-wrong'); el.disabled = true; }
    if (Q.tries === 1) { penalize(q.k, 4, 'خطأ في: ' + q.q.slice(0, 60)); fbEl.className = 'qfb is-err'; fbEl.innerHTML = `${I.warn}<span>إجابة غلط. ركّز في الرسم وجرّب تاني.</span>`; fb('draw_wrong'); }
    else { Q.locked = true; penalize(q.k, 6, 'لم يحدد الإجابة الصحيحة: ' + q.q.slice(0, 60)); fbEl.className = 'qfb is-err'; fbEl.innerHTML = `${I.info}<span>الإجابة الصحيحة: <b>${q.type === 'num' ? q.a + ' ' + q.unit : q.type === 'tap' ? 'الرمز المنوّر في الرسم' : q.a}</b>. ${q.why}</span>`; mark(q.a, false); next(2600); }
  }
  $('#drScore').textContent = scoreNow();
}
function mark(sym, ok) { if (Q.list[Q.i].type !== 'tap') return; $$(`#drSheet [data-sym="${sym}"]`).forEach(c => { c.classList.add(ok ? 'is-right' : 'is-show'); setTimeout(() => c.classList.remove('is-right', 'is-show'), 2200); }); }
function next(ms = 1600) {
  setTimeout(() => {
    if (!Q) return;
    Q.locked = false; Q.i++;
    if (Q.i >= Q.list.length) return finish();
    renderQ();
  }, ms);
}
function finish() {
  clearInterval(timerI);
  const tips = [];
  if (SES.ded.symbols) tips.push('راجع رموز الصمامات والوصلات في مفتاح الرموز قبل ما تبدأ أي رسم.');
  if (SES.ded.quant) tips.push('عند حساب طول القطع اطرح طول الكوع من المركز للطرف من الناحيتين.');
  if (SES.ded.knowledge) tips.push('ركّز على خانة البيانات في الرسم: رقم الخط والخدمة والتصنيف وضغط الاختبار.');
  renderResult(drawingStation, { badges: [scoreNow() >= 90 && 'reader'], tips });
  Q = null;
}

export const drawingStation = {
  id: 'drawing', title: 'قراءة الرسومات الهندسية',
  start({ mode = 'test', level = 'mid', scenario = 'ship' } = {}) {
    const v = VARIANTS[scenario] || VARIANTS.ship;
    this.last = { mode, level, scenario };
    startSession({ id: 'drawing', title: v.title, sub: v.sub, mode, level, cats: { symbols: ['قراءة الرموز', 30], quant: ['الكميات والأبعاد', 45], knowledge: ['المعرفة الفنية', 25] } });
    $('#drTitle').textContent = 'قراءة الرسومات · ' + v.title; $('#drSub').textContent = v.sub;
    $('#drSheet').innerHTML = drawingSVG(v);
    let list = questions(v);
    if (level === 'easy') list = list.filter(q => q.type !== 'num' || q.a < 100).slice(0, 7);
    Q = { list, i: 0, tries: 0, locked: false };
    $('#drSheet').onclick = e => { const c = e.target.closest('[data-sym]'); if (!c || !Q) return; const q = Q.list[Q.i]; if (q.type !== 'tap') return; answer(c.dataset.sym, null); };
    $('#drScore').textContent = scoreNow();
    clearInterval(timerI); timerI = setInterval(() => { $('#drTimer').textContent = fmt(elapsed()); }, 500);
    renderQ(); say('draw_intro');
  },
  again() { this.start(this.last); },
  stop() { clearInterval(timerI); Q = null; },
};

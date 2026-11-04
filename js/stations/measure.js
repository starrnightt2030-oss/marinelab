// Station: measuring & marking — vernier reading, pipe OD → nominal size, tape marking of a cut length.
import { sfx } from '../audio.js';
import { $, $$, gsap, I, renderResult, shuffle, SES, scoreNow } from '../ui.js';
import { openWork, closeWork, workSteps, wsay, wreplay, wmsg, wpenalize, body, view, choose } from '../work.js';

const PIPES = [['DN50', '2"', 60.3], ['DN65', '2½"', 73.0], ['DN80', '3"', 88.9], ['DN100', '4"', 114.3], ['DN150', '6"', 168.3]];
const RES = { easy: { r: 0.1, n: 10 }, mid: { r: 0.05, n: 20 }, pro: { r: 0.02, n: 50 } };
const TOL = { easy: 2, mid: 1, pro: 0.5 };
const STEPS = ['قراءة الورنية', 'قياس قطر الماسورة', 'شنكرة طول القطع'];
let S = null;
const round = (v, r) => Math.round(v / r) * r;
const f2 = (v, r) => v.toFixed(r < 0.1 ? 2 : 1);

// ---------- vernier close-up (main scale in mm, vernier with n divisions over n-1 mm) ----------
function caliperSVG(v, { r, n }, hint = false) {
  const px = r === 0.02 ? 15 : 18, vlen = n - 1;
  const start = Math.max(0, Math.floor(v) - 10), end = v + vlen + 8;
  const W = (end - start) * px + 40, X = mm => 20 + (mm - start) * px;
  let main = '', vern = '';
  for (let m = Math.ceil(start); m <= Math.floor(end); m++) {
    const L = m % 10 === 0 ? 30 : m % 5 === 0 ? 22 : 14;
    main += `<line x1="${X(m)}" y1="96" x2="${X(m)}" y2="${96 - L}" stroke="#111" stroke-width="${m % 10 === 0 ? 2 : 1.3}"/>`;
    if (m % 10 === 0) main += `<text x="${X(m)}" y="52" text-anchor="middle" font-size="18" font-weight="700" fill="#111" font-family="JetBrains Mono">${m / 10}</text>`;
  }
  const step = n / 10, k0 = Math.round((v - Math.floor(v + 1e-9)) / r) % n;
  for (let k = 0; k <= n; k++) {
    const x = X(v + k * vlen / n), major = k % step === 0, hit = hint && k === k0;
    vern += `<line x1="${x}" y1="100" x2="${x}" y2="${100 + (major ? 24 : 15)}" stroke="${hit ? '#d62828' : '#111'}" stroke-width="${hit ? 2.6 : major ? 1.8 : 1.1}"/>`;
    if (major) vern += `<text x="${x}" y="146" text-anchor="middle" font-size="14" font-weight="600" fill="#111" font-family="JetBrains Mono">${k / step}</text>`;
  }
  return `<svg viewBox="0 0 ${W} 190" class="cal" style="min-width:${Math.min(W, 1400)}px" role="img" aria-label="تدريج القدمة ذات الورنية مكبّر">
    <defs><linearGradient id="calm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f6f9"/><stop offset="1" stop-color="#c9d2db"/></linearGradient>
    <linearGradient id="calv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7edf2"/><stop offset="1" stop-color="#b9c3cd"/></linearGradient></defs>
    <rect x="0" y="20" width="${W}" height="78" fill="url(#calm)" stroke="#8a96a3"/>
    <rect x="${X(v) - 24}" y="98" width="${vlen * px + 48}" height="60" rx="6" fill="url(#calv)" stroke="#7d8996"/>
    ${main}${vern}
    <text x="${X(v) - 18}" y="176" font-size="12" fill="#333" font-family="JetBrains Mono">${r} mm</text>
    <line x1="${X(v)}" y1="20" x2="${X(v)}" y2="98" stroke="#2F7CF6" stroke-width="1" stroke-dasharray="4 3" opacity="${hint ? 1 : 0}"/>
  </svg>`;
}

// ---------- task 1: read the vernier ----------
async function taskRead() {
  workSteps(STEPS, 0); wsay(S.mode === 'learn' ? 'cal_learn' : 'cal_test');
  const R = RES[S.level];
  for (let i = 0; i < 3 && S; i++) {
    const v = round(10 + Math.random() * 120, R.r);
    await readOnce(v, R, `قراءة ${i + 1} من 3`);
  }
}
function readOnce(v, R, label, context = '') {
  return new Promise(resolve => {
    let tries = 0;
    const draw = (hint) => view(`<div class="wk__stage"><p class="wk__cap">${context || 'تكبير تدريج الورنية'} · دقة <b dir="ltr">${R.r} mm</b></p><div class="wk__scroll">${caliperSVG(v, R, hint)}</div>
      <div class="howto"><b>طريقة القراءة</b><ol><li>اقرأ آخر ملّيمتر على المسطرة الرئيسية قبل صفر الورنية.</li><li>دوّر على خط الورنية اللي ينطبق تمامًا على خط من المسطرة.</li><li>القراءة = الملليمترات + (رقم الخط × <span dir="ltr">${R.r}</span>).</li></ol></div></div>`);
    draw(false);
    body(`<p class="wk__q">${label}: اقرأ القياس بالملليمتر.</p>
      <form class="qnum" id="rdForm"><label for="rdIn" class="muted">القراءة (mm)</label><div><input id="rdIn" inputmode="decimal" autocomplete="off" dir="ltr" placeholder="0.00"><button class="btn btn--primary" type="submit">تحقق</button></div></form>`);
    setTimeout(() => $('#rdIn')?.focus(), 150);
    $('#rdForm').addEventListener('submit', e => {
      e.preventDefault();
      const a = parseFloat(($('#rdIn').value || '').replace(',', '.').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
      if (isNaN(a)) return;
      const k = Math.round((v - Math.floor(v + 1e-9)) / R.r);
      if (Math.abs(a - v) < R.r / 2 + 1e-6) { sfx.ok(); wmsg(`صحيح: <b dir="ltr">${f2(v, R.r)} mm</b>`, 'ok', 2200); setTimeout(resolve, 900); return; }
      tries++; sfx.error();
      if (tries === 1) {
        wpenalize('reading', 4, `قراءة ورنية خاطئة (${a} بدل ${f2(v, R.r)})`);
        if (S.mode === 'learn') { draw(true); wmsg('مش مظبوطة. بص على الخط الأحمر في الورنية: ده الخط المنطبق. ركّز في رقم الملليمتر قبل الصفر.', 'info', 6000); }
        else wmsg('القراءة غير صحيحة. حاول تاني.', 'err');
      } else {
        wpenalize('reading', 6, 'لم يتمكن من قراءة الورنية بشكل صحيح');
        draw(true);
        wmsg(`القراءة الصحيحة: <b dir="ltr">${Math.floor(v + 1e-9)} + ${k} × ${R.r} = ${f2(v, R.r)} mm</b>`, 'info', 7000);
        setTimeout(resolve, 4200);
      }
    });
  });
}

// ---------- task 2: measure the OD and identify the nominal size ----------
async function taskOD() {
  workSteps(STEPS, 1); wsay(S.mode === 'learn' ? 'od_learn' : 'od_test');
  const [dn, inch, od] = PIPES[Math.floor(Math.random() * PIPES.length)];
  const R = RES[S.level];
  await new Promise(resolve => {
    const sc = 2.1, cx = 300, cy = 190, rpx = od / 2 * sc;
    view(`<div class="wk__stage"><p class="wk__cap">قفّل الفك المتحرك على الماسورة لحد ما يلمسها</p>
      <svg viewBox="0 0 600 380" class="odsvg" role="img" aria-label="مقطع ماسورة بين فكي الورنية">
        <defs><radialGradient id="pg" cx="50%" cy="40%"><stop offset="0" stop-color="#cfd6de"/><stop offset="1" stop-color="#6f7884"/></radialGradient></defs>
        <rect x="0" y="0" width="600" height="380" fill="#0b1630"/>
        <circle cx="${cx}" cy="${cy}" r="${rpx}" fill="url(#pg)" stroke="#2b333d" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${rpx * 0.88}" fill="#0b1630" stroke="#2b333d"/>
        <rect id="jawFix" x="${cx - rpx - 18}" y="20" width="18" height="${cy - 10}" fill="#d9dee4" stroke="#8a96a3"/>
        <rect id="jawMov" x="${cx - rpx - 18 + 18}" y="20" width="18" height="${cy - 10}" fill="#d9dee4" stroke="#8a96a3"/>
        <rect x="${cx - rpx - 40}" y="6" width="${Math.max(560 - (cx - rpx - 40), 300)}" height="22" fill="#e8edf2" stroke="#8a96a3"/>
        <text id="odState" x="300" y="360" text-anchor="middle" fill="#A6B8DD" font-size="15" font-family="Readex Pro">الفك مفتوح</text>
      </svg></div>`);
    body(`<p class="wk__q">اسحب المؤشر لتقفيل الفك على الماسورة. الفك لازم يلمس الماسورة من غير ما يضغطها.</p>
      <label class="slider"><span>فتحة الفك</span><input type="range" id="odR" min="0" max="${Math.ceil(od + 60)}" step="0.1" value="${Math.ceil(od + 50)}"></label>
      <button class="btn btn--primary" id="odGo" disabled>${I.search}اقرأ القياس</button>`);
    const jaw = $('#jawMov'), rng = $('#odR'), st = $('#odState'), go = $('#odGo');
    const upd = () => {
      let o = parseFloat(rng.value);
      if (o < od) { o = od; rng.value = od; if (!S.squeezed) { S.squeezed = true; sfx.clank(); } }
      jaw.setAttribute('x', cx - rpx + o * sc);
      const touch = o - od < 0.15;
      jaw.setAttribute('fill', touch ? '#7cf7cc' : '#d9dee4');
      st.textContent = touch ? 'الفك لامس الماسورة ✓' : 'الفك مفتوح';
      go.disabled = !touch;
    };
    rng.addEventListener('input', upd); upd();
    go.addEventListener('click', () => { sfx.tap(); resolve(); });
  });
  if (!S) return;
  await readOnce(round(od, R.r), R, 'القراءة على الماسورة', `ورنية مقفولة على ماسورة · دقة`);
  if (!S) return;
  const opts = shuffle(PIPES).slice(0, 4); if (!opts.find(p => p[0] === dn)) opts[0] = PIPES.find(p => p[0] === dn);
  let first = true;
  for (;;) {
    const r = await choose(`القطر الخارجي <b dir="ltr">${od} mm</b>. ده مقاس ماسورة إيه؟`, shuffle(opts).map(p => ({ t: `${p[0]} · <span dir="ltr">${p[1]}</span>`, v: p[0] })));
    if (!S) return;
    if (r.v === dn) { sfx.ok(); r.el.classList.add('is-right'); wmsg(`صحيح: <b>${dn}</b> (${inch}) قطرها الخارجي ${od} مم. لاحظ إن المقاس الاسمي مش هو القطر الفعلي.`, 'ok', 5000); await wait(1800); break; }
    sfx.error(); r.el.classList.add('is-wrong');
    if (first) { wpenalize('sizing', 8, 'تحديد مقاس اسمي خاطئ للماسورة'); first = false; wmsg('مش ده. المقاس الاسمي DN أصغر من القطر الخارجي الفعلي. راجع الجدول.', 'info', 6000); body($('#wkBody').innerHTML + sizeTable()); }
    else { wpenalize('sizing', 6, 'تحديد مقاس اسمي خاطئ للمرة الثانية'); }
  }
}
function sizeTable() {
  return `<div class="spec"><b>جدول الأقطار الخارجية للمواسير (ASME B36.10)</b><table><thead><tr><th>المقاس</th><th>بوصة</th><th>القطر الخارجي mm</th></tr></thead><tbody>${PIPES.map(p => `<tr><td dir="ltr">${p[0]}</td><td dir="ltr">${p[1]}</td><td class="mono" dir="ltr">${p[2]}</td></tr>`).join('')}</tbody></table></div>`;
}

// ---------- task 3: mark the cut length with a tape ----------
async function taskMark() {
  workSteps(STEPS, 2); wsay(S.mode === 'learn' ? 'mark_learn' : 'mark_test');
  const L = S.level === 'pro' ? Math.round((300 + Math.random() * 600) * 2) / 2 : Math.round(300 + Math.random() * 600);
  const tol = TOL[S.level];
  let pos = Math.round(1000 + Math.random() * 100);
  await new Promise(resolve => {
    const k = 0.6, X = mm => 40 + mm * k;
    view(`<div class="wk__stage"><p class="wk__cap">ماسورة طولها 1200 مم · المتر مثبت من الطرف الشمال</p>
      <svg viewBox="0 0 800 220" class="marksvg" id="markSvg" role="img" aria-label="ماسورة عليها متر قياس">
        <defs><linearGradient id="pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d6672"/><stop offset=".45" stop-color="#d6dde4"/><stop offset="1" stop-color="#4c545e"/></linearGradient></defs>
        <rect x="0" y="0" width="800" height="220" fill="#0b1630"/>
        <rect x="${X(0)}" y="90" width="${1200 * k}" height="70" fill="url(#pp)"/>
        <rect x="${X(0)}" y="70" width="${1200 * k}" height="20" fill="#f5c400"/>
        ${Array.from({ length: 121 }, (_, i) => `<line x1="${X(i * 10)}" y1="70" x2="${X(i * 10)}" y2="${70 + (i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6)}" stroke="#111" stroke-width="${i % 10 === 0 ? 1.6 : .8}"/>${i % 10 === 0 ? `<text x="${X(i * 10) + 2}" y="66" fill="#d9e6ff" font-size="11" font-family="JetBrains Mono">${i * 10}</text>` : ''}`).join('')}
        <rect x="${X(0) - 6}" y="66" width="6" height="40" fill="#c0c7cf"/>
        <g id="marker" style="cursor:ew-resize"><line id="mkLine" x1="0" y1="62" x2="0" y2="168" stroke="#FF4D57" stroke-width="2.5"/><path id="mkHead" d="" fill="#FF4D57"/><rect id="mkHit" x="0" y="40" width="40" height="140" fill="transparent"/></g>
      </svg>
      <div class="loupe" id="loupe"></div>
      <p class="wk__cap">اسحب العلامة الحمرا، وظبطها بالأزرار. التكبير تحت بيوريك الملليمترات.</p></div>`);
    body(`<p class="wk__q">علّم على الماسورة طول القطع: <b class="mono" dir="ltr">${L} mm</b> من الطرف الشمال.</p>
      <div class="fine"><button class="btn" data-d="-10">−10</button><button class="btn" data-d="-1">−1</button>${S.level === 'pro' ? '<button class="btn" data-d="-0.5">−0.5</button><button class="btn" data-d="0.5">+0.5</button>' : ''}<button class="btn" data-d="1">+1</button><button class="btn" data-d="10">+10</button></div>
      <button class="btn btn--primary" id="mkOk">${I.ok}ثبّت العلامة</button>`);
    const svg = $('#markSvg');
    const draw = () => {
      const x = X(pos);
      $('#mkLine').setAttribute('x1', x); $('#mkLine').setAttribute('x2', x);
      $('#mkHead').setAttribute('d', `M${x - 8} 48 L${x + 8} 48 L${x} 62 Z`);
      $('#mkHit').setAttribute('x', x - 20);
      const lo = pos - 15, ticks = [];
      for (let m = Math.ceil(lo * 2) / 2; m <= pos + 15; m += 0.5) {
        const xx = (m - lo) * 20, big = m % 10 === 0, mid = m % 5 === 0, whole = m % 1 === 0;
        ticks.push(`<line x1="${xx}" y1="0" x2="${xx}" y2="${big ? 34 : mid ? 26 : whole ? 18 : 9}" stroke="#111" stroke-width="${big ? 2 : 1}"/>${big || mid ? `<text x="${xx + 3}" y="48" font-size="13" font-family="JetBrains Mono" fill="#111">${m}</text>` : ''}`);
      }
      $('#loupe').innerHTML = `<svg viewBox="0 0 600 80"><rect width="600" height="80" fill="#f5c400"/>${ticks.join('')}<line x1="300" y1="0" x2="300" y2="80" stroke="#d62828" stroke-width="2.5"/></svg>`;
    };
    const fromEvt = e => { const r = svg.getBoundingClientRect(); const sx = (e.clientX - r.left) / r.width * 800; return Math.max(0, Math.min(1200, (sx - 40) / k)); };
    let dragging = false;
    svg.addEventListener('pointerdown', e => { dragging = true; svg.setPointerCapture(e.pointerId); pos = Math.round(fromEvt(e)); draw(); });
    svg.addEventListener('pointermove', e => { if (dragging) { pos = Math.round(fromEvt(e)); draw(); } });
    svg.addEventListener('pointerup', () => { dragging = false; });
    $$('#wkBody [data-d]').forEach(b => b.addEventListener('click', () => { pos = Math.max(0, Math.min(1200, pos + parseFloat(b.dataset.d))); sfx.tap(); draw(); }));
    $('#mkOk').addEventListener('click', () => {
      const err = Math.abs(pos - L);
      if (err <= tol) { sfx.ok(); wmsg(`العلامة عند <b dir="ltr">${pos} mm</b>، داخل التفاوت المسموح ±${tol} مم.`, 'ok', 3000); }
      else { sfx.error(); wpenalize('marking', err > 10 ? 12 : 7, `خطأ في الشنكرة: ${pos} بدل ${L} مم`); wmsg(`العلامة عند <b dir="ltr">${pos}</b> والمطلوب <b dir="ltr">${L}</b> (فرق ${(+err).toFixed(1)} مم). القطعة هتطلع ${pos < L ? 'قصيرة' : 'طويلة'}، وفي الورشة دي معناها ماسورة ضايعة.`, 'err', 6500); }
      resolve();
    });
    draw();
  });
  if (!S) return;
  await wait(1200);
  await ask3('هتقطع فين بالنسبة للعلامة؟', [
    { t: 'على العلامة بالظبط', ok: false, why: 'سلاح المنشار أو عجلة القطع ليها عرض، فالقطعة هتقصر بعرض القطع.' },
    { t: 'جنب العلامة من ناحية الجزء الزيادة (الهالك)', ok: true, why: 'صح: القطع على الناحية الهالكة يحافظ على الطول المطلوب.' },
    { t: 'جنب العلامة من ناحية القطعة المطلوبة', ok: false, why: 'كده عرض القطع هيتاكل من القطعة المطلوبة وتطلع قصيرة.' },
  ], 'marking');
  await ask3('إزاي ترسم خط القطع حوالين الماسورة بحيث يطلع عمودي على محورها؟', [
    { t: 'بشريط لف (Wrap-around) أو ورقة مستقيمة ملفوفة على الماسورة', ok: true, why: 'الشريط الملفوف بيدي خط عمودي على محور الماسورة في كل الاتجاهات.' },
    { t: 'بالقلم باليد وأكمّل الخط بعيني', ok: false, why: 'الخط هيطلع مايل، والقطع هيبقى مش عمودي.' },
    { t: 'بخيط الشنكرة (Chalk line)', ok: false, why: 'خيط الشنكرة للخطوط المستقيمة الطويلة على الأرض والألواح.' },
  ], 'marking');
}
async function ask3(q, opts, cat) {
  let first = true;
  for (;;) {
    const r = await choose(q, shuffle(opts));
    if (!S) return;
    if (r.ok) { sfx.ok(); r.el.classList.add('is-right'); wmsg(r.why, 'ok', 4000); await wait(1700); return; }
    sfx.error(); r.el.classList.add('is-wrong'); wmsg(r.why, 'info', 5000);
    wpenalize(cat, first ? 4 : 3, 'إجابة خاطئة: ' + q); first = false;
    await wait(1600);
  }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

export const measureStation = {
  id: 'measure', title: 'القياس والشنكرة',
  async start({ mode = 'learn', level = 'easy' } = {}) {
    this.last = { mode, level };
    S = { mode, level };
    openWork({ id: 'measure', title: 'القياس والشنكرة', sub: `قدمة بورنية دقة ${RES[level].r} مم · متر شريط`, mode, level, steps: STEPS,
      cats: { reading: ['قراءة الورنية', 40], sizing: ['تحديد مقاس الماسورة', 25], marking: ['الشنكرة', 35] } });
    const run = S;
    await taskRead(); if (S !== run) return;
    await taskOD(); if (S !== run) return;
    await taskMark(); if (S !== run) return;
    workSteps(STEPS, 3); closeWork();
    const tips = [];
    if (SES.ded.reading) tips.push('اقرأ الملليمترات الكاملة قبل صفر الورنية الأول، وبعدها دوّر على الخط المنطبق.');
    if (SES.ded.sizing) tips.push('احفظ الأقطار الخارجية الشائعة: DN50 = 60.3، DN80 = 88.9، DN100 = 114.3 مم.');
    if (SES.ded.marking) tips.push('ظبط العلامة بالتكبير، واقطع دايمًا على الناحية الهالكة من العلامة.');
    renderResult(measureStation, { badges: [SES.ded.reading === 0 && 'precise'], tips });
    S = null;
  },
  again() { return this.start(this.last); },
  replay: wreplay,
  stop() { S = null; closeWork(); },
};

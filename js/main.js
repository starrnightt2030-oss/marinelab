// App shell: intro → hub (learning stations) → station screens. Each station module owns its own screen logic.
import { audio, sfx, unlockAudio, leakSound } from './audio.js';
import { initAmbient, SERVICES } from './ambient.js';
import { VOICE } from './voice-lines.js';
import { $, $$, gsap, I, show, profile, saveProfile, level, playLine, stopVoice, replay, BADGES, LEVELS } from './ui.js';
import { flangeStation, __dbg as flangeDbg } from './stations/flange.js';
import { libraryStation } from './stations/library.js';
import { drawingStation } from './stations/drawing.js';
import { measureStation } from './stations/measure.js';
import { cutStation } from './stations/cut.js';
import { ITEMS } from './tools3d.js';

// ---------------- station catalogue ----------------
const STATIONS = [
  { id: 'library', cat: 'basics', icon: 'library', accent: 'cyan', t: 'مكتبة العِدد والمعدات', d: 'لِف كل عدة بإيدك، واعرف أجزاءها واستخدامها وتعليمات السلامة.', skills: ['القياس', 'العِدد اليدوية', 'مكونات المواسير'], live: true, kind: 'library' },
  { id: 'drawing', cat: 'drawing', icon: 'drawing', accent: 'amber', t: 'قراءة الرسومات الهندسية', d: 'رسومات أيزومترية لخطوط السفن والبترول: الرموز، الكميات، وأطوال القطع.', skills: ['الرموز', 'قائمة المواد', 'حساب الأطوال'], live: true, kind: 'sheet', station: drawingStation, scenarios: ['ship', 'oil'] },
  { id: 'flange', cat: 'ship', icon: 'twrench', accent: 'blue', t: 'تجميع واختبار وصلة فلانشة', d: 'تنظيف وفحص، حشية، كوع، ربط بالعزم بالتتابع النجمي، واختبار ضغط مع عيوب حقيقية لازم تشخّصها.', skills: ['الفحص', 'التجميع', 'العزم', 'الاختبار'], live: true, kind: 'sheet', station: flangeStation, scenarios: ['ship', 'oil'] },
  { id: 'measure', cat: 'basics', icon: 'caliper', accent: 'cyan', t: 'القياس والشنكرة', d: 'قراءة الورنية بدقة 0.1 و0.05 و0.02 مم، قياس قطر الماسورة وتحديد مقاسها، وشنكرة طول القطع بالمتر.', skills: ['الورنية', 'مقاسات المواسير', 'الشنكرة'], live: true, kind: 'sheet', screen: 'work', station: measureStation },
  { id: 'bench', cat: 'basics', icon: 'file', accent: 'cyan', t: 'أعمال البرادة على المنجلة', d: 'القطع بالمنشار، البرد، التخريم، والقلوظة اليدوية.', skills: ['المنشار', 'المبرد', 'التخريم'], live: false },
  { id: 'cut', cat: 'basics', icon: 'cutter', accent: 'blue', t: 'قطع وشطف المواسير', d: 'تثبيت في المنجلة، قطع بالقطاعة مع التحكم في التغذية، إزالة الرايش، وشطفة 37.5° للحام.', skills: ['المنجلة', 'القطاعة', 'الشطف', 'الفحص'], live: true, kind: 'sheet', screen: 'work', station: cutStation },
  { id: 'thread', cat: 'ship', icon: 'thread', accent: 'blue', t: 'قلوظة ووصلات المواسير', d: 'عمل سن القلاووظ، الشريط، والربط بمفتاح المواسير.', skills: ['اللقمة', 'التسريب'], live: false },
  { id: 'seawater', cat: 'ship', icon: 'ship', accent: 'blue', t: 'خطوط السفن: مياه البحر والحريق', d: 'مشروع تركيب خط من الرسم داخل غرفة الماكينات، بالحوامل والصمامات.', skills: ['مشروع', 'الحوامل'], live: false },
  { id: 'oilgas', cat: 'oil', icon: 'oil', accent: 'red', t: 'خطوط البترول والغاز', d: 'فلانشات Class 300، حشيات حلزونية، وإجراءات العزل والأمان.', skills: ['التصنيفات', 'العزل'], live: false },
  { id: 'hydro', cat: 'oil', icon: 'shield', accent: 'red', t: 'الاختبار الهيدروليكي للخطوط', d: 'تجهيز الاختبار، رفع الضغط على مراحل، وتسجيل النتائج.', skills: ['الاختبار', 'التقرير'], live: false },
];
const FILTERS = [{ k: 'all', t: 'الكل' }, { k: 'basics', t: 'أساسيات' }, { k: 'drawing', t: 'الرسومات' }, { k: 'ship', t: 'السفن' }, { k: 'oil', t: 'البترول والغاز' }];
const SCEN = { ship: { t: 'سفينة', d: 'غرفة الماكينات' }, oil: { t: 'محطة بترول', d: 'خط زيت خام' } };

let active = null;          // running station module
let filter = 'all';
let launch = { station: null, mode: 'learn', level: 'easy', scenario: 'ship' };
let amb = null;

// ---------------- routing ----------------
function go(id) {
  if (active && active.stop) active.stop();
  active = null;
  stopVoice(); leakSound(0);
  show(id);
  const ambientOn = id === 'intro' || id === 'hub';
  $('#ambient').classList.toggle('is-off', !ambientOn);
  if (amb) ambientOn ? amb.start() : amb.stop();
  if (id === 'hub') renderHub();
}

// ---------------- intro ----------------
function introGo() {
  unlockAudio();
  $('#introGate').hidden = true; $('#introShow').hidden = false;
  amb = initAmbient($('#ambient')); amb.start();
  $('#introLegend').innerHTML = SERVICES.map(s => `<li><i style="background:#${s.c.toString(16).padStart(6, '0')}"></i><span>${s.t}</span><small dir="ltr">${s.en}</small></li>`).join('');
  const items = $$('#introLegend li');
  gsap.set(items, { opacity: 0, x: 20 });
  gsap.set(['#introLogo', '#introOrg', '#introTitle span', '#introTag', '#introWelcome', '#introCta'], { opacity: 0 });
  $('.intro__ring').style.opacity = 0;
  sfx.whoosh();
  const tl = amb.grow(gsap, i => { gsap.to(items[i], { opacity: 1, x: 0, duration: .45 }); sfx.tap(); });
  const t = gsap.timeline({ delay: 3.2 });
  t.add(() => sfx.boom())
    .fromTo('#introLogo', { scale: .2, opacity: 0, rotate: -40 }, { scale: 1, opacity: 1, rotate: 0, duration: 1.1, ease: 'back.out(1.6)' })
    .to('.intro__ring', { opacity: 1, duration: .4 }, '<.3')
    .add(() => sfx.chime(), '<')
    .fromTo('#introOrg', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .6 }, '-=.3')
    .fromTo('#introTitle span', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .18, ease: 'power3.out' }, '-=.2')
    .fromTo('#introTag', { opacity: 0 }, { opacity: 1, duration: .6 })
    .add(() => typeWelcome())
    .fromTo('#introCta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'back.out(2)' }, '+=1.2');
  introTL = [tl, t];
}
let introTL = [];
function typeWelcome() {
  const el = $('#introWelcome'), txt = VOICE.welcome.t; el.style.opacity = 1; el.textContent = '';
  let i = 0; const id = setInterval(() => { el.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(id); }, 28);
  playLine('welcome');
}
function introDone() {
  introTL.forEach(t => t && t.progress && t.progress(1));
  if (!amb) { amb = initAmbient($('#ambient')); }
  amb.setMode('hub');
  sfx.whoosh();
  go('hub');
  gsap.from('.station-card', { y: 30, opacity: 0, duration: .5, stagger: .05, ease: 'power2.out' });
}

// ---------------- hub ----------------
function renderHub() {
  $('#playerName').value = profile.name || '';
  const lvl = level(), into = profile.xp % 250;
  $('#levelNum').textContent = lvl; $('#chipLevel').textContent = lvl; $('#chipName').textContent = profile.name || 'المتدرب';
  $('#xpNow').textContent = into; $('#xpNext').textContent = 250; $('#xpFill').style.width = (into / 250 * 100) + '%';
  $('#badges').innerHTML = Object.entries(BADGES).map(([k, t]) => `<span class="badge ${profile.badges.includes(k) ? 'is-on' : ''}">${I.star}${t}</span>`).join('');
  const done = Object.keys(profile.best || {}).length, seen = (profile.seenTools || []).length;
  $('#hubStats').innerHTML = [
    [STATIONS.filter(s => s.live).length + ' / ' + STATIONS.length, 'محطات متاحة'],
    [`${seen} / ${ITEMS.length}`, 'عدة اتعرفت عليها'],
    [done, 'تدريب مكتمل'],
    [profile.xp, 'نقطة خبرة'],
  ].map(([v, t]) => `<div class="stat"><b class="mono" dir="ltr">${v}</b><span>${t}</span></div>`).join('');
  $('#stationFilters').innerHTML = FILTERS.map(f => `<button role="tab" aria-selected="${f.k === filter}" class="chip ${f.k === filter ? 'is-on' : ''}" data-filter="${f.k}">${f.t}</button>`).join('');
  $('#stationGrid').innerHTML = STATIONS.filter(s => filter === 'all' || s.cat === filter).map((s, i) => {
    const best = Math.max(0, ...['easy', 'mid', 'pro'].map(l => profile.best?.[`${s.id}:${l}`] || 0));
    return `<article class="station-card glass accent-${s.accent} ${s.live ? '' : 'is-soon'}">
      <div class="station-card__top"><span class="station-card__no mono">${String(STATIONS.indexOf(s) + 1).padStart(2, '0')}</span>
        <span class="tag ${s.live ? 'tag--live' : ''}">${s.live ? 'متاحة' : 'قريباً'}</span></div>
      <div class="station-card__icon">${I[s.icon] || I.library}</div>
      <h3>${s.t}</h3><p>${s.d}</p>
      <div class="skills">${s.skills.map(k => `<span>${k}</span>`).join('')}</div>
      <div class="station-card__foot">${best ? `<span class="best mono" dir="ltr">${best}/100</span>` : '<span></span>'}
        ${s.live ? `<button class="btn btn--primary" data-open="${s.id}">${s.kind === 'library' ? 'افتح المكتبة' : 'ابدأ'}${I.back.replace('M9 6l6 6-6 6', 'M15 6l-6 6 6 6')}</button>` : `<span class="soon">${I.lock}المرحلة الجاية</span>`}</div>
    </article>`;
  }).join('');
}
function openStation(id) {
  const s = STATIONS.find(x => x.id === id); if (!s || !s.live) return;
  sfx.pick();
  if (s.kind === 'library') { go('library'); active = libraryStation; libraryStation.open(); return; }
  launch.station = s;
  $('#launchKicker').textContent = 'إعداد التدريب';
  $('#launchTitle').textContent = s.t; $('#launchDesc').textContent = s.d;
  $('#scenarioGroup').hidden = !s.scenarios;
  if (s.scenarios) $('#scenarioSeg').innerHTML = s.scenarios.map(k => `<button class="seg__b ${launch.scenario === k ? 'is-on' : ''}" data-scen="${k}"><b>${SCEN[k].t}</b><small>${SCEN[k].d}</small></button>`).join('');
  $('#modeSeg').innerHTML = [['learn', 'تعلّم', 'شرح صوتي وإرشاد'], ['test', 'اختبار', 'من غير مساعدة · بدرجة']].map(([k, t, d]) => `<button class="seg__b ${launch.mode === k ? 'is-on' : ''}" data-mode="${k}"><b>${t}</b><small>${d}</small></button>`).join('');
  $('#levelSeg').innerHTML = Object.entries(LEVELS).map(([k, v]) => `<button class="seg__b ${launch.level === k ? 'is-on' : ''}" data-level="${k}"><b>${v.t}</b><small>${v.d}</small></button>`).join('');
  const sh = $('#launchSheet'); sh.hidden = false;
  gsap.fromTo('.sheet__card', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power3.out' });
}
async function startLaunch() {
  const s = launch.station; $('#launchSheet').hidden = true;
  const opts = { mode: launch.mode, level: launch.level, scenario: launch.scenario };
  if (s.id === 'drawing') { go('drawing'); active = drawingStation; drawingStation.start(opts); return; }
  if (s.screen === 'work') { go('work'); active = s.station; s.station.start(opts); return; }
  go('station'); active = s.station;
  const boot = $('#boot'); boot.hidden = false; boot.classList.remove('is-gone');
  await s.station.start(opts);
  setTimeout(() => { boot.classList.add('is-gone'); setTimeout(() => (boot.hidden = true), 500); }, 200);
}

// ---------------- global events ----------------
$('#playerName').addEventListener('input', e => { profile.name = e.target.value.trim(); saveProfile(); $('#chipName').textContent = profile.name || 'المتدرب'; });
document.addEventListener('click', e => {
  const seg = e.target.closest('[data-scen],[data-mode],[data-level]');
  if (seg && seg.closest('#launchSheet')) {
    sfx.tap();
    if (seg.dataset.scen) launch.scenario = seg.dataset.scen;
    if (seg.dataset.mode) launch.mode = seg.dataset.mode;
    if (seg.dataset.level) launch.level = seg.dataset.level;
    seg.parentElement.querySelectorAll('.seg__b').forEach(b => b.classList.toggle('is-on', b === seg));
    return;
  }
  const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; sfx.tap(); renderHub(); return; }
  const o = e.target.closest('[data-open]'); if (o) { openStation(o.dataset.open); return; }
  const b = e.target.closest('[data-action]'); if (!b) return;
  unlockAudio();
  const a = b.dataset.action;
  if (a === 'sound') { audio.on = !audio.on; $$('[data-action="sound"]').forEach(x => x.setAttribute('aria-pressed', audio.on)); if (!audio.on) { stopVoice(); leakSound(0); } }
  if (a === 'fullscreen') { const el = document.documentElement; try { (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.catch?.(() => {}); } catch { /* not supported */ } }
  if (a === 'exit') exitApp();
  if (a === 'intro-go') introGo();
  if (a === 'intro-done') introDone();
  if (a === 'hub') go('hub');
  if (a === 'replay') { if (active && active.replay) active.replay(); else replay(); }
  if (a === 'profile') { $('#profilePanel').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#playerName').focus(); }
  if (a === 'sheet-close') $('#launchSheet').hidden = true;
  if (a === 'launch') startLaunch();
  if (a === 'again') { const s = launch.station; if (s) startLaunch(); }
});
addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#launchSheet').hidden) $('#launchSheet').hidden = true; });

function exitApp() {
  try { document.fullscreenElement && document.exitFullscreen(); } catch { /* ignore */ }
  stopVoice(); window.close();
  setTimeout(() => { const h = $('#exitHint'); h.hidden = false; setTimeout(() => (h.hidden = true), 5000); }, 400);
}

// ---------------- boot ----------------
gsap.fromTo('.intro__gatelogo', { scale: .7, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'back.out(1.7)' });
gsap.fromTo(['.intro__kicker', '.intro__enter'], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .15, delay: .4 });
if (location.search.includes('debug')) window.__ml = { go, openStation, startLaunch, launch, flangeStation, drawingStation, libraryStation, flangeDbg };

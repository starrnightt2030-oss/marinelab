import * as THREE from 'three';
import { createWorld, DIM, MAT, gasket, elbowAssembly, studBolt, dropletSprite, ringSprite } from './scene.js';
import { audio, sfx, speak, stopSpeaking, unlockAudio, leakSound } from './audio.js';
import { VOICE } from './voice-lines.js';

const gsap = window.gsap;
const $ = (s, r = document) => r.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('ml3d:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ml3d:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ---------------- icons ----------------
const I = {
  helmet: '<svg viewBox="0 0 48 48"><path d="M8 31a16 16 0 0 1 32 0"/><path d="M4 31h40v5H4z"/><path d="M20 15.5V12h8v3.5"/><path d="M24 15v16"/></svg>',
  goggles: '<svg viewBox="0 0 48 48"><rect x="5" y="17" width="16" height="13" rx="5"/><rect x="27" y="17" width="16" height="13" rx="5"/><path d="M21 23h6M5 22H2M43 22h3"/></svg>',
  gloves: '<svg viewBox="0 0 48 48"><path d="M16 42V22l-4-6a2.5 2.5 0 0 1 4-3l4 5V8a2.5 2.5 0 0 1 5 0v11-13a2.5 2.5 0 0 1 5 0v13-10a2.5 2.5 0 0 1 5 0v18c0 6-3 10-6 13v5z"/><path d="M16 36h17"/></svg>',
  boots: '<svg viewBox="0 0 48 48"><path d="M12 6h14v20l12 6c3 1.5 4 4 4 7v3H8V6z"/><path d="M8 36h34M12 14h14"/></svg>',
  watch: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9"/><path d="M24 19v5l3 3M19 16l1-10h8l1 10M19 32l1 10h8l1-10"/></svg>',
  scarf: '<svg viewBox="0 0 48 48"><path d="M10 10c8 4 20 4 28 0v8c-8 4-20 4-28 0z"/><path d="M28 19l4 22-6-3-4 4-2-22"/></svg>',
  sandal: '<svg viewBox="0 0 48 48"><path d="M18 6c8 0 12 6 12 16s-2 20-8 20-8-6-8-18 0-18 4-18z"/><path d="M22 14l-7 10M22 14l7 10"/></svg>',
  gasket: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="11"/></svg>',
  gasketSmall: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="8"/></svg>',
  elbow: '<svg viewBox="0 0 48 48"><path d="M6 30h10a14 14 0 0 0 14-14V6"/><path d="M6 40h10a24 24 0 0 0 24-24V6"/><path d="M4 26v18M26 4h18"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>',
  roll: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></svg>',
  flip: '<svg viewBox="0 0 24 24"><path d="M12 3v18M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  wrench: '<svg viewBox="0 0 24 24"><path d="M14.5 6.5a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.5-1.5"/><path d="M3 21l6-6"/></svg>',
};

// ---------------- content ----------------
const STEPS = [
  { id: 'ppe', title: 'مهمات الوقاية', },
  { id: 'clean', title: 'تنظيف وجه الفلانشة', },
  { id: 'fit', title: 'الحشية والكوع', },
  { id: 'bolts', title: 'تركيب المسامير', },
  { id: 'torque', title: 'الربط النجمي', },
  { id: 'test', title: 'اختبار الضغط', },
];
const CATS = { safety: ['السلامة والوقاية', 15], prep: ['تجهيز الأسطح', 10], assembly: ['صحة التجميع', 35], bolting: ['ربط المسامير', 25], testing: ['اختبار الضغط', 15] };
const BADGES = { safety: 'سلامة أولاً', noleak: 'من غير تسريب', star: 'ربط مثالي', fast: 'إيد سريعة' };
const MISSIONS = [
  ['السلامة والعِدد اليدوية', 'Safety & Hand Tools'], ['القياس والشنكرة', 'Measuring & Marking'], ['أعمال البرادة على المنجلة', 'Bench Fitting'],
  ['قطع المواسير وشطف الأطراف', 'Cutting & Bevelling'], ['قلوظة المواسير', 'Pipe Threading'], ['تجميع Spool من رسم', 'Spool Assembly'],
  ['الاختبار الهيدروليكي لخط كامل', 'Hydrostatic Test'], ['مشروع: خط مياه تبريد بحري', 'Cooling Water Line'],
];

// ---------------- profile / home ----------------
const profile = store.get('profile', { name: '', xp: 0, badges: [] });
let mode = 'learn';
function renderHome() {
  $('#playerName').value = profile.name || '';
  const lvl = Math.floor(profile.xp / 250) + 1, into = profile.xp % 250;
  $('#levelNum').textContent = lvl; $('#xpNow').textContent = into; $('#xpNext').textContent = 250;
  $('#xpFill').style.width = (into / 250 * 100) + '%';
  $('#badges').innerHTML = Object.entries(BADGES).map(([k, t]) => `<span class="badge ${profile.badges.includes(k) ? 'is-on' : ''}">${I.star}${t}</span>`).join('');
  $('#missionPath').innerHTML = MISSIONS.map(([ar, en], i) => `<li class="mstep"><span class="mstep__no">${String(i + 2).padStart(2, '0')} · قريباً</span><b>${ar}</b><small dir="ltr">${en}</small><span class="mstep__lock">${I.lock}</span></li>`).join('');
}
$('#playerName').addEventListener('input', e => { profile.name = e.target.value.trim(); store.set('profile', profile); });
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => {
  mode = b.dataset.mode; sfx.tap();
  document.querySelectorAll('.mode').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', x === b); });
}));

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('is-active', s.id === id));
}

// global buttons
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  unlockAudio();
  const a = b.dataset.action;
  if (a === 'sound') { audio.on = !audio.on; document.querySelectorAll('[data-action="sound"]').forEach(x => x.setAttribute('aria-pressed', audio.on)); if (!audio.on) { stopVoice(); leakSound(0); } }
  if (a === 'fullscreen') { const el = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.catch?.(() => {}); }
  if (a === 'start') startExercise();
  if (a === 'home') { leaveWorkshop(); }
  if (a === 'replay') narrate();
  if (a === 'again') startExercise();
  if (a === 'gohome') { show('home'); renderHome(); }
});

// ---------------- world ----------------
let W = null, raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
let loose = [];            // draggable objects in the scene
let labels = [];
const dropTex = dropletSprite(), ringAmber = ringSprite('#FFC23D'), ringMint = ringSprite('#2EE6A6'), ringBlue = ringSprite('#8DB8FF');
let leak = null;
let S = null;              // exercise state

async function ensureWorld() {
  if (W) return W;
  const logo = new Image(); logo.src = 'assets/logo.png';
  await Promise.all([logo.decode().catch(() => {}), document.fonts.load('700 40px "Readex Pro"').catch(() => {}), document.fonts.load('600 40px "Readex Pro"').catch(() => {})]);
  W = await createWorld($('#stage'), logo);
  W.dirtOriginal = (() => { const c = document.createElement('canvas'); const src = W.dirtTex.userData.canvas; c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; })();
  // leak particles
  const N = 700, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.012, map: dropTex, transparent: true, depthWrite: false, opacity: 0.9 }));
  pts.frustumCulled = false; W.scene.add(pts);
  leak = { pts, N, vel: new Float32Array(N * 3), life: new Float32Array(N), level: 0, i: 0 };
  bindStagePointer();
  let last = performance.now();
  W.renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    W.controls.update();
    tickLeak(dt); tickTest(dt);
    if (S && S.pulse) S.pulse.forEach(m => { m.material.opacity = 0.55 + 0.45 * Math.sin(now / 220); });
    W.renderer.render(W.scene, W.camera);
    updateLabels();
  });
  return W;
}

function tickLeak(dt) {
  if (!leak) return;
  const p = leak.pts.geometry.attributes.position.array, v = leak.vel;
  const spawn = Math.floor(leak.level * 26);
  for (let k = 0; k < spawn; k++) {
    const i = leak.i = (leak.i + 1) % leak.N, a = Math.random() * Math.PI * 2, r = 0.081;
    p[i * 3] = 0.0015 + (Math.random() - .5) * 0.004; p[i * 3 + 1] = DIM.pipeY + Math.cos(a) * r; p[i * 3 + 2] = Math.sin(a) * r;
    const sp = 0.6 + Math.random() * 1.4 * leak.level;
    v[i * 3] = (Math.random() - .5) * 0.5; v[i * 3 + 1] = Math.cos(a) * sp; v[i * 3 + 2] = Math.sin(a) * sp;
    leak.life[i] = 1.4;
  }
  for (let i = 0; i < leak.N; i++) {
    if (leak.life[i] <= 0) { p[i * 3 + 1] = -10; continue; }
    leak.life[i] -= dt; v[i * 3 + 1] -= 9.8 * dt;
    p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
    if (p[i * 3 + 1] < 0.004) { p[i * 3 + 1] = 0.004; v[i * 3] *= 0.3; v[i * 3 + 1] = 0; v[i * 3 + 2] *= 0.3; }
  }
  leak.pts.geometry.attributes.position.needsUpdate = true;
}

// ---------------- labels ----------------
function addLabel(text, pos) {
  const el = document.createElement('div'); el.className = 'label3d'; el.textContent = text;
  $('#workshop').appendChild(el); const L = { el, pos }; labels.push(L); return L;
}
function clearLabels() { labels.forEach(l => l.el.remove()); labels = []; }
const tmpV = new THREE.Vector3();
function updateLabels() {
  if (!labels.length) return;
  const r = W.renderer.domElement.getBoundingClientRect();
  labels.forEach(l => {
    const p = typeof l.pos === 'function' ? l.pos() : l.pos;
    tmpV.copy(p).project(W.camera);
    const vis = tmpV.z < 1;
    l.el.style.display = vis ? '' : 'none';
    l.el.style.left = ((tmpV.x + 1) / 2 * r.width) + 'px';
    l.el.style.top = ((1 - tmpV.y) / 2 * r.height) + 'px';
  });
}

// ---------------- camera ----------------
const CAMS = {
  iso: [[0.95, 1.45, 1.25], [0.02, DIM.pipeY, 0]],
  front: [[0.95, 1.02, 0.08], [0, DIM.pipeY, 0]],
  close: [[0.42, 1.12, 0.46], [0.02, DIM.pipeY, 0]],
  clean: [[0.5, 1.02, 0.18], [0, DIM.pipeY, 0]],
  fit: [[0.9, 1.35, 1.05], [0.12, DIM.pipeY + 0.06, 0]],
  bolts: [[0.62, 1.12, 0.5], [0.02, DIM.pipeY, 0]],
  test: [[1.25, 1.45, 1.45], [0.05, DIM.pipeY, 0]],
};
function camTo(name, dur = 1.2) {
  const [p, t] = CAMS[name], c = W.camera, ctl = W.controls;
  const PK = { clean: .8, front: 1, bolts: 1, close: .9, fit: 1.2, iso: 1.3, test: 1.3 };
  const portrait = innerWidth / innerHeight < 0.8, k = portrait ? PK[name] : 1;
  const P = new THREE.Vector3(...p).sub(new THREE.Vector3(...t)).multiplyScalar(k).add(new THREE.Vector3(...t));
  gsap.to(c.position, { x: P.x, y: P.y, z: P.z, duration: dur, ease: 'power2.inOut' });
  gsap.to(ctl.target, { x: t[0], y: t[1], z: t[2], duration: dur, ease: 'power2.inOut' });
}
document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => { sfx.tap(); camTo(b.dataset.cam); }));

// ---------------- UI helpers ----------------
let toastTimer = 0;
function toast(msg, kind = 'err', ms = 3200) {
  const t = $('#toast'); t.className = 'toast' + (kind === 'ok' ? ' is-ok' : kind === 'info' ? ' is-info' : '');
  t.innerHTML = (kind === 'ok' ? I.ok : kind === 'info' ? I.info : I.warn) + `<span>${msg}</span>`; t.hidden = false;
  gsap.fromTo(t, { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: .3 });
  clearTimeout(toastTimer); toastTimer = setTimeout(() => gsap.to(t, { opacity: 0, duration: .3, onComplete: () => (t.hidden = true) }), ms);
}
// recorded voice clips (Shakir) with the device's Arabic voice as fallback
let clip = null;
function stopVoice() { stopSpeaking(); if (clip) { clip.pause(); clip = null; } $('#say').classList.remove('is-speaking'); }
function playLine(id) {
  stopVoice();
  if (!audio.on || !VOICE[id]) return;
  const L = VOICE[id], a = new Audio(`assets/voice/${id}.mp3`);
  const on = () => $('#say').classList.add('is-speaking'), off = () => $('#say').classList.remove('is-speaking');
  let fell = false;
  const fallback = () => { if (fell || clip !== a) return; fell = true; clip = null; speak(L.s || L.t, on, off); };
  clip = a; a.onplay = on; a.onended = off; a.onerror = fallback;
  a.play().catch(fallback);
}
function say(id) { $('#sayText').textContent = VOICE[id].t; playLine(id); }
function fb(id, kind = 'err', ms = 3600) { toast(VOICE[id].t, kind, ms); playLine(id); }
function narrate() { say(`${STEPS[S.step].id}_${S.mode}`); }
function dock(items, label = '') {
  const d = $('#dock'); d.innerHTML = items ? `<div class="dock__row">${items}</div>${label ? `<span class="dock__label">${label}</span>` : ''}` : '';
  requestAnimationFrame(() => document.documentElement.style.setProperty('--dock-h', d.offsetHeight ? d.offsetHeight + 'px' : '0px'));
  if (items) gsap.fromTo(d, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: 'power2.out' });
}
function renderSteps() {
  $('#steps').innerHTML = STEPS.map((s, i) => `<li class="step ${i < S.step ? 'is-done' : i === S.step ? 'is-now' : ''}"><span class="step__dot">${i < S.step ? '✓' : i + 1}</span><span class="step__label">${s.title}</span></li>`).join('');
  $('#stepTitle').innerHTML = `<span class="stepno">الخطوة ${S.step + 1} من ${STEPS.length}: </span>${STEPS[S.step].title}`;
}
function scoreNow() { return Object.entries(CATS).reduce((a, [k, [, max]]) => a + Math.max(0, max - S.ded[k]), 0); }
function penalize(cat, pts, text) {
  S.ded[cat] += pts; S.mistakes.push({ t: elapsed(), text, pts });
  const el = $('#score'); el.textContent = scoreNow();
  gsap.fromTo('.pill--score', { scale: 1.25 }, { scale: 1, duration: .4 });
}
const elapsed = () => Math.floor((performance.now() - S.t0) / 1000);
const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

// ---------------- exercise lifecycle ----------------
async function startExercise() {
  unlockAudio();
  show('workshop');
  const boot = $('#boot'); boot.classList.remove('is-gone');
  await ensureWorld();
  resetScene();
  S = { mode, step: 0, t0: performance.now(), ded: { safety: 0, prep: 0, assembly: 0, bolting: 0, testing: 0 }, mistakes: [], ppe: new Set(), gasketOn: false, elbow: null, elbowOn: false, roll: 1, flipped: false, studs: [], tight: [], torqueSeq: [], pulse: [], markers: [], testFails: 0, wrongHits: 0, orientErr: 0 };
  $('#modePill').textContent = mode === 'learn' ? 'تعلّم' : 'اختبار';
  $('#score').textContent = scoreNow();
  clearInterval(S.timer); S.timer = setInterval(() => { $('#timer').textContent = fmt(elapsed()); }, 500);
  W.onResize();
  setTimeout(() => boot.classList.add('is-gone'), 150);
  W.camera.position.set(2.2, 2.2, 2.6); camTo('iso', 2);
  enterStep(0);
}
function leaveWorkshop() {
  stopVoice(); leakSound(0); if (S) clearInterval(S.timer); S = null;
  show('home'); renderHome();
}
function resetScene() {
  loose.forEach(o => W.scene.remove(o)); loose = [];
  W.scene.children.filter(o => o.userData.dynamic).forEach(o => W.scene.remove(o));
  clearLabels(); leak.level = 0; leakSound(0);
  const c = W.dirtTex.userData.canvas.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 256, 256); c.drawImage(W.dirtOriginal, 0, 0);
  W.dirtTex.needsUpdate = true; W.dirt.material.opacity = 1; W.dirt.visible = true;
  $('#gauge').hidden = true; $('#toast').hidden = true;
}
function nextStep() { sfx.ok(); enterStep(S.step + 1); }
function enterStep(i) {
  S.step = i; renderSteps(); clearMarkers(); clearLabels();
  const id = STEPS[i].id;
  narrate();
  ({ ppe: stepPPE, clean: stepClean, fit: stepFit, bolts: stepBolts, torque: stepTorque, test: stepTest })[id]();
}

// ---------- step 1: PPE ----------
const PPE = [
  { k: 'helmet', t: 'خوذة', ok: true }, { k: 'goggles', t: 'نضارة واقية', ok: true }, { k: 'gloves', t: 'جوانتي عمل', ok: true },
  { k: 'watch', t: 'ساعة وخاتم', ok: false, why: 'الساعة والخاتم ممنوعين في الورشة: ممكن يتشبكوا في العِدة أو الماكينة.' },
  { k: 'boots', t: 'حذاء أمان', ok: true },
  { k: 'scarf', t: 'كوفية طويلة', ok: false, why: 'اللبس الواسع والكوفية خطر: ممكن تتلف في أي جزء دوّار.' },
  { k: 'sandal', t: 'شبشب', ok: false, why: 'الشبشب ممنوع. لازم حذاء أمان بمقدمة حديد يحمي صوابعك.' },
];
function stepPPE() {
  camTo('iso');
  dock(PPE.map(p => `<button class="tile" data-ppe="${p.k}">${I[p.k]}<span>${p.t}</span></button>`).join(''), 'اختار اللي هتلبسه قبل ما تدخل الورشة (4 حاجات)');
  $('#dock').onclick = e => {
    const b = e.target.closest('[data-ppe]'); if (!b || b.classList.contains('is-picked')) return;
    const p = PPE.find(x => x.k === b.dataset.ppe);
    if (p.ok) { b.classList.add('is-picked'); sfx.wear(); S.ppe.add(p.k); gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .3, ease: 'back.out(3)' });
      if (S.ppe.size === 4) { fb('ppe_ok', 'ok', 2600); $('#dock').onclick = null; setTimeout(nextStep, 900); } }
    else { b.classList.add('is-wrong', 'is-used'); sfx.error(); fb('ppe_' + p.k); penalize('safety', 5, 'اختيار غير آمن: ' + p.t); }
  };
}

// ---------- step 2: clean ----------
function stepClean() {
  camTo('clean');
  W.dirt.visible = true;
  S.cleanBase = alphaSum(); S.cleanLast = 0;
  dock(`<div class="progress"><span>${I.wrench}</span><div class="meter"><i id="cleanBar" style="width:0%"></i></div><b class="mono" id="cleanPct">0%</b></div>`, 'امسح على وجه الفلانشة بصباعك أو بالماوس لحد ما يلمع');
  addLabel('وجه الفلانشة · Raised Face', new THREE.Vector3(0.01, DIM.pipeY + 0.1, 0));
  $('#stage').classList.add('is-brush');
}
function alphaSum() {
  const d = W.dirtTex.userData.canvas.getContext('2d').getImageData(0, 0, 256, 256).data; let s = 0;
  for (let i = 3; i < d.length; i += 16) s += d[i]; return s;
}
function brushAt(uv) {
  const c = W.dirtTex.userData.canvas.getContext('2d');
  c.globalCompositeOperation = 'destination-out';
  const x = uv.x * 256, y = (1 - uv.y) * 256;
  const g = c.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 26, 0, 7); c.fill();
  c.globalCompositeOperation = 'source-over';
  W.dirtTex.needsUpdate = true;
  if (Math.random() < 0.35) sfx.brush();
  const now = performance.now();
  if (now - S.cleanLast > 140) {
    S.cleanLast = now;
    const pct = Math.min(1, 1 - alphaSum() / S.cleanBase);
    const shown = Math.min(100, Math.round(pct / 0.85 * 100));
    $('#cleanBar').style.width = shown + '%'; $('#cleanPct').textContent = shown + '%';
    if (pct >= 0.85 && !S.cleanDone) {
      S.cleanDone = true; $('#stage').classList.remove('is-brush');
      gsap.to(W.dirt.material, { opacity: 0, duration: .6, onComplete: () => (W.dirt.visible = false) });
      fb('clean_ok', 'ok', 2200); setTimeout(nextStep, 900);
    }
  }
}

// ---------- step 3: gasket + elbow ----------
function stepFit() {
  S.cleanDone = true; $('#stage').classList.remove('is-brush');
  camTo('fit');
  renderFitDock();
  addLabel('ضع هنا · F-01', () => tmpV.set(0.03, DIM.pipeY + 0.13, 0));
  if (S.mode === 'learn') showGhost();
}
function renderFitDock() {
  const hasElbowLoose = S.elbow && !S.elbowOn;
  const tiles = [
    { k: 'gasket', t: 'حشية', s: 'DN100', used: S.gasketOn || loose.some(o => o.userData.kind === 'gasket') },
    { k: 'gasketSmall', t: 'حشية', s: 'DN80', used: S.usedSmall },
    { k: 'elbow', t: 'كوع 90° بفلانشة', s: 'DN100 LR', used: !!S.elbow },
  ];
  let html = tiles.map(t => `<button class="tile ${t.used ? 'is-used' : ''}" data-part="${t.k}">${I[t.k]}<span>${t.t}</span><small>${t.s}</small></button>`).join('');
  if (hasElbowLoose) {
    html += `<div class="actions">
      <button class="btn btn--amber" data-elbow="roll">${I.roll}لف الكوع 90°</button>
      <button class="btn" data-elbow="flip">${I.flip}اقلب الوجه</button>
      <span class="pill" id="orient">${orientText()}</span></div>`;
  }
  dock(html, hasElbowLoose ? 'اسحب الكوع لحد الفلانشة بعد ما تظبط اتجاهه' : 'اسحب القطعة من هنا للفلانشة، أو اضغط عليها مرة');
  document.querySelectorAll('[data-part]').forEach(b => b.addEventListener('pointerdown', trayDown));
  document.querySelectorAll('[data-elbow]').forEach(b => b.addEventListener('click', () => b.dataset.elbow === 'roll' ? rollElbow() : flipElbow()));
}
const ORIENT = ['لفوق', 'لقدّام', 'لتحت', 'لورا'];
function orientText() { return `اتجاه الفتحة: <b>${ORIENT[S.roll]}</b>${S.flipped ? ' · الوش مقلوب' : ''}${S.roll === 0 && !S.flipped ? ' ✓' : ''}`; }
function applyElbowRotation(animate = true) {
  const e = S.elbow; const rx = S.rx, ry = S.flipped ? Math.PI : 0;
  e.rotation.order = 'YXZ';
  if (animate) gsap.to(e.rotation, { x: rx, y: ry, duration: .45, ease: 'power2.out' }); else e.rotation.set(rx, ry, 0);
  const o = $('#orient'); if (o) o.innerHTML = orientText();
}
function rollElbow() { S.roll = (S.roll + 1) % 4; S.rx += Math.PI / 2; sfx.slide(); applyElbowRotation(); }
function flipElbow() { S.flipped = !S.flipped; sfx.slide(); applyElbowRotation(); }

function showGhost() {
  if (S.ghost) return;
  const g = elbowAssembly();
  g.traverse(o => { if (o.isMesh) { o.material = MAT.ghost; o.castShadow = false; } });
  g.position.set(DIM.gasketT, DIM.pipeY, 0); g.userData.dynamic = true; S.ghost = g; W.scene.add(g);
}
function spawnPart(kind) {
  let obj;
  if (kind === 'elbow') { obj = elbowAssembly(); S.elbow = obj; S.roll = 1; S.rx = Math.PI / 2; S.flipped = false; applyElbowRotation(false); }
  else { obj = gasket(kind === 'gasketSmall'); if (kind === 'gasketSmall') S.usedSmall = true; }
  obj.userData.kind = kind; obj.userData.dynamic = true;
  W.scene.add(obj); loose.push(obj); sfx.pick();
  return obj;
}
const STAGING = { gasket: new THREE.Vector3(0.32, DIM.pipeY + 0.02, 0.22), gasketSmall: new THREE.Vector3(0.32, DIM.pipeY + 0.02, 0.22), elbow: new THREE.Vector3(0.36, DIM.pipeY + 0.04, 0.3) };

// ---------- pointer: tray drag ----------
let drag = null;
const plane = new THREE.Plane(), hit = new THREE.Vector3();
function setRay(x, y) { const r = W.renderer.domElement.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, W.camera); }
function planeThrough(p) { const n = new THREE.Vector3(); W.camera.getWorldDirection(n); plane.setFromNormalAndCoplanarPoint(n.negate(), p); }
function trayDown(e) {
  const b = e.currentTarget; if (b.classList.contains('is-used')) return;
  e.preventDefault(); unlockAudio();
  const kind = b.dataset.part;
  if (kind === 'gasket' && S.elbowOn) { fb('elbow_busy'); sfx.error(); return; }
  const obj = spawnPart(kind);
  obj.position.copy(STAGING[kind]);
  const sx = e.clientX, sy = e.clientY;
  drag = { obj, fromTray: true, moved: false, sx, sy, off: new THREE.Vector3() };
  planeThrough(new THREE.Vector3(0.1, DIM.pipeY, 0));
  W.controls.enabled = false;
  renderFitDock();
}
addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
  if (!drag.moved) return;
  setRay(e.clientX, e.clientY);
  if (raycaster.ray.intersectPlane(plane, hit)) { drag.obj.position.copy(hit).sub(drag.off); drag.obj.position.y = Math.max(0.15, drag.obj.position.y); }
  nearHint(drag.obj);
});
addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
function endDrag() {
  if (!drag) return;
  const d = drag; drag = null; W.controls.enabled = true;
  if (!d.moved && d.fromTray) { // tap: lift into view near the joint
    gsap.fromTo(d.obj.position, { y: d.obj.position.y + 0.25 }, { y: d.obj.position.y, duration: .5, ease: 'bounce.out' });
    return;
  }
  trySnap(d.obj);
}
function nearHint(obj) {
  if (!S.ghost) return;
  const dist = obj.position.distanceTo(S.ghost.position);
  S.ghost.traverse(o => { if (o.isMesh) o.material.opacity = dist < 0.15 ? 0.32 : 0.18; });
}

// ---------- stage pointer (brush, grab, tap markers) ----------
function bindStagePointer() {
  const stage = $('#stage');
  stage.addEventListener('pointerdown', e => {
    if (!S) return;
    unlockAudio();
    setRay(e.clientX, e.clientY);
    const id = STEPS[S.step].id;
    if (id === 'clean' && !S.cleanDone) {
      const h = raycaster.intersectObject(W.dirt, false)[0];
      if (h) { W.controls.enabled = false; S.brushing = true; brushAt(h.uv); }
      return;
    }
    if (id === 'fit') {
      const hits = raycaster.intersectObjects(loose, true);
      if (hits.length) {
        let o = hits[0].object; while (o.parent && !loose.includes(o)) o = o.parent;
        // drag on a camera-facing plane through the joint, keeping the grab offset on screen
        planeThrough(new THREE.Vector3(0.1, DIM.pipeY, 0));
        raycaster.ray.intersectPlane(plane, hit); const grab = hit.clone();
        const sp = o.position.clone().project(W.camera); raycaster.setFromCamera(new THREE.Vector2(sp.x, sp.y), W.camera);
        const base = new THREE.Vector3(); raycaster.ray.intersectPlane(plane, base);
        drag = { obj: o, fromTray: false, moved: true, off: grab.sub(base) };
        gsap.to(o.position, { x: base.x, y: base.y, z: base.z, duration: .15 });
        W.controls.enabled = false; sfx.pick();
      }
      return;
    }
    if (id === 'bolts' || id === 'torque') {
      const h = raycaster.intersectObjects(S.markers.map(m => m.userData.hitbox), false)[0];
      if (h) { W.controls.enabled = false; setTimeout(() => (W.controls.enabled = true), 0); (id === 'bolts' ? insertStud : tightenNut)(h.object.userData.index); }
    }
  }, { capture: true });
  stage.addEventListener('pointermove', e => {
    if (!S || !S.brushing) return;
    setRay(e.clientX, e.clientY);
    const h = raycaster.intersectObject(W.dirt, false)[0]; if (h) brushAt(h.uv);
  });
  const stop = () => { if (S && S.brushing) { S.brushing = false; W.controls.enabled = true; } };
  addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
}

function trySnap(obj) {
  const kind = obj.userData.kind;
  const target = new THREE.Vector3(0, DIM.pipeY, 0);
  if (kind === 'gasket' || kind === 'gasketSmall') {
    if (obj.position.distanceTo(target) > 0.14) return;
    if (kind === 'gasketSmall') {
      sfx.error(); fb('gasket_small', 'err', 4500);
      penalize('assembly', 4, 'اختيار حشية بمقاس غير متوافق (DN80)');
      gsap.to(obj.position, { y: 0.02, x: 0.6, duration: .7, ease: 'power2.in', onComplete: () => { W.scene.remove(obj); loose = loose.filter(o => o !== obj); } });
      return;
    }
    if (S.elbowOn) return;
    loose = loose.filter(o => o !== obj);
    gsap.to(obj.position, { x: 0, y: DIM.pipeY, z: 0, duration: .35, ease: 'power2.out', onComplete: () => sfx.thunk() });
    S.gasketOn = true; S.gasketObj = obj; fb('gasket_ok', 'ok', 2000);
    if (S.ghost) gsap.to(S.ghost.position, { x: DIM.gasketT, duration: .3 });
    renderFitDock();
    return;
  }
  if (kind === 'elbow') {
    const g = S.gasketOn ? DIM.gasketT : 0.0005;
    target.x = g;
    if (obj.position.distanceTo(target) > 0.16) return;
    if (S.flipped) { sfx.error(); fb('flip', 'err', 4200); penalize('assembly', 3, 'محاولة تركيب الكوع بوش مقلوب'); bounceBack(obj); return; }
    if (S.roll !== 0) {
      sfx.error(); S.orientErr++;
      fb('orient', 'err', 4200);
      if (S.orientErr <= 3) penalize('assembly', 3, 'محاولة تركيب الكوع باتجاه مخالف للرسم');
      bounceBack(obj); return;
    }
    if (!S.gasketOn && S.mode === 'learn') {
      sfx.error(); fb('no_gasket', 'info', 4200);
      penalize('assembly', 2, 'محاولة تركيب الكوع قبل الحشية'); bounceBack(obj); return;
    }
    loose = loose.filter(o => o !== obj);
    S.elbowOn = true;
    gsap.to(obj.position, { x: target.x, y: target.y, z: 0, duration: .5, ease: 'power3.out', onComplete: () => { sfx.clank(); } });
    if (S.ghost) { W.scene.remove(S.ghost); S.ghost = null; }
    fb('elbow_ok', 'ok', 2000);
    setTimeout(nextStep, 1000);
  }
}
function bounceBack(obj) { const p = STAGING[obj.userData.kind]; gsap.to(obj.position, { x: p.x, y: p.y, z: p.z, duration: .6, ease: 'back.out(1.6)' }); }

// ---------- markers (holes / nuts) ----------
function holeWorld(i) { const v = new THREE.Vector3(); W.spoolFlange.anchors[i].getWorldPosition(v); return v; }
function addMarker(i, pos, tex) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.setScalar(0.042); sp.position.copy(pos); sp.renderOrder = 10;
  const hb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hb.position.copy(pos); hb.userData.index = i;
  sp.userData = { hitbox: hb, index: i, dynamic: true }; hb.userData.dynamic = true;
  W.scene.add(sp, hb); S.markers.push(sp); S.pulse.push(sp);
  return sp;
}
function clearMarkers() { if (!S) return; S.markers.forEach(m => { W.scene.remove(m, m.userData.hitbox); }); S.markers = []; S.pulse = []; }

// ---------- step 4: bolts ----------
function stepBolts() {
  camTo('bolts');
  S.studs = new Array(8).fill(null);
  for (let i = 0; i < 8; i++) { const p = holeWorld(i); p.x = 0.05; addMarker(i, p, ringBlue); }
  dock(`<div class="progress"><span class="mono" id="boltCount">0 / 8</span><div class="meter"><i id="boltBar" style="width:0%"></i></div></div>`, 'اضغط على كل خرم منوّر علشان تركّب المسمار');
}
function insertStud(i) {
  if (S.studs[i]) return;
  const st = studBolt(); const p = holeWorld(i);
  const cx = (S.gasketOn ? DIM.gasketT : 0) / 2;
  st.position.set(0.4, p.y, p.z); st.userData.dynamic = true; W.scene.add(st); S.studs[i] = st;
  const m = S.markers.find(x => x.userData.index === i); if (m) { W.scene.remove(m, m.userData.hitbox); S.markers = S.markers.filter(x => x !== m); S.pulse = S.pulse.filter(x => x !== m); }
  sfx.slide();
  gsap.to(st.position, { x: cx, duration: .5, ease: 'power2.out', onComplete: () => { sfx.thunk(); gsap.fromTo(st.userData.front.rotation, { x: 0 }, { x: Math.PI * 3, duration: .5 }); } });
  const n = S.studs.filter(Boolean).length;
  $('#boltCount').textContent = `${n} / 8`; $('#boltBar').style.width = (n / 8 * 100) + '%';
  if (n === 8) setTimeout(nextStep, 900);
}

// ---------- step 5: torque (star pattern) ----------
const STAR = [0, 4, 2, 6, 1, 5, 3, 7];
function starCandidates(seq) {
  if (!seq.length) return null;
  const s = seq[0], out = [];
  [1, -1].forEach(dir => { const c = STAR.map(o => ((s + dir * o) % 8 + 8) % 8); if (seq.every((v, i) => c[i] === v)) out.push(c); });
  return out;
}
function stepTorque() {
  camTo('front');
  S.torqueSeq = []; S.tight = new Array(8).fill(false);
  for (let i = 0; i < 8; i++) { const p = holeWorld(i); p.x = 0.06; addMarker(i, p, ringAmber); }
  dock(`<div class="progress"><span class="mono" id="tqCount">0 / 8</span><div class="meter"><i id="tqBar" style="width:0%"></i></div></div>`, 'اضغط على الصامولة علشان تربطها بالمفتاح · الترتيب مهم');
}
function tightenNut(i) {
  if (S.tight[i]) return;
  const seq = [...S.torqueSeq, i];
  const cand = starCandidates(seq);
  if (S.mode === 'learn' && !cand.length) {
    sfx.error();
    const prev = starCandidates(S.torqueSeq); const next = prev[0][S.torqueSeq.length];
    fb(S.torqueSeq.length === 1 ? 'torque_opposite' : 'torque_next', 'info');
    penalize('bolting', 2, 'محاولة ربط مسمار خارج التتابع النجمي');
    highlightNext([next]);
    return;
  }
  S.torqueSeq = seq; S.tight[i] = true;
  const st = S.studs[i];
  sfx.ratchet(7);
  gsap.to(st.userData.front.rotation, { x: `+=${Math.PI * 4}`, duration: .7, ease: 'power1.out' });
  gsap.to(st.userData.front.position, { x: st.userData.front.position.x - 0.0025, duration: .7 });
  const m = S.markers.find(x => x.userData.index === i); if (m) { m.material.map = ringMint; S.pulse = S.pulse.filter(x => x !== m); m.material.opacity = 1; }
  S.markers.forEach(x => { if (!S.tight[x.userData.index]) x.material.map = ringAmber; });
  if (S.mode === 'learn' && S.torqueSeq.length < 8) { const c = starCandidates(S.torqueSeq); highlightNext(c.map(x => x[S.torqueSeq.length])); }
  const n = S.torqueSeq.length;
  $('#tqCount').textContent = `${n} / 8`; $('#tqBar').style.width = (n / 8 * 100) + '%';
  if (n === 8) {
    if (S.mode === 'test' && !starCandidates(S.torqueSeq).length) penalize('bolting', 10, 'ترتيب ربط المسامير لم يكن نجمياً (ضغط غير متساوٍ على الحشية)');
    setTimeout(nextStep, 900);
  }
}
function highlightNext(list) {
  S.markers.forEach(x => { const k = x.userData.index; if (!S.tight[k]) x.material.map = list.includes(k) ? ringBlue : ringAmber; });
}

// ---------- step 6: pressure test ----------
function gaugeSVG() {
  let ticks = '';
  for (let v = 0; v <= 16; v += 2) { const a = (-135 + v / 16 * 270) * Math.PI / 180; ticks += `<line x1="${60 + Math.sin(a) * 40}" y1="${60 - Math.cos(a) * 40}" x2="${60 + Math.sin(a) * 47}" y2="${60 - Math.cos(a) * 47}" stroke="#A3B5DA" stroke-width="2"/><text x="${60 + Math.sin(a) * 31}" y="${64 - Math.cos(a) * 31}" font-size="8" fill="#A3B5DA" text-anchor="middle" font-family="JetBrains Mono">${v}</text>`; }
  const a10 = (-135 + 10 / 16 * 270) * Math.PI / 180;
  return `<svg viewBox="0 0 120 120" role="img" aria-label="مانومتر الضغط"><circle cx="60" cy="60" r="54" fill="#0B1A3A" stroke="#22396E" stroke-width="3"/>
    <path d="M${60 + Math.sin(a10) * 50} ${60 - Math.cos(a10) * 50} A50 50 0 0 1 ${60 + Math.sin(135 * Math.PI / 180) * 50} ${60 - Math.cos(135 * Math.PI / 180) * 50}" stroke="#FF4D57" stroke-width="4" fill="none"/>
    ${ticks}<g id="needle" style="transform-origin:60px 60px;transform:rotate(-135deg)"><path d="M58 60 L60 16 L62 60 Z" fill="#FFC23D"/></g><circle cx="60" cy="60" r="6" fill="#EEF3FF"/>
    <text x="60" y="92" font-size="8" fill="#A3B5DA" text-anchor="middle" font-family="JetBrains Mono">bar</text></svg>
    <b id="pVal" dir="ltr">0.0 bar</b><small id="pState">الهدف: 10 bar</small>`;
}
function stepTest() {
  camTo('test');
  const g = $('#gauge'); g.innerHTML = gaugeSVG(); g.hidden = false;
  S.p = 0; S.hold = false; S.leakT = 0; S.watch = 0; S.testOver = false;
  dock(`<button class="holdbtn" id="pump"><i></i><span>اضغط مع الاستمرار: تشغيل المضخة</span></button>`, 'خليك ضاغط لحد ما الضغط يوصل 10 bar وراقب الوصلة');
  const pump = $('#pump');
  const on = e => { e.preventDefault(); unlockAudio(); S.hold = true; pump.setPointerCapture?.(e.pointerId); };
  const off = () => { S.hold = false; };
  pump.addEventListener('pointerdown', on); pump.addEventListener('pointerup', off); pump.addEventListener('pointercancel', off); pump.addEventListener('lostpointercapture', off);
}
let pumpTick = 0;
function tickTest(dt) {
  if (!S || STEPS[S.step]?.id !== 'test' || S.testOver || S.p === undefined) return;
  const leaking = !S.gasketOn;
  if (S.hold) {
    S.p += dt * (leaking ? (S.p < 2.6 ? 2.6 : 0.15) : 3.0);
    pumpTick += dt; if (pumpTick > 0.32) { pumpTick = 0; sfx.pump(); }
  } else if (leaking) S.p = Math.max(0, S.p - dt * 0.9);
  S.p = Math.min(S.p, 10);
  if (leaking && S.p > 1.2) { leak.level = Math.min(1, (S.p - 1) / 2); S.leakT += S.hold ? dt : 0; } else leak.level = Math.max(0, leak.level - dt);
  leakSound(leak.level);
  const fill = $('#pump i'); if (fill) fill.style.width = (S.p / 10 * 100) + '%';
  const nd = $('#needle'); if (nd) nd.style.transform = `rotate(${-135 + S.p / 16 * 270}deg)`;
  const pv = $('#pVal'); if (pv) pv.textContent = S.p.toFixed(1) + ' bar';
  if (leaking && S.leakT > 2.6) return testFail();
  if (!leaking && S.p >= 10) {
    S.watch += dt; const left = Math.max(0, 4 - S.watch);
    $('#pState').textContent = `مراقبة الوصلة… ${left.toFixed(1)} ث`;
    if (S.watch >= 4) testPass();
  }
}
function testFail() {
  S.testOver = true; S.hold = false; S.testFails++;
  sfx.error(); toast('تسريب عند الوصلة! الضغط لا يرتفع، والحشية غير موجودة بين الفلانشتين.', 'err', 5000);
  if (S.testFails === 1) { penalize('testing', 15, 'فشل اختبار الضغط: تسريب عند الوصلة'); penalize('assembly', 10, 'قفل الوصلة بدون حشية'); }
  $('#pState').textContent = 'فشل: تسريب';
  say('leak_fail');
  dock(`<button class="btn btn--amber btn--xl" id="fixJoint">${I.wrench}فك الوصلة وصلّح</button>`);
  $('#fixJoint').addEventListener('click', disassemble);
}
function disassemble() {
  sfx.ratchet(10);
  leak.level = 0; leakSound(0); $('#gauge').hidden = true;
  S.studs.forEach((st, k) => st && gsap.to(st.position, { x: 0.5, y: st.position.y + 0.05, duration: .6, delay: k * 0.05, onComplete: () => W.scene.remove(st) }));
  S.studs = []; S.tight = []; S.torqueSeq = [];
  const e = S.elbow; S.elbowOn = false; loose.push(e);
  gsap.to(e.position, { ...STAGING.elbow, duration: .8, delay: .4, ease: 'power2.inOut' });
  S.p = undefined;
  setTimeout(() => { S.step = 2; renderSteps(); narrate(); stepFit(); }, 1300);
}
function testPass() {
  S.testOver = true; S.hold = false; leak.level = 0; leakSound(0);
  $('#pState').textContent = 'ناجح: لا يوجد تسريب';
  sfx.win(); fb('pass', 'ok', 3200);
  burst();
  setTimeout(finish, 2200);
}
function burst() {
  if (!window.confetti) return;
  const colors = ['#2F7CF6', '#FFC23D', '#2EE6A6', '#FFFFFF', '#E8323C'];
  window.confetti({ particleCount: 140, spread: 80, origin: { y: .6 }, colors, disableForReducedMotion: true });
  setTimeout(() => window.confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true }), 250);
  setTimeout(() => window.confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true }), 400);
}

// ---------------- result ----------------
function finish() {
  clearInterval(S.timer); stopVoice();
  const time = elapsed(), total = scoreNow();
  const stars = total >= 90 ? 3 : total >= 70 ? 2 : 1;
  const earned = [];
  if (S.ded.safety === 0) earned.push('safety');
  if (S.testFails === 0) earned.push('noleak');
  if (S.ded.bolting === 0) earned.push('star');
  if (time < 360) earned.push('fast');
  const xp = S.mode === 'test' ? total : Math.round(total / 2);
  profile.xp += xp; earned.forEach(b => profile.badges.includes(b) || profile.badges.push(b)); store.set('profile', profile);
  const verdict = total >= 90 ? 'ممتاز' : total >= 80 ? 'جيد جداً' : total >= 65 ? 'جيد' : 'محتاج تدريب أكتر';
  const crit = Object.entries(CATS).map(([k, [name, max]]) => { const got = Math.max(0, max - S.ded[k]); return `<div class="crit__row"><span>${name}</span><b class="mono" dir="ltr">${got} / ${max}</b><div class="meter"><i class="${got === max ? 'full' : ''}" style="width:${got / max * 100}%"></i></div></div>`; }).join('');
  const log = S.mistakes.length ? S.mistakes.map(m => `<li><span class="mono muted">${fmt(m.t)}</span><span>${m.text}</span><b dir="ltr">−${m.pts}</b></li>`).join('') : '<li><span></span><span>مفيش أخطاء مسجلة. شغل نضيف.</span><span></span></li>';
  $('#resultBody').innerHTML = `
    <section class="card result__top">
      <div class="stars" aria-label="${stars} من 3 نجوم">${[1, 2, 3].map(n => I.star.replace('<svg', `<svg class="${n <= stars ? 'on' : ''}"`)).join('')}</div>
      <div><div class="bigscore mono" dir="ltr">${total}<small> / 100</small></div><h2>${verdict}</h2></div>
      <div style="margin-inline-start:auto;display:flex;flex-direction:column;gap:.3rem">
        <span class="muted">${profile.name || 'المتدرب'} · ${S.mode === 'test' ? 'وضع الاختبار' : 'وضع التعلّم'}</span>
        <span class="mono">الزمن ${fmt(time)} · +${xp} XP</span>
        <span>${earned.map(b => `<span class="badge is-on">${I.star}${BADGES[b]}</span>`).join(' ')}</span>
      </div>
    </section>
    <section class="card crit"><h3>تفاصيل التقييم</h3>${crit}</section>
    <section class="card log"><h3>سجل الأخطاء</h3><ul>${log}</ul></section>
    <div class="result__actions"><button class="btn btn--primary btn--xl" data-action="again">أعد المحاولة</button><button class="btn btn--xl" data-action="gohome">الرئيسية</button></div>`;
  show('result');
  gsap.from('.stars svg', { scale: 0, rotate: -90, duration: .6, stagger: .18, ease: 'back.out(2)' });
  gsap.from('.bigscore', { scale: .6, opacity: 0, duration: .6, ease: 'back.out(2)' });
  if (stars >= 2) burst();
}

// ---------------- boot ----------------
renderHome();
document.fonts.ready.then(() => setTimeout(() => $('#boot').classList.add('is-gone'), 300));

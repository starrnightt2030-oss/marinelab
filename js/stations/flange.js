// Station: flanged elbow joint — PPE → clean → inspect & fit → bolts → torque → hydrostatic test (+ fault diagnosis).
import * as THREE from 'three';
import { createWorld, DIM, MAT, gasket, elbowAssembly, studBolt, dropletSprite, ringSprite, wireBrush, torqueWrench } from '../scene.js';
import { createWorker } from '../worker3d.js';
import { sfx, unlockAudio, leakSound } from '../audio.js';
import { $, $$, gsap, I, say, fb, toast, dock, extra, renderSteps, penalize, startSession, renderResult, burst, ask, shuffle, SES } from '../ui.js';

export const SCENARIOS = {
  ship: { t: 'خط مياه تبريد بحري', sub: 'غرفة الماكينات · DN100 · Class 150', target: 10, line: 'CW-101' },
  oil: { t: 'خط زيت خام', sub: 'محطة معالجة بترول · DN100 · Class 150', target: 15, line: '4"-CO-1001' },
};
const CATS = { safety: ['السلامة والوقاية', 15], prep: ['تجهيز وفحص الأسطح', 15], assembly: ['صحة التجميع', 30], bolting: ['ربط المسامير', 25], testing: ['الاختبار والتشخيص', 15] };
const TORQUE_OK = 120;   // N·m for M16 studs with a compressed-fibre gasket — illustrative training value
const TORQUE_TABLE = [['M12', 60], ['M16', 120], ['M20', 200], ['M24', 340]];

let W = null, S = null, WK = null, leak = null, dust = null;
let loose = [], labels = [], drag = null;
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3(), tmpV = new THREE.Vector3();
const dropTex = dropletSprite(), ringAmber = ringSprite('#FFC23D'), ringMint = ringSprite('#2EE6A6'), ringBlue = ringSprite('#3DD9FF');

function stepsFor(level) {
  return [
    { id: 'ppe', title: 'مهمات الوقاية' },
    { id: 'clean', title: level === 'easy' ? 'تنظيف وجه الفلانشة' : 'تنظيف وفحص وجه الفلانشة' },
    { id: 'fit', title: level === 'easy' ? 'الحشية والكوع' : 'فحص الحشية وتركيب الكوع' },
    { id: 'bolts', title: 'تركيب المسامير' },
    { id: 'torque', title: level === 'pro' ? 'الربط النجمي على مرحلتين' : 'الربط النجمي' },
    { id: 'test', title: 'اختبار الضغط' },
  ];
}

export const flangeStation = {
  id: 'flange',
  title: 'تركيب وصلة فلانشة وكوع',
  async start({ mode, level, scenario = 'ship' }) {
    await ensureWorld();
    resetScene();
    const sc = SCENARIOS[scenario];
    startSession({ id: 'flange', title: 'تركيب وصلة فلانشة وكوع', sub: `${sc.t} · ${sc.sub}`, mode, level, cats: CATS, timeLimit: level === 'pro' ? 600 : 0, timeCat: 'testing' });
    S = {
      mode, level, scenario: sc, steps: stepsFor(level), step: 0,
      ppe: new Set(), gasketOn: false, gasketObj: null, gasketInspected: false, stockDamaged: level !== 'easy' && Math.random() < (level === 'pro' ? 0.75 : 0.5),
      scratch: level === 'pro' ? Math.random() < 0.5 : level === 'mid' ? Math.random() < 0.25 : false, scratchFixed: false,
      elbow: null, elbowOn: false, roll: 1, rx: Math.PI / 2, flipped: false,
      studs: [], tight: [], torqueSeq: [], allSeqs: [], pass: 1, torqueVal: level === 'easy' ? TORQUE_OK : null,
      pulse: [], markers: [], testFails: 0, orientErr: 0, tool: null, toolObj: null,
    };
    if (W.scratch) W.scratch.visible = S.scratch;
    W.paused = false; W.onResize();
    W.camera.position.set(2.2, 2.2, 2.6); camTo('iso', 2);
    enterStep(0);
  },
  stop() { if (W) { W.paused = true; leakSound(0); } if (WK) WK.stop(); clearLabels(); S = null; },
  again() { return this.start({ mode: SES.mode, level: SES.level, scenario: Object.keys(SCENARIOS).find(k => SCENARIOS[k] === S?.scenario) || 'ship' }); },
};

// ---------------- world ----------------
async function ensureWorld() {
  if (W) return W;
  const logo = new Image(); logo.src = 'assets/logo.png';
  await Promise.all([logo.decode().catch(() => {}), document.fonts.load('700 40px "Readex Pro"').catch(() => {})]);
  W = await createWorld($('#stage3d'), logo); W.logo = logo; W.paused = false;
  W.dirtOriginal = (() => { const c = document.createElement('canvas'); const src = W.dirtTex.userData.canvas; c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; })();
  // radial scratch defect on the raised face (hidden unless the scenario rolls it)
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.0016), new THREE.MeshBasicMaterial({ color: 0x1a1d22 }));
  sc.rotation.y = Math.PI / 2; sc.position.set(0.0006, DIM.pipeY + 0.066, 0.012); sc.rotation.x = 0.35; sc.visible = false;
  W.scene.add(sc); W.scratch = sc;
  // leak particles
  const N = 700, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-10), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.012, map: dropTex, transparent: true, depthWrite: false, opacity: 0.9 }));
  pts.frustumCulled = false; W.scene.add(pts);
  leak = { pts, N, vel: new Float32Array(N * 3), life: new Float32Array(N), level: 0, i: 0 };
  bindStagePointer();
  $$('[data-cam]').forEach(b => b.addEventListener('click', () => { sfx.tap(); camTo(b.dataset.cam); }));
  let last = performance.now();
  W.renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (W.paused) return;
    W.controls.update();
    tickLeak(dt); tickTest(dt); tickDust(dt);
    if (S && S.pulse) S.pulse.forEach(m => { m.material.opacity = 0.55 + 0.45 * Math.sin(now / 220); });
    W.renderer.render(W.scene, W.camera);
    updateLabels();
  });
  return W;
}
function resetScene() {
  loose.forEach(o => W.scene.remove(o)); loose = [];
  W.scene.children.filter(o => o.userData.dynamic).forEach(o => W.scene.remove(o));
  clearLabels(); leak.level = 0; leakSound(0);
  const c = W.dirtTex.userData.canvas.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 256, 256); c.drawImage(W.dirtOriginal, 0, 0);
  W.dirtTex.needsUpdate = true; W.dirt.material.opacity = 1; W.dirt.visible = true;
  $('#ppePill').hidden = true; if (WK) WK.stop();
}

// ---------------- particles ----------------
function emitDust(p) {
  if (!dust) {
    const N = 300, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-10), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.004, color: 0x8a4b22, transparent: true, opacity: 0.9, depthWrite: false }));
    pts.frustumCulled = false; W.scene.add(pts); dust = { pts, N, vel: new Float32Array(N * 3), life: new Float32Array(N), i: 0 };
  }
  const a = dust.pts.geometry.attributes.position.array;
  for (let k = 0; k < 5; k++) {
    const i = dust.i = (dust.i + 1) % dust.N;
    a[i * 3] = p.x + 0.004; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z;
    dust.vel[i * 3] = 0.2 + Math.random() * 0.4; dust.vel[i * 3 + 1] = (Math.random() - .2) * 0.5; dust.vel[i * 3 + 2] = (Math.random() - .5) * 0.6; dust.life[i] = 0.8;
  }
}
function tickDust(dt) {
  if (!dust) return; const a = dust.pts.geometry.attributes.position.array;
  for (let i = 0; i < dust.N; i++) { if (dust.life[i] <= 0) { a[i * 3 + 1] = -10; continue; } dust.life[i] -= dt; dust.vel[i * 3 + 1] -= 4 * dt; a[i * 3] += dust.vel[i * 3] * dt; a[i * 3 + 1] += dust.vel[i * 3 + 1] * dt; a[i * 3 + 2] += dust.vel[i * 3 + 2] * dt; }
  dust.pts.geometry.attributes.position.needsUpdate = true;
}
function tickLeak(dt) {
  const p = leak.pts.geometry.attributes.position.array, v = leak.vel;
  const spawn = Math.floor(leak.level * 26);
  for (let k = 0; k < spawn; k++) {
    const i = leak.i = (leak.i + 1) % leak.N, a = leak.arc != null ? leak.arc + (Math.random() - .5) * 0.5 : Math.random() * Math.PI * 2, r = 0.081;
    p[i * 3] = 0.0015 + (Math.random() - .5) * 0.004; p[i * 3 + 1] = DIM.pipeY + Math.cos(a) * r; p[i * 3 + 2] = Math.sin(a) * r;
    const sp = 0.4 + Math.random() * 1.4 * leak.level;
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

// ---------------- labels (positioned over the 3D view only) ----------------
function addLabel(text, pos) { const el = document.createElement('div'); el.className = 'label3d'; el.textContent = text; $('#stage').appendChild(el); labels.push({ el, pos }); }
function clearLabels() { labels.forEach(l => l.el.remove()); labels = []; }
function updateLabels() {
  if (!labels.length) return;
  const r = W.renderer.domElement.getBoundingClientRect(), sr = $('#stage').getBoundingClientRect();
  labels.forEach(l => {
    tmpV.copy(typeof l.pos === 'function' ? l.pos() : l.pos).project(W.camera);
    l.el.style.display = tmpV.z < 1 ? '' : 'none';
    l.el.style.left = (r.left - sr.left + (tmpV.x + 1) / 2 * r.width) + 'px';
    l.el.style.top = (r.top - sr.top + (1 - tmpV.y) / 2 * r.height) + 'px';
  });
}

// ---------------- camera ----------------
const CAMS = {
  iso: [[0.95, 1.45, 1.25], [0.02, DIM.pipeY, 0]],
  front: [[0.9, 1.0, 0.08], [0, DIM.pipeY, 0]],
  close: [[0.42, 1.12, 0.46], [0.02, DIM.pipeY, 0]],
  clean: [[0.48, 1.0, 0.16], [0, DIM.pipeY, 0]],
  fit: [[0.9, 1.35, 1.05], [0.12, DIM.pipeY + 0.06, 0]],
  gasket: [[0.62, 1.02, 0.45], [0.32, DIM.pipeY + 0.02, 0.22]],
  bolts: [[0.62, 1.12, 0.5], [0.02, DIM.pipeY, 0]],
  test: [[1.25, 1.45, 1.45], [0.05, DIM.pipeY, 0]],
};
function camTo(name, dur = 1.2) {
  const [p, t] = CAMS[name], c = W.camera, ctl = W.controls;
  const el = $('#stage3d'), portrait = el.clientWidth / el.clientHeight < 0.9;
  const k = portrait ? ({ clean: .85, front: 1.05, bolts: 1.05, close: .95, gasket: 1, fit: 1.25, iso: 1.35, test: 1.35 })[name] : 1;
  const P = new THREE.Vector3(...p).sub(new THREE.Vector3(...t)).multiplyScalar(k).add(new THREE.Vector3(...t));
  gsap.to(c.position, { x: P.x, y: P.y, z: P.z, duration: dur, ease: 'power2.inOut' });
  gsap.to(ctl.target, { x: t[0], y: t[1], z: t[2], duration: dur, ease: 'power2.inOut' });
}

// ---------------- flow ----------------
const line = (base) => `${base}_${S.mode}`;
function nextStep() { sfx.ok(); enterStep(S.step + 1); }
function enterStep(i) {
  if (S.toolObj && !['clean', 'torque'].includes(S.steps[i].id)) dropTool();
  S.step = i; renderSteps(S.steps, i); clearMarkers(); clearLabels(); extra('');
  const id = S.steps[i].id;
  say(line(id));
  ({ ppe: stepPPE, clean: stepClean, fit: stepFit, bolts: stepBolts, torque: stepTorque, test: stepTest })[id]();
}

// ---------- 1: PPE ----------
const PPE = [
  { k: 'helmet', t: 'خوذة', ok: true }, { k: 'goggles', t: 'نظارة واقية', ok: true }, { k: 'gloves', t: 'قفاز عمل', ok: true },
  { k: 'watch', t: 'ساعة وخاتم', ok: false }, { k: 'boots', t: 'حذاء أمان', ok: true },
  { k: 'scarf', t: 'كوفية طويلة', ok: false }, { k: 'sandal', t: 'شبشب', ok: false },
];
const PPE_OK = ['helmet', 'goggles', 'gloves', 'boots'];
function stepPPE() {
  camTo('iso');
  const e = extra(`<div class="worker"><b class="worker__title">المتدرب</b><div class="worker__stage" id="workerStage"></div><ul class="worker__list">${PPE_OK.map(k => `<li data-slot="${k}">${I[k]}<span>${PPE.find(p => p.k === k).t}</span></li>`).join('')}</ul></div>`);
  if (WK) WK.stop();
  WK = createWorker($('#workerStage', e), W.logo); WK.start();
  dock(shuffle(PPE).map(p => `<button class="tile" data-ppe="${p.k}">${I[p.k]}<span>${p.t}</span></button>`).join(''), 'اختار اللي هتلبسه قبل ما تدخل الورشة (4 حاجات)');
  $('#dock').onclick = ev => {
    const b = ev.target.closest('[data-ppe]'); if (!b || b.classList.contains('is-picked') || b.classList.contains('is-used')) return;
    const p = PPE.find(x => x.k === b.dataset.ppe);
    if (p.ok) {
      b.classList.add('is-picked'); sfx.wear(); S.ppe.add(p.k); WK.equip(p.k);
      const li = $(`[data-slot="${p.k}"]`); if (li) { li.classList.add('is-on'); gsap.fromTo(li, { scale: .8 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); }
      if (S.ppe.size === 4) {
        fb('ppe_ok', 'ok'); $('#dock').onclick = null;
        const pill = $('#ppePill'); pill.innerHTML = PPE_OK.map(k => I[k]).join(''); pill.hidden = false;
        gsap.fromTo(pill, { scale: 0 }, { scale: 1, duration: .5, delay: 1, ease: 'back.out(3)' });
        setTimeout(() => { if (WK) WK.stop(); nextStep(); }, 2400);
      }
    } else { b.classList.add('is-wrong', 'is-used'); sfx.error(); WK.wrong(p.k); fb('ppe_' + p.k); penalize('safety', 5, 'اختيار غير آمن: ' + p.t); }
  };
}

// ---------- hand tools ----------
const TOOLSETS = {
  clean: [{ k: 'brush', t: 'فرشاة سلك', ok: true }, { k: 'file', t: 'مبرد', ok: false, v: 'tool_file_bad' }, { k: 'rag', t: 'قطعة قماش', ok: false, v: 'tool_rag_bad' }],
  torque: [{ k: 'twrench', t: 'مفتاح عزم', s: '24 mm', ok: true }, { k: 'pipewrench', t: 'مفتاح مواسير', ok: false, v: 'tool_pipewrench_bad' }, { k: 'hammer', t: 'شاكوش', ok: false, v: 'tool_hammer_bad' }],
};
const TOOL_REST = { brush: [new THREE.Vector3(0.2, DIM.pipeY + 0.04, 0.2), -0.6], twrench: [new THREE.Vector3(0.16, DIM.pipeY - 0.36, 0.34), 0.3] };
const toolTiles = set => shuffle(TOOLSETS[set]).map(t => `<button class="tile" data-tool="${t.k}">${I[t.k]}<span>${t.t}</span>${t.s ? `<small>${t.s}</small>` : ''}</button>`).join('');
function bindToolTiles(set, cat) {
  $$('[data-tool]').forEach(b => b.addEventListener('click', () => {
    if (S.tool || b.classList.contains('is-used')) return;
    const t = TOOLSETS[set].find(x => x.k === b.dataset.tool);
    if (!t.ok) { b.classList.add('is-wrong', 'is-used'); sfx.error(); fb(t.v); penalize(cat, 3, 'اختيار عدة غير مناسبة: ' + t.t); return; }
    b.classList.add('is-picked'); $$('[data-tool]').forEach(x => x.classList.remove('is-hint'));
    pickTool(t.k);
  }));
}
function pickTool(k) {
  S.tool = k; sfx.pick();
  const obj = k === 'brush' ? wireBrush() : torqueWrench();
  obj.userData.dynamic = true; S.toolObj = obj; W.scene.add(obj);
  const [rest, ry] = TOOL_REST[k];
  obj.rotation.set(0, ry, 0);
  obj.position.copy(rest).add(new THREE.Vector3(0.25, -0.35, 0.3));
  gsap.to(obj.position, { x: rest.x, y: rest.y, z: rest.z, duration: .7, ease: 'back.out(1.4)' });
}
function toolHome(dur = .45) {
  const o = S.toolObj; if (!o) return;
  const [rest, ry] = TOOL_REST[S.tool];
  gsap.to(o.position, { x: rest.x, y: rest.y, z: rest.z, duration: dur, ease: 'power2.out' });
  gsap.to(o.rotation, { x: 0, y: ry, z: 0, duration: dur });
}
function dropTool() {
  const o = S.toolObj; if (!o) return;
  S.toolObj = null; S.tool = null;
  gsap.to(o.position, { y: o.position.y - 0.5, x: o.position.x + 0.3, duration: .6, ease: 'power2.in', onComplete: () => W.scene.remove(o) });
}
function hintTool() { $$('[data-tool]').forEach(b => { const t = Object.values(TOOLSETS).flat().find(x => x.k === b.dataset.tool); if (t.ok) b.classList.add('is-hint'); }); }

// ---------- 2: clean (+ inspect the face at mid/pro) ----------
function stepClean() {
  camTo('clean');
  W.dirt.visible = true;
  S.cleanBase = alphaSum(); S.cleanLast = 0; S.cleanDone = false; S.tool = null;
  dock(toolTiles('clean') + `<div class="progress"><span>${I.brush}</span><div class="meter"><i id="cleanBar" style="width:0%"></i></div><b class="mono" id="cleanPct">0%</b></div>`, 'التقط العُدّة المناسبة، وبعدين امسح بيها وش الفلانشة');
  bindToolTiles('clean', 'prep');
  addLabel('وجه الفلانشة · Raised Face', new THREE.Vector3(0.01, DIM.pipeY + 0.1, 0));
  $('#stage').classList.add('is-brush');
}
let ringIdx = null;
function alphaSum() {
  if (!ringIdx) {
    ringIdx = []; const rIn = 128 * (DIM.pipeID / 2) / (DIM.rfD / 2) + 3, rOut = 125;
    for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const r = Math.hypot(x - 128, y - 128); if (r > rIn && r < rOut) ringIdx.push((y * 256 + x) * 4 + 3); }
  }
  const d = W.dirtTex.userData.canvas.getContext('2d').getImageData(0, 0, 256, 256).data; let s = 0;
  for (const i of ringIdx) s += d[i]; return s;
}
function scrub(c, x, y) {
  const g = c.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 30, 0, 7); c.fill();
}
function brushAt(uv) {
  if (S.cleanDone || !$('#cleanBar')) return;
  const c = W.dirtTex.userData.canvas.getContext('2d');
  c.globalCompositeOperation = 'destination-out';
  const x = uv.x * 256, y = (1 - uv.y) * 256, L = S.lastUV;
  if (L && Math.hypot(x - L[0], y - L[1]) < 90) { const n = Math.ceil(Math.hypot(x - L[0], y - L[1]) / 8); for (let k = 1; k <= n; k++) scrub(c, L[0] + (x - L[0]) * k / n, L[1] + (y - L[1]) * k / n); }
  else scrub(c, x, y);
  S.lastUV = [x, y];
  c.globalCompositeOperation = 'source-over';
  if (S.brushHit) { emitDust(S.brushHit); const o = S.toolObj; if (o) { o.position.set(S.brushHit.x + 0.002, S.brushHit.y, S.brushHit.z); o.rotation.set((Math.random() - .5) * 0.15, -0.35, (Math.random() - .5) * 0.2); } }
  W.dirtTex.needsUpdate = true;
  if (Math.random() < 0.35) sfx.brush();
  const now = performance.now();
  if (now - S.cleanLast > 120) {
    S.cleanLast = now;
    const pct = Math.min(1, 1 - alphaSum() / S.cleanBase);
    const shown = Math.min(100, Math.round(pct / 0.72 * 100));
    $('#cleanBar').style.width = shown + '%'; $('#cleanPct').textContent = shown + '%';
    if (pct >= 0.72) {
      S.cleanDone = true; $('#stage').classList.remove('is-brush'); S.brushing = false; setTimeout(dropTool, 300);
      gsap.to(W.dirt.material, { opacity: 0, duration: .6, onComplete: () => (W.dirt.visible = false) });
      fb('clean_ok', 'ok');
      setTimeout(S.level === 'easy' ? nextStep : inspectFace, 1200);
    }
  }
}
async function inspectFace() {
  camTo('front', .9); say('face_inspect');
  addLabel('افحص التحزيز على الوجه', new THREE.Vector3(0.01, DIM.pipeY + 0.11, 0));
  const r = await ask('حالة وجه الفلانشة بعد التنظيف؟', [{ t: 'الوجه سليم — أكمّل التجميع', v: 'ok' }, { t: 'فيه خدش عرضي على الوجه — أبلّغ المشرف', v: 'bad' }]);
  if (!S) return;
  if (S.scratch && r.v === 'bad') { fb('scratch_found', 'ok'); S.scratchFixed = true; gsap.to(W.scratch.scale, { x: 0.01, duration: 1.2, delay: .8, onComplete: () => (W.scratch.visible = false) }); sfx.brush(); }
  else if (S.scratch && r.v === 'ok') { penalize('prep', 6, 'عدم ملاحظة خدش عرضي على وجه الفلانشة'); S.flags = { ...(S.flags || {}), missedScratch: true }; }
  else if (!S.scratch && r.v === 'bad') { penalize('prep', 2, 'إيقاف الشغل بدون عيب حقيقي في الوجه'); toast('بصّيت كويس؟ الوجه ده سليم. الإيقاف بدون سبب بيعطّل الشغل.', 'info'); }
  else fb('face_ok', 'ok');
  setTimeout(nextStep, 1600);
}

// ---------- 3: gasket inspection + elbow ----------
function stepFit() {
  S.cleanDone = true; $('#stage').classList.remove('is-brush');
  camTo('fit');
  renderFitDock();
  addLabel('ضع هنا · F-01', () => tmpV.set(0.03, DIM.pipeY + 0.13, 0));
  if (S.mode === 'learn' && S.level === 'easy') showGhost();
}
function renderFitDock() {
  const looseGasket = loose.find(o => o.userData.kind === 'gasket');
  const hasElbowLoose = S.elbow && !S.elbowOn;
  const tiles = [
    { k: 'gasket', t: 'حشية', s: 'DN100', used: S.gasketOn || !!looseGasket },
    { k: 'gasketSmall', t: 'حشية', s: 'DN80', used: S.usedSmall },
    { k: 'elbow', t: 'كوع 90° بفلانشة', s: 'DN100 LR', used: !!S.elbow },
  ];
  let html = tiles.map(t => `<button class="tile ${t.used ? 'is-used' : ''}" data-part="${t.k}">${I[t.k]}<span>${t.t}</span><small>${t.s}</small></button>`).join('');
  const acts = [];
  if (looseGasket && S.level !== 'easy' && !S.gasketInspected) acts.push(`<button class="btn btn--cyan" data-act="inspect">${I.search}افحص الحشية</button>`);
  if (hasElbowLoose) acts.push(`<button class="btn btn--amber" data-act="roll">${I.roll}لف الكوع 90°</button><button class="btn" data-act="flip">${I.flip}اقلب الوجه</button><span class="pill" id="orient">${orientText()}</span>`);
  if (acts.length) html += `<div class="actions">${acts.join('')}</div>`;
  dock(html, hasElbowLoose ? 'اسحب الكوع لحد الفلانشة بعد ما تظبط اتجاهه' : 'اسحب القطعة للفلانشة، أو اضغط عليها مرة علشان تطلع قدامك');
  $$('[data-part]').forEach(b => b.addEventListener('pointerdown', trayDown));
  $$('[data-act]').forEach(b => b.addEventListener('click', () => ({ roll: rollElbow, flip: flipElbow, inspect: inspectGasket })[b.dataset.act]()));
}
async function inspectGasket() {
  const g = loose.find(o => o.userData.kind === 'gasket'); if (!g) return;
  camTo('gasket', .8);
  gsap.to(g.rotation, { y: -0.9, duration: .8 });
  say('gasket_inspect');
  const r = await ask('نتيجة فحص الحشية؟', [{ t: 'سليمة — جاهزة للتركيب', v: 'ok' }, { t: 'تالفة (قطع أو حرق) — استبدلها', v: 'bad' }]);
  if (!S) return;
  const damaged = g.userData.damaged;
  S.gasketInspected = true;
  if (damaged && r.v === 'bad') { fb('gasket_bad_found', 'ok'); replaceGasket(g); }
  else if (damaged && r.v === 'ok') { penalize('assembly', 5, 'قبول حشية تالفة بعد الفحص'); }
  else if (!damaged && r.v === 'bad') { penalize('assembly', 2, 'استبعاد حشية سليمة'); toast('الحشية دي كانت سليمة. اتبدلت بواحدة جديدة، بس كده بنهدر خامات.', 'info'); replaceGasket(g); }
  else fb('gasket_good', 'ok');
  gsap.to(g.rotation, { y: 0, duration: .6 });
  camTo('fit', .8); renderFitDock();
}
function replaceGasket(g) {
  loose = loose.filter(o => o !== g);
  gsap.to(g.position, { y: 0.05, x: 0.7, duration: .7, ease: 'power2.in', onComplete: () => W.scene.remove(g) });
  S.stockDamaged = false; S.gasketInspected = false;
}
const ORIENT = ['لفوق', 'لقدّام', 'لتحت', 'لورا'];
function orientText() { return `اتجاه الفتحة: <b>${ORIENT[S.roll]}</b>${S.flipped ? ' · الوش مقلوب' : ''}${S.roll === 0 && !S.flipped ? ' ✓' : ''}`; }
function applyElbowRotation(animate = true) {
  const e = S.elbow; e.rotation.order = 'YXZ';
  const ry = S.flipped ? Math.PI : 0;
  if (animate) gsap.to(e.rotation, { x: S.rx, y: ry, duration: .45, ease: 'power2.out' }); else e.rotation.set(S.rx, ry, 0);
  const o = $('#orient'); if (o) o.innerHTML = orientText();
}
function rollElbow() { if (!S.elbow || S.elbowOn) return; S.roll = (S.roll + 1) % 4; S.rx += Math.PI / 2; sfx.slide(); applyElbowRotation(); }
function flipElbow() { if (!S.elbow || S.elbowOn) return; S.flipped = !S.flipped; sfx.slide(); applyElbowRotation(); }
function showGhost() {
  if (S.ghost) return;
  const g = elbowAssembly();
  g.traverse(o => { if (o.isMesh) { o.material = MAT.ghost; o.castShadow = false; } });
  g.position.set(DIM.gasketT, DIM.pipeY, 0); g.userData.dynamic = true; S.ghost = g; W.scene.add(g);
}
function spawnPart(kind) {
  let obj;
  if (kind === 'elbow') { obj = elbowAssembly(); S.elbow = obj; S.roll = 1; S.rx = Math.PI / 2; S.flipped = false; applyElbowRotation(false); }
  else { obj = gasket(kind === 'gasketSmall', kind === 'gasket' && S.stockDamaged); if (kind === 'gasketSmall') S.usedSmall = true; else S.gasketInspected = false; }
  obj.userData.kind = kind; obj.userData.dynamic = true;
  W.scene.add(obj); loose.push(obj); sfx.pick();
  return obj;
}
const STAGING = { gasket: new THREE.Vector3(0.32, DIM.pipeY + 0.02, 0.22), gasketSmall: new THREE.Vector3(0.32, DIM.pipeY + 0.02, 0.22), elbow: new THREE.Vector3(0.36, DIM.pipeY + 0.04, 0.3) };

// ---------- pointer ----------
function setRay(x, y) { const r = W.renderer.domElement.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, W.camera); }
function planeThrough(p) { const n = new THREE.Vector3(); W.camera.getWorldDirection(n); plane.setFromNormalAndCoplanarPoint(n.negate(), p); }
function trayDown(e) {
  const b = e.currentTarget; if (b.classList.contains('is-used') || !S) return;
  e.preventDefault(); unlockAudio();
  const kind = b.dataset.part;
  if (kind === 'gasket' && S.elbowOn) { fb('elbow_busy'); sfx.error(); return; }
  const obj = spawnPart(kind);
  obj.position.copy(STAGING[kind]);
  drag = { obj, fromTray: true, moved: false, sx: e.clientX, sy: e.clientY, off: new THREE.Vector3() };
  planeThrough(new THREE.Vector3(0.1, DIM.pipeY, 0));
  W.controls.enabled = false;
  renderFitDock();
}
addEventListener('pointermove', e => {
  if (!drag || !S) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
  if (!drag.moved) return;
  setRay(e.clientX, e.clientY);
  if (raycaster.ray.intersectPlane(plane, hit)) { drag.obj.position.copy(hit).sub(drag.off); drag.obj.position.y = Math.max(0.15, drag.obj.position.y); }
  if (S.ghost) { const dist = drag.obj.position.distanceTo(S.ghost.position); S.ghost.traverse(o => { if (o.isMesh) o.material.opacity = dist < 0.15 ? 0.32 : 0.18; }); }
});
const endDrag = () => {
  if (!drag) return;
  const d = drag; drag = null; if (W) W.controls.enabled = true;
  if (!S) return;
  if (!d.moved && d.fromTray) { gsap.fromTo(d.obj.position, { y: d.obj.position.y + 0.25 }, { y: d.obj.position.y, duration: .5, ease: 'bounce.out' }); return; }
  trySnap(d.obj);
};
addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);

function bindStagePointer() {
  const stage = $('#stage3d');
  stage.addEventListener('pointerdown', e => {
    if (!S || W.paused) return;
    unlockAudio(); setRay(e.clientX, e.clientY);
    const id = S.steps[S.step].id;
    if (id === 'clean' && !S.cleanDone) {
      const h = raycaster.intersectObject(W.dirt, false)[0];
      if (h) {
        if (S.tool !== 'brush') { fb('tool_brush_pick', 'info'); hintTool(); W.controls.enabled = false; S.noOrbit = true; return; }
        W.controls.enabled = false; S.brushing = true; S.brushHit = h.point; brushAt(h.uv);
      }
      return;
    }
    if (id === 'fit') {
      const hits = raycaster.intersectObjects(loose, true);
      if (hits.length) {
        let o = hits[0].object; while (o.parent && !loose.includes(o)) o = o.parent;
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
    const h = raycaster.intersectObject(W.dirt, false)[0]; if (h) { S.brushHit = h.point; brushAt(h.uv); }
  });
  const stop = () => { if (!S) return; if (S.noOrbit) { S.noOrbit = false; W.controls.enabled = true; } if (S.brushing) { S.brushing = false; S.lastUV = null; S.brushHit = null; W.controls.enabled = true; if (S.tool === 'brush') toolHome(); } };
  addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
}

function trySnap(obj) {
  const kind = obj.userData.kind;
  const target = new THREE.Vector3(0, DIM.pipeY, 0);
  if (kind === 'gasket' || kind === 'gasketSmall') {
    if (obj.position.distanceTo(target) > 0.14) return;
    if (kind === 'gasketSmall') {
      sfx.error(); fb('gasket_small');
      penalize('assembly', 4, 'اختيار حشية بمقاس غير متوافق (DN80)');
      gsap.to(obj.position, { y: 0.02, x: 0.6, duration: .7, ease: 'power2.in', onComplete: () => { W.scene.remove(obj); loose = loose.filter(o => o !== obj); } });
      return;
    }
    if (S.elbowOn) return;
    if (S.level !== 'easy' && !S.gasketInspected) penalize('assembly', 3, 'تركيب حشية من غير فحصها');
    loose = loose.filter(o => o !== obj);
    gsap.to(obj.position, { x: 0, y: DIM.pipeY, z: 0, duration: .35, ease: 'power2.out', onComplete: () => sfx.thunk() });
    gsap.to(obj.rotation, { y: 0, duration: .3 });
    S.gasketOn = true; S.gasketObj = obj; fb('gasket_ok', 'ok');
    if (S.ghost) gsap.to(S.ghost.position, { x: DIM.gasketT, duration: .3 });
    renderFitDock();
    return;
  }
  if (kind === 'elbow') {
    target.x = S.gasketOn ? DIM.gasketT : 0.0005;
    if (obj.position.distanceTo(target) > 0.16) return;
    if (S.flipped) { sfx.error(); fb('flip'); penalize('assembly', 3, 'محاولة تركيب الكوع بوش مقلوب'); bounceBack(obj); return; }
    if (S.roll !== 0) {
      sfx.error(); S.orientErr++; fb('orient');
      if (S.orientErr <= 3) penalize('assembly', 3, 'محاولة تركيب الكوع باتجاه مخالف للرسم');
      bounceBack(obj); return;
    }
    if (!S.gasketOn && S.mode === 'learn') { sfx.error(); fb('no_gasket', 'info'); penalize('assembly', 2, 'محاولة تركيب الكوع قبل الحشية'); bounceBack(obj); return; }
    loose = loose.filter(o => o !== obj);
    S.elbowOn = true;
    gsap.to(obj.position, { x: target.x, y: target.y, z: 0, duration: .5, ease: 'power3.out', onComplete: () => sfx.clank() });
    if (S.ghost) { W.scene.remove(S.ghost); S.ghost = null; }
    fb('elbow_ok', 'ok');
    setTimeout(nextStep, 1000);
  }
}
function bounceBack(obj) { const p = STAGING[obj.userData.kind]; gsap.to(obj.position, { x: p.x, y: p.y, z: p.z, duration: .6, ease: 'back.out(1.6)' }); }

// ---------- markers ----------
function holeWorld(i) { const v = new THREE.Vector3(); W.spoolFlange.anchors[i].getWorldPosition(v); return v; }
function addMarker(i, pos, tex) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.setScalar(0.042); sp.position.copy(pos); sp.renderOrder = 10;
  const hb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hb.position.copy(pos); hb.userData.index = i;
  sp.userData = { hitbox: hb, index: i, dynamic: true }; hb.userData.dynamic = true;
  W.scene.add(sp, hb); S.markers.push(sp); S.pulse.push(sp);
}
function clearMarkers() { if (!S) return; S.markers.forEach(m => W.scene.remove(m, m.userData.hitbox)); S.markers = []; S.pulse = []; }

// ---------- 4: bolts ----------
function stepBolts() {
  camTo('bolts');
  if (!S.studs.filter(Boolean).length) S.studs = new Array(8).fill(null);
  for (let i = 0; i < 8; i++) if (!S.studs[i]) { const p = holeWorld(i); p.x = 0.05; addMarker(i, p, ringBlue); }
  const n = S.studs.filter(Boolean).length;
  dock(`<div class="progress"><span class="mono" id="boltCount">${n} / 8</span><div class="meter"><i id="boltBar" style="width:${n / 8 * 100}%"></i></div></div>`, 'اضغط على كل خرم منوّر علشان تركّب المسمار والصواميل باليد');
  if (n === 8) setTimeout(nextStep, 600);
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

// ---------- 5: torque ----------
const STAR = [0, 4, 2, 6, 1, 5, 3, 7];
function starCandidates(seq) {
  if (!seq.length) return null;
  const s = seq[0], out = [];
  [1, -1].forEach(dir => { const c = STAR.map(o => ((s + dir * o) % 8 + 8) % 8); if (seq.every((v, i) => c[i] === v)) out.push(c); });
  return out;
}
async function stepTorque() {
  camTo('front');
  S.torqueSeq = []; S.tight = new Array(8).fill(false); S.tool = null; S.busy = false; S.wq = [];
  if (!S.torqueVal) await chooseTorque();
  if (!S) return;
  S.passes = S.level === 'pro' ? 2 : 1; S.pass = 1;
  for (let i = 0; i < 8; i++) { const p = holeWorld(i); p.x = 0.06; addMarker(i, p, ringAmber); }
  renderTorqueDock();
  bindToolTiles('torque', 'bolting');
}
function renderTorqueDock() {
  const passTxt = S.passes > 1 ? `<span class="pill">المرحلة ${S.pass} من ${S.passes} · ${S.pass === 1 ? '50%' : '100%'} من العزم</span>` : '';
  dock(toolTiles('torque') + `<div class="actions">${passTxt}<span class="pill mono" dir="ltr">${S.torqueVal} N·m</span></div><div class="progress"><span class="mono" id="tqCount">0 / 8</span><div class="meter"><i id="tqBar" style="width:0%"></i></div></div>`, 'التقط المفتاح المناسب، وبعدين اضغط على كل صامولة · الترتيب مهم');
}
async function chooseTorque() {
  extra(`<div class="spec"><b>جدول عزم ربط المسامير</b><small>قيم تدريبية توضيحية · حشية ألياف مضغوطة</small><table><thead><tr><th>المسمار</th><th>العزم N·m</th></tr></thead><tbody>${TORQUE_TABLE.map(([m, v]) => `<tr><td dir="ltr">${m}</td><td class="mono" dir="ltr">${v}</td></tr>`).join('')}</tbody></table><small>مسامير الوصلة دي: <b dir="ltr">M16</b></small></div>`);
  say('torque_select');
  const r = await ask('اضبط مفتاح العزم على كام؟', shuffle(TORQUE_TABLE.map(([, v]) => ({ t: `${v} N·m`, v }))));
  if (!S) return;
  S.torqueVal = r.v;
  if (r.v !== TORQUE_OK) {
    penalize('bolting', 6, `ضبط مفتاح العزم على ${r.v} N·m بدل ${TORQUE_OK} N·m`);
    if (S.mode === 'learn') { fb(r.v < TORQUE_OK ? 'torque_low' : 'torque_high', 'info'); S.torqueVal = TORQUE_OK; }
  } else fb('torque_right', 'ok');
}
function wrenchOn(st, done) {
  const o = S.toolObj, nut = st.userData.front;
  const p = new THREE.Vector3(st.position.x + nut.position.x + 0.008, st.position.y, st.position.z);
  const th = Math.atan2(st.position.z, st.position.y - DIM.pipeY);
  S.busy = true;
  const tl = gsap.timeline({ onComplete: () => { S && (S.busy = false); done && done(); } });
  tl.to(o.position, { x: p.x, y: p.y, z: p.z, duration: .4, ease: 'power2.out' }, 0).to(o.rotation, { x: th, y: 0, z: 0, duration: .4 }, 0);
  const swings = S.pass === 1 && S.passes > 1 ? 1 : 2;
  for (let k = 0; k < swings; k++) {
    tl.add(() => sfx.ratchet(4)).to(o.rotation, { x: th - 0.75, duration: .3, ease: 'power1.inOut' }).to(nut.rotation, { x: `+=${Math.PI * 0.8}`, duration: .3 }, '<').to(o.rotation, { x: th, duration: .18 });
  }
  tl.add(() => sfx.clank()).to(nut.position, { x: nut.position.x - 0.0012, duration: .2 }, '<');
  const [rest, ry] = TOOL_REST.twrench;
  tl.to(o.position, { x: rest.x, y: rest.y, z: rest.z, duration: .35, ease: 'power2.inOut' }).to(o.rotation, { x: 0, y: ry, duration: .35 }, '<');
}
function runWrenchQueue() {
  if (!S || S.busy || !S.wq.length) return;
  const i = S.wq.shift();
  wrenchOn(S.studs[i], () => { if (!S) return; if (S.wq.length) runWrenchQueue(); else if (S.torqueSeq.length === 8) passDone(); });
}
function tightenNut(i) {
  if (S.tight[i]) return;
  S.wq = S.wq || [];
  if (S.tool !== 'twrench') { fb('tool_wrench_pick', 'info'); hintTool(); return; }
  const seq = [...S.torqueSeq, i];
  if (S.mode === 'learn' && !starCandidates(seq).length) {
    sfx.error();
    const next = starCandidates(S.torqueSeq)[0][S.torqueSeq.length];
    fb(S.torqueSeq.length === 1 ? 'torque_opposite' : 'torque_next', 'info');
    penalize('bolting', 2, 'محاولة ربط مسمار خارج التتابع النجمي');
    highlightNext([next]); return;
  }
  S.torqueSeq = seq; S.tight[i] = true;
  const n = S.torqueSeq.length;
  S.wq.push(i); runWrenchQueue();
  const m = S.markers.find(x => x.userData.index === i); if (m) { m.material.map = ringMint; S.pulse = S.pulse.filter(x => x !== m); m.material.opacity = 1; }
  S.markers.forEach(x => { if (!S.tight[x.userData.index]) x.material.map = ringAmber; });
  if (S.mode === 'learn' && n < 8) highlightNext(starCandidates(S.torqueSeq).map(x => x[n]));
  $('#tqCount').textContent = `${n} / 8`; $('#tqBar').style.width = (n / 8 * 100) + '%';
}
function passDone() {
  S.allSeqs.push(S.torqueSeq);
  if (!starCandidates(S.torqueSeq).length) { penalize('bolting', 6, `ترتيب الربط في المرحلة ${S.pass} لم يكن نجمياً`); S.orderBad = true; }
  if (S.pass < S.passes) {
    S.pass++; S.torqueSeq = []; S.tight = new Array(8).fill(false);
    S.markers.forEach(x => { x.material.map = ringAmber; if (!S.pulse.includes(x)) S.pulse.push(x); });
    say('torque_pass2'); renderTorqueDock(); $$('[data-tool="twrench"]').forEach(b => b.classList.add('is-picked'));
    return;
  }
  dropTool(); setTimeout(nextStep, 500);
}
function highlightNext(list) { S.markers.forEach(x => { const k = x.userData.index; if (!S.tight[k]) x.material.map = list.includes(k) ? ringBlue : ringAmber; }); }

// ---------- 6: hydrostatic test + diagnosis ----------
/** Returns the leak cause for the current joint, or null when it should hold. */
function leakCause() {
  if (!S.gasketOn) return 'none';
  if (S.gasketObj?.userData.damaged) return 'damaged';
  if (S.flags?.missedScratch && !S.scratchFixed) return 'scratch';
  if (S.torqueVal > TORQUE_OK) return 'high';
  if (S.torqueVal < TORQUE_OK) return 'low';
  if (S.orderBad && S.level === 'pro') return 'order';
  return null;
}
const CAUSES = {
  none: { t: 'الوصلة اتقفلت من غير حشية', cap: .26, fixTo: 'fit', pts: ['assembly', 10] },
  damaged: { t: 'الحشية اللي اتركبت تالفة', cap: .55, fixTo: 'fit', pts: ['assembly', 6] },
  scratch: { t: 'خدش عرضي في وجه الفلانشة', cap: .7, fixTo: 'fit', pts: ['prep', 4] },
  high: { t: 'عزم ربط زيادة كسر الحشية', cap: .6, fixTo: 'fit', pts: ['bolting', 6] },
  low: { t: 'عزم الربط أقل من المطلوب', cap: .85, fixTo: 'torque', pts: ['bolting', 6] },
  order: { t: 'ترتيب ربط غلط وضغط غير متساوي', cap: .93, fixTo: 'torque', pts: ['bolting', 4] },
};
function gaugeSVG(max) {
  let ticks = '';
  const step = max <= 16 ? 2 : 5;
  for (let v = 0; v <= max; v += step) { const a = (-135 + v / max * 270) * Math.PI / 180; ticks += `<line x1="${60 + Math.sin(a) * 40}" y1="${60 - Math.cos(a) * 40}" x2="${60 + Math.sin(a) * 47}" y2="${60 - Math.cos(a) * 47}" stroke="#A3B5DA" stroke-width="2"/><text x="${60 + Math.sin(a) * 31}" y="${64 - Math.cos(a) * 31}" font-size="8" fill="#A3B5DA" text-anchor="middle" font-family="JetBrains Mono">${v}</text>`; }
  const t0 = (-135 + S.scenario.target / max * 270) * Math.PI / 180;
  return `<div class="gauge"><svg viewBox="0 0 120 120" role="img" aria-label="مانومتر الضغط"><circle cx="60" cy="60" r="54" fill="#081430" stroke="#22396E" stroke-width="3"/>
    <path d="M${60 + Math.sin(t0) * 50} ${60 - Math.cos(t0) * 50} A50 50 0 0 1 ${60 + Math.sin(135 * Math.PI / 180) * 50} ${60 - Math.cos(135 * Math.PI / 180) * 50}" stroke="#FF4D57" stroke-width="4" fill="none"/>
    ${ticks}<g id="needle" style="transform-origin:60px 60px;transform:rotate(-135deg)"><path d="M58 60 L60 16 L62 60 Z" fill="#FFC23D"/></g><circle cx="60" cy="60" r="6" fill="#EEF3FF"/>
    <text x="60" y="92" font-size="8" fill="#A3B5DA" text-anchor="middle" font-family="JetBrains Mono">bar</text></svg>
    <div><b id="pVal" dir="ltr">0.0 bar</b><small id="pState">ضغط الاختبار: <span dir="ltr">${S.scenario.target} bar</span></small></div></div>`;
}
function stepTest() {
  camTo('test');
  S.gaugeMax = S.scenario.target <= 10 ? 16 : 25;
  extra(gaugeSVG(S.gaugeMax));
  S.p = 0; S.hold = false; S.leakT = 0; S.watch = 0; S.testOver = false; S.cause = leakCause();
  leak.arc = S.cause === 'none' ? null : Math.random() * Math.PI * 2;
  dock(`<button class="holdbtn" id="pump"><i></i><span>اضغط مع الاستمرار: تشغيل المضخة</span></button>`, `ارفع الضغط لحد ${S.scenario.target} bar وراقب الوصلة`);
  const pump = $('#pump');
  const on = e => { e.preventDefault(); unlockAudio(); S.hold = true; pump.setPointerCapture?.(e.pointerId); };
  const off = () => { if (S) S.hold = false; };
  pump.addEventListener('pointerdown', on); pump.addEventListener('pointerup', off); pump.addEventListener('pointercancel', off); pump.addEventListener('lostpointercapture', off);
}
let pumpTick = 0;
function tickTest(dt) {
  if (!S || S.steps[S.step]?.id !== 'test' || S.testOver || S.p === undefined) return;
  const T = S.scenario.target, cause = S.cause, cap = cause ? CAUSES[cause].cap * T : T;
  if (S.hold) {
    S.p += dt * (S.p < cap ? T / 3.2 : 0.06);
    pumpTick += dt; if (pumpTick > 0.32) { pumpTick = 0; sfx.pump(); }
  } else if (cause) S.p = Math.max(0, S.p - dt * T * 0.08);
  S.p = Math.min(S.p, T);
  const leaking = cause && S.p > cap * 0.75;
  if (leaking) { leak.level = Math.min(1, cause === 'none' ? (S.p / cap) : 0.25 + 0.5 * (S.p / T)); if (cause === 'order' || cause === 'low') leak.level *= .45; S.leakT += S.hold ? dt : 0; }
  else leak.level = Math.max(0, leak.level - dt);
  leakSound(leak.level);
  const fill = $('#pump i'); if (fill) fill.style.width = (S.p / T * 100) + '%';
  const nd = $('#needle'); if (nd) nd.style.transform = `rotate(${-135 + S.p / S.gaugeMax * 270}deg)`;
  const pv = $('#pVal'); if (pv) pv.textContent = S.p.toFixed(1) + ' bar';
  if (cause && S.leakT > 2.6) return testFail();
  if (!cause && S.p >= T) {
    S.watch += dt; const left = Math.max(0, 4 - S.watch);
    $('#pState').textContent = `مراقبة ثبات الضغط… ${left.toFixed(1)} ث`;
    if (S.watch >= 4) testPass();
  }
}
async function testFail() {
  S.testOver = true; S.hold = false; S.testFails++;
  sfx.error(); toast('تسريب عند الوصلة! الضغط مش بيثبت.', 'err');
  $('#pState').textContent = 'فشل: تسريب';
  const truth = S.cause, C = CAUSES[truth];
  if (S.testFails === 1) penalize('testing', 8, 'فشل اختبار الضغط: تسريب عند الوصلة');
  penalize(C.pts[0], C.pts[1], C.t);
  say('diag_ask');
  const pool = shuffle(Object.keys(CAUSES).filter(k => k !== truth)).slice(0, 3).concat(truth);
  const r = await ask('شخّص المشكلة: إيه سبب التسريب؟', shuffle(pool).map(k => ({ t: CAUSES[k].t, v: k })));
  if (!S) return;
  if (r.v === truth) { fb('diag_ok', 'ok'); S.flags.diagnosed = true; }
  else { penalize('testing', 4, 'تشخيص خاطئ لسبب التسريب'); toast(`التشخيص الصحيح: ${C.t}.`, 'info', 6000); playLineSafe('diag_wrong'); }
  leak.level = 0; leakSound(0);
  dock(`<button class="btn btn--amber btn--xl" id="fixJoint">${I.wrench}${C.fixTo === 'torque' ? 'أعد ضبط العزم واربط تاني' : 'فك الوصلة وصلّح'}</button>`, 'صلّح السبب الحقيقي وأعد الاختبار');
  $('#fixJoint').addEventListener('click', () => repair(truth));
}
function playLineSafe(id) { try { say(id); } catch { /* optional line */ } }
function repair(cause) {
  sfx.ratchet(8);
  extra('');
  if (CAUSES[cause].fixTo === 'torque') {
    S.torqueVal = S.level === 'easy' ? TORQUE_OK : null; S.orderBad = false;
    S.studs.forEach(st => st && gsap.to(st.userData.front.rotation, { x: `-=${Math.PI * 2}`, duration: .6 }));
    S.p = undefined;
    setTimeout(() => enterStep(S.steps.findIndex(s => s.id === 'torque')), 900);
    return;
  }
  // full disassembly
  S.studs.forEach((st, k) => st && gsap.to(st.position, { x: 0.5, y: st.position.y + 0.05, duration: .6, delay: k * 0.05, onComplete: () => W.scene.remove(st) }));
  S.studs = []; S.tight = []; S.torqueSeq = []; S.orderBad = false;
  if (cause === 'scratch') { S.scratchFixed = true; gsap.to(W.scratch.scale, { x: 0.01, duration: 1, delay: .6, onComplete: () => (W.scratch.visible = false) }); }
  if (S.gasketObj && (cause === 'damaged' || cause === 'high')) { const g = S.gasketObj; gsap.to(g.position, { x: 0.7, y: 0.05, duration: .8, delay: .9, onComplete: () => W.scene.remove(g) }); S.gasketOn = false; S.gasketObj = null; S.stockDamaged = false; }
  if (cause === 'high') S.torqueVal = S.level === 'easy' ? TORQUE_OK : null;
  const e = S.elbow; S.elbowOn = false; loose.push(e);
  gsap.to(e.position, { ...STAGING.elbow, duration: .8, delay: .4, ease: 'power2.inOut' });
  S.p = undefined;
  setTimeout(() => enterStep(S.steps.findIndex(s => s.id === 'fit')), 1400);
}
function testPass() {
  S.testOver = true; S.hold = false; leak.level = 0; leakSound(0);
  $('#pState').textContent = 'ناجح: الضغط ثابت ولا يوجد تسريب';
  sfx.win(); fb('pass', 'ok'); burst();
  setTimeout(() => {
    if (!S) return;
    const badges = [SES.ded.safety === 0 && 'safety', S.testFails === 0 && 'noleak', SES.ded.bolting === 0 && 'star', SES.ded.prep === 0 && S.level !== 'easy' && 'inspector'];
    const tips = [];
    if (SES.ded.bolting) tips.push('راجع جدول العزم قبل ما تضبط المفتاح، واربط بالتتابع النجمي في كل مرحلة.');
    if (SES.ded.assembly) tips.push('افحص الحشية قبل التركيب واتأكد من المقاس واتجاه الكوع من الرسم.');
    if (SES.ded.prep) tips.push('بعد التنظيف بص على تحزيز الوجه: أي خدش عرضي لازم يتبلّغ قبل التجميع.');
    if (SES.ded.safety) tips.push('مهمات الوقاية الأربعة قبل أي شغل، ومن غير ساعات أو لبس واسع.');
    renderResult(flangeStation, { badges, tips });
  }, 2200);
}

export const __dbg = () => ({ W, S, enterStep });

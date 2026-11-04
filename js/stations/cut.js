// Station: cutting, deburring and bevelling a DN50 pipe (3D). Rotate the cutter by dragging around the pipe; control the feed.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { sfx, unlockAudio } from '../audio.js';
import { $, $$, gsap, I, renderResult, shuffle, SES } from '../ui.js';
import { createWorker } from '../worker3d.js';
import { ITEMS } from '../tools3d.js';
import { openWork, closeWork, workSteps, wsay, wreplay, wmsg, wpenalize, body, choose } from '../work.js';

const OD = 0.0603, WALL = 3.91, ID = OD - 2 * WALL / 1000, CUT_X = 0.2, FEED = 0.36;   // DN50 Sch40 — mm for wall/feed
const STEPS = ['مهمات الوقاية', 'تثبيت الماسورة', 'القطع بالقطاعة', 'إزالة الرايش', 'تجهيز الشطفة', 'الفحص'];
const ICON = {
  goggles: '<svg viewBox="0 0 48 48"><rect x="5" y="17" width="16" height="13" rx="5"/><rect x="27" y="17" width="16" height="13" rx="5"/><path d="M21 23h6"/></svg>',
  gloves: '<svg viewBox="0 0 48 48"><path d="M16 42V22l-4-6a2.5 2.5 0 0 1 4-3l4 5V8a2.5 2.5 0 0 1 5 0v11-13a2.5 2.5 0 0 1 5 0v13-10a2.5 2.5 0 0 1 5 0v18c0 6-3 10-6 13v5z"/></svg>',
  shield: '<svg viewBox="0 0 48 48"><path d="M10 10h28v6c0 12-6 22-14 26-8-4-14-14-14-26z"/><path d="M10 16h28"/></svg>',
  ear: '<svg viewBox="0 0 48 48"><path d="M16 30c-4 0-6-3-6-7s3-7 7-7 6 4 6 7"/><path d="M38 30c4 0 6-3 6-7s-3-7-7-7-6 4-6 7"/><path d="M16 30c0 6 4 10 8 10s8-4 8-10"/></svg>',
  watch: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9"/><path d="M24 19v5l3 3M19 16l1-10h8l1 10M19 32l1 10h8l1-10"/></svg>',
  scarf: '<svg viewBox="0 0 48 48"><path d="M10 10c8 4 20 4 28 0v8c-8 4-20 4-28 0z"/><path d="M28 19l4 22-6-3-4 4-2-22"/></svg>',
};
let S = null, V = null, WK = null;
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const rot = (m, x, y, z) => { m.rotation.set(x, y, z); return m; };

// ---------------- 3D scene ----------------
function lathe(pts, seg = 64, mat) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat); }
function hollowPipe(x0, x1, mat, inner) {
  const g = new THREE.Group(), ro = OD / 2, ri = ID / 2;
  const o = lathe([[ri, x0], [ro, x0], [ro, x1], [ri, x1]], 64, mat); g.add(o);
  const i = lathe([[ri, x0], [ri, x1]], 48, inner); g.add(i);
  g.rotation.z = -Math.PI / 2; return g;   // lathe axis Y → world +X
}
function buildScene(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1222); scene.fog = new THREE.Fog(0x0a1222, 2, 7);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 30);
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a2440, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(1.5, 2.5, 1.8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const steel = new THREE.MeshStandardMaterial({ color: 0xbfc6ce, metalness: 0.8, roughness: 0.35 });
  const inner = new THREE.MeshStandardMaterial({ color: 0x353a42, metalness: 0.6, roughness: 0.6, side: THREE.BackSide });
  const paint = new THREE.MeshStandardMaterial({ color: 0x1f5fd1, metalness: 0.3, roughness: 0.5 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc62a2f, metalness: 0.3, roughness: 0.45 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe1e6eb, metalness: 1, roughness: 0.15 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 });
  // bench + yoke pipe vise
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.6), wood); bench.position.set(-0.1, -0.16, 0); bench.receiveShadow = true; scene.add(bench);
  const vise = new THREE.Group();
  vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.16), paint), 0, -0.12, 0));
  [-1, 1].forEach(k => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), paint); p.position.set(0, -0.03, k * 0.06); vise.add(p); });
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.16), paint); yoke.position.y = 0.065; vise.add(yoke);
  // the screw, its T-handle and the upper jaw travel together; the student turns the handle by hand
  const grip = new THREE.MeshStandardMaterial({ color: 0xffc23d, metalness: 0.2, roughness: 0.45, emissive: 0x6a4300, emissiveIntensity: 0 });
  const screwG = new THREE.Group(); vise.add(screwG);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 16), chrome); thread.position.y = 0.115; screwG.add(thread);
  for (let k = 0; k < 14; k++) screwG.add(at(rot(new THREE.Mesh(new THREE.TorusGeometry(0.0083, 0.0011, 4, 16), chrome), Math.PI / 2, 0, 0), 0, 0.06 + k * 0.008, 0));
  const handle = new THREE.Group(); handle.position.y = 0.185; screwG.add(handle);
  handle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.02, 20), chrome));
  handle.add(rot(new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.2, 14), chrome), Math.PI / 2, 0, 0));
  [-1, 1].forEach(k => { handle.add(at(rot(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.045, 16), grip), Math.PI / 2, 0, 0), 0, 0, k * 0.085)); handle.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 10), grip), 0, 0, k * 0.108)); });
  const handleHit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), new THREE.MeshBasicMaterial({ visible: false })); handle.add(handleHit);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.07), chrome); jaw.position.y = OD / 2 + 0.008 + 0.02; screwG.add(jaw);
  jaw.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.07), new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: .7, roughness: .7 })), 0, -0.009, 0));
  vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.07), chrome), 0, -OD / 2 - 0.008, 0));
  vise.position.x = -0.12; scene.add(vise);
  // pipe (two parts so the off-cut can fall away)
  const keep = hollowPipe(-0.42, CUT_X, steel, inner); scene.add(keep);
  const off = hollowPipe(CUT_X, CUT_X + 0.18, steel, inner); scene.add(off);
  keep.traverse(o => { if (o.isMesh) o.castShadow = true; }); off.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const mark = new THREE.Mesh(new THREE.TorusGeometry(OD / 2 + 0.0004, 0.0009, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff4d57 })); mark.rotation.y = Math.PI / 2; mark.position.x = CUT_X; scene.add(mark);
  const groove = new THREE.Mesh(new THREE.TorusGeometry(OD / 2, 0.0004, 8, 64), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 1 })); groove.rotation.y = Math.PI / 2; groove.position.x = CUT_X; scene.add(groove);
  const burr = new THREE.Mesh(new THREE.TorusGeometry(ID / 2 - 0.0012, 0.0016, 8, 48), new THREE.MeshStandardMaterial({ color: 0x8e969f, metalness: 0.9, roughness: 0.5 })); burr.rotation.y = Math.PI / 2; burr.position.x = CUT_X - 0.001; burr.visible = false; scene.add(burr);
  // pipe cutter around the mark — the same detailed model as the tools library, fitted to this pipe
  const cutter = new THREE.Group();
  const frame = ITEMS.find(i => i.id === 'cutter').build();
  frame.remove(frame.children[frame.children.length - 1]);          // drop the library's demo pipe
  frame.rotation.y = Math.PI / 2; frame.position.y = 0.016 + 0.0002;  // library pipe axis (y = -0.016, along z) → world X axis
  frame.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const wheel = frame.children[4];
  // feed knob (rubber T-handle on the feed screw) — the student turns it a quarter turn by hand
  const knob = frame.children[6];
  const knobMat = knob.material.clone(); knobMat.emissive = new THREE.Color(0x6a4300); knobMat.emissiveIntensity = 0; knob.material = knobMat;
  const tick = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.064, 0.004), new THREE.MeshBasicMaterial({ color: 0xffc23d })); tick.position.set(0, 0, 0.0135); knob.add(tick);
  const knobHit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); knob.add(knobHit);
  cutter.add(frame); cutter.position.x = CUT_X; scene.add(cutter);
  // reamer + grinder (shown later)
  const reamer = new THREE.Group();
  reamer.add(rot(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 6), chrome), 0, 0, Math.PI / 2));
  const rh = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 12), red); rh.rotation.z = Math.PI / 2; rh.position.x = 0.1; reamer.add(rh);
  reamer.position.set(CUT_X + 0.25, 0, 0); reamer.visible = false; scene.add(reamer);
  // sparks
  const N = 220, sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-9), 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffb347, size: 0.006, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sparks.frustumCulled = false; scene.add(sparks);
  const sv = new Float32Array(N * 3), sl = new Float32Array(N); let si = 0, spark = 0;

  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  let running = true, last = performance.now();
  const setCam = (p, t, d = 1) => { gsap.to(camera.position, { x: p[0], y: p[1], z: p[2], duration: d, ease: 'power2.inOut', onUpdate: () => camera.lookAt(...t) }); V.look = t; };
  camera.position.set(0.55, 0.28, 0.5); camera.lookAt(0.05, 0, 0);
  const loop = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (V.look) camera.lookAt(...V.look);
    const a = sg.attributes.position.array;
    for (let k = 0; k < spark; k++) { const i = si = (si + 1) % N; a[i * 3] = CUT_X + 0.004; const t = Math.random() * Math.PI * 2; a[i * 3 + 1] = Math.cos(t) * OD / 2; a[i * 3 + 2] = Math.sin(t) * OD / 2; sv[i * 3] = 0.3 + Math.random() * 0.6; sv[i * 3 + 1] = Math.cos(t) * (0.4 + Math.random()); sv[i * 3 + 2] = Math.sin(t) * (0.4 + Math.random()); sl[i] = 0.5; }
    for (let i = 0; i < N; i++) { if (sl[i] <= 0) { a[i * 3 + 1] = -9; continue; } sl[i] -= dt; sv[i * 3 + 1] -= 6 * dt; a[i * 3] += sv[i * 3] * dt; a[i * 3 + 1] += sv[i * 3 + 1] * dt; a[i * 3 + 2] += sv[i * 3 + 2] * dt; }
    sg.attributes.position.needsUpdate = true;
    renderer.render(scene, camera); requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop); setTimeout(resize, 30);
  V = { renderer, scene, camera, setCam, keep, off, mark, groove, burr, cutter, wheel, knob, knobHit, knobMat, reamer, jaw, screwG, handle, handleHit, grip, setSpark: n => (spark = n), stop() { running = false; renderer.dispose(); }, dom: renderer.domElement };
  return V;
}

/** Drag in a circle around the pipe's on-screen centre; calls onTurn(deltaRadians). Returns an unbind function. */
function circleDrag(onTurn) {
  const el = V.dom; let prev = null;
  const centre = () => { const p = new THREE.Vector3(CUT_X, 0, 0).project(V.camera), r = el.getBoundingClientRect(); return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; };
  const ang = e => { const [cx, cy] = centre(); return Math.atan2(e.clientY - cy, e.clientX - cx); };
  const down = e => { unlockAudio(); prev = ang(e); el.setPointerCapture(e.pointerId); };
  const move = e => { if (prev == null) return; const a = ang(e); let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; prev = a; onTurn(d); };
  const up = () => { prev = null; };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
}
/** Grab a 3D part and turn it: pointer must start on `hit` (or within 70px of it); the twist is measured around `centre()` on screen. */
const ray = new THREE.Raycaster();
function grabTurn(hit, centreW, onTurn, onMiss) {
  const el = V.dom; let prev = null;
  const scr = (w) => { const p = w.clone().project(V.camera), r = el.getBoundingClientRect(); return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; };
  const ang = e => { const [cx, cy] = scr(centreW()); return Math.atan2(e.clientY - cy, e.clientX - cx); };
  const onPart = e => {
    const r = el.getBoundingClientRect(); ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, V.camera);
    if (ray.intersectObject(hit, false).length) return true;
    const [hx, hy] = scr(hit.getWorldPosition(new THREE.Vector3())); return Math.hypot(e.clientX - hx, e.clientY - hy) < 70;
  };
  const down = e => { unlockAudio(); if (!onPart(e)) { onMiss && onMiss(e); return; } e.stopImmediatePropagation(); prev = ang(e); el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; };
  const move = e => { if (prev == null) return; e.stopImmediatePropagation(); const a = ang(e); let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; prev = a; onTurn(d); };
  const up = () => { prev = null; el.style.cursor = ''; };
  el.addEventListener('pointerdown', down, true); el.addEventListener('pointermove', move, true); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return { active: () => prev != null, off() { el.removeEventListener('pointerdown', down, true); el.removeEventListener('pointermove', move, true); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); } };
}
const glow = (mat, on) => { gsap.killTweensOf(mat); if (on) gsap.fromTo(mat, { emissiveIntensity: 0 }, { emissiveIntensity: 1.4, duration: .7, repeat: -1, yoyo: true }); else mat.emissiveIntensity = 0; };
const hint = t => { const h = $('#wkView .wk__hint'); if (h) h.textContent = t; };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function ask(q, opts, cat, pts = 4) {
  let first = true;
  for (;;) {
    const r = await choose(q, shuffle(opts)); if (!S) return null;
    if (r.ok) { sfx.ok(); r.el.classList.add('is-right'); wmsg(r.why, 'ok', 4000); await wait(1500); return r; }
    sfx.error(); r.el.classList.add('is-wrong'); wmsg(r.why, 'info', 5200); wpenalize(cat, first ? pts : Math.ceil(pts / 2), 'إجابة خاطئة: ' + q.replace(/<[^>]+>/g, '')); first = false; await wait(1400);
  }
}

// ---------------- tasks ----------------
async function taskPPE() {
  workSteps(STEPS, 0); wsay('cut_ppe');
  const items = [['goggles', 'نظارة واقية', 1], ['gloves', 'قفاز عمل', 1], ['shield', 'واقي وجه', 1], ['ear', 'واقي أذن', 1], ['watch', 'ساعة وخاتم', 0], ['scarf', 'كوفية طويلة', 0]];
  const OK = items.filter(i => i[2]);
  await new Promise(res => {
    body(`<div class="worker"><b class="worker__title">المتدرب · شوف كل حاجة بيلبسها</b><div class="worker__stage" id="cutWorker"></div>
      <ul class="worker__list">${OK.map(([k, t]) => `<li data-slot="${k}">${ICON[k]}<span>${t}</span></li>`).join('')}</ul></div>
      <p class="wk__q">الشغل فيه قطع وتجليخ بالصاروخ. اختار مهمات الوقاية المناسبة (4 حاجات).</p><div class="dock__row">${shuffle(items).map(([k, t]) => `<button class="tile" data-k="${k}">${ICON[k]}<span>${t}</span></button>`).join('')}</div>`);
    if (WK) WK.stop();
    WK = createWorker($('#cutWorker'), null); WK.start();
    let n = 0;
    $$('#wkBody [data-k]').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('is-picked') || b.classList.contains('is-used')) return;
      const it = items.find(i => i[0] === b.dataset.k);
      if (it[2]) {
        b.classList.add('is-picked'); sfx.wear(); WK.equip(it[0]);
        const li = $(`#wkBody [data-slot="${it[0]}"]`); li.classList.add('is-on'); gsap.fromTo(li, { scale: .8 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
        if (++n === 4) { wmsg('تمام. الصاروخ بيطلّع شرر ورايش، وصوته عالي: الوجه والعين والودن لازم يكونوا محميين.', 'ok', 3500); setTimeout(() => { if (WK) { WK.stop(); WK = null; } res(); }, 2600); }
      } else { b.classList.add('is-wrong', 'is-used'); sfx.error(); WK.wrong(it[0]); wpenalize('safety', 5, 'اختيار غير آمن: ' + it[1]); wmsg(it[0] === 'watch' ? 'الساعة والخاتم ممكن يتشبكوا في العدة الدوّارة.' : 'اللبس الواسع ممكن يتلف في الصاروخ.', 'err'); }
    }));
  });
}
async function taskClamp() {
  workSteps(STEPS, 1); wsay('cut_clamp');
  V.setCam([0.3, 0.34, 0.36], [-0.11, 0.06, 0]);
  hint('امسك يد المنجلة الصفرا ولفّها في اتجاه عقارب الساعة');
  glow(V.grip, true);
  let t = 0, lastQ = 0;              // t = turns of the handle; jaw meets the pipe at CONTACT
  const CONTACT = 3, GOOD = [3.6, 4.6], MAXT = 6;
  await new Promise(res => {
    body(`<p class="wk__q">ثبّت الماسورة في منجلة المواسير <b>بإيدك</b>: امسك يد المنجلة في المجسم ولفّها مع عقارب الساعة لحد ما الماسورة تتمسك كويس من غير ما تتفلطح. عكس عقارب الساعة بيفك.</p>
      <div class="progress"><span class="mono" id="clT" dir="ltr">0.0</span><div class="meter meter--zone"><i id="clBar" style="width:0%"></i></div></div><p class="muted" id="clState">الفك العلوي لسه بعيد عن الماسورة</p>
      <div class="actions"><button class="btn btn--primary" id="clGo">كفاية — ابدأ القطع</button></div>`);
    const upd = () => {
      $('#clT').textContent = t.toFixed(1) + (S.mode === 'learn' ? ' لفة' : ''); $('#clBar').style.width = Math.min(100, t / MAXT * 100) + '%';
      $('#clState').textContent = t < CONTACT ? 'الفك العلوي نازل… لسه مالمسش الماسورة' : t < GOOD[0] ? 'الفك لمس الماسورة — لسه بتلف في الفكوك' : t <= GOOD[1] ? 'مربوطة كويس ✓' : 'زيادة! الفكوك بتعلّم وتفلطح الماسورة';
      V.screwG.position.y = -Math.min(t, CONTACT) / CONTACT * 0.02 - Math.max(0, t - CONTACT) * 0.0006;
      V.handle.rotation.y = -t * Math.PI * 2;
    };
    const g = grabTurn(V.handleHit, () => V.handle.getWorldPosition(new THREE.Vector3()), d => {
      // after contact the screw gets stiff: same hand motion turns it less
      const k = t >= CONTACT ? 0.45 : 1;
      t = Math.max(0, Math.min(MAXT, t + d / (Math.PI * 2) * k));
      const q = Math.floor(t * 4); if (q !== lastQ) { lastQ = q; t >= CONTACT ? sfx.ratchet(1) : sfx.tap(); if (Math.abs(t - CONTACT) < 0.15) sfx.clank(); }
      upd();
    }, () => wmsg('امسك يد المنجلة نفسها (الجزء الأصفر فوق) ولفّ.', 'info', 2500));
    $('#clGo').addEventListener('click', () => {
      if (t < GOOD[0]) { sfx.error(); wpenalize('cutting', 5, 'بدء القطع والماسورة غير مثبتة'); wmsg(t < CONTACT ? 'الفك لسه مالمسش الماسورة! كمّل لف اليد.' : 'الماسورة لسه بتلف مع القطاعة! اربط أكتر شوية.', 'err'); gsap.fromTo(V.keep.rotation, { x: 0 }, { x: 0.25, duration: .15, yoyo: true, repeat: 3 }); return; }
      if (t > GOOD[1]) { wpenalize('cutting', 4, 'ربط المنجلة زيادة وتعليم الماسورة'); wmsg('الماسورة اتعلّمت من الفكوك. اربط لحد ما تتمسك بس.', 'info'); }
      else wmsg('تثبيت مظبوط.', 'ok', 2000);
      g.off(); glow(V.grip, false); sfx.clank(); res();
    });
    upd();
  });
}
async function taskCut() {
  workSteps(STEPS, 2); wsay(S.mode === 'learn' ? 'cut_learn' : 'cut_test');
  V.setCam([0.6, 0.32, 0.42], [CUT_X - 0.02, 0.07, 0]);
  hint('لف المقبض الأحمر فوق القطاعة ربع لفة · واسحب في دايرة حوالين الماسورة علشان تلف القطاعة');
  glow(V.knobMat, true);
  let depth = 0, pending = 0, turn = 0, jam = false, overFeeds = 0, idle = 0, knobQ = 0, contact = false;
  await new Promise(res => {
    body(`<p class="wk__q">1) لف <b>مفتاح التغذية</b> (المقبض الأحمر فوق القطاعة في المجسم) ربع لفة مع عقارب الساعة.<br>2) اسحب في دايرة حوالين الماسورة علشان تلف القطاعة لفة كاملة.<br>كرّر لحد ما الماسورة تتقطع. عكس عقارب الساعة على المفتاح بيفك التغذية.</p>
      <div class="progress"><span>${I.wrench}</span><div class="meter"><i id="ctBar" style="width:0%"></i></div><b class="mono" id="ctD" dir="ltr">0.0 / ${WALL} mm</b></div>
      <div class="actions"><span class="pill mono" id="ctFeedP">تغذية: 0</span><span class="pill mono" id="ctRev">0 لفة</span></div>
      <p class="muted" id="ctState">ركّب القطاعة على العلامة الحمرا ولف مفتاح التغذية لحد ما العجلة تلمس الماسورة.</p>`);
    const st = $('#ctState');
    const upd = () => { $('#ctBar').style.width = Math.min(100, depth / WALL * 100) + '%'; $('#ctD').textContent = `${depth.toFixed(1)} / ${WALL} mm`; $('#ctRev').textContent = `${Math.floor(Math.abs(turn) / (Math.PI * 2))} لفة`; $('#ctFeedP').textContent = `تغذية: ${pending.toFixed(1)} × ¼`; V.groove.geometry.dispose(); V.groove.geometry = new THREE.TorusGeometry(OD / 2 - depth / 2000, 0.0004 + depth / 2000, 8, 64); };
    // knob: a clockwise quarter turn adds one feed step; counter-clockwise backs it off
    const g = grabTurn(V.knobHit, () => V.knob.getWorldPosition(new THREE.Vector3()), d => {
      if (!S) return;
      const dq = d / (Math.PI / 2);
      if (!contact) { // the first turns only bring the wheel down onto the pipe
        knobQ += Math.max(0, dq); V.knob.rotation.y -= Math.max(0, d); $('#ctFeedP').textContent = `اقتراب العجلة: ${Math.min(100, Math.round(knobQ / 4 * 100))}%`; if (Math.random() < .2) sfx.tap();
        if (knobQ >= 4) { contact = true; knobQ = 0; sfx.clank(); st.textContent = 'العجلة لمست الماسورة. لف القطاعة لفة كاملة الأول، وبعدين ربع لفة تغذية.'; wmsg('لمست. من هنا: ربع لفة تغذية بس لكل لفة قطاعة.', 'ok', 3000); }
        return;
      }
      const before = pending; pending = Math.max(0, pending + dq); V.knob.rotation.y -= d;
      if (Math.floor(pending * 4) !== Math.floor(before * 4)) sfx.ratchet(1);
      if (dq < 0 && jam && pending < 2.5) { jam = false; st.textContent = 'العجلة اتحررت. كمّل لف بتغذية خفيفة.'; }
      if (Math.floor(pending) > Math.floor(before) && dq > 0) {
        if (pending >= 3 && !jam) { jam = true; overFeeds++; sfx.error(); wpenalize('cutting', 6, 'تغذية زيادة: عجلة القطع اتزنقت'); wmsg('العجلة اتزنقت! التغذية الزيادة بتكسر العجلة وتعمل حرف ملفوف (Burr) كبير. لف المفتاح عكس عقارب الساعة شوية.', 'err', 6000); }
        else if (pending >= 2) { overFeeds++; sfx.error(); st.textContent = 'تغذية زيادة قبل ما تكمل اللفة!'; wmsg('ربع لفة تغذية بس لكل لفة كاملة. التغذية الكبيرة بتشوّه طرف الماسورة.', 'info'); }
        else st.textContent = 'ربع لفة ✓ — العجلة ضاغطة. لف القطاعة لفة كاملة.';
      }
      upd();
    }, null);
    let acc = 0;
    const unbind = circleDrag(d => {
      if (!S || g.active()) return;
      if (!contact) { st.textContent = 'العجلة لسه مش لامسة — لف مفتاح التغذية الأول'; return; }
      if (jam) { st.textContent = 'العجلة متزنقة — فك مفتاح التغذية شوية (عكس عقارب الساعة)'; return; }
      V.cutter.rotation.x += d; turn += d; acc += Math.abs(d);
      if (pending < 0.05) { idle += Math.abs(d); if (idle > Math.PI * 2.5) { st.textContent = 'العجلة بتلف على الفاضي — زوّد التغذية ربع لفة'; } return; }
      idle = 0; V.setSpark(1);
      if (acc > 0.5) { acc = 0; sfx.brush(); }
      // one quarter-turn of feed is consumed over one full revolution
      const use = Math.min(pending, Math.abs(d) / (Math.PI * 2));
      depth = Math.min(WALL, depth + use * FEED * (pending >= 2 ? 1.6 : 1)); pending = Math.max(0, pending - use);
      if (pending < 0.05) { pending = 0; st.textContent = 'لفة كاملة ✓ — لف مفتاح التغذية ربع لفة'; }
      upd();
      if (depth >= WALL - 1e-6) {
        unbind(); g.off(); glow(V.knobMat, false); V.setSpark(0); sfx.clank();
        gsap.to(V.cutter.position, { y: 0.3, x: CUT_X + 0.2, duration: .8, ease: 'power2.in', onComplete: () => (V.cutter.visible = false) });
        gsap.to(V.off.position, { y: -0.4, duration: .9, delay: .3, ease: 'power2.in' }); gsap.to(V.off.rotation, { x: 0.8, duration: .9, delay: .3 });
        V.mark.visible = false; V.groove.visible = false; V.burr.visible = true;
        S.overFeeds = overFeeds; S.burrBig = overFeeds > 1;
        if (S.burrBig) V.burr.scale.setScalar(1.6);
        hint('اسحب في دايرة علشان تلف العدة');
        wmsg('الماسورة اتقطعت. بص على الطرف من جوه: فيه رايش (Burr) لازم يتشال.', 'ok', 4000);
        setTimeout(res, 1600);
      }
    });
    upd();
  });
}
async function taskDeburr() {
  workSteps(STEPS, 3); wsay('cut_deburr');
  V.setCam([0.42, 0.06, 0.05], [CUT_X - 0.02, 0, 0]);
  await ask('الرايش اللي جوه الماسورة بيتشال بإيه؟', [
    { t: 'مقوار مواسير (Reamer)', ok: true, why: 'المقوار المخروطي بيشيل الرايش الداخلي ويرجّع القطر الداخلي كامل.' },
    { t: 'فرشاة سلك', ok: false, why: 'الفرشاة بتنضف الصدأ، لكن مش بتشيل حرف المعدن الملفوف.' },
    { t: 'شاكوش', ok: false, why: 'الطرق بيشوّه طرف الماسورة ويقفل القطر أكتر.' },
  ], 'deburr');
  if (!S) return;
  V.reamer.visible = true; gsap.fromTo(V.reamer.position, { x: CUT_X + 0.25 }, { x: CUT_X + 0.02, duration: .7, ease: 'power2.out' });
  const need = S.burrBig ? 3 : 2; let turned = 0;
  await new Promise(res => {
    body(`<p class="wk__q">لف المقوار جوه طرف الماسورة (${need} لفة) لحد ما الرايش يتشال.</p><div class="progress"><span>${I.roll}</span><div class="meter"><i id="dbBar" style="width:0%"></i></div></div>`);
    const unbind = circleDrag(d => {
      V.reamer.rotation.x += d; turned += Math.abs(d) / (Math.PI * 2);
      const p = Math.min(1, turned / need); $('#dbBar').style.width = p * 100 + '%';
      V.burr.scale.setScalar(Math.max(0.01, (S.burrBig ? 1.6 : 1) * (1 - p))); if (Math.random() < 0.2) sfx.brush();
      if (p >= 1) { unbind(); V.burr.visible = false; gsap.to(V.reamer.position, { x: CUT_X + 0.3, duration: .6, onComplete: () => (V.reamer.visible = false) }); wmsg('الطرف نضيف من جوه.', 'ok', 2500); setTimeout(res, 1000); }
    });
  });
  if (S.burrBig) wmsg('الرايش كان كبير بسبب التغذية الزيادة، وده خد وقت ومجهود زيادة.', 'info', 4500);
}
async function taskBevel() {
  workSteps(STEPS, 4); wsay(S.mode === 'learn' ? 'bevel_learn' : 'bevel_test');
  await ask('الطرف هيتلحم لحام تناكبي (Butt weld). زاوية الشطف القياسية كام؟', [
    { t: '37.5° (± 2.5°)', ok: true, why: 'الشطفة القياسية للحام التناكبي للمواسير 37.5° حسب ASME B16.25.' },
    { t: '15°', ok: false, why: 'زاوية صغيرة: اللحام مش هيوصل لجذر الوصلة.' },
    { t: '45°', ok: false, why: 'زاوية كبيرة: حجم اللحام بيزيد والتشوّه بيزيد من غير فايدة.' },
    { t: '60°', ok: false, why: 'زاوية كبيرة جدًا للحام الماسورة.' },
  ], 'bevel');
  if (!S) return;
  await ask('سمك الجزء المستوي في جذر الشطفة (Root face) يكون تقريبًا كام؟', [
    { t: '1.6 مم (± 0.8)', ok: true, why: 'الوش المستوي الصغير بيمنع ذوبان الحافة ويسمح باختراق اللحام.' },
    { t: 'من غير جزء مستوي (حافة سكينة)', ok: false, why: 'الحافة الحادة بتسيح وتعمل ثقوب في الجذر.' },
    { t: 'نص سمك الجدار', ok: false, why: 'كده اللحام مش هيخترق الجذر.' },
  ], 'bevel');
  if (!S) return;
  V.setCam([0.36, 0.14, 0.22], [CUT_X, 0, 0]);
  await new Promise(res => {
    body(`<p class="wk__q">اشطف الطرف بالصاروخ: اضغط مع الاستمرار على الزرار لحد ما الشطفة تكمل.</p><button class="holdbtn" id="bvHold"><i></i><span>اضغط مع الاستمرار: تجليخ الشطفة</span></button>`);
    const b = $('#bvHold'); let p = 0, on = false, raf = 0;
    const tick = () => { if (on) { p = Math.min(1, p + 0.008); b.querySelector('i').style.width = p * 100 + '%'; V.setSpark(3); if (Math.random() < .3) sfx.brush(); } else V.setSpark(0); if (p >= 1) { V.setSpark(0); finish(); return; } raf = requestAnimationFrame(tick); };
    const finish = () => {
      V.keep.children[0].geometry.dispose();
      const ro = OD / 2, ri = ID / 2, land = 1.6 / 1000, hgt = Math.tan(37.5 * Math.PI / 180) * (WALL / 1000 - land);
      const x1 = CUT_X;
      V.keep.children[0].geometry = new THREE.LatheGeometry([[ri, -0.42], [ro, -0.42], [ro, x1 - hgt], [ri + land, x1], [ri, x1]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
      sfx.ok(); wmsg('الشطفة خلصت. افحصها قبل ما تسلّم الماسورة للّحام.', 'ok', 3000); setTimeout(res, 1200);
    };
    b.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); on = true; b.setPointerCapture?.(e.pointerId); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => (on = false)));
    raf = requestAnimationFrame(tick);
  });
}
async function taskInspect() {
  workSteps(STEPS, 5); wsay('cut_inspect');
  await ask('تتأكد إزاي إن القطع عمودي على محور الماسورة؟', [
    { t: 'بالزاوية القائمة على الطرف من أكتر من ناحية', ok: true, why: 'الزاوية القائمة تكشف أي ميل في القطع (Squareness).' },
    { t: 'بالنظر من بعيد', ok: false, why: 'العين مش هتكشف ميل 1–2 مم، وده كفاية يبوّظ الوصلة.' },
    { t: 'بالمتر', ok: false, why: 'المتر للأطوال، مش للتعامد.' },
  ], 'inspect');
  if (!S) return;
  await ask('زاوية الشطفة بتتقاس بإيه؟', [
    { t: 'منقلة / جيج شطف (Bevel gauge)', ok: true, why: 'جيج اللحام بيقيس زاوية الشطفة وسمك الـ Root face.' },
    { t: 'القدمة ذات الورنية', ok: false, why: 'الورنية بتقيس أطوال وأقطار، مش زوايا.' },
    { t: 'ميزان المياه', ok: false, why: 'الميزان للأفقية والرأسية.' },
  ], 'inspect');
}

export const cutStation = {
  id: 'cut', title: 'قطع وشطف المواسير',
  async start({ mode = 'learn', level = 'easy' } = {}) {
    this.last = { mode, level };
    if (V) { V.stop(); V = null; }
    S = { mode, level };
    openWork({ id: 'cut', title: 'قطع وشطف المواسير', sub: 'ماسورة DN50 · Sch40 · تجهيز للحام تناكبي', mode, level, steps: STEPS,
      cats: { safety: ['السلامة', 15], cutting: ['التثبيت والقطع', 35], deburr: ['إزالة الرايش', 15], bevel: ['الشطف', 20], inspect: ['الفحص', 15] } });
    $('#wkView').innerHTML = '<div class="wk__3d" id="cut3d"></div><p class="wk__hint">جهّز نفسك الأول: البس مهمات الوقاية</p>';
    buildScene($('#cut3d'));
    if (location.search.includes('debug')) window.__cut = { V: () => V, scr: o => { const p = o.getWorldPosition(new THREE.Vector3()).project(V.camera), r = V.dom.getBoundingClientRect(); return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; } };
    const run = S;
    for (const t of [taskPPE, taskClamp, taskCut, taskDeburr, taskBevel, taskInspect]) { await t(); if (S !== run) return; }
    workSteps(STEPS, 6); closeWork();
    const tips = [];
    if (SES.ded.cutting) tips.push('ربع لفة تغذية بس لكل لفة كاملة، وثبّت الماسورة كويس قبل القطع.');
    if (SES.ded.bevel) tips.push('الشطفة القياسية 37.5° مع جذر مستوي حوالي 1.6 مم.');
    if (SES.ded.safety) tips.push('واقي الوجه وسدادات الأذن أساسيين مع الصاروخ.');
    renderResult(cutStation, { badges: [SES.ded.cutting === 0 && 'fast'], tips });
    S = null;
  },
  again() { return this.start(this.last); },
  replay: wreplay,
  stop() { S = null; closeWork(); if (WK) { WK.stop(); WK = null; } if (V) { V.stop(); V = null; } },
};

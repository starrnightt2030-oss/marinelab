// Station: cutting, deburring and bevelling a DN50 pipe (3D). Rotate the cutter by dragging around the pipe; control the feed.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { sfx, unlockAudio } from '../audio.js';
import { $, $$, gsap, I, renderResult, shuffle, SES } from '../ui.js';
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
let S = null, V = null;
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
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 16), chrome); screw.position.y = 0.11; vise.add(screw);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 12), chrome); bar.rotation.x = Math.PI / 2; bar.position.y = 0.17; vise.add(bar);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.07), chrome); jaw.position.y = OD / 2 + 0.008 + 0.02; vise.add(jaw);
  vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.07), chrome), 0, -OD / 2 - 0.008, 0));
  vise.position.x = -0.12; scene.add(vise);
  // pipe (two parts so the off-cut can fall away)
  const keep = hollowPipe(-0.42, CUT_X, steel, inner); scene.add(keep);
  const off = hollowPipe(CUT_X, CUT_X + 0.18, steel, inner); scene.add(off);
  keep.traverse(o => { if (o.isMesh) o.castShadow = true; }); off.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const mark = new THREE.Mesh(new THREE.TorusGeometry(OD / 2 + 0.0004, 0.0009, 8, 64), new THREE.MeshBasicMaterial({ color: 0xff4d57 })); mark.rotation.y = Math.PI / 2; mark.position.x = CUT_X; scene.add(mark);
  const groove = new THREE.Mesh(new THREE.TorusGeometry(OD / 2, 0.0004, 8, 64), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 1 })); groove.rotation.y = Math.PI / 2; groove.position.x = CUT_X; scene.add(groove);
  const burr = new THREE.Mesh(new THREE.TorusGeometry(ID / 2 - 0.0012, 0.0016, 8, 48), new THREE.MeshStandardMaterial({ color: 0x8e969f, metalness: 0.9, roughness: 0.5 })); burr.rotation.y = Math.PI / 2; burr.position.x = CUT_X - 0.001; burr.visible = false; scene.add(burr);
  // pipe cutter around the mark
  const cutter = new THREE.Group();
  const frame = new THREE.Group();
  frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.11), red), 0, OD / 2 + 0.035, 0));
  frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.02), red), 0, 0, 0.055));
  frame.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.11), red), 0, -OD / 2 - 0.03, 0));
  [-1, 1].forEach(k => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.022, 16), chrome); r.rotation.z = Math.PI / 2; r.position.set(0, -OD / 2 - 0.006, k * 0.018); frame.add(r); });
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.003, 32), chrome); wheel.rotation.z = Math.PI / 2; wheel.position.y = OD / 2 + 0.012; frame.add(wheel);
  const feedScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 12), chrome); feedScrew.position.y = OD / 2 + 0.1; frame.add(feedScrew);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x1d2127, roughness: 0.8 })); knob.position.y = OD / 2 + 0.17; frame.add(knob);
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
  V = { renderer, scene, camera, setCam, keep, off, mark, groove, burr, cutter, wheel, knob, reamer, jaw, screw, setSpark: n => (spark = n), stop() { running = false; renderer.dispose(); }, dom: renderer.domElement };
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
  const items = [['goggles', 'نظارة واقية', 1], ['gloves', 'قفاز عمل', 1], ['shield', 'واقي وجه', 1], ['ear', 'سدادات أذن', 1], ['watch', 'ساعة وخاتم', 0], ['scarf', 'كوفية طويلة', 0]];
  await new Promise(res => {
    body(`<p class="wk__q">الشغل فيه قطع وتجليخ بالصاروخ. اختار مهمات الوقاية المناسبة (4 حاجات).</p><div class="dock__row">${shuffle(items).map(([k, t]) => `<button class="tile" data-k="${k}">${ICON[k]}<span>${t}</span></button>`).join('')}</div>`);
    let n = 0;
    $$('#wkBody [data-k]').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('is-picked') || b.classList.contains('is-used')) return;
      const it = items.find(i => i[0] === b.dataset.k);
      if (it[2]) { b.classList.add('is-picked'); sfx.wear(); if (++n === 4) { wmsg('تمام. الصاروخ بيطلّع شرر ورايش، وصوته عالي: الوجه والعين والودن لازم يكونوا محميين.', 'ok', 3500); setTimeout(res, 1200); } }
      else { b.classList.add('is-wrong', 'is-used'); sfx.error(); wpenalize('safety', 5, 'اختيار غير آمن: ' + it[1]); wmsg(it[0] === 'watch' ? 'الساعة والخاتم ممكن يتشبكوا في العدة الدوّارة.' : 'اللبس الواسع ممكن يتلف في الصاروخ.', 'err'); }
    }));
  });
}
async function taskClamp() {
  workSteps(STEPS, 1); wsay('cut_clamp');
  V.setCam([0.32, 0.3, 0.42], [-0.08, 0, 0]);
  let t = 0;
  await new Promise(res => {
    body(`<p class="wk__q">ثبّت الماسورة في منجلة المواسير: لف عمود الربط لحد ما الماسورة تتمسك كويس من غير ما تتفلطح.</p>
      <div class="progress"><span class="mono" id="clT">0</span><div class="meter meter--zone"><i id="clBar" style="width:0%"></i></div></div><p class="muted" id="clState">الماسورة سايبة</p>
      <div class="actions"><button class="btn btn--amber" id="clUp">${I.roll}لف عمود الربط</button><button class="btn" id="clDown">فك لفة</button><button class="btn btn--primary" id="clGo">كفاية — ابدأ القطع</button></div>`);
    const upd = () => {
      $('#clT').textContent = t; $('#clBar').style.width = Math.min(100, t / 8 * 100) + '%';
      $('#clState').textContent = t < 4 ? 'الماسورة لسه بتلف في الفكوك' : t <= 5 ? 'مربوطة كويس ✓' : 'زيادة! الفكوك بتعلّم وتفلطح الماسورة';
      gsap.to(V.jaw.position, { y: OD / 2 + 0.008 + 0.02 - Math.min(t, 6) / 6 * 0.02, duration: .25 }); gsap.to(V.screw.rotation, { y: t * 1.2, duration: .25 });
    };
    $('#clUp').addEventListener('click', () => { t = Math.min(8, t + 1); sfx.ratchet(3); upd(); });
    $('#clDown').addEventListener('click', () => { t = Math.max(0, t - 1); sfx.tap(); upd(); });
    $('#clGo').addEventListener('click', () => {
      if (t < 4) { sfx.error(); wpenalize('cutting', 5, 'بدء القطع والماسورة غير مثبتة'); wmsg('الماسورة لفّت مع القطاعة! لازم تتربط كويس قبل القطع.', 'err'); return; }
      if (t > 5) { wpenalize('cutting', 4, 'ربط المنجلة زيادة وتعليم الماسورة'); wmsg('الماسورة اتعلّمت من الفكوك. اربط لحد ما تتمسك بس.', 'info'); }
      else wmsg('تثبيت مظبوط.', 'ok', 2000);
      sfx.clank(); res();
    });
    upd();
  });
}
async function taskCut() {
  workSteps(STEPS, 2); wsay(S.mode === 'learn' ? 'cut_learn' : 'cut_test');
  V.setCam([0.62, 0.12, 0.08], [CUT_X, 0, 0]);
  let depth = 0, pending = 0, turn = 0, jam = false, overFeeds = 0, idle = 0;
  await new Promise(res => {
    body(`<p class="wk__q">لف القطاعة حوالين الماسورة بالسحب في دايرة على الشاشة. بعد كل لفة كاملة زوّد التغذية ربع لفة.</p>
      <div class="progress"><span>${I.wrench}</span><div class="meter"><i id="ctBar" style="width:0%"></i></div><b class="mono" id="ctD" dir="ltr">0.0 / ${WALL} mm</b></div>
      <div class="actions"><button class="btn btn--amber" id="ctFeed">${I.roll}زوّد التغذية ¼ لفة</button><button class="btn" id="ctBack">فك التغذية</button><span class="pill mono" id="ctRev">0 لفة</span></div>
      <p class="muted" id="ctState">ركّب القطاعة على العلامة الحمرا وزوّد التغذية علشان العجلة تلمس الماسورة.</p>`);
    const st = $('#ctState');
    const upd = () => { $('#ctBar').style.width = Math.min(100, depth / WALL * 100) + '%'; $('#ctD').textContent = `${depth.toFixed(1)} / ${WALL} mm`; $('#ctRev').textContent = `${Math.floor(Math.abs(turn) / (Math.PI * 2))} لفة`; V.groove.geometry.dispose(); V.groove.geometry = new THREE.TorusGeometry(OD / 2 - depth / 2000, 0.0004 + depth / 2000, 8, 64); };
    $('#ctFeed').addEventListener('click', () => {
      if (jam) return;
      pending++; sfx.ratchet(2); gsap.to(V.knob.rotation, { y: `+=${Math.PI / 2}`, duration: .25 });
      if (pending >= 2) { overFeeds++; sfx.error(); st.textContent = 'تغذية زيادة قبل ما تكمل اللفة!'; if (pending >= 3) { jam = true; wpenalize('cutting', 6, 'تغذية زيادة: عجلة القطع اتزنقت'); wmsg('العجلة اتزنقت! التغذية الزيادة بتكسر العجلة وتعمل حرف ملفوف (Burr) كبير. فك التغذية شوية.', 'err', 6000); } else wmsg('ربع لفة تغذية بس لكل لفة كاملة. التغذية الكبيرة بتشوّه طرف الماسورة.', 'info'); }
      else st.textContent = 'العجلة ضاغطة على الماسورة. لف لفة كاملة.';
    });
    $('#ctBack').addEventListener('click', () => { if (pending > 0) pending--; jam = pending >= 3; sfx.tap(); st.textContent = jam ? 'لسه متزنقة' : 'التغذية اتظبطت. كمّل لف.'; });
    let acc = 0;
    const unbind = circleDrag(d => {
      if (!S) return;
      if (jam) { st.textContent = 'العجلة متزنقة — فك التغذية الأول'; return; }
      V.cutter.rotation.x += d; turn += d; acc += Math.abs(d);
      if (pending === 0) { idle += Math.abs(d); if (idle > Math.PI * 2.5) { st.textContent = 'العجلة بتلف على الفاضي — زوّد التغذية'; } return; }
      idle = 0; V.setSpark(1);
      if (acc > 0.5) { acc = 0; sfx.brush(); }
      // one quarter-turn of feed is consumed over one full revolution
      const use = Math.min(pending, Math.abs(d) / (Math.PI * 2));
      depth = Math.min(WALL, depth + use * FEED * (pending >= 2 ? 1.6 : 1)); pending = Math.max(0, pending - use);
      if (pending < 0.05) { pending = 0; st.textContent = 'لفة كاملة ✓ — زوّد التغذية ربع لفة'; }
      upd();
      if (depth >= WALL - 1e-6) {
        unbind(); V.setSpark(0); sfx.clank();
        gsap.to(V.cutter.position, { y: 0.3, x: CUT_X + 0.2, duration: .8, ease: 'power2.in', onComplete: () => (V.cutter.visible = false) });
        gsap.to(V.off.position, { y: -0.4, duration: .9, delay: .3, ease: 'power2.in' }); gsap.to(V.off.rotation, { x: 0.8, duration: .9, delay: .3 });
        V.mark.visible = false; V.groove.visible = false; V.burr.visible = true;
        S.overFeeds = overFeeds; S.burrBig = overFeeds > 1;
        if (S.burrBig) V.burr.scale.setScalar(1.6);
        wmsg('الماسورة اتقطعت. بص على الطرف من جوه: فيه رايش (Burr) لازم يتشال.', 'ok', 4000);
        setTimeout(res, 1600);
      }
    });
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
    $('#wkView').innerHTML = '<div class="wk__3d" id="cut3d"></div><p class="wk__hint">اسحب في دايرة حوالين الماسورة علشان تلف العدة</p>';
    buildScene($('#cut3d'));
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
  stop() { S = null; closeWork(); if (V) { V.stop(); V = null; } },
};

// Station (phase 3): threading a DN25 pipe with a ratchet die stock, sealing with PTFE tape, making up a screwed coupling
// with a pipe wrench, then a leak test with fault diagnosis. All by hand on the 3D model.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { sfx, leakSound } from '../audio.js';
import { $, $$, gsap, I, renderResult, shuffle, SES } from '../ui.js';
import { openWork, closeWork, workSteps, wsay, wreplay, wmsg, wpenalize, body, choose } from '../work.js';
import { createWorker } from '../worker3d.js';
import { twist, tap3d, glow } from '../grab3d.js';
import { ITEMS } from '../tools3d.js';

// DN25 (1") Sch40; 11.5 threads per inch (NPT/BSPT 1"). Training values: about 10 full threads for a 1" pipe.
const OD = 0.0334, ID = 0.0266, PITCH = 0.0254 / 11.5, GOOD = [9, 11], PIPE_X0 = -0.5;
const STEPS = ['مهمات الوقاية', 'اختيار اللقمة', 'عمل القلاووظ', 'الفحص والتنظيف', 'شريط التفلون', 'الربط بمفتاح المواسير', 'اختبار التسريب'];
const ICON = {
  helmet: '<svg viewBox="0 0 48 48"><path d="M8 32a16 16 0 0 1 32 0z"/><path d="M5 32h38v4H5zM24 16v-6"/></svg>',
  goggles: '<svg viewBox="0 0 48 48"><rect x="5" y="17" width="16" height="13" rx="5"/><rect x="27" y="17" width="16" height="13" rx="5"/><path d="M21 23h6"/></svg>',
  gloves: '<svg viewBox="0 0 48 48"><path d="M16 42V22l-4-6a2.5 2.5 0 0 1 4-3l4 5V8a2.5 2.5 0 0 1 5 0v11-13a2.5 2.5 0 0 1 5 0v13-10a2.5 2.5 0 0 1 5 0v18c0 6-3 10-6 13v5z"/></svg>',
  boots: '<svg viewBox="0 0 48 48"><path d="M12 8h12v20l14 6v8H8V30z"/><path d="M8 36h30"/></svg>',
  watch: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9"/><path d="M24 19v5l3 3M19 16l1-10h8l1 10M19 32l1 10h8l1-10"/></svg>',
  scarf: '<svg viewBox="0 0 48 48"><path d="M10 10c8 4 20 4 28 0v8c-8 4-20 4-28 0z"/><path d="M28 19l4 22-6-3-4 4-2-22"/></svg>',
};
let S = null, V = null, WK = null;
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const rot = (m, x, y, z) => { m.rotation.set(x, y, z); return m; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const hint = t => { const h = $('#wkView .wk__hint'); if (h) h.textContent = t; };
const W = () => new THREE.Vector3();

// ---------------- 3D scene ----------------
function lathe(pts, mat, seg = 48) { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat); m.rotation.z = -Math.PI / 2; return m; }  // axis → world +X
function helix(turns, r, x1, mat) {
  const n = Math.max(2, Math.round(turns * 40)), pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n * turns * Math.PI * 2; pts.push(new THREE.Vector3(x1 - (t / (Math.PI * 2)) * PITCH, Math.cos(t) * r, Math.sin(t) * r)); }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, PITCH * 0.32, 6, false), mat);
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
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(1.2, 2.5, 1.8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const M = {
    steel: new THREE.MeshStandardMaterial({ color: 0xa9b0b8, metalness: 0.75, roughness: 0.42 }),
    bright: new THREE.MeshStandardMaterial({ color: 0xe3e8ee, metalness: 1, roughness: 0.22 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x353a42, metalness: 0.6, roughness: 0.6, side: THREE.BackSide }),
    cast: new THREE.MeshStandardMaterial({ color: 0x4b5058, metalness: 0.55, roughness: 0.6 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc62a2f, metalness: 0.3, roughness: 0.45, emissive: 0x6a4300, emissiveIntensity: 0 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x1f5fd1, metalness: 0.3, roughness: 0.5 }),
    galv: new THREE.MeshStandardMaterial({ color: 0x9aa3a9, metalness: 0.7, roughness: 0.5, emissive: 0x6a4300, emissiveIntensity: 0 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.8 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a24a, metalness: 0.9, roughness: 0.3, emissive: 0x6a4300, emissiveIntensity: 0 }),
    tape: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false }),
    oilFilm: new THREE.MeshStandardMaterial({ color: 0x7a5a10, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0 }),
  };
  // bench + yoke vise
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.6), M.wood); bench.position.set(-0.2, -0.13, 0); bench.receiveShadow = true; scene.add(bench);
  const vise = new THREE.Group();
  vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.14), M.blue), 0, -0.095, 0));
  [-1, 1].forEach(k => vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.15, 0.026), M.blue), 0, -0.02, k * 0.05)));
  vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.026, 0.13), M.blue), 0, 0.055, 0));
  vise.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.09, 12), M.bright), 0, 0.09, 0));
  vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.05), M.bright), 0, OD / 2 + 0.006, 0));
  vise.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.05), M.bright), 0, -OD / 2 - 0.006, 0));
  vise.add(at(rot(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15, 10), M.bright), Math.PI / 2, 0, 0), 0, 0.135, 0));
  vise.position.x = -0.3; scene.add(vise);
  // pipe: plain part + the end that gets threaded (thread helix + chamfer rebuilt as cutting goes on)
  const pipe = new THREE.Group(); scene.add(pipe);
  pipe.add(lathe([[ID / 2, PIPE_X0], [OD / 2, PIPE_X0], [OD / 2, 0], [ID / 2, 0]], M.steel, 64));
  pipe.add(lathe([[ID / 2, PIPE_X0], [ID / 2, 0]], M.inner, 32));
  pipe.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const thr = new THREE.Group(); scene.add(thr);
  const oilFilm = lathe([[OD / 2 + 0.0004, -0.03], [OD / 2 + 0.0004, 0]], M.oilFilm, 32); scene.add(oilFilm);
  const tape = lathe([[OD / 2 + 0.0007, -0.024], [OD / 2 + 0.0007, -0.002]], M.tape, 48); scene.add(tape);
  // ratchet die stock: head + die + guide, long handle (rotates about the pipe axis)
  const die = new THREE.Group(); scene.add(die);
  const head = new THREE.Group(); die.add(head);
  head.add(lathe([[0.026, -0.012], [0.05, -0.012], [0.05, 0.03], [0.026, 0.03]], M.cast, 48));
  head.add(lathe([[OD / 2 + 0.001, -0.004], [0.026, -0.004], [0.026, 0.024], [OD / 2 + 0.001, 0.024]], M.bright, 6));   // hex die
  head.add(lathe([[OD / 2 + 0.002, -0.05], [0.034, -0.05], [0.034, -0.012], [OD / 2 + 0.002, -0.012]], M.cast, 32));      // guide bushing (rides on the plain pipe)
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; head.add(at(rot(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.006), M.bright), a, 0, 0), 0.01, Math.cos(a) * 0.02, Math.sin(a) * 0.02)); }
  const lever = new THREE.Group(); head.add(lever);
  lever.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.22, 16), M.bright), 0.012, 0.15, 0));
  lever.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 20), M.red), 0.012, 0.24, 0));
  lever.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.015, 16, 10), M.red), 0.012, 0.29, 0));
  lever.add(at(rot(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12), M.cast), 0, 0, Math.PI / 2), 0.012, 0.07, 0));   // ratchet pawl knob
  const leverHit = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 8), new THREE.MeshBasicMaterial({ visible: false })); leverHit.position.set(0.012, 0.2, 0); lever.add(leverHit);
  die.position.x = 0.15; die.visible = false;
  // oil can (tap it to oil the die)
  const can = new THREE.Group(); scene.add(can);
  can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 32), M.red));
  can.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.03, 32), M.brass), 0, 0.05, 0));
  can.add(at(rot(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, 0.13, 10), M.brass), 0, 0, -0.9), 0.05, 0.1, 0));
  can.add(at(rot(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 8, 20, Math.PI), M.brass), 0, 0, 0), -0.035, 0.0, 0));
  can.position.set(0.16, -0.07, -0.13); scene.add(can);
  const drops = []; for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 6), new THREE.MeshStandardMaterial({ color: 0x9a7414, metalness: .3, roughness: .1 })); d.visible = false; scene.add(d); drops.push(d); }
  // coupling (galvanised malleable iron) with a short stub on the far side
  const fit = new THREE.Group(); scene.add(fit);
  fit.add(lathe([[OD / 2, 0], [0.0235, 0], [0.0245, 0.003], [0.0245, 0.042], [0.0235, 0.045], [OD / 2, 0.045]], M.galv, 48));
  fit.add(at(rot(new THREE.Mesh(new THREE.TorusGeometry(0.0245, 0.0018, 6, 40), M.galv), 0, Math.PI / 2, 0), 0.0225, 0, 0));
  fit.add(lathe([[0, 0.158], [0.0185, 0.158], [0.0195, 0.165], [0.0195, 0.18], [0.012, 0.186], [0, 0.186]], M.galv, 32));   // end cap for the pressure test
  const stub = lathe([[ID / 2, 0.03], [OD / 2, 0.03], [OD / 2, 0.16], [ID / 2, 0.16]], M.steel, 48); fit.add(stub);
  const fitHit = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); fitHit.position.x = 0.02; fit.add(fitHit);
  fit.position.x = 0.2; fit.visible = false;
  // pipe wrench gripping the coupling (wrench plane ⟂ pipe axis)
  const wr = new THREE.Group(); scene.add(wr);
  const pw = ITEMS.find(i => i.id === 'pipewrench').build(); pw.rotation.y = -Math.PI / 2; pw.position.set(0, -0.07, 0.01); wr.add(pw);
  pw.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const wrHit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), new THREE.MeshBasicMaterial({ visible: false })); wrHit.position.set(0, -0.07, 0.14); wr.add(wrHit);
  wr.visible = false;
  // smoke (dry cutting) and leak drops
  const smoke = []; for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), new THREE.MeshBasicMaterial({ color: 0xc8ccd2, transparent: true, opacity: 0 })); scene.add(s); smoke.push(s); }
  const leak = []; for (let i = 0; i < 16; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5fc7ff, transparent: true, opacity: .85, metalness: .1, roughness: .05 })); d.visible = false; scene.add(d); leak.push(d); }

  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  let running = true, last = performance.now(), smokeOn = 0, leakOn = 0, si = 0, li = 0;
  const setCam = (p, t, d = 1) => { gsap.to(camera.position, { x: p[0], y: p[1], z: p[2], duration: d, ease: 'power2.inOut' }); gsap.to(V.look, { 0: t[0], 1: t[1], 2: t[2], duration: d, ease: 'power2.inOut' }); };
  camera.position.set(0.45, 0.3, 0.55);
  const loop = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    camera.lookAt(V.look[0], V.look[1], V.look[2]);
    if (smokeOn && Math.random() < 0.3) { const s = smoke[si = (si + 1) % smoke.length]; s.position.set(die.position.x, 0.02, (Math.random() - .5) * .03); s.material.opacity = 0.5; s.scale.setScalar(1); }
    smoke.forEach(s => { if (s.material.opacity > 0) { s.position.y += dt * 0.12; s.scale.multiplyScalar(1 + dt * 1.5); s.material.opacity = Math.max(0, s.material.opacity - dt * 0.5); } });
    if (leakOn && Math.random() < leakOn * 0.45) { const d = leak[li = (li + 1) % leak.length]; d.visible = true; d.position.set(fit.position.x - 0.002 + Math.random() * .004, -OD / 2 - 0.004, (Math.random() - .5) * .02); d.userData.v = 0; }
    leak.forEach(d => { if (d.visible) { d.userData.v += dt * 2.5; d.position.y -= d.userData.v * dt; if (d.position.y < -0.11) d.visible = false; } });
    drops.forEach(d => { if (d.visible) { d.userData.v += dt * 2.5; d.position.y -= d.userData.v * dt; d.position.x += d.userData.vx * dt; if (d.position.y < 0) d.visible = false; } });
    renderer.render(scene, camera); requestAnimationFrame(loop);
  };
  V = { renderer, scene, camera, setCam, look: [0, 0, 0], M, thr, oilFilm, tape, die, head, lever, leverHit, can, drops, fit, fitHit, wr, wrHit, dom: renderer.domElement,
    smoke: n => (smokeOn = n), leak: n => (leakOn = n), stop() { running = false; renderer.dispose(); } };
  setCam([0.45, 0.3, 0.55], [-0.05, 0, 0], 0.01);
  requestAnimationFrame(loop); setTimeout(resize, 30);
  return V;
}
function setThreads(n) {
  V.thr.children.forEach(c => c.geometry.dispose()); V.thr.clear();
  if (n <= 0) return;
  V.thr.add(helix(n, OD / 2 - PITCH * 0.25, 0, V.M.bright));
  V.thr.add(lathe([[OD / 2 - PITCH * 0.55, -n * PITCH], [OD / 2 - PITCH * 0.55, 0]], V.M.cast, 32));   // root
}

// ---------------- helpers ----------------
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
  workSteps(STEPS, 0); wsay('thr_ppe');
  const items = [['goggles', 'نظارة واقية', 1], ['gloves', 'قفاز عمل', 1], ['boots', 'حذاء أمان', 1], ['helmet', 'خوذة', 1], ['watch', 'ساعة وخاتم', 0], ['scarf', 'كوفية طويلة', 0]];
  await new Promise(res => {
    body(`<div class="worker"><b class="worker__title">المتدرب · شوف كل حاجة بيلبسها</b><div class="worker__stage" id="thrWorker"></div>
      <ul class="worker__list">${items.filter(i => i[2]).map(([k, t]) => `<li data-slot="${k}">${ICON[k]}<span>${t}</span></li>`).join('')}</ul></div>
      <p class="wk__q">هتقلوظ بلقمة فيها زيت تبريد ورايش حاد. اختار مهمات الوقاية (4 حاجات).</p><div class="dock__row">${shuffle(items).map(([k, t]) => `<button class="tile" data-k="${k}">${ICON[k]}<span>${t}</span></button>`).join('')}</div>`);
    if (WK) WK.stop(); WK = createWorker($('#thrWorker'), null); WK.start();
    let n = 0;
    $$('#wkBody [data-k]').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('is-picked') || b.classList.contains('is-used')) return;
      const it = items.find(i => i[0] === b.dataset.k);
      if (it[2]) {
        b.classList.add('is-picked'); sfx.wear(); WK.equip(it[0]);
        const li = $(`#wkBody [data-slot="${it[0]}"]`); li.classList.add('is-on'); gsap.fromTo(li, { scale: .8 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
        if (++n === 4) { wmsg('جاهز. الرايش بتاع القلوظة حاد جدًا: ماتشيلوش بإيدك من غير قفاز.', 'ok', 3500); setTimeout(() => { if (WK) { WK.stop(); WK = null; } res(); }, 2600); }
      } else { b.classList.add('is-wrong', 'is-used'); sfx.error(); WK.wrong(it[0]); wpenalize('safety', 5, 'اختيار غير آمن: ' + it[1]); wmsg(it[0] === 'watch' ? 'الساعة والخاتم ممكن يتشبكوا في ذراع اللقمة.' : 'اللبس الواسع ممكن يتلف مع اللقمة.', 'err'); }
    }));
  });
}
async function taskDie() {
  workSteps(STEPS, 1); wsay('thr_die');
  V.setCam([0.3, 0.16, 0.34], [-0.04, 0, 0]);
  await ask('الماسورة مقاس 1 بوصة (DN25). هتختار أنهي لقمة؟', [
    { t: 'لقمة 1" — 11.5 سنة في البوصة (مسلوبة)', ok: true, why: 'مواسير 1 بوصة بتتقلوظ 11.5 سنة في البوصة، والسن مسلوب علشان يحبك وهو بيتربط.' },
    { t: 'لقمة ¾" — 14 سنة في البوصة', ok: false, why: 'دي لماسورة ¾ بوصة: أصغر من الماسورة.' },
    { t: 'لقمة 1" — 8 سنة في البوصة', ok: false, why: '8 سنة في البوصة لمواسير 2½ بوصة وأكبر.' },
    { t: 'لقمة مسامير M33 (متري)', ok: false, why: 'سن المسامير مستقيم ومش بيحبك. المواسير ليها سن مواسير مسلوب.' },
  ], 'die');
  if (!S) return;
  await ask('قبل ما تبدأ القلوظة، طرف الماسورة لازم يكون إزاي؟', [
    { t: 'مقطوع عمودي ومتشال منه الرايش من جوه وبرّه', ok: true, why: 'القطع المايل بيخلي السن يبدأ أعوج، والرايش بيبوّظ اللقمة.' },
    { t: 'مشطوف 37.5° زي اللحام', ok: false, why: 'الشطفة دي للحام التناكبي، مش للقلوظة.' },
    { t: 'مايفرقش', ok: false, why: 'يفرق جدًا: السن الأعوج هيسرّب.' },
  ], 'die');
}
async function taskThread() {
  workSteps(STEPS, 2); wsay(S.mode === 'learn' ? 'thr_learn' : 'thr_test');
  V.die.visible = true; gsap.fromTo(V.die.position, { x: 0.18 }, { x: -0.024 + 10 * PITCH, duration: .8, ease: 'power2.out' });
  V.setCam([0.8, 0.22, 0.5], [0.02, 0.0, -0.02]);
  hint('اضغط على علبة الزيت · وبعدين امسك ذراع اللقمة الأحمر ولفّه مع عقارب الساعة');
  glow(gsap, V.M.red, true); glow(gsap, V.M.brass, true);
  let pos = 0, cut = 0, chip = 0, oil = 0, jam = false, dry = false, started = false, backs = 0, lastQ = 0;
  const learn = S.mode === 'learn';
  await new Promise(res => {
    body(`<p class="wk__q">1) اضغط على <b>علبة الزيت</b> علشان تزيّت اللقمة.<br>2) امسك <b>ذراع اللقمة</b> ولفّه مع عقارب الساعة (وانت باصص على طرف الماسورة).<br>3) كل لفة تقريبًا: رجّع الذراع ربع لفة لورا علشان تكسر الرايش، وزيّت تاني.<br>4) وقّف لما طرف الماسورة يطلع مستوي مع وش اللقمة.</p>
      <div class="progress"><span>${I.roll}</span><div class="meter meter--zone"><i id="thBar" style="width:0%"></i></div><b class="mono" id="thN">${learn ? '0 سنة' : '—'}</b></div>
      <div class="actions"><span class="pill mono" id="thOil">الزيت: 0%</span><span class="pill mono" id="thChip">الرايش: خفيف</span></div>
      <p class="muted" id="thState">زيّت اللقمة الأول.</p>
      <div class="actions"><button class="btn btn--primary" id="thDone">كفاية — فك اللقمة</button></div>`);
    const st = $('#thState');
    const upd = () => {
      if (learn) { $('#thN').textContent = `${cut.toFixed(1)} سنة`; $('#thBar').style.width = Math.min(100, cut / 13 * 100) + '%'; }
      $('#thOil').textContent = `الزيت: ${Math.round(oil * 100)}%`;
      $('#thChip').textContent = 'الرايش: ' + (chip < 0.8 ? 'خفيف' : chip < 1.4 ? 'بيتجمّع' : 'زانق!');
      V.oilFilm.material.opacity = oil * 0.55;
      V.die.position.x = -0.024 + (10 - pos) * PITCH;   // die face flush with the pipe end at 10 threads
    };
    const untap = tap3d(V, V.can, () => {
      oil = 1; sfx.slide(); glow(gsap, V.M.brass, false);
      gsap.fromTo(V.can.rotation, { z: 0 }, { z: 0.7, duration: .35, yoyo: true, repeat: 1 });
      V.drops.forEach((d, i) => setTimeout(() => { d.visible = true; d.position.set(V.die.position.x + 0.02, 0.05, (Math.random() - .5) * .02); d.userData.v = 0; d.userData.vx = -0.12; }, i * 40));
      if (dry) { dry = false; V.smoke(0); }
      st.textContent = started ? 'اتزيّتت. كمّل.' : 'اللقمة متزيّتة. امسك الذراع ولف.'; upd();
    });
    const tw = twist(V, () => V.head.getWorldPosition(W()), d => {
      if (!S) return;
      // viewed from the pipe end (camera on +X) a clockwise screen twist = rotating the die clockwise = cutting
      if (d > 0) {
        if (jam) { st.textContent = 'اللقمة زانقة — رجّع الذراع ربع لفة لورا'; sfx.thunk(); return; }
        started = true;
        const turns = d / (Math.PI * 2);
        pos += turns; if (pos > cut) cut = pos; chip += turns; oil = Math.max(0, oil - turns * 0.45);
        V.head.rotation.x -= d;
        if (oil <= 0 && !dry) { dry = true; V.smoke(1); sfx.error(); wpenalize('threading', 4, 'القلوظة على الناشف من غير زيت تبريد'); wmsg('دخان! اللقمة بتسخن وبتقطع السن مقطّع. زيّت فورًا.', 'err', 4500); st.textContent = 'محتاجة زيت!'; }
        if (chip > 1.4 && chip - turns <= 1.4) { sfx.error(); st.textContent = 'الرايش بيتجمّع — رجّع ربع لفة'; if (learn) wmsg('اللقمة بتصرّخ: الرايش اتجمّع. رجّع الذراع ربع لفة يكسر الرايش.', 'info', 4000); }
        if (chip > 2 && !jam) { jam = true; sfx.clank(); wpenalize('threading', 5, 'إهمال تكسير الرايش: اللقمة زنقت'); wmsg('اللقمة زنقت والسن ممكن يتقطّع! لازم ترجع ربع لفة كل لفة تقريبًا.', 'err', 5000); S.torn = true; }
        const q = Math.floor(pos * 4); if (q !== lastQ) { lastQ = q; sfx.ratchet(1); }
        if (Math.floor(cut * 2) !== Math.floor((cut - turns) * 2)) setThreads(cut);
        if (cut > 12.5 && !S.longWarn) { S.longWarn = true; if (learn) wmsg('عدّيت الطول المطلوب: السن الزيادة بيبقى مكشوف ويصدّي.', 'info', 4000); }
      } else {
        const back = -d / (Math.PI * 2);
        pos = Math.max(0, pos - back); V.head.rotation.x -= d;
        if (chip > 0) { chip = Math.max(0, chip - back * 5); if (chip === 0 && started) { backs++; sfx.brush(); } }
        if (jam && chip < 0.5) { jam = false; st.textContent = 'الرايش اتكسر. كمّل لف لقدّام.'; }
      }
      upd();
    }, { hit: V.leverHit, px: 90, miss: () => wmsg('امسك ذراع اللقمة (الأحمر) ولف بيه حوالين الماسورة.', 'info', 2500) });
    $('#thDone').addEventListener('click', () => {
      if (cut < 2) { wmsg('لسه ماعملتش سن تقريبًا!', 'err', 2500); sfx.error(); return; }
      tw.off(); untap(); glow(gsap, V.M.red, false); glow(gsap, V.M.brass, false); V.smoke(0);
      S.threads = cut;
      if (cut < GOOD[0]) { S.short = true; wpenalize('threading', 6, `سن قصير (${cut.toFixed(1)} سنة)`); }
      else if (cut > GOOD[1] + 1) { S.long = true; wpenalize('threading', 3, `سن أطول من المطلوب (${cut.toFixed(1)} سنة)`); }
      if (backs < Math.floor(cut / 3)) wpenalize('threading', 2, 'قلة الرجوع لتكسير الرايش');
      wmsg(learn ? `اتعمل ${cut.toFixed(1)} سنة. المطلوب لماسورة 1" حوالي 10 سنة كاملة.` : 'فك اللقمة بلفها عكس عقارب الساعة.', cut >= GOOD[0] && cut <= GOOD[1] + 1 ? 'ok' : 'info', 4500);
      gsap.to(V.head.rotation, { x: V.head.rotation.x + Math.PI * 6, duration: 1.6 });
      gsap.to(V.die.position, { x: 0.25, duration: 1.6, ease: 'power1.in', onComplete: () => (V.die.visible = false) });
      hint(''); setTimeout(res, 1800);
    });
    upd();
  });
}
async function taskInspect() {
  workSteps(STEPS, 3); wsay('thr_inspect');
  V.setCam([0.22, 0.08, 0.2], [-0.015, 0, 0]);
  await ask('إيه أول حاجة تعملها بعد فك اللقمة؟', [
    { t: 'أنضّف الرايش والزيت بفرشاة سلك، وأشيل الرايش الداخلي بالمقوار', ok: true, why: 'الرايش جوه الماسورة بيروح للصمامات والطلمبات ويبوّظها.' },
    { t: 'أشيل الرايش بصباعي', ok: false, why: 'الرايش حاد جدًا ويجرح. استخدم فرشاة.' },
    { t: 'أركّب الوصلة على طول', ok: false, why: 'الرايش والزيت هيمنعوا الشريط والوصلة من الإحكام.' },
  ], 'inspect');
  if (!S) return;
  await ask('تتأكد إزاي إن السن سليم ومقاسه مظبوط؟', [
    { t: 'بجيج حلقي (Ring gauge) وبالنظر: سن كامل ومش مقطّع', ok: true, why: 'الجيج بيقيس المقاس، والنظر بيكشف السن المقطّع (Torn threads).' },
    { t: 'بالمتر', ok: false, why: 'المتر مش بيقيس السن.' },
    { t: 'بالشاكوش', ok: false, why: 'الطرق بيبوّظ السن.' },
  ], 'inspect');
  if (S && S.torn) wmsg('ملحوظة: فيه أجزاء من السن متقطعة بسبب الزنق. في الشغل الحقيقي ده سبب للرفض.', 'info', 4500);
}
async function taskTape() {
  workSteps(STEPS, 4); wsay('thr_tape');
  V.setCam([0.16, 0.045, 0.07], [-0.012, 0, 0]);
  hint('اسحب في دايرة حوالين طرف الماسورة علشان تلف الشريط');
  const learn = S.mode === 'learn';
  let cw = 0, ccw = 0;
  await new Promise(res => {
    body(`<p class="wk__q">لف شريط التفلون على السن. <b>انت باصص على طرف الماسورة</b>: اسحب في دايرة حوالين الطرف. اختار الاتجاه الصح وعدد اللفات المناسب، وسيب أول سنة من غير شريط.</p>
      <div class="progress"><span>${I.roll}</span><div class="meter meter--zone"><i id="tpBar" style="width:0%"></i></div><b class="mono" id="tpN">${learn ? '0 لفة' : '—'}</b></div>
      <p class="muted" id="tpState">ابدأ لف.</p>
      <div class="actions"><button class="btn btn--primary" id="tpDone">خلصت اللف</button></div>`);
    const tw = twist(V, () => new THREE.Vector3(0, 0, 0), d => {
      if (d > 0) cw += d / (Math.PI * 2); else ccw -= d / (Math.PI * 2);
      const layers = Math.abs(cw - ccw);
      V.tape.material.opacity = Math.min(0.92, layers * 0.2); V.tape.rotation.x += d;
      if (learn) { $('#tpN').textContent = `${layers.toFixed(1)} لفة`; $('#tpBar').style.width = Math.min(100, layers / 7 * 100) + '%'; }
      if (ccw > 0.6 && ccw > cw && !S.tapeWarned) { S.tapeWarned = true; if (learn) wmsg('خلي بالك من الاتجاه: لما الوصلة تتربط هتلف الشريط عكسه وتقشّره.', 'info', 4500); }
      if (Math.random() < .15) sfx.slide();
    });
    $('#tpDone').addEventListener('click', () => {
      const layers = Math.abs(cw - ccw);
      if (layers < 1) { sfx.error(); wmsg('مالفّيتش شريط تقريبًا.', 'err', 2500); return; }
      tw.off(); hint('');
      S.tapeWrong = ccw > cw; S.tapeLayers = layers;
      if (S.tapeWrong) wpenalize('sealing', 8, 'شريط التفلون ملفوف عكس اتجاه الربط');
      if (layers < 2.5) { S.tapeThin = true; wpenalize('sealing', 4, `شريط قليل (${layers.toFixed(1)} لفة)`); }
      else if (layers > 6.5) { S.tapeThick = true; wpenalize('sealing', 3, `شريط كتير (${layers.toFixed(1)} لفة) ممكن يشرخ الوصلة`); }
      sfx.ok(); res();
    });
  });
}
async function taskMakeup() {
  workSteps(STEPS, 5); wsay('thr_makeup');
  V.fit.visible = true; V.setCam([0.34, 0.2, 0.42], [0.02, 0, 0]);
  gsap.fromTo(V.fit.position, { x: 0.2 }, { x: 0, duration: .7, ease: 'power2.out' });
  const handTight = Math.min(S.threads, 10) * 0.45;   // turns by hand before the taper locks
  let turns = 0;
  const place = () => { V.fit.position.x = -turns * PITCH; V.fit.rotation.x = -turns * Math.PI * 2; };
  // 1) hand tight
  hint('امسك الجلبة ولفّها بإيدك مع عقارب الساعة');
  glow(gsap, V.M.galv, true);
  await new Promise(res => {
    body(`<p class="wk__q">ركّب الجلبة (Coupling) على السن، ولفّها <b>بإيدك</b> مع عقارب الساعة لحد ما تقف (ربط اليد).</p><p class="muted" id="mkState">ابدأ لف.</p>`);
    const tw = twist(V, () => V.fit.getWorldPosition(W()), d => {
      if (d < 0) return;
      turns = Math.min(handTight, turns + d / (Math.PI * 2)); place(); if (Math.random() < .2) sfx.tap();
      if (turns >= handTight) { tw.off(); glow(gsap, V.M.galv, false); sfx.thunk(); $('#mkState').textContent = 'وقفت: ده ربط اليد (Hand tight).'; setTimeout(res, 900); }
    }, { hit: V.fitHit, px: 90 });
  });
  if (!S) return;
  await ask('علشان تكمّل الربط بعد ربط اليد، هتستخدم إيه؟', [
    { t: 'مفتاح مواسير (Pipe wrench) + مفتاح تاني يمسك الماسورة', ok: true, why: 'مفتاح المواسير بيمسك الجسم المستدير، والمفتاح التاني يمنع لف الماسورة أو الجزء اللي قبلها.' },
    { t: 'مفتاح عزم', ok: false, why: 'مفتاح العزم للمسامير، مش بيمسك جسم مستدير.' },
    { t: 'زرادية', ok: false, why: 'الزرادية مش هتديك عزم كفاية وهتفلت.' },
  ], 'makeup');
  if (!S) return;
  // 2) wrench: 1.5–3 turns past hand tight (training value for 1" taper threads)
  V.wr.visible = true; V.wr.position.x = V.fit.position.x + 0.022;
  hint('امسك ذراع المفتاح ولفّه مع عقارب الساعة');
  V.setCam([0.42, 0.12, 0.5], [0.0, -0.06, 0.05]);
  let extra = 0, swing = 0;
  await new Promise(res => {
    body(`<p class="wk__q">امسك <b>ذراع مفتاح المواسير</b> واربط. بعد ربط اليد المطلوب حوالي <b>1.5 – 3 لفات</b> بالمفتاح. الربط الزيادة بيشرخ الجلبة، والقليل بيسرّب.</p>
      <div class="progress"><span>${I.wrench}</span><div class="meter meter--zone"><i id="mkBar" style="width:0%"></i></div><b class="mono" id="mkN">${S.mode === 'learn' ? '0.0 لفة' : '—'}</b></div>
      <p class="muted" id="mkState">الفكوك ماسكة الجلبة.</p><div class="actions"><button class="btn btn--primary" id="mkDone">كفاية ربط</button></div>`);
    const tw = twist(V, () => V.fit.getWorldPosition(W()), d => {
      if (d <= 0) { V.wr.rotation.x = Math.min(0, V.wr.rotation.x - d); return; }   // swing back freely (re-grip)
      const k = 0.5 + 0.5 / (1 + extra);      // gets stiffer as the taper locks
      const t = d / (Math.PI * 2) * k; extra += t; turns += t; swing += d * k; place();
      V.wr.rotation.x = -swing; V.wr.position.x = V.fit.position.x + 0.022;
      if (swing > Math.PI / 2) { swing = 0; gsap.to(V.wr.rotation, { x: 0, duration: .3 }); sfx.ratchet(2); $('#mkState').textContent = 'المفتاح اتنقل لمسكة جديدة.'; }
      else if (Math.random() < .2) sfx.ratchet(1);
      if (S.mode === 'learn') { $('#mkN').textContent = `${extra.toFixed(1)} لفة`; $('#mkBar').style.width = Math.min(100, extra / 4 * 100) + '%'; }
      if (extra > 3.6 && !S.cracked) { S.cracked = true; sfx.boom(); wpenalize('makeup', 8, 'ربط زيادة: الجلبة اتشرخت'); wmsg('طقّة! الجلبة اتشرخت من الربط الزيادة.', 'err', 4500); }
    }, { hit: V.wrHit, px: 120, miss: () => wmsg('امسك ذراع المفتاح الأحمر.', 'info', 2000) });
    $('#mkDone').addEventListener('click', () => {
      tw.off(); S.extra = extra;
      if (extra < 1.2) { S.under = true; wpenalize('makeup', 6, `ربط قليل (${extra.toFixed(1)} لفة بعد ربط اليد)`); }
      gsap.to(V.wr.position, { y: -0.3, duration: .6, onComplete: () => (V.wr.visible = false) }); hint(''); res();
    });
  });
}
const CAUSES = {
  short: { t: 'السن قصير: الوصلة مش داخلة كفاية', fix: 'اقطع الطرف واعمل سن بالطول المظبوط (حوالي 10 سنة لماسورة 1")' },
  tapeWrong: { t: 'الشريط ملفوف عكس اتجاه الربط فاتقشّر', fix: 'لف الشريط مع عقارب الساعة وانت باصص على طرف الماسورة' },
  tapeThin: { t: 'الشريط قليل ومش مالي السن', fix: 'لف 3–5 لفات مشدودة' },
  under: { t: 'الربط قليل بعد ربط اليد', fix: 'كمّل 1.5–3 لفات بالمفتاح بعد ربط اليد' },
  cracked: { t: 'الجلبة اتشرخت من الربط الزيادة', fix: 'غيّر الجلبة، ومتزودش عن 3 لفات بعد ربط اليد' },
  torn: { t: 'السن متقطّع من القلوظة على الناشف أو الزنق', fix: 'زيّت باستمرار ورجّع ربع لفة كل لفة' },
};
async function taskTest() {
  workSteps(STEPS, 6); wsay('thr_testp');
  V.setCam([0.34, 0.12, 0.36], [0.04, -0.02, 0]);
  const faults = ['cracked', 'tapeWrong', 'short', 'under', 'tapeThin', 'torn'].filter(k => S[k] && !(k === 'torn' && (S.short || S.threads < GOOD[0])));
  const hasLeak = faults.length > 0;
  await new Promise(res => {
    body(`<p class="wk__q">اختبر الوصلة بالضغط: اضغط مع الاستمرار على الطلمبة لحد 10 bar، وراقب الوصلة.</p>
      <div class="progress"><span class="mono" id="tsP" dir="ltr">0.0 bar</span><div class="meter meter--zone"><i id="tsBar" style="width:0%"></i></div></div>
      <button class="holdbtn" id="tsHold"><i></i><span>اضغط مع الاستمرار: طلمبة الاختبار</span></button>`);
    const b = $('#tsHold'); let p = 0, on = false, raf = 0, done = false, last = performance.now();
    const tick = (now = performance.now()) => {
      if (done) return;
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (on) { p = Math.min(10, p + dt * 1.3); if (Math.random() < dt * 4) sfx.pump(); }
      if (hasLeak && p > 3) { V.leak(Math.min(1, (p - 3) / 4)); leakSound(Math.min(1, (p - 3) / 5)); p = Math.max(0, p - dt * 0.4); }
      $('#tsP').textContent = p.toFixed(1) + ' bar'; $('#tsBar').style.width = p * 10 + '%'; b.querySelector('i').style.width = p * 10 + '%';
      if (p >= 9.95 && !hasLeak) { done = true; sfx.win(); wmsg('10 bar ثابتة ومفيش ولا نقطة. وصلة سليمة!', 'ok', 4000); setTimeout(res, 1600); return; }
      if (hasLeak && p > 5.5 && !done) { done = true; on = false; setTimeout(() => res(), 1800); wmsg('الضغط بيقع والوصلة بتنقّط!', 'err', 4000); return; }
      raf = requestAnimationFrame(tick);
    };
    b.addEventListener('pointerdown', e => { e.preventDefault(); on = true; b.setPointerCapture?.(e.pointerId); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, () => (on = false)));
    raf = requestAnimationFrame(tick);
  });
  if (!S || !hasLeak) return;
  const real = faults[0];
  const opts = shuffle(Object.keys(CAUSES)).filter(k => k !== real).slice(0, 3).concat(real);
  await ask('الوصلة بتسرّب. إيه السبب الأقرب حسب اللي حصل في شغلك؟', opts.map(k => ({ t: CAUSES[k].t, ok: k === real || faults.includes(k), why: (k === real || faults.includes(k)) ? 'صح. العلاج: ' + CAUSES[k].fix + '.' : 'مش ده السبب في شغلك. راجع خطواتك.' })), 'diag', 5);
  V.leak(0); leakSound(0);
  S.faults = faults;
}

export const threadStation = {
  id: 'thread', title: 'قلوظة ووصلات المواسير',
  async start({ mode = 'learn', level = 'easy' } = {}) {
    this.last = { mode, level };
    if (V) { V.stop(); V = null; }
    S = { mode, level };
    openWork({ id: 'thread', title: 'قلوظة ووصلات المواسير', sub: 'ماسورة 1" (DN25) · سن مواسير مسلوب · جلبة مقلوظة', mode, level, steps: STEPS,
      cats: { safety: ['السلامة', 10], die: ['اختيار اللقمة', 10], threading: ['عمل القلاووظ', 30], inspect: ['الفحص', 10], sealing: ['الشريط', 15], makeup: ['الربط', 15], diag: ['التشخيص', 10] } });
    $('#wkView').innerHTML = '<div class="wk__3d" id="thr3d"></div><p class="wk__hint">جهّز نفسك الأول: البس مهمات الوقاية</p>';
    buildScene($('#thr3d'));
    if (location.search.includes('debug')) window.__thr = { V: () => V, S: () => S };
    const run = S;
    for (const t of [taskPPE, taskDie, taskThread, taskInspect, taskTape, taskMakeup, taskTest]) { await t(); if (S !== run) return; }
    workSteps(STEPS, 7); closeWork();
    const tips = [];
    if (SES.ded.threading) tips.push('زيّت اللقمة باستمرار، ورجّع ربع لفة كل لفة، ووقّف عند حوالي 10 سنة لماسورة 1".');
    if (SES.ded.sealing) tips.push('شريط التفلون: 3–5 لفات مع عقارب الساعة وانت باصص على طرف الماسورة.');
    if (SES.ded.makeup) tips.push('بعد ربط اليد: 1.5–3 لفات بمفتاح المواسير، مع مفتاح تاني ماسك.');
    if (S.faults?.length) tips.push('الوصلة سرّبت بسبب: ' + S.faults.map(k => CAUSES[k].t).join('، ') + '.');
    renderResult(threadStation, { badges: [!S.faults?.length && 'fast'], tips });
    S = null;
  },
  again() { return this.start(this.last); },
  replay: wreplay,
  stop() { S = null; closeWork(); leakSound(0); if (WK) { WK.stop(); WK = null; } if (V) { V.stop(); V = null; } },
};

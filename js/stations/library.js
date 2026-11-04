// Station: tools & equipment library — turn the tool in your hand (drag), zoom, show/hide part numbers, listen to each part.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { ITEMS, CATS } from '../tools3d.js';
import { sfx } from '../audio.js';
import { $, $$, gsap, I, playLine, stopVoice, profile, saveProfile } from '../ui.js';

let V = null, current = null, cat = 'all', autoRotate = true, showPins = false, focused = -1;

function initViewer() {
  if (V) return V;
  const host = $('#libStage');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.02).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  // studio lights: key, fill, two rims
  scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x1a2440, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(1.5, 3, 2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2 }); key.shadow.radius = 6; scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd6ff, 0.9); fill.position.set(-2, 1, 1.5); scene.add(fill);
  const rim1 = new THREE.PointLight(0x3dd9ff, 10, 6); rim1.position.set(-1.6, 1.2, -1.5); scene.add(rim1);
  const rim2 = new THREE.PointLight(0xffc23d, 5, 6); rim2.position.set(1.6, 0.6, -1.4); scene.add(rim2);
  // fixed shadow catcher (never moves with the tool)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.7; floor.receiveShadow = true; scene.add(floor);
  const holder = new THREE.Group(); scene.add(holder);
  let dist = 3.1, yaw = 0.6, pitch = 0.18;
  const placeCam = () => { camera.position.set(0, 0.35, dist); camera.lookAt(0, -0.02, 0); };
  placeCam();
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); addEventListener('resize', resize);
  // --- turn the tool itself: one finger / mouse drag rotates, two-finger pinch or wheel zooms ---
  const pts = new Map(); let pinch0 = 0, dist0 = dist;
  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); autoRotate = false; syncRotateBtn(); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = dist; } });
  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { yaw += (e.clientX - prev[0]) * 0.008; pitch = Math.max(-1.3, Math.min(1.3, pitch + (e.clientY - prev[1]) * 0.006)); }
    else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); dist = Math.max(1.4, Math.min(5, dist0 * pinch0 / d)); placeCam(); }
  });
  const up = e => pts.delete(e.pointerId);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(1.4, Math.min(5, dist * (1 + Math.sign(e.deltaY) * 0.1))); placeCam(); }, { passive: false });

  let running = false; const tmp = new THREE.Vector3(), camDir = new THREE.Vector3(), nrm = new THREE.Vector3();
  const loop = () => {
    if (!running) return;
    if (autoRotate) yaw += 0.006;
    if (current) { current.spin.rotation.set(pitch, yaw, 0); }
    renderer.render(scene, camera);
    const r = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
    if (current) current.pins.forEach((p, i) => {
      tmp.copy(p.local); current.inner.localToWorld(tmp);
      nrm.copy(tmp).sub(current.center); camera.getWorldDirection(camDir);
      const front = nrm.dot(camDir) < 0.02;
      tmp.project(camera);
      p.el.style.left = (r.left - hr.left + (tmp.x + 1) / 2 * r.width) + 'px';
      p.el.style.top = (r.top - hr.top + (1 - tmp.y) / 2 * r.height) + 'px';
      p.el.hidden = !(showPins || i === focused) || tmp.z > 1;
      p.el.classList.toggle('is-back', !front);
    });
    requestAnimationFrame(loop);
  };
  V = { renderer, scene, holder, floor, resize, setDist(d) { dist = d; placeCam(); }, reset() { yaw = 0.6; pitch = 0.18; dist = 3.1; placeCam(); }, start() { if (!running) { running = true; resize(); requestAnimationFrame(loop); } }, stop() { running = false; } };
  return V;
}
function syncRotateBtn() { const b = $('[data-lib="rotate"]'); if (b) b.setAttribute('aria-pressed', autoRotate); }
function syncPinsBtn() { const b = $('[data-lib="labels"]'); if (b) { b.setAttribute('aria-pressed', showPins); b.querySelector('span').textContent = showPins ? 'إخفاء الأرقام' : 'إظهار الأرقام'; } }

function renderList() {
  $('#libCats').innerHTML = CATS.map(c => `<button role="tab" aria-selected="${c.k === cat}" class="chip ${c.k === cat ? 'is-on' : ''}" data-cat="${c.k}">${c.t}</button>`).join('');
  const seen = new Set(profile.seenTools || []);
  $('#libItems').innerHTML = ITEMS.filter(it => cat === 'all' || it.cat === cat).map(it => `<li><button class="lib__item ${current?.item.id === it.id ? 'is-on' : ''}" data-item="${it.id}">${I[it.icon] || I.library}<span><b>${it.t}</b><small dir="ltr">${it.en}</small></span>${seen.has(it.id) ? '<i class="seen" aria-label="تمت المشاهدة"></i>' : ''}</button></li>`).join('');
}

function showItem(id, speakIt = true) {
  const v = initViewer(), item = ITEMS.find(i => i.id === id);
  if (current) { v.holder.remove(current.spin); current.pins.forEach(p => p.el.remove()); }
  focused = -1;
  const model = item.build();
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const bb = new THREE.Box3().setFromObject(model), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const s = 1.25 / Math.max(size.x, size.y, size.z);
  const inner = new THREE.Group(); inner.add(model); model.position.sub(c); inner.scale.setScalar(s);
  const spin = new THREE.Group(); spin.add(inner); v.holder.add(spin);
  const host = $('#libStage');
  const pins = item.parts.map((p, i) => {
    const el = document.createElement('button'); el.className = 'pin'; el.textContent = i + 1; el.setAttribute('aria-label', p.n); el.hidden = true;
    el.addEventListener('click', () => focusPart(i)); host.appendChild(el);
    return { el, local: new THREE.Vector3(...p.at).sub(c) };
  });
  current = { item, spin, inner, pins, center: new THREE.Vector3(0, 0, 0) };
  gsap.fromTo(inner.scale, { x: s * .5, y: s * .5, z: s * .5 }, { x: s, y: s, z: s, duration: .7, ease: 'back.out(1.8)' });
  $('#libInfo').innerHTML = `
    <p class="eyebrow">${CATS.find(k => k.k === item.cat).t}</p>
    <div class="lib__title"><h2>${item.t}</h2><button class="iconbtn" data-lib="speak" aria-label="اسمع الشرح">${'<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>'}</button></div>
    <p class="en" dir="ltr">${item.en}</p>
    <p>${item.d}</p>
    <h3>الأجزاء <small class="muted">اضغط على الجزء علشان يتعلّم على العدة وتسمع شرحه</small></h3>
    <ol class="partlist">${item.parts.map((p, i) => `<li><button data-part="${i}"><span class="num">${i + 1}</span><span><b>${p.n}</b><small>${p.d}</small></span></button></li>`).join('')}</ol>
    <h3>بيُستخدم في</h3><ul class="bul">${item.use.map(u => `<li>${u}</li>`).join('')}</ul>
    <h3 class="warn-h">${I.shield}السلامة</h3><ul class="bul bul--warn">${item.safe.map(u => `<li>${u}</li>`).join('')}</ul>`;
  $$('#libInfo [data-part]').forEach(b => b.addEventListener('click', () => focusPart(+b.dataset.part)));
  $('#libInfo [data-lib="speak"]').addEventListener('click', () => playLine(`lib_${id}`));
  profile.seenTools = [...new Set([...(profile.seenTools || []), id])]; saveProfile();
  renderList(); sfx.pick();
  if (speakIt) playLine(`lib_${id}`);
}
function focusPart(i) {
  sfx.tap(); focused = i;
  current.pins.forEach((p, k) => p.el.classList.toggle('is-on', k === i));
  $$('#libInfo [data-part]').forEach((b, k) => b.classList.toggle('is-on', k === i));
  const el = current.pins[i].el; el.hidden = false; gsap.fromTo(el, { scale: 1.8 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
  playLine(`lib_${current.item.id}_${i}`);
}

let bound = false;
export const libraryStation = {
  id: 'library', title: 'مكتبة العِدد والمعدات',
  open() {
    const v = initViewer();
    if (!bound) {
      bound = true;
      $('#libCats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; sfx.tap(); renderList(); });
      $('#libItems').addEventListener('click', e => { const b = e.target.closest('[data-item]'); if (b) showItem(b.dataset.item); });
      $$('.lib__tools [data-lib]').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.lib; sfx.tap();
        if (k === 'rotate') { autoRotate = !autoRotate; syncRotateBtn(); }
        if (k === 'labels') { showPins = !showPins; syncPinsBtn(); }
        if (k === 'reset') v.reset();
      }));
    }
    renderList(); syncPinsBtn(); syncRotateBtn();
    v.start();
    if (!current) showItem(ITEMS[0].id, false);
    playLine('lib_intro');
  },
  stop() { if (V) V.stop(); stopVoice(); },
};

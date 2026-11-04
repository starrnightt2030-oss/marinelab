// Station: tools & equipment library — rotate any tool, tap its parts, read uses and safety notes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { ITEMS, CATS } from '../tools3d.js';
import { sfx } from '../audio.js';
import { $, $$, gsap, I, say, profile, saveProfile } from '../ui.js';

let V = null, current = null, cat = 'all', autoRotate = true, showLabels = true;

function initViewer() {
  if (V) return V;
  const host = $('#libStage');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.03).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50); camera.position.set(1.6, 1.0, 2.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.6; controls.minDistance = 0.8; controls.maxDistance = 6; controls.enablePan = false;
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a2440, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rim = new THREE.PointLight(0x3dd9ff, 12, 8); rim.position.set(-2, 1.5, -2); scene.add(rim);
  // turntable
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.05, 72), new THREE.MeshStandardMaterial({ color: 0x0c1a3a, metalness: 0.6, roughness: 0.35 }));
  disc.position.y = -0.62; disc.receiveShadow = true; scene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0x3dd9ff })); ring.rotation.x = Math.PI / 2; ring.position.y = -0.595; scene.add(ring);
  const holder = new THREE.Group(); scene.add(holder);
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); addEventListener('resize', resize);
  let running = false;
  const tmp = new THREE.Vector3();
  const loop = () => {
    if (!running) return;
    controls.update(); renderer.render(scene, camera);
    // pin labels
    const r = renderer.domElement.getBoundingClientRect(), hr = host.getBoundingClientRect();
    if (current) current.pins.forEach(p => {
      tmp.copy(p.local); current.wrap.localToWorld(tmp);
      const facing = tmp.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) > 0;
      tmp.project(camera);
      p.el.style.left = (r.left - hr.left + (tmp.x + 1) / 2 * r.width) + 'px';
      p.el.style.top = (r.top - hr.top + (1 - tmp.y) / 2 * r.height) + 'px';
      p.el.hidden = !showLabels || !facing || tmp.z > 1;
    });
    requestAnimationFrame(loop);
  };
  V = { renderer, scene, camera, controls, holder, resize, start() { if (!running) { running = true; resize(); requestAnimationFrame(loop); } }, stop() { running = false; } };
  return V;
}

function renderList() {
  $('#libCats').innerHTML = CATS.map(c => `<button role="tab" aria-selected="${c.k === cat}" class="chip ${c.k === cat ? 'is-on' : ''}" data-cat="${c.k}">${c.t}</button>`).join('');
  const seen = new Set(profile.seenTools || []);
  $('#libItems').innerHTML = ITEMS.filter(it => cat === 'all' || it.cat === cat).map(it => `<li><button class="lib__item ${current?.item.id === it.id ? 'is-on' : ''}" data-item="${it.id}">${I[it.icon] || I.library}<span><b>${it.t}</b><small dir="ltr">${it.en}</small></span>${seen.has(it.id) ? '<i class="seen" aria-label="تمت المشاهدة"></i>' : ''}</button></li>`).join('');
}

function showItem(id) {
  const v = initViewer(), item = ITEMS.find(i => i.id === id);
  if (current) { v.holder.remove(current.wrap); current.pins.forEach(p => p.el.remove()); }
  const model = item.build();
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const wrap = new THREE.Group(); wrap.add(model);
  const bb = new THREE.Box3().setFromObject(model), size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const s = 1.15 / Math.max(size.x, size.y, size.z);
  model.position.sub(c);
  wrap.scale.setScalar(s);
  wrap.position.y = -0.62 + 0.03 + (size.y * s) / 2;
  v.holder.add(wrap);
  const host = $('#libStage');
  const pins = item.parts.map((p, i) => {
    const el = document.createElement('button'); el.className = 'pin'; el.textContent = i + 1; el.setAttribute('aria-label', p.n);
    el.addEventListener('click', () => focusPart(i)); host.appendChild(el);
    return { el, local: new THREE.Vector3(...p.at).sub(c) };
  });
  current = { item, wrap, pins };
  gsap.fromTo(wrap.scale, { x: s * .6, y: s * .6, z: s * .6 }, { x: s, y: s, z: s, duration: .6, ease: 'back.out(2)' });
  gsap.fromTo(wrap.rotation, { y: -1.2 }, { y: 0, duration: .9, ease: 'power3.out' });
  v.controls.autoRotate = autoRotate;
  $('#libInfo').innerHTML = `
    <p class="eyebrow">${CATS.find(k => k.k === item.cat).t}</p>
    <h2>${item.t}</h2><p class="en" dir="ltr">${item.en}</p>
    <p>${item.d}</p>
    <h3>الأجزاء</h3>
    <ol class="partlist">${item.parts.map((p, i) => `<li><button data-part="${i}"><span class="num">${i + 1}</span><span><b>${p.n}</b><small>${p.d}</small></span></button></li>`).join('')}</ol>
    <h3>بيُستخدم في</h3><ul class="bul">${item.use.map(u => `<li>${u}</li>`).join('')}</ul>
    <h3 class="warn-h">${I.shield}السلامة</h3><ul class="bul bul--warn">${item.safe.map(u => `<li>${u}</li>`).join('')}</ul>`;
  $$('#libInfo [data-part]').forEach(b => b.addEventListener('click', () => focusPart(+b.dataset.part)));
  profile.seenTools = [...new Set([...(profile.seenTools || []), id])]; saveProfile();
  renderList(); sfx.pick();
}
function focusPart(i) {
  sfx.tap();
  current.pins.forEach((p, k) => p.el.classList.toggle('is-on', k === i));
  $$('#libInfo [data-part]').forEach((b, k) => b.classList.toggle('is-on', k === i));
  const el = current.pins[i].el; gsap.fromTo(el, { scale: 1.6 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
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
      $$('[data-lib]').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.lib; sfx.tap();
        if (k === 'rotate') { autoRotate = !autoRotate; v.controls.autoRotate = autoRotate; b.setAttribute('aria-pressed', autoRotate); }
        if (k === 'labels') { showLabels = !showLabels; b.setAttribute('aria-pressed', showLabels); }
        if (k === 'reset') { gsap.to(v.camera.position, { x: 1.6, y: 1.0, z: 2.2, duration: .8 }); v.controls.target.set(0, 0, 0); }
      }));
    }
    renderList();
    v.start();
    if (!current) showItem(ITEMS[0].id);
    say('lib_intro');
  },
  stop() { if (V) V.stop(); },
};

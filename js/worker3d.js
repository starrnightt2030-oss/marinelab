// Cartoon 3D trainee shown while the student puts on PPE (toon shading + ink outline).
import * as THREE from 'three';

const gsap = window.gsap;
function toonRamp() {
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}

export function createWorker(container, logoImg) {
  const ramp = toonRamp();
  const M = c => new THREE.MeshToonMaterial({ color: c, gradientMap: ramp });
  const ink = new THREE.MeshBasicMaterial({ color: 0x0b1020, side: THREE.BackSide });
  const C = { skin: M(0xf1c29b), cov: M(0x2557c7), covDark: M(0x163b8a), stripe: new THREE.MeshBasicMaterial({ color: 0xe8eef7 }), hair: M(0x3a2618), white: new THREE.MeshBasicMaterial({ color: 0xffffff }), black: new THREE.MeshBasicMaterial({ color: 0x14100c }), shoe: M(0x7a8291), mouth: M(0x9c3b2b),
    yellow: M(0xffc23d), orange: M(0xff8a1f), bootBlack: M(0x1e2430), steel: M(0xc9d1db), red: M(0xe8323c), blue: M(0x18a3e0), lens: new THREE.MeshPhongMaterial({ color: 0x7fd3ff, transparent: true, opacity: 0.55, shininess: 120 }) };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.35, 6.5); camera.lookAt(0, 1.22, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); scene.add(sun);

  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  function part(geo, mat, pos, opts = {}) {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos);
    if (opts.rot) m.rotation.set(...opts.rot); if (opts.scale) m.scale.set(...opts.scale);
    if (opts.outline !== false) { const o = new THREE.Mesh(geo, ink); o.scale.setScalar(1 + (opts.ol || 0.06)); m.add(o); }
    (opts.parent || body).add(m); return m;
  }
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 20);
  const sph = (r) => new THREE.SphereGeometry(r, 32, 20);
  // legs, shoes
  [-1, 1].forEach(s => { part(cap(0.17, 0.5), C.cov, [s * 0.2, 0.6, 0]); part(new THREE.TorusGeometry(0.172, 0.028, 8, 32), C.stripe, [s * 0.2, 0.52, 0], { rot: [Math.PI / 2, 0, 0], outline: false }); });
  const shoes = new THREE.Group(); body.add(shoes);
  [-1, 1].forEach(s => part(cap(0.12, 0.16), C.shoe, [s * 0.2, 0.12, 0.08], { rot: [Math.PI / 2, 0, 0], parent: shoes }));
  // torso
  part(cap(0.4, 0.42), C.cov, [0, 1.22, 0], { scale: [1, 1, 0.82] });
  part(new THREE.TorusGeometry(0.4, 0.03, 8, 40), C.stripe, [0, 1.12, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, 0.82, 1], outline: false });
  part(new THREE.CylinderGeometry(0.405, 0.405, 0.08, 40), C.covDark, [0, 0.92, 0], { scale: [1, 1, 0.82], outline: false });
  part(new THREE.BoxGeometry(0.12, 0.09, 0.05), C.steel, [0, 0.92, 0.33], { outline: false });
  if (logoImg) {
    const t = new THREE.Texture(logoImg); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    patch.position.set(-0.17, 1.38, 0.345); patch.rotation.y = -0.18; body.add(patch);
  }
  // arms + hands
  const hands = new THREE.Group(); body.add(hands);
  [-1, 1].forEach(s => { part(cap(0.12, 0.42), C.cov, [s * 0.5, 1.2, 0], { rot: [0, 0, s * 0.22] }); part(sph(0.13), C.skin, [s * 0.6, 0.86, 0.02], { parent: hands }); });
  // neck + head
  part(new THREE.CylinderGeometry(0.12, 0.13, 0.16, 20), C.skin, [0, 1.68, 0], { outline: false });
  const head = new THREE.Group(); head.position.set(0, 2.08, 0); body.add(head);
  part(sph(0.44), C.skin, [0, 0, 0], { parent: head });
  part(new THREE.SphereGeometry(0.46, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), C.hair, [0, 0.03, -0.03], { parent: head, ol: 0.03 });
  [-1, 1].forEach(s => {
    part(sph(0.08), C.skin, [s * 0.43, -0.02, 0], { parent: head, ol: 0.1 });
    part(sph(0.085), C.white, [s * 0.15, 0.04, 0.37], { parent: head, ol: 0.12 });
    part(sph(0.045), C.black, [s * 0.15, 0.04, 0.445], { parent: head, outline: false });
    part(sph(0.015), C.white, [s * 0.15 + 0.015, 0.06, 0.48], { parent: head, outline: false });
    part(new THREE.BoxGeometry(0.13, 0.03, 0.03), C.hair, [s * 0.15, 0.17, 0.4], { parent: head, rot: [0, 0, s * -0.12], outline: false });
  });
  part(sph(0.06), C.skin, [0, -0.06, 0.44], { parent: head, ol: 0.12 });
  part(new THREE.TorusGeometry(0.1, 0.018, 8, 20, Math.PI), C.mouth, [0, -0.17, 0.4], { parent: head, rot: [0.25, 0, Math.PI], outline: false });

  // ---- PPE items ----
  const items = {};
  const mk = (name, build) => { const g = new THREE.Group(); build(g); g.visible = false; body.add(g); items[name] = g; };
  mk('helmet', g => {
    part(new THREE.SphereGeometry(0.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), C.yellow, [0, 2.12, 0], { parent: g, ol: 0.04 });
    part(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 40), C.yellow, [0, 2.13, 0.06], { parent: g, ol: 0.04 });
    part(new THREE.BoxGeometry(0.09, 0.14, 0.9), C.yellow, [0, 2.55, 0], { parent: g, rot: [0, 0, 0], ol: 0.05 });
    part(new THREE.CircleGeometry(0.08, 24), C.blue, [0, 2.38, 0.44], { parent: g, rot: [-0.6, 0, 0], outline: false });
  });
  mk('goggles', g => {
    part(new THREE.TorusGeometry(0.445, 0.035, 8, 48), C.black, [0, 2.12, 0], { parent: g, rot: [Math.PI / 2, 0, 0], outline: false });
    [-1, 1].forEach(s => { part(new THREE.CapsuleGeometry(0.075, 0.08, 6, 16), C.lens, [s * 0.15, 2.12, 0.43], { parent: g, rot: [0, 0, Math.PI / 2], ol: 0.12 }); });
  });
  mk('gloves', g => {
    [-1, 1].forEach(s => { part(sph(0.17), C.orange, [s * 0.6, 0.85, 0.02], { parent: g }); part(new THREE.CylinderGeometry(0.15, 0.16, 0.12, 20), C.orange, [s * 0.58, 1.0, 0.02], { parent: g, rot: [0, 0, s * 0.22] }); });
  });
  mk('boots', g => {
    [-1, 1].forEach(s => {
      part(new THREE.BoxGeometry(0.28, 0.3, 0.42), C.bootBlack, [s * 0.2, 0.15, 0.06], { parent: g, ol: 0.05 });
      part(sph(0.12), C.steel, [s * 0.2, 0.1, 0.26], { parent: g, scale: [1.1, 0.8, 0.6], ol: 0.08 });
      part(new THREE.BoxGeometry(0.29, 0.05, 0.43), C.yellow, [s * 0.2, 0.27, 0.06], { parent: g, outline: false });
    });
  });
  mk('scarf', g => { part(new THREE.TorusGeometry(0.2, 0.08, 10, 30), C.red, [0, 1.66, 0], { parent: g, rot: [Math.PI / 2, 0, 0] }); part(new THREE.BoxGeometry(0.14, 0.6, 0.06), C.red, [0.12, 1.3, 0.3], { parent: g, rot: [0.1, 0, 0.25] }); });
  mk('watch', g => { part(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 20), C.black, [-0.58, 1.0, 0.02], { parent: g, rot: [0, 0, -0.22] }); part(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), C.steel, [-0.58, 1.0, 0.13], { parent: g, rot: [Math.PI / 2, 0, 0] }); });
  mk('sandal', g => { [-1, 1].forEach(s => { part(new THREE.BoxGeometry(0.26, 0.04, 0.44), C.blue, [s * 0.2, 0.02, 0.08], { parent: g }); part(sph(0.12), C.skin, [s * 0.2, 0.12, 0.1], { parent: g, scale: [1, 0.7, 1.4] }); }); });

  // ---- loop ----
  let raf = 0, running = false;
  const resize = () => { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const tick = (t) => {
    if (!running) return;
    root.rotation.y = Math.sin(t / 1400) * 0.45;
    body.position.y = Math.sin(t / 380) * 0.015;
    head.rotation.z = Math.sin(t / 900) * 0.05;
    renderer.render(scene, camera); raf = requestAnimationFrame(tick);
  };
  return {
    start() { if (running) return; running = true; resize(); raf = requestAnimationFrame(tick); },
    stop() { running = false; cancelAnimationFrame(raf); },
    reset() { Object.values(items).forEach(g => (g.visible = false)); shoes.visible = true; hands.visible = true; },
    equip(k) {
      const g = items[k]; if (!g) return;
      if (k === 'boots') shoes.visible = false;
      if (k === 'gloves') hands.visible = false;
      g.visible = true;
      gsap.fromTo(g.position, { y: k === 'boots' ? -0.6 : 1.4 }, { y: 0, duration: .7, ease: 'bounce.out' });
      gsap.fromTo(body.scale, { y: 0.94 }, { y: 1, duration: .5, ease: 'back.out(3)' });
      gsap.fromTo(root.rotation, { y: root.rotation.y }, { y: root.rotation.y + Math.PI * 2, duration: .9, ease: 'power2.inOut' });
    },
    wrong(k) {
      const g = items[k]; if (!g) return;
      const shoeWas = shoes.visible; if (k === 'sandal') shoes.visible = false;
      g.visible = true;
      gsap.fromTo(g.position, { x: 0 }, { x: 0.06, duration: .06, repeat: 9, yoyo: true, onComplete: () => setTimeout(() => { g.visible = false; if (k === 'sandal') shoes.visible = shoeWas && !items.boots.visible; }, 900) });
    },
    resize,
  };
}

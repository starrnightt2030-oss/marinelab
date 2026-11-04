// Ambient 3D pipe network (intro + hub background). Pipes use ship service colour codes (ISO 14726 main colours).
import * as THREE from 'three';

export const SERVICES = [
  { t: 'مياه البحر', en: 'Sea water', c: 0x2f9e57 },
  { t: 'مياه عذبة', en: 'Fresh water', c: 0x2a6fdb },
  { t: 'وقود', en: 'Fuel oil', c: 0x8b5a2b },
  { t: 'زيت تزييت', en: 'Lube oil', c: 0xe0b100 },
  { t: 'إطفاء الحريق', en: 'Fire fighting', c: 0xd62828 },
  { t: 'هواء مضغوط', en: 'Compressed air', c: 0x7fc8f8 },
  { t: 'بخار', en: 'Steam', c: 0xc3c9d0 },
];

let R = null;

function orthoPath(pts, r = 0.45) {
  const path = new THREE.CurvePath();
  const V = pts.map(p => new THREE.Vector3(...p));
  let prev = V[0];
  for (let i = 1; i < V.length - 1; i++) {
    const a = V[i - 1], b = V[i], c = V[i + 1];
    const inD = b.clone().sub(a).normalize(), outD = c.clone().sub(b).normalize();
    const p1 = b.clone().addScaledVector(inD, -r), p2 = b.clone().addScaledVector(outD, r);
    path.add(new THREE.LineCurve3(prev, p1)); path.add(new THREE.QuadraticBezierCurve3(p1, b, p2)); prev = p2;
  }
  path.add(new THREE.LineCurve3(prev, V[V.length - 1]));
  return path;
}

export function initAmbient(container) {
  if (R) return R;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050b1a);
  scene.fog = new THREE.FogExp2(0x050b1a, 0.055);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 2.2, 7);

  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0b1430, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 8, 6); scene.add(key);
  const cyan = new THREE.PointLight(0x3dd9ff, 30, 18); cyan.position.set(-3, 3, 2); scene.add(cyan);
  const amber = new THREE.PointLight(0xffc23d, 16, 14); amber.position.set(4, 1, -2); scene.add(amber);

  // glowing floor grid
  const grid = new THREE.GridHelper(60, 60, 0x1f6fff, 0x123060); grid.position.y = -1.6;
  grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);

  // pipelines
  const lines = [];
  const flMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, metalness: 0.85, roughness: 0.3 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0xd62828, metalness: 0.3, roughness: 0.4 });
  SERVICES.forEach((s, i) => {
    const y = -0.9 + i * 0.42, z = -2.4 + (i % 4) * 1.15, x1 = -2.6 + i * 0.75, z2 = z - 1.2 - (i % 3) * 0.4, y2 = y + 0.6 + (i % 2) * 0.5;
    const pts = [[-14, y, z], [x1, y, z], [x1, y, z2], [x1 + 1.6, y, z2], [x1 + 1.6, y2, z2], [14, y2, z2]];
    const curve = orthoPath(pts);
    const segs = 260, radial = 14;
    const geo = new THREE.TubeGeometry(curve, segs, 0.11, radial, false);
    const mat = new THREE.MeshStandardMaterial({ color: s.c, metalness: 0.35, roughness: 0.38, emissive: s.c, emissiveIntensity: 0.08 });
    const m = new THREE.Mesh(geo, mat); scene.add(m);
    const per = radial * 6, total = geo.index.count;
    // flanges + a valve along the run
    const fitt = [];
    [0.18, 0.42, 0.66, 0.86].forEach((u, k) => {
      const p = curve.getPointAt(u), tn = curve.getTangentAt(u);
      const g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tn);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 28), flMat); g.add(disc);
      const disc2 = disc.clone(); disc2.position.y = 0.06; g.add(disc2);
      if (k === 1 && i % 2 === 0) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), wheelMat); w.position.set(0.33, 0.03, 0); w.rotation.z = Math.PI / 2; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.33, 8), flMat); st.rotation.z = Math.PI / 2; st.position.x = 0.17; g.add(w, st); }
      g.scale.setScalar(0.0001); scene.add(g); fitt.push({ g, u });
    });
    lines.push({ m, total, per, fitt, s, progress: 0 });
  });

  // floating particles
  const N = 500, pg = new THREE.BufferGeometry(), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 30; pos[i * 3 + 1] = Math.random() * 8 - 1.5; pos[i * 3 + 2] = (Math.random() - .5) * 20; }
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7fd8ff, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(pts);

  const setProgress = (L, p) => {
    L.progress = p;
    const n = Math.floor((L.total / L.per) * p) * L.per;
    L.m.geometry.setDrawRange(0, Math.max(0, n));
    L.fitt.forEach(f => { const s = p >= f.u ? Math.min(1, (p - f.u) * 12) : 0.0001; f.g.scale.setScalar(Math.max(0.0001, s)); });
  };
  lines.forEach(L => setProgress(L, 0));

  let running = false, mode = 'intro', t0 = performance.now(), raf = 0;
  const resize = () => { const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
  const loop = (now) => {
    if (!running) return;
    const t = (now - t0) / 1000;
    const a = pts.geometry.attributes.position.array;
    for (let i = 0; i < N; i++) { a[i * 3 + 1] += 0.003; if (a[i * 3 + 1] > 6.5) a[i * 3 + 1] = -1.5; }
    pts.geometry.attributes.position.needsUpdate = true;
    if (mode === 'hub') {
      camera.position.set(Math.sin(t * 0.05) * 8, 2.6 + Math.sin(t * 0.13) * 0.4, Math.cos(t * 0.05) * 8);
      camera.lookAt(0, 0.4, -1);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };

  R = {
    start() { if (running) return; running = true; resize(); raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    setMode(m) { mode = m; if (m === 'hub') lines.forEach(L => setProgress(L, 1)); },
    /** Grow all pipelines with a camera move. Calls onService(i) as each line starts. */
    grow(gsap, onService) {
      mode = 'intro';
      camera.position.set(-1.5, 0.6, 3.2); camera.lookAt(0, 0.2, -1);
      const tl = gsap.timeline();
      lines.forEach((L, i) => {
        const o = { p: 0 };
        tl.to(o, { p: 1, duration: 2.6, ease: 'power2.inOut', onStart: () => onService && onService(i), onUpdate: () => setProgress(L, o.p) }, i * 0.32);
      });
      const cam = { x: -1.5, y: 0.6, z: 3.2 };
      tl.to(cam, { x: 0, y: 2.4, z: 8.5, duration: 4.2, ease: 'power2.inOut', onUpdate: () => { camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(0, 0.4, -1); } }, 0.4);
      return tl;
    },
  };
  return R;
}

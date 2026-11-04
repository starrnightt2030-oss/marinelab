// Procedural 3D models + reference data for the tools & equipment library (units: metres).
import * as THREE from 'three';
import { ensureMaterials, weldNeckFlange, gasket, studBolt, wireBrush, torqueWrench, pipeY, MAT, DIM } from './scene.js';

const std = (color, metalness = 0.5, roughness = 0.45, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
const M = {};
function mats() {
  if (M.steel) return M;
  Object.assign(M, {
    steel: std(0x9aa3ad, 0.9, 0.32), chrome: std(0xdfe5ea, 1, 0.15), dark: std(0x2a2f36, 0.7, 0.45), blued: std(0x3a4552, 0.8, 0.35),
    red: std(0xc62a2f, 0.25, 0.45), blue: std(0x1f5fd1, 0.3, 0.45), yellow: std(0xf2b705, 0.2, 0.5), orange: std(0xe86a1a, 0.2, 0.5),
    wood: std(0x9a6a3c, 0, 0.7), rubber: std(0x1d2127, 0, 0.85), brass: std(0xc9a24a, 1, 0.3), green: std(0x2f9e57, 0.2, 0.5),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9ff7b0, transmission: 0.6, roughness: 0.1, transparent: true, opacity: 0.7 }),
    castIron: std(0x4a5563, 0.6, 0.6),
  });
  return M;
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r1, r2, h, m, seg = 28) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
function at(o, x, y, z, rx = 0, ry = 0, rz = 0) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; }
function scaleTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

// ---------------- builders ----------------
const B = {
  hacksaw() {
    const g = new THREE.Group(), m = mats();
    g.add(at(box(0.34, 0.014, 0.012, m.blue), 0, 0.11, 0));
    g.add(at(box(0.014, 0.12, 0.012, m.blue), -0.165, 0.05, 0));
    g.add(at(box(0.014, 0.1, 0.012, m.blue), 0.165, 0.06, 0));
    const blade = box(0.32, 0.012, 0.0008, m.blued); at(blade, 0, 0.0, 0); g.add(blade);
    const teeth = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0016, 0.003, 3), m.steel, 80); const mm = new THREE.Matrix4();
    for (let i = 0; i < 80; i++) { mm.compose(new THREE.Vector3(-0.158 + i * 0.004, -0.0072, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), new THREE.Vector3(1, 1, 1)); teeth.setMatrixAt(i, mm); }
    g.add(teeth);
    const grip = box(0.04, 0.11, 0.03, m.rubber); at(grip, 0.2, 0.03, 0, 0, 0, -0.35); g.add(grip);
    const wing = cyl(0.012, 0.012, 0.01, m.chrome); at(wing, -0.185, 0.0, 0, 0, 0, Math.PI / 2); g.add(wing);
    g.add(at(box(0.004, 0.03, 0.006, m.chrome), -0.192, 0.0, 0));
    return g;
  },
  file() {
    const g = new THREE.Group(), m = mats();
    const t = scaleTex(512, 64, (c, w, h) => { c.fillStyle = '#7b848e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3d444c'; c.lineWidth = 2; for (let x = -h; x < w; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); c.beginPath(); c.moveTo(x, h); c.lineTo(x + h * .6, 0); c.stroke(); } });
    const face = new THREE.MeshStandardMaterial({ map: t, metalness: 0.85, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.022), face); at(body, 0, 0, 0); g.add(body);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.011, 0.03, 4, 1), face); at(tip, -0.115, 0, 0, 0, Math.PI / 4, Math.PI / 2); tip.scale.set(1, 1, 0.2); g.add(tip);
    g.add(at(box(0.04, 0.004, 0.008, m.dark), 0.12, 0, 0));
    g.add(at(cyl(0.012, 0.012, 0.012, m.brass), 0.135, 0, 0, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.015, 0.012, 0.11, m.wood), 0.195, 0, 0, 0, 0, Math.PI / 2));
    return g;
  },
  hammer() {
    const g = new THREE.Group(), m = mats();
    g.add(at(cyl(0.012, 0.015, 0.3, m.wood), 0, 0, 0));
    const head = new THREE.Group();
    head.add(at(cyl(0.018, 0.018, 0.07, m.steel), 0.02, 0, 0, 0, 0, Math.PI / 2));
    head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.017, 24, 16), m.steel), -0.02, 0, 0));
    head.add(at(cyl(0.02, 0.02, 0.01, m.chrome), 0.058, 0, 0, 0, 0, Math.PI / 2));
    head.position.y = 0.15; g.add(head);
    g.add(at(box(0.006, 0.012, 0.03, m.dark), 0, 0.168, 0));
    return g;
  },
  punch() {
    const g = new THREE.Group(), m = mats();
    const kn = scaleTex(64, 256, (c, w, h) => { c.fillStyle = '#8f98a2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4b535c'; for (let y = -w; y < h; y += 5) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + w); c.stroke(); c.beginPath(); c.moveTo(w, y); c.lineTo(0, y + w); c.stroke(); } });
    g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 24), new THREE.MeshStandardMaterial({ map: kn, metalness: 0.9, roughness: 0.4 })), 0, 0.02, 0));
    g.add(at(cyl(0.006, 0.0035, 0.025, m.steel), 0, -0.032, 0));
    g.add(at(cyl(0.0035, 0.0002, 0.012, m.chrome), 0, -0.05, 0));
    g.add(at(cyl(0.005, 0.006, 0.006, m.steel), 0, 0.063, 0));
    return g;
  },
  caliper() {
    const g = new THREE.Group(), m = mats();
    const sc = scaleTex(1024, 64, (c, w, h) => { c.fillStyle = '#e8ecf0'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '20px sans-serif'; for (let i = 0; i <= 150; i++) { const x = 20 + i * 6.4; const L = i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 14; c.fillRect(x, 0, 1.4, L); if (i % 10 === 0) c.fillText(String(i / 10), x - 5, 54); } });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.016, 0.003), [m.chrome, m.chrome, m.chrome, m.chrome, new THREE.MeshStandardMaterial({ map: sc, metalness: 0.6, roughness: 0.3 }), m.chrome]);
    at(beam, 0.02, 0, 0); g.add(beam);
    g.add(at(box(0.012, 0.045, 0.003, m.chrome), -0.075, -0.03, 0));
    g.add(at(box(0.008, 0.02, 0.003, m.chrome), -0.076, 0.017, 0));
    const slide = new THREE.Group();
    slide.add(at(box(0.04, 0.024, 0.006, m.chrome), 0.006, 0, 0));
    slide.add(at(box(0.012, 0.045, 0.003, m.chrome), -0.008, -0.03, 0));
    slide.add(at(box(0.008, 0.02, 0.003, m.chrome), -0.009, 0.017, 0));
    slide.add(at(cyl(0.004, 0.004, 0.006, m.dark), 0.01, 0.014, 0.004, Math.PI / 2));
    slide.add(at(cyl(0.006, 0.006, 0.004, m.dark), 0.018, -0.016, 0.0, Math.PI / 2));
    slide.position.x = -0.045; g.add(slide);
    g.add(at(box(0.07, 0.0015, 0.0015, m.chrome), 0.155, 0, 0));
    return g;
  },
  tape() {
    const g = new THREE.Group(), m = mats();
    const caseG = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.026, 40), m.yellow); caseG.rotation.x = Math.PI / 2; g.add(caseG);
    g.add(at(box(0.07, 0.03, 0.026, m.yellow), 0.0, -0.02, 0));
    g.add(at(cyl(0.012, 0.012, 0.028, m.dark), 0, 0, 0, Math.PI / 2));
    const tt = scaleTex(1024, 48, (c, w, h) => { c.fillStyle = '#f5c400'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 18px sans-serif'; for (let i = 0; i < 200; i++) { const x = i * 5.12; c.fillRect(x, 0, 1, i % 10 === 0 ? 22 : i % 5 === 0 ? 14 : 8); if (i % 10 === 0) c.fillText(String(i / 10), x + 2, 40); } c.fillStyle = '#c00'; c.fillRect(0, 44, w, 4); });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.0012, 0.019), [m.yellow, m.yellow, new THREE.MeshStandardMaterial({ map: tt, roughness: 0.5 }), m.yellow, m.yellow, m.yellow]);
    at(blade, -0.135, -0.034, 0); g.add(blade);
    g.add(at(box(0.002, 0.012, 0.02, m.chrome), -0.236, -0.03, 0));
    g.add(at(box(0.012, 0.006, 0.01, m.red), 0.0, 0.037, 0));
    return g;
  },
  square() {
    const g = new THREE.Group(), m = mats();
    g.add(at(box(0.11, 0.022, 0.012, m.dark), 0, 0, 0));
    const bl = scaleTex(512, 32, (c, w, h) => { c.fillStyle = '#d7dde3'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; for (let i = 0; i < 100; i++) c.fillRect(i * 5.1, 0, 1, i % 10 ? 8 : 16); });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.2, 0.024), [m.chrome, m.chrome, m.chrome, m.chrome, new THREE.MeshStandardMaterial({ map: bl, metalness: 0.8, roughness: 0.3 }), m.chrome]);
    blade.geometry.rotateZ(0); at(blade, -0.05, 0.11, 0); g.add(blade);
    g.add(at(cyl(0.003, 0.003, 0.014, m.brass), -0.02, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.003, 0.003, 0.014, m.brass), 0.02, 0, 0, Math.PI / 2));
    return g;
  },
  level() {
    const g = new THREE.Group(), m = mats();
    g.add(at(box(0.4, 0.04, 0.022, m.yellow), 0, 0, 0));
    [0, -0.15].forEach(x => { g.add(at(box(0.05, 0.03, 0.024, m.dark), x, 0, 0)); g.add(at(cyl(0.007, 0.007, 0.04, m.glass), x, 0.0, 0.006, 0, 0, Math.PI / 2)); });
    g.add(at(box(0.024, 0.05, 0.024, m.dark), 0.15, 0, 0));
    g.add(at(cyl(0.007, 0.007, 0.04, m.glass), 0.15, 0, 0.006));
    return g;
  },
  pipewrench() {
    const g = new THREE.Group(), m = mats();
    g.add(at(box(0.3, 0.024, 0.014, m.red), 0.04, 0, 0));
    g.add(at(box(0.05, 0.03, 0.02, m.red), -0.12, 0.004, 0));
    const hook = new THREE.Group();
    hook.add(at(box(0.012, 0.11, 0.018, m.steel), -0.14, 0.06, 0));
    hook.add(at(box(0.05, 0.018, 0.02, m.steel), -0.122, 0.11, 0));
    const th = new THREE.InstancedMesh(new THREE.ConeGeometry(0.002, 0.004, 3), m.dark, 12); const mm = new THREE.Matrix4();
    for (let i = 0; i < 12; i++) { mm.compose(new THREE.Vector3(-0.142 + i * 0.004, 0.099, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), new THREE.Vector3(1, 1, 1)); th.setMatrixAt(i, mm); }
    hook.add(th); g.add(hook);
    g.add(at(box(0.04, 0.014, 0.02, m.steel), -0.115, 0.03, 0));
    const nut = cyl(0.014, 0.014, 0.02, m.chrome, 18); at(nut, -0.14, 0.045, 0); g.add(nut);
    g.add(at(box(0.01, 0.026, 0.016, m.dark), 0.19, 0, 0));
    return g;
  },
  spanner() {
    const g = new THREE.Group(), m = mats();
    g.add(at(box(0.16, 0.014, 0.006, m.chrome), 0, 0, 0));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.006, 12, 12), m.chrome); at(ring, 0.09, 0, 0, 0, 0, 0); ring.rotation.x = 0; g.add(ring);
    const open = new THREE.Group();
    open.add(at(box(0.028, 0.01, 0.006, m.chrome), -0.098, 0.014, 0, 0, 0, 0.25));
    open.add(at(box(0.028, 0.01, 0.006, m.chrome), -0.098, -0.014, 0, 0, 0, -0.25));
    open.add(at(box(0.012, 0.034, 0.006, m.chrome), -0.084, 0, 0));
    g.add(open);
    return g;
  },
  cutter() {
    const g = new THREE.Group(), m = mats();
    g.add(at(box(0.012, 0.09, 0.02, m.red), 0.045, 0, 0));
    g.add(at(box(0.09, 0.014, 0.02, m.red), 0.0, -0.045, 0));
    g.add(at(box(0.09, 0.014, 0.02, m.red), 0.0, 0.045, 0));
    [0.03, -0.03].forEach(y => g.add(at(cyl(0.009, 0.009, 0.016, m.chrome), 0.032, y * 0.7, 0, Math.PI / 2)));
    g.add(at(cyl(0.014, 0.014, 0.003, m.chrome, 36), -0.03, 0, 0, Math.PI / 2));
    g.add(at(box(0.03, 0.03, 0.022, m.red), -0.05, 0, 0));
    g.add(at(cyl(0.004, 0.004, 0.14, m.steel), -0.12, 0, 0, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.01, 0.01, 0.07, m.rubber), -0.17, 0, 0, 0, 0, Math.PI / 2));
    const pipe = pipeYSimple(0.03, 0.12); at(pipe, 0.0, 0, 0, Math.PI / 2); g.add(pipe);
    return g;
  },
  threader() {
    const g = new THREE.Group(), m = mats();
    g.add(at(cyl(0.045, 0.045, 0.05, m.dark, 40), 0, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.03, 0.03, 0.052, m.steel, 6), 0, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.015, 0.015, 0.054, m.dark, 24), 0, 0, 0, Math.PI / 2));
    g.add(at(box(0.04, 0.03, 0.03, m.red), 0.06, 0, 0));
    g.add(at(cyl(0.011, 0.011, 0.38, m.steel), 0.27, 0, 0, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.014, 0.014, 0.1, m.rubber), 0.41, 0, 0, 0, 0, Math.PI / 2));
    g.add(at(box(0.012, 0.02, 0.02, m.yellow), 0.06, 0.025, 0));
    return g;
  },
  vise() {
    const g = new THREE.Group(), m = mats();
    g.add(at(box(0.22, 0.03, 0.16, m.castIron), 0, 0, 0));
    g.add(at(box(0.06, 0.12, 0.16, m.blue), 0.08, 0.075, 0));
    g.add(at(box(0.012, 0.05, 0.16, m.dark), 0.044, 0.11, 0));
    const mov = new THREE.Group();
    mov.add(at(box(0.06, 0.1, 0.16, m.blue), 0, 0.065, 0));
    mov.add(at(box(0.012, 0.05, 0.16, m.dark), 0.036, 0.11, 0));
    mov.add(at(box(0.16, 0.04, 0.06, m.blue), -0.08, 0.04, 0));
    mov.position.x = -0.04; g.add(mov);
    g.add(at(cyl(0.008, 0.008, 0.2, m.chrome), -0.15, 0.05, 0, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.005, 0.005, 0.14, m.chrome), -0.2, 0.05, 0, Math.PI / 2));
    [-1, 1].forEach(k => g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), m.chrome), -0.2, 0.05, k * 0.07)));
    g.add(at(box(0.08, 0.006, 0.08, m.chrome), 0.12, 0.13, 0));
    return g;
  },
  flange() { ensureMaterials(); const f = weldNeckFlange(); const g = new THREE.Group(); f.group.rotation.x = Math.PI / 2; g.add(f.group); return g; },
  gasketPart() { ensureMaterials(); const g = new THREE.Group(); const gs = gasket(); gs.rotation.y = Math.PI / 2; g.add(gs); return g; },
  elbow() {
    ensureMaterials();
    const g = new THREE.Group(), R = DIM.elbowR;
    const o = new THREE.Mesh(new THREE.TorusGeometry(R, DIM.pipeOD / 2, 36, 64, Math.PI / 2), MAT.steel);
    const i = new THREE.Mesh(new THREE.TorusGeometry(R, DIM.pipeID / 2, 24, 48, Math.PI / 2), MAT.steelInside);
    g.add(o, i); g.add(bevelRing(R, 0, 0, Math.PI / 2), bevelRing(0, R, Math.PI / 2, 0));
    return g;
  },
  tee() {
    ensureMaterials();
    const g = new THREE.Group();
    const run = pipeY(-0.14, 0.14); run.rotation.z = Math.PI / 2; g.add(run);
    const br = pipeY(0.0, 0.14); g.add(br);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(DIM.pipeOD / 2 * 1.02, 32, 16), MAT.steel));
    return g;
  },
  reducer() {
    ensureMaterials();
    const pts = [[0.0445, -0.06], [0.0445, -0.03], [0.0572, 0.03], [0.0572, 0.06]].map(([r, y]) => new THREE.Vector2(r, y));
    const outer = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), MAT.steel);
    const inner = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p.x - 0.005, p.y)), 48), MAT.steelInside);
    const g = new THREE.Group(); g.add(outer, inner); g.rotation.z = Math.PI / 2; const w = new THREE.Group(); w.add(g); return w;
  },
  valve() {
    const g = new THREE.Group(), m = mats();
    ensureMaterials();
    g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 20), m.castIron), 0, 0, 0)); g.children[0].scale.set(1, 1.05, 0.85);
    [-1, 1].forEach(s => { g.add(at(cyl(0.05, 0.05, 0.06, m.castIron), s * 0.08, 0, 0, 0, 0, Math.PI / 2)); g.add(at(cyl(0.1, 0.1, 0.02, m.castIron, 40), s * 0.115, 0, 0, 0, 0, Math.PI / 2));
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; g.add(at(cyl(0.007, 0.007, 0.03, m.dark, 8), s * 0.115, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0, 0, Math.PI / 2)); } });
    g.add(at(cyl(0.05, 0.06, 0.1, m.castIron), 0, 0.11, 0));
    g.add(at(cyl(0.065, 0.065, 0.016, m.castIron), 0, 0.165, 0));
    g.add(at(cyl(0.009, 0.009, 0.16, m.chrome), 0, 0.24, 0));
    const wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 10, 40), m.red)); wheel.children[0].rotation.x = Math.PI / 2;
    for (let k = 0; k < 3; k++) { const sp = box(0.085, 0.008, 0.012, m.red); sp.position.set(Math.cos(k * 2.09) * 0.042, 0, Math.sin(k * 2.09) * 0.042); sp.rotation.y = -k * 2.09; wheel.add(sp); }
    wheel.add(cyl(0.016, 0.016, 0.02, m.red)); wheel.position.y = 0.29; g.add(wheel);
    return g;
  },
  stud() { ensureMaterials(); const g = new THREE.Group(); const s = studBolt(); s.scale.setScalar(2.2); g.add(s); return g; },
  brush() { ensureMaterials(); const g = new THREE.Group(); const b = wireBrush(); b.rotation.y = Math.PI / 2; g.add(b); return g; },
  twrench() { ensureMaterials(); const g = new THREE.Group(); const w = torqueWrench(); w.rotation.z = -Math.PI / 2; g.add(w); return g; },
};
function pipeYSimple(r, len) { const m = mats(); const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 32, 1, true), m.steel)); g.children[0].material = m.steel.clone(); g.children[0].material.side = THREE.DoubleSide; return g; }
function bevelRing(x, y, rx, ry) { const r = new THREE.Mesh(new THREE.RingGeometry(DIM.pipeID / 2, DIM.pipeOD / 2, 40), MAT.steel); r.position.set(x, y, 0); r.rotation.set(rx, ry, 0); r.material = MAT.steel; return r; }

// ---------------- catalogue ----------------
export const CATS = [
  { k: 'all', t: 'الكل' }, { k: 'measure', t: 'القياس والشنكرة' }, { k: 'hand', t: 'عدد يدوية' },
  { k: 'cut', t: 'القطع والقلوظة' }, { k: 'equip', t: 'معدات' }, { k: 'parts', t: 'مكونات المواسير' },
];
/** parts[].at = anchor in the model's own coordinates (m). */
export const ITEMS = [
  { id: 'caliper', cat: 'measure', icon: 'caliper', t: 'القدمة ذات الورنية', en: 'Vernier caliper', build: B.caliper,
    d: 'أداة قياس دقيقة للأقطار الخارجية والداخلية والأعماق. دقتها الشائعة 0.02 مم أو 0.05 مم حسب الورنية.',
    use: ['قياس القطر الخارجي والداخلي للمواسير', 'قياس سمك جدار الماسورة والفلانشة', 'قياس عمق الثقوب والقلاووظ'],
    safe: ['لا تستخدمها على قطعة تدور أو ساخنة', 'نظّف الفكوك قبل القياس واحفظها في علبتها'],
    parts: [{ n: 'المسطرة الرئيسية', d: 'عليها التدريج الأساسي بالملليمتر', at: [0.05, 0.004, 0.002] }, { n: 'الفك الثابت', d: 'جزء من المسطرة، تُرتكز عليه القطعة', at: [-0.075, -0.045, 0] }, { n: 'الفك المنزلق', d: 'يتحرك مع الورنية لملامسة القطعة', at: [-0.053, -0.045, 0] }, { n: 'تدريج الورنية', d: 'التدريج المساعد لقراءة كسور الملليمتر', at: [-0.04, 0, 0.004] }, { n: 'مسمار التثبيت', d: 'يثبّت الفك المنزلق بعد القياس', at: [-0.035, 0.014, 0.006] }, { n: 'ذراع العمق', d: 'لقياس عمق الثقوب والمجاري', at: [0.17, 0, 0] }] },
  { id: 'tape', cat: 'measure', icon: 'caliper', t: 'متر الشريط', en: 'Steel tape measure', build: B.tape,
    d: 'شريط صلب مدرّج يُسحب من علبة بزنبرك، لقياس الأطوال الكبيرة وتحديد أماكن القطع على المواسير.',
    use: ['قياس أطوال المواسير قبل القطع', 'قياس المسافات بين مراكز الوصلات', 'نقل الأبعاد من الرسم إلى الموقع'],
    safe: ['لا تترك الشريط يرتد بسرعة، فحافته حادة', 'تأكد أن الخطاف سليم لأنه يؤثر على دقة القراءة'],
    parts: [{ n: 'العلبة', d: 'تحمي الشريط وبداخلها زنبرك السحب', at: [0, 0.01, 0.014] }, { n: 'الشريط المدرّج', d: 'عليه التدريج بالسنتيمتر والملليمتر', at: [-0.13, -0.033, 0.01] }, { n: 'الخطاف', d: 'يُثبت على طرف الماسورة، وحركته البسيطة مقصودة لتعويض سمكه', at: [-0.236, -0.03, 0] }, { n: 'زر القفل', d: 'يثبّت الشريط عند الطول المطلوب', at: [0, 0.04, 0] }] },
  { id: 'square', cat: 'measure', icon: 'caliper', t: 'الزاوية القائمة', en: 'Try square', build: B.square,
    d: 'أداة لفحص ورسم الزوايا القائمة (90°)، وللتأكد من استقامة قطع طرف الماسورة.',
    use: ['فحص تعامد طرف الماسورة بعد القطع', 'رسم خطوط عمودية على الحافة', 'فحص تعامد الفلانشة على الماسورة'],
    safe: ['لا تستخدمها كمطرقة أو رافعة، فذلك يفسد دقتها'],
    parts: [{ n: 'القاعدة (الكعب)', d: 'الجزء السميك الذي يرتكز على حافة القطعة', at: [0.02, 0, 0.007] }, { n: 'النصل المدرّج', d: 'الضلع الرفيع العمودي على القاعدة', at: [-0.05, 0.15, 0] }] },
  { id: 'level', cat: 'measure', icon: 'caliper', t: 'ميزان المياه', en: 'Spirit level', build: B.level,
    d: 'يحتوي على أنابيب زجاجية بها سائل وفقاعة هواء، لضبط أفقية ورأسية خطوط المواسير والحوامل.',
    use: ['ضبط أفقية خط المواسير والميول المطلوبة', 'ضبط رأسية الصاعد (Riser)', 'تثبيت الحوامل في المنسوب الصحيح'],
    safe: ['احفظه من الصدمات، فأي انحناء في الجسم يلغي دقته'],
    parts: [{ n: 'الجسم', d: 'قطاع مستقيم ومشغول بدقة', at: [0.08, 0.02, 0.011] }, { n: 'فقاعة الأفقي', d: 'تكون في المنتصف عندما يكون السطح أفقيًا', at: [0, 0.01, 0.012] }, { n: 'فقاعة الرأسي', d: 'لضبط الرأسية', at: [0.15, 0.025, 0.012] }] },
  { id: 'punch', cat: 'measure', icon: 'caliper', t: 'سنبك العلّام', en: 'Centre punch', build: B.punch,
    d: 'قضيب صلب بطرف مخروطي حاد، يُطرق عليه لعمل نقطة غائرة تحدد مركز الثقب قبل التخريم.',
    use: ['تحديد مراكز الثقوب على الفلانشات والألواح', 'منع انزلاق البنطة عند بداية التخريم'],
    safe: ['البس النظارة الواقية عند الطرق', 'لا تستخدم سنبكًا رأسه مفلطح أو متشقق'],
    parts: [{ n: 'الجسم المخرّش', d: 'سطح خشن يمنع انزلاق اليد', at: [0.007, 0.02, 0] }, { n: 'الطرف المخروطي', d: 'زاويته تقريبًا 90° لعمل نقطة التخريم', at: [0, -0.055, 0] }, { n: 'الرأس', d: 'يُطرق عليه بالشاكوش', at: [0, 0.066, 0] }] },
  { id: 'hammer', cat: 'hand', icon: 'hammer', t: 'شاكوش البرادة', en: 'Ball-peen hammer', build: B.hammer,
    d: 'شاكوش ذو وجه مستو ورأس كروي، يُستخدم في أعمال البرادة والعلام والبرشمة.',
    use: ['الطرق على سنبك العلام والأجنات', 'أعمال التسوية والبرشمة الخفيفة'],
    safe: ['تأكد من تثبيت الرأس بالخابور قبل الاستخدام', 'ممنوع الطرق على الصواميل أو أسطح الفلانشات المشغولة'],
    parts: [{ n: 'الوجه المستوي', d: 'للطرق العادي', at: [0.063, 0.15, 0] }, { n: 'الرأس الكروي', d: 'للبرشمة وتشكيل المعادن', at: [-0.035, 0.15, 0] }, { n: 'اليد', d: 'من الخشب أو الفيبر، تُمسك من طرفها', at: [0, -0.05, 0.014] }, { n: 'الخابور', d: 'يثبت الرأس على اليد', at: [0, 0.172, 0] }] },
  { id: 'file', cat: 'hand', icon: 'file', t: 'المبرد المبسط', en: 'Flat file', build: B.file,
    d: 'قضيب من الصلب المقسّى عليه أسنان، لإزالة الرايش وتنعيم الحواف بعد القطع.',
    use: ['إزالة الرايش (الزوائد) من طرف الماسورة بعد القطع', 'تشطيب الحواف وتسويتها'],
    safe: ['لا تستخدم مبردًا بدون يد، فالسيلة تجرح الكف', 'ممنوع استخدامه على وجه الفلانشة المشغول (التحزيز)'],
    parts: [{ n: 'الوجه المسنن', d: 'أسنان متقاطعة تزيل المعدن عند الدفع للأمام', at: [-0.02, 0.003, 0] }, { n: 'الطرف', d: 'الجزء الأمامي من المبرد', at: [-0.12, 0, 0] }, { n: 'السيلة', d: 'الجزء الذي يدخل في اليد', at: [0.12, 0.004, 0] }, { n: 'اليد', d: 'مقبض خشبي آمن', at: [0.2, 0.016, 0] }] },
  { id: 'brush', cat: 'hand', icon: 'brush', t: 'الفرشاة السلك', en: 'Wire brush', build: B.brush,
    d: 'فرشاة بشعيرات من سلك الصلب، لإزالة الصدأ والقشور والدهانات عن الأسطح قبل التجميع أو اللحام.',
    use: ['تنظيف وجه الفلانشة قبل وضع الحشية', 'إزالة الصدأ عن القلاووظ', 'تنظيف منطقة اللحام'],
    safe: ['البس النظارة والقفاز، فالشعيرات قد تتطاير', 'استخدم فرشاة ستانلس على الأسطح المصنوعة من الستانلس'],
    parts: [{ n: 'الشعيرات السلك', d: 'تحك السطح وتزيل الصدأ', at: [0.0, 0.0, -0.01] }, { n: 'الكعب', d: 'تُثبت فيه الشعيرات', at: [0, 0.018, -0.024] }, { n: 'اليد', d: 'مقبض خشبي للإمساك', at: [0.13, 0, -0.034] }] },
  { id: 'spanner', cat: 'hand', icon: 'twrench', t: 'مفتاح بلدي مشرشر', en: 'Combination spanner', build: B.spanner,
    d: 'مفتاح له طرف مفتوح وطرف حلقي (مشرشر) بنفس المقاس، لفك وربط الصواميل والمسامير.',
    use: ['تثبيت الصامولة الخلفية أثناء الربط بمفتاح العزم', 'الربط المبدئي باليد'],
    safe: ['استخدم المقاس المضبوط للصامولة (مثلًا 24 مم لمسمار M16)', 'اسحب المفتاح ناحيتك ولا تدفعه'],
    parts: [{ n: 'الطرف الحلقي', d: 'يمسك أركان الصامولة الستة، أقل عرضة للانزلاق', at: [0.09, 0.02, 0] }, { n: 'الطرف المفتوح', d: 'يدخل على الصامولة من الجنب', at: [-0.1, 0.02, 0] }, { n: 'الذراع', d: 'طوله يحدد قوة العزم اليدوي', at: [0, 0.01, 0.004] }] },
  { id: 'twrench', cat: 'hand', icon: 'twrench', t: 'مفتاح العزم', en: 'Torque wrench', build: B.twrench,
    d: 'مفتاح يُضبط على قيمة عزم محددة، ويصدر طقة عند الوصول إليها، لربط مسامير الفلانشات بالتساوي.',
    use: ['ربط مسامير الفلانشات بالعزم المحدد في المواصفة', 'الربط على مراحل بالتتابع النجمي'],
    safe: ['لا تستخدمه لفك المسامير', 'ارجع التدريج للصفر بعد الاستخدام للحفاظ على دقة الزنبرك'],
    parts: [{ n: 'اللقمة (البوكس)', d: 'تركب على الصامولة بمقاسها', at: [0, -0.017, 0] }, { n: 'رأس السقاطة', d: 'يسمح بالربط في اتجاه واحد', at: [0, -0.046, 0] }, { n: 'تدريج العزم', d: 'تُضبط عليه القيمة المطلوبة بـ N·m', at: [0.2, -0.046, 0.012] }, { n: 'المقبض', d: 'يُمسك من المنتصف لتكون القراءة صحيحة', at: [0.33, -0.046, 0.015] }] },
  { id: 'pipewrench', cat: 'hand', icon: 'pipewrench', t: 'مفتاح المواسير', en: 'Pipe wrench', build: B.pipewrench,
    d: 'مفتاح بفكوك مسننة يمسك الجسم الأسطواني، لربط وفك المواسير والوصلات المقلوظة.',
    use: ['ربط المواسير والوصلات المقلوظة', 'تثبيت الماسورة أثناء الربط'],
    safe: ['لا تستخدمه على الصواميل لأنه يتلف أركانها', 'اترك فراغًا صغيرًا بين ظهر الفك والماسورة ليعمل الفك صح'],
    parts: [{ n: 'الفك المعقوف', d: 'فك متحرك مسنن', at: [-0.12, 0.11, 0] }, { n: 'الفك السفلي', d: 'فك ثابت مسنن', at: [-0.115, 0.03, 0] }, { n: 'صامولة الضبط', d: 'تضبط فتحة الفك حسب قطر الماسورة', at: [-0.14, 0.045, 0.014] }, { n: 'الذراع', d: 'كلما طال زاد العزم', at: [0.08, 0, 0.008] }] },
  { id: 'hacksaw', cat: 'cut', icon: 'cutter', t: 'المنشار اليدوي', en: 'Hacksaw', build: B.hacksaw,
    d: 'إطار يُشد فيه سلاح مسنن رفيع لقطع المعادن والمواسير يدويًا.',
    use: ['قطع المواسير والقضبان', 'عمل مجاري خفيفة'],
    safe: ['الأسنان تتجه للأمام والقطع يتم في حركة الدفع', 'شد السلاح كويس حتى لا ينكسر'],
    parts: [{ n: 'الإطار', d: 'يحمل السلاح مشدودًا', at: [0, 0.118, 0] }, { n: 'السلاح', d: 'شفرة مسننة، تختار عدد أسنانها حسب سمك المعدن', at: [-0.05, -0.006, 0] }, { n: 'المقبض', d: 'يُمسك باليد اليمنى', at: [0.2, 0.03, 0.016] }, { n: 'صامولة الشد', d: 'لشد السلاح على الإطار', at: [-0.19, 0, 0.008] }] },
  { id: 'cutter', cat: 'cut', icon: 'cutter', t: 'قطّاعة المواسير', en: 'Pipe cutter', build: B.cutter,
    d: 'عدة تلتف حول الماسورة وتقطعها بعجلة قطع، وتعطي قطعًا عموديًا نظيفًا.',
    use: ['قطع المواسير الصلب والنحاس بزاوية قائمة'],
    safe: ['اربط العجلة تدريجيًا مع كل لفة ولا تضغط مرة واحدة', 'أزل الرايش الداخلي بعد القطع'],
    parts: [{ n: 'عجلة القطع', d: 'تخترق جدار الماسورة تدريجيًا', at: [-0.03, 0.016, 0] }, { n: 'البكرتان', d: 'تسندان الماسورة من الناحية الأخرى', at: [0.032, 0.022, 0.009] }, { n: 'عمود التغذية', d: 'يقرّب العجلة من الماسورة', at: [-0.12, 0.006, 0] }, { n: 'الإطار', d: 'جسم القطاعة', at: [0.045, 0.045, 0.012] }] },
  { id: 'threader', cat: 'cut', icon: 'thread', t: 'لقمة القلوظة بالذراع', en: 'Ratchet pipe threader', build: B.threader,
    d: 'ذراع بسقاطة تُركب عليه لقمة (Die) لعمل سن قلاووظ خارجي على أطراف المواسير.',
    use: ['عمل قلاووظ مخروطي (BSPT/NPT) على المواسير الصغيرة', 'تجديد السن التالف'],
    safe: ['استخدم زيت القطع أثناء القلوظة', 'ارجع ربع لفة كل لفة لتكسير الرايش'],
    parts: [{ n: 'رأس اللقمة', d: 'يحمل سكاكين القلوظة', at: [0, 0.046, 0] }, { n: 'السكاكين (Die)', d: 'تقطع السن على الماسورة', at: [0, 0, 0.028] }, { n: 'السقاطة', d: 'تغيّر اتجاه الحركة', at: [0.06, 0.03, 0.016] }, { n: 'الذراع', d: 'يعطي العزم اللازم للقطع', at: [0.3, 0.012, 0] }] },
  { id: 'vise', cat: 'equip', icon: 'library', t: 'المنجلة', en: 'Bench vise', build: B.vise,
    d: 'أداة تُثبت على البنك لتثبيت القطع أثناء القطع والبرد والتخريم.',
    use: ['تثبيت الماسورة أثناء القطع بالمنشار', 'تثبيت القطع أثناء البرد'],
    safe: ['لا تطرق على الذراع لزيادة الربط', 'استخدم بطانات ناعمة للأسطح المشغولة'],
    parts: [{ n: 'الفك الثابت', d: 'مثبّت في الجسم', at: [0.08, 0.14, 0] }, { n: 'الفك المتحرك', d: 'يتحرك مع عمود الربط', at: [-0.04, 0.12, 0.08] }, { n: 'عمود الربط', d: 'مسمار قلاووظ يحرّك الفك', at: [-0.15, 0.06, 0] }, { n: 'ذراع الربط', d: 'للف عمود الربط', at: [-0.2, 0.05, 0.07] }, { n: 'السندان', d: 'سطح صغير للطرق الخفيف', at: [0.12, 0.135, 0] }] },
  { id: 'flange', cat: 'parts', icon: 'library', t: 'فلانشة رقبة لحام', en: 'Weld-neck flange (RF)', build: B.flange,
    d: 'فلانشة لها رقبة تُلحم على الماسورة، ووجه مرتفع (RF) عليه تحزيز تجلس عليه الحشية. شائعة في خطوط الضغط في السفن والبترول.',
    use: ['ربط الماسورة بالصمامات والمعدات أو بماسورة أخرى', 'تسهيل الفك للصيانة'],
    safe: ['احمِ الوجه المشغول من الخدوش أثناء النقل والتخزين'],
    parts: [{ n: 'الوجه المرتفع (RF)', d: 'سطح التحزيز الذي تُضغط عليه الحشية', at: [0.07, 0, 0.004] }, { n: 'ثقوب المسامير', d: 'عددها ومحيطها حسب المقاس والتصنيف', at: [0.094, 0.04, -0.01] }, { n: 'الرقبة', d: 'تخفف تركيز الإجهاد وتُلحم تناكبيًا', at: [0.06, 0, -0.05] }, { n: 'خط اللحام', d: 'لحام الرقبة بالماسورة', at: [0.058, 0, -0.076] }] },
  { id: 'gasket', cat: 'parts', icon: 'gasket', t: 'الحشية', en: 'Gasket', build: B.gasketPart,
    d: 'حلقة من مادة لينة تُوضع بين وجهي الفلانشتين، وتُضغط بالمسامير لمنع التسريب.',
    use: ['إحكام وصلات الفلانشات', 'اختيار مادتها حسب السائل والحرارة والضغط'],
    safe: ['لا تُعاد الحشية بعد فكها', 'افحصها قبل التركيب: أي قطع أو حرق يعني رفضها'],
    parts: [{ n: 'القطر الداخلي', d: 'يساوي تقريبًا القطر الداخلي للماسورة', at: [0, 0.057, 0] }, { n: 'القطر الخارجي', d: 'يجلس داخل دائرة المسامير', at: [0, 0.074, 0.004] }] },
  { id: 'elbow', cat: 'parts', icon: 'elbow', t: 'كوع 90° نصف قطر طويل', en: '90° LR elbow', build: B.elbow,
    d: 'وصلة لتغيير اتجاه الخط 90 درجة. نصف قطر الانحناء في الكوع الطويل 1.5 مرة القطر الاسمي.',
    use: ['تغيير اتجاه الخط', 'يُلحم بالماسورة بلحام تناكبي'],
    safe: ['اختر نفس السماكة (Schedule) ومادة الماسورة'],
    parts: [{ n: 'الطرف المشطوف', d: 'مجهز للحام التناكبي', at: [DIM.elbowR, 0, 0.05] }, { n: 'الانحناء', d: 'نصف قطر = 1.5 × القطر الاسمي', at: [0.11, 0.11, 0.05] }] },
  { id: 'tee', cat: 'parts', icon: 'library', t: 'وصلة T متساوية', en: 'Equal tee', build: B.tee,
    d: 'وصلة لتفريع خط من الخط الرئيسي بنفس القطر.',
    use: ['أخذ فرع من الخط الرئيسي', 'تركيب أجهزة القياس أو خطوط التصريف'],
    safe: ['انتبه لاتجاه السريان عند تركيب الفرع'],
    parts: [{ n: 'الخط الرئيسي (Run)', d: 'يمر فيه السريان الأساسي', at: [0.12, 0, 0.06] }, { n: 'الفرع (Branch)', d: 'الخروج الجانبي', at: [0, 0.13, 0.06] }] },
  { id: 'reducer', cat: 'parts', icon: 'library', t: 'مُسلوب متحد المركز', en: 'Concentric reducer', build: B.reducer,
    d: 'وصلة تغيّر قطر الخط من مقاس لمقاس أصغر، ومحور الطرفين على خط واحد.',
    use: ['تصغير القطر عند مدخل الطلمبة أو المعدات'],
    safe: ['في خطوط السحب الأفقية للطلمبات يُفضّل المسلوب غير المتحد المركز لتجنب جيوب الهواء'],
    parts: [{ n: 'الطرف الكبير', d: 'DN100 في هذا المثال', at: [-0.05, 0.06, 0] }, { n: 'الطرف الصغير', d: 'DN80 في هذا المثال', at: [0.05, 0.047, 0] }] },
  { id: 'valve', cat: 'parts', icon: 'library', t: 'محبس بوابة', en: 'Gate valve', build: B.valve,
    d: 'صمام يفتح ويقفل الخط بالكامل ببوابة تتحرك لأعلى ولأسفل. لا يُستخدم للتحكم في كمية السريان.',
    use: ['عزل جزء من الخط للصيانة', 'القفل والفتح الكامل فقط'],
    safe: ['افتح وأقفل ببطء لتجنب الطَّرق المائي', 'اربطه على نفس تصنيف الفلانشات'],
    parts: [{ n: 'الجسم', d: 'بداخله البوابة', at: [0, 0, 0.065] }, { n: 'الغطاء (Bonnet)', d: 'يقفل الجسم من أعلى', at: [0, 0.12, 0.05] }, { n: 'الساق', d: 'تحرك البوابة', at: [0, 0.23, 0.01] }, { n: 'الطارة', d: 'تُلف لفتح وقفل المحبس', at: [0.085, 0.29, 0] }, { n: 'فلانشة الطرف', d: 'تُربط بفلانشة الخط', at: [0.12, 0.09, 0] }] },
  { id: 'stud', cat: 'parts', icon: 'library', t: 'مسمار برجلين (Stud) بصواميل', en: 'Stud bolt + nuts', build: B.stud,
    d: 'قضيب مقلوظ من الطرفين بصامولتين، يُستخدم في ربط الفلانشات. الشائع في الخطوط: مسامير ASTM A193 B7 وصواميل 2H.',
    use: ['ربط الفلانشات ببعضها', 'اختيار المقاس والعدد حسب الفلانشة'],
    safe: ['يجب أن يظهر سنّان أو ثلاثة على الأقل خارج الصامولة بعد الربط', 'لا تستخدم مسمارًا سنه تالف'],
    parts: [{ n: 'الجسم المقلوظ', d: 'قلاووظ كامل بطول المسمار', at: [0, 0.02, 0] }, { n: 'الصامولة', d: 'سداسية، تُربط بالمفتاح', at: [0.08, 0.035, 0] }] },
];

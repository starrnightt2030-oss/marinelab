// Procedural 3D models for the tools & equipment library (units: metres). Profiles are extruded from real tool outlines,
// with brushed / chrome / painted / rubber / wood materials, so silhouettes read like the real tools.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { ensureMaterials, weldNeckFlange, gasket, studBolt, wireBrush, torqueWrench, pipeY, MAT, DIM } from './scene.js';
import { CATS, ITEMS as DATA } from './library-data.js';

// ---------------- textures & materials ----------------
function tex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
const M = {};
function mats() {
  if (M.steel) return M;
  const brushed = tex(512, 64, (g, w, h) => { g.fillStyle = '#8c949c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.globalAlpha = Math.random() * 0.25; g.fillStyle = Math.random() > .5 ? '#d8dee4' : '#5a626a'; g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 160, 1); } }, { srgb: false });
  const knurl = tex(64, 64, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = -w; i < w * 2; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } }, { repeat: [4, 4], srgb: false });
  const grain = tex(512, 128, (g, w, h) => { g.fillStyle = '#9b6a3e'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.globalAlpha = 0.25 + Math.random() * 0.3; g.fillStyle = Math.random() > .5 ? '#7a4d29' : '#b5814f'; g.fillRect(0, y + Math.sin(y) * 2, w, 1 + Math.random() * 2); } });
  const rubberN = tex(128, 128, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2000; i++) { g.fillStyle = Math.random() > .5 ? '#9a9a9a' : '#666'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, { repeat: [3, 3], srgb: false });
  const cast = tex(256, 256, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},0.08)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, { repeat: [2, 2], srgb: false });
  M.tex = { brushed, knurl, grain, rubberN, cast };
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  Object.assign(M, {
    steel: new THREE.MeshStandardMaterial({ color: 0xc7cdd3, metalness: 1, roughness: 0.32, roughnessMap: brushed }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xeef2f5, metalness: 1, roughness: 0.08 }),
    satin: new THREE.MeshStandardMaterial({ color: 0xd9dee3, metalness: 1, roughness: 0.22, roughnessMap: brushed }),
    oxide: new THREE.MeshStandardMaterial({ color: 0x2b2f35, metalness: 0.85, roughness: 0.42 }),
    knurled: new THREE.MeshStandardMaterial({ color: 0xb9c0c7, metalness: 1, roughness: 0.35, bumpMap: knurl, bumpScale: 1.4 }),
    red: P({ color: 0xb8161c, metalness: 0.2, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    blue: P({ color: 0x1c4fb8, metalness: 0.2, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    yellow: P({ color: 0xf2b705, metalness: 0.05, roughness: 0.4, clearcoat: 0.6 }),
    orange: P({ color: 0xe8661a, metalness: 0.1, roughness: 0.4, clearcoat: 0.5 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.9, roughness: 0.38, roughnessMap: brushed }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x16191d, metalness: 0, roughness: 0.9, bumpMap: rubberN, bumpScale: 0.6 }),
    rubberRed: new THREE.MeshStandardMaterial({ color: 0x8f1218, metalness: 0, roughness: 0.85, bumpMap: rubberN, bumpScale: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ map: grain, roughness: 0.55, metalness: 0 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd2a84d, metalness: 1, roughness: 0.28 }),
    castIron: new THREE.MeshStandardMaterial({ color: 0x4a5460, metalness: 0.55, roughness: 0.7, bumpMap: cast, bumpScale: 0.8 }),
    castBlue: new THREE.MeshStandardMaterial({ color: 0x2a5aa8, metalness: 0.3, roughness: 0.55, bumpMap: cast, bumpScale: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xb8ff6a, transmission: 0.7, roughness: 0.05, thickness: 0.004, transparent: true, opacity: 0.85 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0f1114, metalness: 0.3, roughness: 0.6 }),
  });
  return M;
}
// ---------------- helpers ----------------
const rbox = (w, h, d, m, r = Math.min(w, h, d) * 0.25) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
const cyl = (r1, r2, h, m, seg = 32) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const sph = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), m);
function put(o, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; }
function shape(pts) { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); s.closePath(); return s; }
/** Extrude a 2D outline (XY) to depth d (centred on Z) with a small bevel. */
function ext(sh, d, m, bevel = 0.0008) {
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 32 });
  g.translate(0, 0, -d / 2); return new THREE.Mesh(g, m);
}
function lathe(pts, m, seg = 48) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), m); }
function scalePlane(w, h, draw, m = {}) { const t = tex(1024, Math.round(1024 * h / w), draw); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, metalness: 0.6, roughness: 0.35, transparent: true, ...m })); }
function rr(s, x, y, w, h, r) { s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }

// ---------------- models ----------------
const B = {
  caliper() {
    const m = mats(), g = new THREE.Group();
    g.add(put(rbox(0.235, 0.016, 0.0035, m.satin, 0.0012), 0.02, 0, 0));
    const sc = scalePlane(0.22, 0.008, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 13px sans-serif'; for (let i = 0; i <= 150; i++) { const x = 18 + i * 6.4; c.fillRect(x, 0, 1.6, i % 10 === 0 ? 22 : i % 5 === 0 ? 16 : 10); if (i % 10 === 0) c.fillText(String(i / 10), x - 4, 34); } });
    g.add(put(sc, 0.025, 0.002, 0.0019));
    const jawOut = shape([[-0.012, 0.008], [0.006, 0.008], [0.006, -0.05], [0.002, -0.052], [-0.012, -0.022]]);
    const jawIn = shape([[-0.006, 0.008], [0.004, 0.008], [0.004, 0.03], [0.0, 0.031]]);
    g.add(put(ext(jawOut, 0.0035, m.satin), -0.1, 0, 0)); g.add(put(ext(jawIn, 0.0025, m.satin), -0.1, 0, 0));
    const sl = new THREE.Group();
    sl.add(put(rbox(0.052, 0.028, 0.008, m.satin, 0.002), 0.026, 0, 0.0005));
    const vn = scalePlane(0.04, 0.008, (c, w, h) => { c.fillStyle = '#e9eef2'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 12px sans-serif'; for (let k = 0; k <= 20; k++) { const x = 12 + k * 46; c.fillRect(x, h - (k % 2 ? 12 : 20), 1.6, k % 2 ? 12 : 20); if (k % 2 === 0) c.fillText(String(k / 2), x - 3, 16); } });
    sl.add(put(vn, 0.026, -0.006, 0.0047));
    sl.add(put(ext(shape([[0.012, 0.008], [-0.006, 0.008], [-0.006, -0.05], [-0.002, -0.052], [0.012, -0.022]]), 0.0035, m.satin), 0, 0, 0));
    sl.add(put(ext(shape([[0.006, 0.008], [-0.004, 0.008], [-0.004, 0.03], [0, 0.031]]), 0.0025, m.satin), 0, 0, 0));
    const wheel = cyl(0.006, 0.006, 0.004, m.knurled, 24); sl.add(put(wheel, 0.03, -0.017, 0.006, Math.PI / 2));
    sl.add(put(cyl(0.004, 0.004, 0.006, m.knurled, 18), 0.035, 0.017, 0.004, Math.PI / 2));
    sl.position.x = -0.064; g.add(sl);
    g.add(put(rbox(0.04, 0.003, 0.0015, m.satin, 0.0005), 0.155, 0, 0));
    return g;
  },
  tape() {
    const m = mats(), g = new THREE.Group();
    const body = rr(new THREE.Shape(), -0.036, -0.034, 0.072, 0.07, 0.022);
    g.add(ext(body, 0.03, m.yellow, 0.002));
    [-1, 1].forEach(k => { const side = ext(rr(new THREE.Shape(), -0.032, -0.03, 0.064, 0.062, 0.019), 0.003, m.rubber, 0.001); side.position.z = k * 0.0165; g.add(side); });
    g.add(put(cyl(0.012, 0.012, 0.036, m.chrome), 0.0, 0.0, 0, Math.PI / 2));
    const tt = tex(1024, 64, (c, w, h) => { c.fillStyle = '#f5c400'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 20px sans-serif'; for (let i = 0; i < 160; i++) { const x = i * 6.4; c.fillRect(x, 0, 1.4, i % 10 === 0 ? 28 : i % 5 === 0 ? 18 : 10); if (i % 10 === 0) c.fillText(String(i / 10), x + 3, 50); } c.fillStyle = '#c00'; c.fillRect(0, 58, w, 6); });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.0012, 0.019), [m.yellow, m.yellow, new THREE.MeshStandardMaterial({ map: tt, roughness: 0.45 }), m.yellow, m.yellow, m.yellow]);
    g.add(put(blade, -0.115, -0.031, 0));
    const hook = new THREE.Group(); hook.add(put(rbox(0.002, 0.012, 0.021, m.brass, 0.0005), 0, 0.004, 0)); hook.add(put(rbox(0.006, 0.0015, 0.019, m.brass, 0.0005), 0.003, -0.0012, 0));
    g.add(put(hook, -0.196, -0.031, 0));
    g.add(put(rbox(0.018, 0.008, 0.012, m.black, 0.003), 0.004, 0.037, 0));
    g.add(put(rbox(0.008, 0.05, 0.02, m.chrome, 0.002), 0.039, 0.0, 0));
    return g;
  },
  square() {
    const m = mats(), g = new THREE.Group();
    g.add(put(rbox(0.024, 0.11, 0.014, m.wood, 0.002), 0, 0, 0));
    g.add(put(rbox(0.0025, 0.11, 0.0145, m.brass, 0.0006), 0.0125, 0, 0));
    [-0.035, 0, 0.035].forEach(y => g.add(put(cyl(0.0025, 0.0025, 0.0148, m.brass, 16), 0, y, 0, Math.PI / 2)));
    const blade = rbox(0.17, 0.026, 0.0018, m.satin, 0.0006); g.add(put(blade, 0.085 + 0.012, 0.042, 0));
    g.add(put(scalePlane(0.15, 0.006, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#111'; for (let i = 0; i <= 150; i++) c.fillRect(8 + i * 6.7, 0, 1.4, i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 14); }), 0.1, 0.052, 0.001));
    return g;
  },
  level() {
    const m = mats(), g = new THREE.Group();
    const I = shape([[-0.0125, -0.025], [0.0125, -0.025], [0.0125, -0.021], [0.0015, -0.021], [0.0015, 0.021], [0.0125, 0.021], [0.0125, 0.025], [-0.0125, 0.025], [-0.0125, 0.021], [-0.0015, 0.021], [-0.0015, -0.021], [-0.0125, -0.021]]);
    const beam = ext(I, 0.38, m.alu, 0.0004); beam.rotation.y = Math.PI / 2; g.add(beam);
    [-1, 1].forEach(k => g.add(put(rbox(0.012, 0.052, 0.027, m.rubber, 0.003), k * 0.196, 0, 0)));
    const win = (x, vertical) => {
      const w = new THREE.Group();
      w.add(rbox(0.05, 0.034, 0.03, m.black, 0.004));
      const vial = cyl(0.0055, 0.0055, 0.036, m.glass, 20); vial.rotation.z = vertical ? 0 : Math.PI / 2; w.add(put(vial, 0, 0, 0.012, 0, 0, vertical ? 0 : Math.PI / 2));
      w.add(put(sph(0.004, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.1 })), 0, 0, 0.016));
      [-1, 1].forEach(k => w.add(put(new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.014 : 0.0008, vertical ? 0.0008 : 0.014, 0.001), m.black), vertical ? 0 : k * 0.006, vertical ? k * 0.006 : 0, 0.0182)));
      w.position.x = x; return w;
    };
    g.add(win(0, false)); g.add(win(0.14, true));
    return g;
  },
  punch() {
    const m = mats(), g = new THREE.Group();
    g.add(lathe([[0, -0.06], [0.0008, -0.058], [0.0035, -0.047], [0.0035, -0.04], [0.0062, -0.03], [0.0062, -0.028]], m.satin));
    g.add(lathe([[0.0062, -0.028], [0.0062, 0.045]], m.knurled));
    g.add(lathe([[0.0062, 0.045], [0.0052, 0.052], [0.005, 0.058], [0.0035, 0.06], [0, 0.06]], m.satin));
    return g;
  },
  hammer() {
    const m = mats(), g = new THREE.Group();
    const handle = lathe([[0.0, -0.16], [0.012, -0.158], [0.014, -0.12], [0.012, 0.0], [0.010, 0.11], [0.011, 0.13], [0, 0.132]], m.wood); handle.scale.z = 0.7; g.add(handle);
    const head = new THREE.Group();
    head.add(put(lathe([[0, 0.055], [0.013, 0.054], [0.0155, 0.05], [0.0155, 0.02], [0.017, 0.012], [0.017, -0.012]], m.oxide), 0, 0, 0, 0, 0, -Math.PI / 2));
    head.add(put(rbox(0.034, 0.034, 0.03, m.oxide, 0.005), -0.02, 0, 0));
    head.add(put(lathe([[0.0145, 0], [0.0145, 0.012], [0.012, 0.02], [0.007, 0.025], [0, 0.0265]], m.oxide), -0.036, 0, 0, 0, 0, Math.PI / 2));
    head.add(put(cyl(0.0132, 0.0132, 0.002, m.chrome), 0.074, 0, 0, 0, 0, Math.PI / 2));
    head.position.y = 0.145; g.add(head);
    g.add(put(rbox(0.004, 0.006, 0.026, m.chrome, 0.001), -0.02, 0.163, 0));
    return g;
  },
  file() {
    const m = mats(), g = new THREE.Group();
    const teeth = tex(512, 64, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 1.6; for (let x = -h; x < w; x += 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + h, h); c.stroke(); } c.strokeStyle = '#ddd'; for (let x = -h; x < w; x += 7) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h * .5, 0); c.stroke(); } }, { srgb: false });
    const fm = new THREE.MeshStandardMaterial({ color: 0x6f7780, metalness: 0.9, roughness: 0.6, bumpMap: teeth, bumpScale: 2 });
    const top = shape([[-0.1, -0.007], [0.08, -0.011], [0.1, -0.011], [0.1, 0.011], [0.08, 0.011], [-0.1, 0.007]]);
    const body = ext(top, 0.005, fm, 0.0004); body.rotation.x = Math.PI / 2; g.add(body);
    const tang = ext(shape([[0.1, -0.005], [0.14, -0.002], [0.14, 0.002], [0.1, 0.005]]), 0.004, m.oxide, 0.0003); tang.rotation.x = Math.PI / 2; g.add(tang);
    g.add(put(cyl(0.0125, 0.0125, 0.012, m.brass), 0.118, 0, 0, 0, 0, Math.PI / 2));
    const handle = lathe([[0.0115, 0], [0.014, 0.02], [0.016, 0.06], [0.0145, 0.095], [0.009, 0.105], [0, 0.106]], m.wood); handle.rotation.z = -Math.PI / 2; handle.position.x = 0.124; g.add(handle);
    return g;
  },
  brush() {
    const m = mats(), g = new THREE.Group();
    const hs = new THREE.Shape(); hs.moveTo(-0.06, -0.013); hs.lineTo(0.05, -0.013); hs.quadraticCurveTo(0.1, -0.012, 0.18, -0.008); hs.quadraticCurveTo(0.2, 0, 0.18, 0.008); hs.quadraticCurveTo(0.1, 0.012, 0.05, 0.013); hs.lineTo(-0.06, 0.013); hs.closePath();
    hs.holes.push(new THREE.Path().absarc(0.175, 0, 0.004, 0, Math.PI * 2, true));
    g.add(ext(hs, 0.014, m.wood, 0.0015));
    const bristle = new THREE.CylinderGeometry(0.0006, 0.0006, 0.022, 4);
    const inst = new THREE.InstancedMesh(bristle, m.steel, 6 * 22), mm = new THREE.Matrix4(); let n = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 22; j++) { mm.makeTranslation(-0.055 + j * 0.0052 + (Math.random() - .5) * 0.001, -0.009 + i * 0.0036, -0.017); inst.setMatrixAt(n++, mm.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))); }
    g.add(inst);
    return g;
  },
  spanner() {
    const m = mats(), g = new THREE.Group();
    const shaft = shape([[-0.06, -0.006], [0.06, -0.0075], [0.06, 0.0075], [-0.06, 0.006]]); g.add(ext(shaft, 0.005, m.chrome, 0.0008));
    const ring = new THREE.Shape().absarc(0, 0, 0.02, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 2, r = k % 2 ? 0.0128 : 0.0118; const p = [Math.cos(a) * r, Math.sin(a) * r]; k ? hole.lineTo(...p) : hole.moveTo(...p); } ring.holes.push(hole);
    g.add(put(ext(ring, 0.007, m.chrome, 0.001), 0.075, 0, 0, 0, 0.18, 0));
    const R = 0.022, s = 0.0122, o = new THREE.Shape(); o.moveTo(-0.004, -s);
    for (let k = 0; k <= 24; k++) { const a = -0.62 - k / 24 * (2 * Math.PI - 1.24); o.lineTo(Math.cos(a) * R + 0.008, Math.sin(a) * R); }
    o.lineTo(-0.004, s); o.lineTo(0.002, s); o.lineTo(0.002, -s); o.closePath();
    const open = ext(o, 0.006, m.chrome, 0.0008); put(open, -0.083, 0, 0, 0, 0, 0.26); g.add(open);
    g.add(put(scalePlane(0.04, 0.008, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#333'; c.font = 'bold 120px sans-serif'; c.fillText('24 mm', 40, 150); }), 0, 0, 0.0036));
    return g;
  },
  twrench() { ensureMaterials(); const g = new THREE.Group(); const w = torqueWrench(); w.rotation.z = -Math.PI / 2; g.add(w); return g; },
  pipewrench() {
    const m = mats(), g = new THREE.Group();
    const h = new THREE.Shape(); h.moveTo(-0.02, -0.016); h.lineTo(0.25, -0.012); h.quadraticCurveTo(0.262, 0, 0.25, 0.012); h.lineTo(-0.02, 0.016); h.closePath();
    h.holes.push(new THREE.Path().absarc(0.24, 0, 0.004, 0, Math.PI * 2, true));
    g.add(ext(h, 0.016, m.red, 0.0015));
    g.add(put(rbox(0.07, 0.05, 0.022, m.red, 0.004), -0.03, 0.012, 0));
    const zig = (x0, x1, y, dir) => { const p = [[x0, y]]; for (let x = x0; x < x1; x += 0.004) { p.push([x + 0.002, y + dir * 0.003]); p.push([x + 0.004, y]); } return p; };
    const heel = shape([[-0.05, 0.035], ...zig(-0.05, 0.03, 0.042, 1), [0.03, 0.035]]); g.add(ext(heel, 0.02, m.steel, 0.0005));
    const hook = new THREE.Shape(); hook.moveTo(-0.062, 0.03); hook.lineTo(-0.048, 0.03); hook.lineTo(-0.048, 0.098);
    zig(-0.048, 0.035, 0.098, -1).forEach(p => hook.lineTo(...p)); hook.lineTo(0.035, 0.112); hook.lineTo(-0.062, 0.112); hook.closePath();
    g.add(ext(hook, 0.02, m.steel, 0.0006));
    g.add(put(cyl(0.015, 0.015, 0.022, m.knurled, 24), -0.055, 0.06, 0));
    return g;
  },
  hacksaw() {
    const m = mats(), g = new THREE.Group();
    const path = new THREE.CurvePath(); const P = (x, y) => new THREE.Vector3(x, y, 0);
    path.add(new THREE.LineCurve3(P(-0.17, -0.004), P(-0.17, 0.075))); path.add(new THREE.QuadraticBezierCurve3(P(-0.17, 0.075), P(-0.17, 0.09), P(-0.155, 0.09)));
    path.add(new THREE.LineCurve3(P(-0.155, 0.09), P(0.135, 0.09))); path.add(new THREE.QuadraticBezierCurve3(P(0.135, 0.09), P(0.15, 0.09), P(0.15, 0.075)));
    path.add(new THREE.LineCurve3(P(0.15, 0.075), P(0.15, 0.0)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 120, 0.0055, 12, false), m.blue));
    const grip = new THREE.Shape(); grip.moveTo(0.14, 0.03); grip.quadraticCurveTo(0.2, 0.03, 0.215, -0.02); grip.quadraticCurveTo(0.225, -0.07, 0.2, -0.085); grip.lineTo(0.17, -0.085); grip.quadraticCurveTo(0.175, -0.03, 0.14, -0.01); grip.closePath();
    grip.holes.push(rr(new THREE.Path(), 0.16, -0.06, 0.03, 0.045, 0.012));
    g.add(ext(grip, 0.024, m.rubber, 0.003));
    g.add(put(rbox(0.32, 0.012, 0.0008, m.oxide, 0.0003), -0.01, -0.002, 0));
    const teeth = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0013, 0.0026, 3), m.satin, 100), mm = new THREE.Matrix4();
    for (let i = 0; i < 100; i++) { mm.compose(new THREE.Vector3(-0.165 + i * 0.0031, -0.0092, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, -0.3)), new THREE.Vector3(1, 1, 0.5)); teeth.setMatrixAt(i, mm); }
    g.add(teeth);
    const wing = new THREE.Group(); wing.add(cyl(0.006, 0.006, 0.01, m.chrome)); wing.add(put(rbox(0.004, 0.026, 0.006, m.chrome, 0.0015), 0, 0, 0));
    g.add(put(wing, -0.18, -0.002, 0, 0, 0, Math.PI / 2));
    return g;
  },
  cutter() {
    const m = mats(), g = new THREE.Group();
    const f = rr(new THREE.Shape(), -0.048, -0.064, 0.096, 0.13, 0.016); f.holes.push(rr(new THREE.Path(), -0.032, -0.046, 0.064, 0.084, 0.01));
    g.add(ext(f, 0.022, m.red, 0.002));
    [-1, 1].forEach(k => g.add(put(cyl(0.008, 0.008, 0.026, m.chrome), k * 0.016, -0.034, 0, Math.PI / 2)));
    g.add(put(rbox(0.04, 0.016, 0.024, m.red, 0.003), 0, 0.03, 0));
    g.add(put(cyl(0.016, 0.016, 0.0025, m.chrome, 48), 0, 0.016, 0, Math.PI / 2));
    g.add(put(cyl(0.005, 0.005, 0.09, m.satin), 0, 0.105, 0));
    g.add(put(cyl(0.013, 0.013, 0.06, m.rubberRed), 0, 0.17, 0));
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xa9b1b9, metalness: 0.9, roughness: 0.4, side: THREE.DoubleSide }));
    g.add(put(pipe, 0, -0.016, 0, Math.PI / 2));
    return g;
  },
  threader() {
    const m = mats(), g = new THREE.Group();
    g.add(put(lathe([[0.028, -0.025], [0.046, -0.025], [0.048, -0.02], [0.048, 0.02], [0.046, 0.025], [0.028, 0.025]], m.oxide), 0, 0, 0, Math.PI / 2));
    const die = cyl(0.028, 0.028, 0.052, m.satin, 6); g.add(put(die, 0, 0, 0, Math.PI / 2));
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + Math.PI / 4; g.add(put(rbox(0.012, 0.004, 0.054, m.oxide, 0.001), Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0, 0, 0, a)); }
    g.add(put(lathe([[0.016, -0.026], [0.016, 0.026]], m.black), 0, 0, 0, Math.PI / 2));
    g.add(put(rbox(0.05, 0.032, 0.03, m.red, 0.004), 0.07, 0, 0));
    g.add(put(cyl(0.005, 0.005, 0.03, m.chrome), 0.07, 0.028, 0));
    g.add(put(cyl(0.012, 0.012, 0.32, m.satin), 0.26, 0, 0, 0, 0, Math.PI / 2));
    g.add(put(cyl(0.016, 0.016, 0.11, m.rubber), 0.39, 0, 0, 0, 0, Math.PI / 2));
    return g;
  },
  vise() {
    const m = mats(), g = new THREE.Group();
    g.add(put(lathe([[0, 0], [0.075, 0], [0.078, 0.004], [0.075, 0.018], [0, 0.018]], m.castBlue, 64), 0, -0.02, 0));
    g.add(put(rbox(0.11, 0.07, 0.08, m.castBlue, 0.01), 0.05, 0.035, 0));
    g.add(put(rbox(0.06, 0.04, 0.12, m.castBlue, 0.008), 0.08, 0.09, 0));
    const jawTex = tex(128, 64, (c, w, h) => { c.fillStyle = '#808080'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 3; for (let x = 0; x < w; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }, { srgb: false });
    const jm = new THREE.MeshStandardMaterial({ color: 0x9aa2aa, metalness: 1, roughness: 0.45, bumpMap: jawTex, bumpScale: 1.2 });
    g.add(put(rbox(0.008, 0.032, 0.12, jm, 0.001), 0.046, 0.094, 0));
    const mov = new THREE.Group();
    mov.add(put(rbox(0.06, 0.05, 0.12, m.castBlue, 0.008), 0, 0.09, 0)); mov.add(put(rbox(0.12, 0.04, 0.06, m.castBlue, 0.008), -0.06, 0.05, 0));
    mov.add(put(rbox(0.008, 0.032, 0.12, jm, 0.001), 0.034, 0.094, 0));
    mov.position.x = -0.03; g.add(mov);
    g.add(put(cyl(0.009, 0.009, 0.08, m.satin), -0.13, 0.05, 0, 0, 0, Math.PI / 2));
    g.add(put(cyl(0.005, 0.005, 0.15, m.chrome), -0.175, 0.05, 0, Math.PI / 2));
    [-1, 1].forEach(k => g.add(put(sph(0.009, m.chrome), -0.175, 0.05, k * 0.075)));
    g.add(put(rbox(0.05, 0.008, 0.07, m.satin, 0.002), 0.12, 0.114, 0));
    return g;
  },
  flange() { ensureMaterials(); const f = weldNeckFlange(); const g = new THREE.Group(); f.group.rotation.x = Math.PI / 2; g.add(f.group); return g; },
  gasketPart() { ensureMaterials(); const g = new THREE.Group(); const gs = gasket(); gs.rotation.y = Math.PI / 2; g.add(gs); return g; },
  elbow() {
    ensureMaterials();
    const g = new THREE.Group(), R = DIM.elbowR;
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R, DIM.pipeOD / 2, 36, 64, Math.PI / 2), MAT.steel), new THREE.Mesh(new THREE.TorusGeometry(R, DIM.pipeID / 2, 24, 48, Math.PI / 2), MAT.steelInside));
    const ring = (x, y, rx, ry) => put(new THREE.Mesh(new THREE.RingGeometry(DIM.pipeID / 2, DIM.pipeOD / 2, 40), MAT.steel), x, y, 0, rx, ry, 0);
    g.add(ring(R, 0, Math.PI / 2, 0), ring(0, R, 0, Math.PI / 2));
    return g;
  },
  tee() { ensureMaterials(); const g = new THREE.Group(); const run = pipeY(-0.14, 0.14); run.rotation.z = Math.PI / 2; g.add(run); g.add(pipeY(0.0, 0.14)); g.add(new THREE.Mesh(new THREE.SphereGeometry(DIM.pipeOD / 2 * 1.02, 32, 16), MAT.steel)); return g; },
  reducer() {
    ensureMaterials();
    const pts = [[0.0445, -0.06], [0.0445, -0.03], [0.0572, 0.03], [0.0572, 0.06]];
    const g = new THREE.Group(); g.add(lathe(pts, MAT.steel, 64), lathe(pts.map(([r, y]) => [r - 0.005, y]), MAT.steelInside)); g.rotation.z = Math.PI / 2;
    const w = new THREE.Group(); w.add(g); return w;
  },
  valve() {
    const m = mats(), g = new THREE.Group();
    g.add(put(lathe([[0.03, -0.1], [0.05, -0.1], [0.05, -0.085], [0.06, -0.06], [0.075, -0.02], [0.075, 0.02], [0.06, 0.06], [0.05, 0.085], [0.05, 0.1], [0.03, 0.1]], m.castIron), 0, 0, 0, 0, 0, Math.PI / 2));
    [-1, 1].forEach(s => { g.add(put(cyl(0.1, 0.1, 0.02, m.castIron, 48), s * 0.11, 0, 0, 0, 0, Math.PI / 2));
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; g.add(put(cyl(0.0075, 0.0075, 0.034, m.oxide, 6), s * 0.11, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0, 0, Math.PI / 2)); } });
    g.add(put(lathe([[0, 0.05], [0.055, 0.05], [0.055, 0.07], [0.045, 0.09], [0.04, 0.16], [0.065, 0.16], [0.065, 0.178], [0, 0.178]], m.castIron), 0, 0, 0));
    g.add(put(cyl(0.009, 0.009, 0.16, m.chrome), 0, 0.25, 0));
    const wheel = new THREE.Group();
    wheel.add(put(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 12, 48), m.red), 0, 0, 0, Math.PI / 2));
    for (let k = 0; k < 3; k++) { const sp = rbox(0.085, 0.008, 0.012, m.red, 0.003); sp.position.set(Math.cos(k * 2.094) * 0.042, 0, Math.sin(k * 2.094) * 0.042); sp.rotation.y = -k * 2.094; wheel.add(sp); }
    wheel.add(cyl(0.016, 0.016, 0.02, m.red)); wheel.position.y = 0.3; g.add(wheel);
    return g;
  },
  stud() { ensureMaterials(); const g = new THREE.Group(); const s = studBolt(); s.scale.setScalar(2.2); g.add(s); return g; },
};

// anchors (model coordinates) for the redesigned hand tools; components keep the data file's anchors
const ANCH = {
  caliper: [[0.06, 0.004, 0.003], [-0.1, -0.04, 0], [-0.064, -0.04, 0], [-0.038, -0.006, 0.005], [-0.029, 0.017, 0.007], [0.165, 0, 0]],
  tape: [[0.02, 0.02, 0.016], [-0.12, -0.03, 0.01], [-0.198, -0.026, 0], [0.004, 0.042, 0]],
  square: [[0, -0.03, 0.008], [0.12, 0.042, 0.002]],
  level: [[0.1, 0.02, 0.013], [0, 0, 0.018], [0.14, 0, 0.018]],
  punch: [[0.0065, 0.01, 0], [0, -0.058, 0], [0, 0.059, 0]],
  hammer: [[0.075, 0.145, 0], [-0.062, 0.145, 0], [0, -0.06, 0.01], [-0.02, 0.166, 0]],
  file: [[-0.02, 0.003, 0], [-0.1, 0, 0], [0.13, 0, 0], [0.19, 0.015, 0]],
  brush: [[-0.02, 0, -0.024], [0.0, 0.012, -0.004], [0.13, 0, 0.008]],
  spanner: [[0.075, 0.02, 0], [-0.1, 0, 0], [0, 0.006, 0.004]],
  pipewrench: [[0.0, 0.106, 0.011], [0.0, 0.04, 0.011], [-0.055, 0.075, 0], [0.15, 0, 0.009]],
  hacksaw: [[0, 0.09, 0.006], [-0.05, -0.002, 0], [0.19, -0.04, 0.013], [-0.18, -0.002, 0.008]],
  cutter: [[0, 0.016, 0.012], [0.016, -0.034, 0.013], [0, 0.11, 0.006], [0.048, 0, 0.012]],
  threader: [[0, 0.048, 0], [0, 0, 0.027], [0.07, 0.03, 0.016], [0.26, 0.012, 0]],
  vise: [[0.05, 0.11, 0.06], [-0.004, 0.11, 0.06], [-0.13, 0.06, 0.01], [-0.175, 0.05, 0.075], [0.12, 0.12, 0]],
};
export { CATS };
export const ITEMS = DATA.map(d => ({ ...d, build: B[d.b], parts: d.parts.map((p, i) => ({ ...p, at: ANCH[d.id]?.[i] || p.at })) }));

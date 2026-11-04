// Parametric 3D models for the pipe-components library: pipes, fittings, flanges, gaskets, valves, strainers,
// joints, supports, instruments and marine fittings. Units: metres. Pipe axis = X unless stated.
// Each builder returns a Group whose userData.anchors holds the callout points for that item's parts (same order).
import * as THREE from 'three';
import { mats, tex, normalTex, rbox, cyl, sph, put, shape, ext, lathe, scalePlane } from './tools3d.js';

const OD4 = 0.1143, W4 = 0.006, ID4 = OD4 - 2 * W4;       // DN100 Sch40
const OD1 = 0.0334, ID1 = 0.0266;                          // DN25 Sch40
let X = null;
function xm() {
  if (X) return X;
  const m = mats();
  const threadN = normalTex(64, 256, (g, w, h) => { const grd = g.createLinearGradient(0, 0, 0, 16); grd.addColorStop(0, '#000'); grd.addColorStop(.5, '#fff'); grd.addColorStop(1, '#000'); g.fillStyle = grd; for (let y = 0; y < h; y += 16) { g.save(); g.translate(0, y); g.fillRect(0, 0, w, 16); g.restore(); } }, 4, [1, 6]);
  const braidN = normalTex(128, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = -w; i < w * 2; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } }, 3, [10, 2]);
  const P = o => new THREE.MeshPhysicalMaterial(o);
  X = {
    ...m,
    cs: P({ color: 0x2f3338, metalness: 0.7, roughness: 0.55, roughnessMap: m.tex.wear, normalMap: m.tex.castN, normalScale: new THREE.Vector2(.25, .25) }),      // carbon steel, mill scale
    csIn: P({ color: 0x5a4a3c, metalness: 0.4, roughness: 0.8, side: THREE.BackSide }),
    ss: P({ color: 0xd3d8dd, metalness: 1, roughness: 0.28, roughnessMap: m.tex.brushed, anisotropy: 0.8 }),
    galv: P({ color: 0xa9b1b6, metalness: 0.85, roughness: 0.45, roughnessMap: m.tex.wear, normalMap: m.tex.castN, normalScale: new THREE.Vector2(.15, .15) }),
    cuni: P({ color: 0xc98b66, metalness: 1, roughness: 0.35, roughnessMap: m.tex.brushed }),
    grp: P({ color: 0x9fae3c, metalness: 0, roughness: 0.4, clearcoat: 0.6, transmission: 0.05 }),
    hdpe: P({ color: 0x15171a, metalness: 0, roughness: 0.55, clearcoat: 0.3 }),
    stripe: P({ color: 0x1f6fe0, roughness: 0.5 }),
    thread: P({ color: 0xbfc5cb, metalness: 1, roughness: 0.3, normalMap: threadN, normalScale: new THREE.Vector2(1.5, 1.5) }),
    braid: P({ color: 0xc8ced4, metalness: 1, roughness: 0.32, normalMap: braidN, normalScale: new THREE.Vector2(1.2, 1.2) }),
    malleable: P({ color: 0x9aa2a8, metalness: 0.8, roughness: 0.5, normalMap: m.tex.castN, normalScale: new THREE.Vector2(.5, .5) }),
    graphite: P({ color: 0x3a3d42, metalness: 0.3, roughness: 0.7 }),
    gasketWhite: P({ color: 0xe9e6dc, roughness: 0.85 }),
    green: P({ color: 0x1f8a4c, metalness: 0.1, roughness: 0.4, clearcoat: 0.8 }),
    dial: null,
  };
  return X;
}
// lathe axis Y → world +X (wrapped in a group so later put()/position calls don't undo the turn)
const AX = o => { o.rotation.z = -Math.PI / 2; const g = new THREE.Group(); g.add(o); return g; };
/** Hollow pipe piece along X from x0 to x1. */
function pipe(ro, ri, x0, x1, mo, mi) {
  const g = new THREE.Group();
  g.add(AX(lathe([[ri, x0], [ro, x0], [ro, x1], [ri, x1]], mo, 64)));
  g.add(AX(lathe([[ri, x0], [ri, x1]], mi || xm().csIn, 48)));
  return g;
}
/** Pipe bend: centre of curvature at origin, from angle 0 (end on +X axis… pointing +Y) sweeping `ang`. */
function bend(R, ro, ri, ang, mo, mi) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(R, ro, 40, 64, ang), mo));
  const inn = new THREE.Mesh(new THREE.TorusGeometry(R, ri, 24, 48, ang), mi || xm().csIn); g.add(inn);
  const ring = (a) => { const r = new THREE.Mesh(new THREE.RingGeometry(ri, ro, 48), mo); r.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); r.rotation.set(Math.PI / 2, 0, 0); r.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), a); return r; };
  g.add(ring(0), ring(ang));
  return g;
}
/** Flange plate with real bolt holes, axis X, face at x = 0 extending to +x by t. */
function plate(od, bore, t, n, bc, hd, m) {
  const s = new THREE.Shape().absarc(0, 0, od / 2, 0, Math.PI * 2, false);
  if (bore > 0) s.holes.push(new THREE.Path().absarc(0, 0, bore / 2, 0, Math.PI * 2, true));
  for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * Math.PI * 2; s.holes.push(new THREE.Path().absarc(Math.cos(a) * bc / 2, Math.sin(a) * bc / 2, hd / 2, 0, Math.PI * 2, true)); }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0012, bevelSegments: 2, curveSegments: 48 });
  const mesh = new THREE.Mesh(g, m); mesh.rotation.y = Math.PI / 2; return mesh;     // extrusion Z → +X
}
const F4 = { od: 0.229, bc: 0.1905, n: 8, hd: 0.019, t: 0.024 };    // Class 150 DN100
function raisedFace(x, m) { return put(AX(lathe([[ID4 / 2, 0], [0.0785, 0], [0.0785, 0.002], [ID4 / 2, 0.002]], m, 64)), x, 0, 0); }
function hex(af, h, m) { const c = cyl(af / Math.sqrt(3), af / Math.sqrt(3), h, m, 6); return c; }
function boltSet(n, bc, x0, len, m, d = 0.016) {
  const g = new THREE.Group();
  for (let k = 0; k < n; k++) {
    const a = (k + 0.5) / n * Math.PI * 2, y = Math.cos(a) * bc / 2, z = Math.sin(a) * bc / 2;
    g.add(put(cyl(d / 2, d / 2, len, xm().thread, 16), x0 + len / 2, y, z, 0, 0, Math.PI / 2));
    [x0 + 0.008, x0 + len - 0.008].forEach(x => g.add(put(hex(d * 1.55, 0.014, xm().oxide), x, y, z, 0, 0, Math.PI / 2)));
  }
  return g;
}
function handwheel(r, m) {
  const w = new THREE.Group();
  w.add(put(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.09, 12, 48), m), 0, 0, 0, Math.PI / 2));
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const sp = rbox(r, r * 0.08, r * 0.12, m, r * 0.03); sp.position.set(Math.cos(a) * r / 2, 0, Math.sin(a) * r / 2); sp.rotation.y = -a; w.add(sp); }
  w.add(cyl(r * 0.18, r * 0.18, r * 0.22, m));
  return w;
}
const A = (g, pts) => { g.userData.anchors = pts; return g; };

export const CB = {
  // ---------------- pipes ----------------
  pipeCS() { const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.25, 0.25, x.cs); g.add(put(scalePlane(0.2, 0.012, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#f4f4f4'; c.font = 'bold 30px monospace'; c.fillText('ASTM A106 Gr.B  4" SCH40  SMLS  HEAT 4471', 10, 34); }, { metalness: 0 }), 0, 0, OD4 / 2 + 0.0005)); return A(g, [[0.1, 0, OD4 / 2], [0.25, ID4 / 2 + 0.003, 0], [0.25, 0, 0], [0, 0, OD4 / 2 + 0.001]]); },
  pipeSS() { const x = xm(), g = pipe(0.0603 / 2, 0.0548 / 2, -0.2, 0.2, x.ss, x.ss); g.add(put(scalePlane(0.16, 0.008, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#123'; c.font = 'bold 30px monospace'; c.fillText('A312 TP316L  2" SCH10S', 10, 34); }, { metalness: 0 }), 0, 0, 0.0306)); return A(g, [[0.05, 0, 0.03], [0.2, 0.028, 0], [0, 0, 0.0308]]); },
  pipeGalv() { const x = xm(), g = pipe(OD1 / 2, ID1 / 2, -0.12, 0.1, x.galv); g.add(put(AX(lathe([[OD1 / 2 - 0.0006, 0.1], [OD1 / 2 - 0.0006, 0.122]], x.thread)), 0, 0, 0)); g.add(put(AX(lathe([[ID1 / 2, 0.1], [ID1 / 2, 0.122]], x.csIn)), 0, 0, 0)); return A(g, [[-0.05, 0, OD1 / 2], [0.112, 0.016, 0]]); },
  pipeCuNi() { const x = xm(), g = pipe(0.0889 / 2, 0.0849 / 2, -0.22, 0.22, x.cuni, x.cuni); return A(g, [[0.05, 0, 0.0445], [0.22, 0.043, 0]]); },
  pipeGRP() { const x = xm(), g = pipe(0.11 / 2, 0.1 / 2, -0.22, 0.12, x.grp, x.grp); g.add(put(AX(lathe([[0.055, 0.12], [0.066, 0.13], [0.066, 0.23], [0.055, 0.23]], x.grp)), 0, 0, 0)); return A(g, [[-0.05, 0, 0.055], [0.18, 0, 0.066]]); },
  pipeHDPE() { const x = xm(), g = pipe(0.11 / 2, 0.09 / 2, -0.22, 0.22, x.hdpe, x.hdpe); [0, 1, 2].forEach(k => g.add(put(rbox(0.44, 0.003, 0.004, x.stripe, 0.001), 0, Math.cos(k * 2.09) * 0.0551, Math.sin(k * 2.09) * 0.0551, k * 2.09))); return A(g, [[0.05, 0.0551, 0], [0.22, 0.045, 0]]); },

  // ---------------- butt-weld fittings ----------------
  elbow90LR() { const x = xm(), g = bend(0.1524, OD4 / 2, ID4 / 2, Math.PI / 2, x.cs); return A(g, [[0.1524 * Math.cos(.78), 0.1524 * Math.sin(.78), OD4 / 2], [0.1524, 0, 0], [0, 0, 0]]); },
  elbow90SR() { const x = xm(), g = bend(0.1016, OD4 / 2, ID4 / 2, Math.PI / 2, x.cs); return A(g, [[0.1016 * Math.cos(.78), 0.1016 * Math.sin(.78), OD4 / 2], [0.1016, 0, 0]]); },
  elbow45() { const x = xm(), g = bend(0.1524, OD4 / 2, ID4 / 2, Math.PI / 4, x.cs); return A(g, [[0.1524 * Math.cos(.39), 0.1524 * Math.sin(.39), OD4 / 2], [0.1524, 0, 0]]); },
  return180() { const x = xm(), g = bend(0.1524, OD4 / 2, ID4 / 2, Math.PI, x.cs); return A(g, [[0, 0.1524, OD4 / 2], [0.1524, 0, 0], [-0.1524, 0, 0]]); },
  teeEqual() { const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.105, 0.105, x.cs); const br = pipe(OD4 / 2, ID4 / 2, 0, 0.105, x.cs); br.rotation.z = Math.PI / 2; g.add(br); g.add(new THREE.Mesh(new THREE.SphereGeometry(OD4 / 2 * 1.015, 32, 16), x.cs)); return A(g, [[-0.08, 0, OD4 / 2], [0, 0.1, OD4 / 2], [0, 0, OD4 / 2]]); },
  teeReducing() { const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.105, 0.105, x.cs); const br = pipe(0.0603 / 2, 0.0525 / 2, 0, 0.098, x.cs); br.rotation.z = Math.PI / 2; g.add(br); return A(g, [[-0.08, 0, OD4 / 2], [0, 0.09, 0.03]]); },
  reducerConc() { const x = xm(), g = new THREE.Group(), pts = [[0.0572, -0.06], [0.0572, -0.035], [0.0302, 0.035], [0.0302, 0.06]]; g.add(AX(lathe(pts, x.cs, 64)), AX(lathe(pts.map(([r, y]) => [r - 0.005, y]), x.csIn, 48))); return A(g, [[-0.05, 0.0572, 0], [0.05, 0.0302, 0], [0, 0.045, 0]]); },
  reducerEcc() {
    const x = xm(), g = new THREE.Group(), N = 64, segs = 24, pos = [], idx = [];
    for (let i = 0; i <= segs; i++) { const t = i / segs, xx = -0.06 + t * 0.12, s = Math.min(1, Math.max(0, (xx + 0.035) / 0.07)), r = 0.0572 + (0.0302 - 0.0572) * s, cy = (0.0572 - r); for (let j = 0; j <= N; j++) { const a = j / N * Math.PI * 2; pos.push(xx, cy * -1 + Math.cos(a) * r, Math.sin(a) * r); } }
    for (let i = 0; i < segs; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = x.cs.clone(); mat.side = THREE.DoubleSide; g.add(new THREE.Mesh(geo, mat));
    return A(g, [[0, 0.0572, 0], [-0.05, -0.0572, 0], [0.055, -0.03, 0]]);
  },
  capBW() { const x = xm(), g = new THREE.Group(); const pts = [[OD4 / 2, -0.03]]; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI / 2; pts.push([Math.cos(a) * OD4 / 2, Math.sin(a) * 0.032]); } g.add(AX(lathe(pts, x.cs, 64))); g.add(AX(lathe([[ID4 / 2, -0.03], [OD4 / 2, -0.03]], x.cs, 48))); return A(g, [[0.025, 0.03, 0], [-0.03, 0.05, 0]]); },
  stubEnd() { const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.1, 0.01, x.ss, x.ss); g.add(put(AX(lathe([[ID4 / 2, 0], [0.079, 0], [0.079, 0.01], [ID4 / 2, 0.01]], x.ss, 64)), 0, 0, 0)); const lj = plate(F4.od, 0.122, 0.022, F4.n, F4.bc, F4.hd, x.oxide); lj.position.x = -0.04; g.add(lj); return A(g, [[0.005, 0.075, 0], [-0.03, 0.105, 0], [-0.08, 0, OD4 / 2]]); },

  // ---------------- threaded / socket-weld (DN25) ----------------
  coupling() { const x = xm(), g = new THREE.Group(); g.add(AX(lathe([[0.0168, -0.025], [0.0205, -0.025], [0.0215, -0.022], [0.0215, 0.022], [0.0205, 0.025], [0.0168, 0.025]], x.galv, 48))); g.add(AX(lathe([[0.0168, -0.025], [0.0168, 0.025]], x.thread, 40))); return A(g, [[0, 0.0215, 0], [0.025, 0.017, 0]]); },
  halfCoupling() { const x = xm(), g = pipe(0.1096, 0.1014, -0.14, 0.14, x.cs); g.add(lathe([[0.0168, 0.1], [0.0215, 0.1], [0.0215, 0.145], [0.0168, 0.145]], x.forged, 40)); g.add(lathe([[0.0168, 0.11], [0.0168, 0.145]], x.thread, 32)); return A(g, [[0, 0.13, 0.0215], [0.1, 0.1, 0]]); },
  union() {
    const x = xm(), g = new THREE.Group();
    g.add(AX(lathe([[0.0168, -0.045], [0.022, -0.045], [0.022, -0.012], [0.026, -0.012], [0.026, -0.004], [0.0168, -0.004]], x.galv, 6)));
    g.add(AX(lathe([[0.0168, 0.004], [0.026, 0.004], [0.026, 0.012], [0.022, 0.012], [0.022, 0.045], [0.0168, 0.045]], x.galv, 48)));
    g.add(put(hex(0.06, 0.03, x.malleable), 0.006, 0, 0, 0, 0, Math.PI / 2));
    return A(g, [[-0.03, 0.022, 0], [0.006, 0.034, 0], [0.03, 0.022, 0]]);
  },
  nipple() { const x = xm(), g = pipe(OD1 / 2, ID1 / 2, -0.03, 0.03, x.galv); [-1, 1].forEach(k => g.add(AX(lathe([[OD1 / 2 + 0.0003, k * 0.012], [OD1 / 2 + 0.0003, k * 0.05]].sort((a, b) => a[1] - b[1]), x.thread)))); return A(g, [[0, OD1 / 2, 0], [0.04, OD1 / 2, 0]]); },
  plug() { const x = xm(), g = new THREE.Group(); g.add(AX(lathe([[0, 0], [OD1 / 2, 0], [OD1 / 2 - 0.002, 0.024], [0, 0.024]], x.thread))); g.add(put(rbox(0.022, 0.022, 0.016, x.malleable, 0.002), -0.008, 0, 0)); return A(g, [[0.012, OD1 / 2, 0], [-0.008, 0.012, 0]]); },
  bushing() { const x = xm(), g = new THREE.Group(); g.add(AX(lathe([[0.0115, 0], [OD1 / 2, 0], [OD1 / 2 - 0.002, 0.02], [0.0115, 0.02]], x.thread))); g.add(put(hex(0.041, 0.01, x.malleable), -0.005, 0, 0, 0, 0, Math.PI / 2)); g.add(AX(lathe([[0.0105, -0.01], [0.0105, 0.02]], x.thread, 32))); return A(g, [[0.01, OD1 / 2, 0], [-0.005, 0.022, 0], [0.02, 0.0105, 0]]); },
  elbowThreaded() { const x = xm(), g = bend(0.028, 0.0215, 0.0168, Math.PI / 2, x.malleable, x.thread); [0, 1].forEach(k => { const b = new THREE.Mesh(new THREE.TorusGeometry(0.0222, 0.0022, 8, 32), x.malleable); if (k) { b.position.set(0, 0.028, 0); b.rotation.y = Math.PI / 2; } else { b.position.set(0.028, 0, 0); b.rotation.x = Math.PI / 2; } g.add(b); }); return A(g, [[0.02, 0.02, 0.02], [0.028, 0, 0]]); },
  swage() { const x = xm(), g = new THREE.Group(), pts = [[0.0302, -0.07], [0.0302, -0.03], [0.0168, 0.03], [0.0168, 0.07]]; g.add(AX(lathe(pts, x.cs, 48))); g.add(AX(lathe([[0.0169, 0.045], [0.0169, 0.07]], x.thread))); return A(g, [[-0.05, 0.0302, 0], [0.06, 0.017, 0]]); },
  // ---------------- branch outlets (olets) on a DN200 run ----------------
  weldolet() { const x = xm(), g = pipe(0.1096, 0.1014, -0.14, 0.14, x.cs); g.add(put(lathe([[0.0168, 0.1], [0.04, 0.1], [0.022, 0.135], [0.0168, 0.135]], x.forged, 40), 0, 0, 0)); return A(g, [[0, 0.125, 0.02], [0.1, 0.1, 0]]); },
  sockolet() { const x = xm(), g = pipe(0.1096, 0.1014, -0.14, 0.14, x.cs); g.add(lathe([[0.0168, 0.1], [0.042, 0.1], [0.026, 0.132], [0.026, 0.148], [0.018, 0.148]], x.forged, 40)); return A(g, [[0, 0.14, 0.025], [0.1, 0.1, 0]]); },
  threadolet() { const x = xm(), g = pipe(0.1096, 0.1014, -0.14, 0.14, x.cs); g.add(lathe([[0.0168, 0.1], [0.042, 0.1], [0.026, 0.132], [0.026, 0.148], [0.0168, 0.148]], x.forged, 40)); g.add(lathe([[0.0168, 0.12], [0.0168, 0.148]], x.thread, 32)); return A(g, [[0, 0.14, 0.025], [0.1, 0.1, 0]]); },

  // ---------------- flanges ----------------
  flangeWN() { const x = xm(), g = new THREE.Group(); g.add(plate(F4.od, ID4, F4.t, F4.n, F4.bc, F4.hd, x.forged)); g.add(raisedFace(-0.002, x.ground)); g.add(put(AX(lathe([[ID4 / 2, F4.t], [0.068, F4.t], [OD4 / 2, 0.076], [ID4 / 2, 0.076]], x.forged, 64)), 0, 0, 0)); g.add(AX(lathe([[ID4 / 2, -0.002], [ID4 / 2, 0.076]], x.csIn))); return A(g, [[0.05, 0.06, 0], [0.012, 0.105, 0], [-0.002, 0.07, 0], [0.012, F4.bc / 2 * Math.cos(Math.PI / 8), F4.bc / 2 * Math.sin(Math.PI / 8)]]); },
  flangeSO() { const x = xm(), g = new THREE.Group(); g.add(plate(F4.od, OD4 + 0.002, F4.t, F4.n, F4.bc, F4.hd, x.forged)); g.add(raisedFace(-0.002, x.ground)); g.add(put(AX(lathe([[OD4 / 2 + 0.001, F4.t], [0.068, F4.t], [0.068, 0.035], [OD4 / 2 + 0.001, 0.04]], x.forged, 64)), 0, 0, 0)); g.add(pipe(OD4 / 2, ID4 / 2, 0.004, 0.16, x.cs)); return A(g, [[0.012, 0.105, 0], [0.03, 0.065, 0], [0.1, 0, OD4 / 2]]); },
  flangeBlind() { const x = xm(), g = new THREE.Group(); g.add(plate(F4.od, 0, F4.t, F4.n, F4.bc, F4.hd, x.forged)); g.add(put(AX(lathe([[0, 0], [0.0785, 0], [0.0785, 0.002], [0, 0.002]], x.ground, 64)), -0.002, 0, 0)); return A(g, [[-0.002, 0.03, 0], [0.012, 0.105, 0]]); },
  flangeSW() { const x = xm(), g = new THREE.Group(); g.add(plate(0.108, 0.0279, 0.016, 4, 0.0794, 0.016, x.forged)); g.add(put(AX(lathe([[0.017, 0.016], [0.026, 0.016], [0.026, 0.035], [0.017, 0.035]], x.forged)), 0, 0, 0)); g.add(AX(lathe([[0.0139, -0.001], [0.0139, 0.02], [0.017, 0.02]], x.forged))); return A(g, [[0.008, 0.045, 0], [0.03, 0.026, 0], [0.012, 0.0, 0.0139]]); },
  flangeThreaded() { const x = xm(), g = new THREE.Group(); g.add(plate(0.108, 0.034, 0.016, 4, 0.0794, 0.016, x.forged)); g.add(put(AX(lathe([[0.017, 0.016], [0.026, 0.016], [0.026, 0.035], [0.017, 0.035]], x.forged)), 0, 0, 0)); g.add(AX(lathe([[0.0167, -0.001], [0.0167, 0.035]], x.thread))); return A(g, [[0.008, 0.045, 0], [0.02, 0, 0.0167]]); },
  spectacle() {
    const x = xm(), g = new THREE.Group(), t = 0.012;
    g.add(plate(0.158, 0, t, 0, 0, 0, x.forged)); const o = plate(0.158, ID4, t, 0, 0, 0, x.forged); o.position.y = 0.2; g.add(o);
    g.add(put(rbox(t, 0.06, 0.04, x.forged, 0.002), t / 2, 0.1, 0));
    return A(g, [[t, 0.02, 0], [t, 0.2 + 0.068, 0], [t / 2, 0.1, 0.02]]);
  },
  // ---------------- gaskets & bolting ----------------
  gasketFlat() { const x = xm(), g = new THREE.Group(); g.add(plate(0.175, ID4, 0.003, 0, 0, 0, x.gasketWhite)); return A(g, [[0.003, 0.075, 0], [0.003, 0.055, 0]]); },
  gasketSW() {
    const x = xm(), g = new THREE.Group();
    g.add(plate(0.149, 0.119, 0.003, 0, 0, 0, x.yellow));                // outer centring ring (colour = material code)
    const wind = new THREE.Group(); for (let k = 0; k < 10; k++) { const r = 0.0545 + k * 0.0006; wind.add(put(AX(lathe([[r, -0.0021], [r + 0.0005, -0.0021], [r + 0.0005, 0.0051], [r, 0.0051]], k % 2 ? x.graphite : x.ss, 64)), 0, 0, 0)); }
    g.add(wind); g.add(plate(0.108, ID4, 0.003, 0, 0, 0, x.ss));
    return A(g, [[0.003, 0.07, 0], [0.005, 0.0565, 0], [0.003, 0.052, 0]]);
  },
  gasketRTJ() { const x = xm(), g = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.0055, 16, 80), x.satin); t.scale.z = 1.5; t.rotation.y = Math.PI / 2; g.add(t); return A(g, [[0, 0.06, 0], [0.008, 0.06, 0]]); },
  studBolt() { const x = xm(), g = new THREE.Group(); g.add(put(cyl(0.008, 0.008, 0.11, x.thread, 20), 0, 0, 0, 0, 0, Math.PI / 2)); [-0.04, 0.04].forEach(px => g.add(put(hex(0.0254, 0.016, x.oxide), px, 0, 0, 0, 0, Math.PI / 2))); return A(g, [[0, 0.008, 0], [0.04, 0.013, 0]]); },

  // ---------------- valves (DN100 flanged unless noted) ----------------
  valveGate() { const g = valveBody('gate'); return A(g, [[0, 0.03, 0.07], [0.12, 0.08, 0], [0, 0.2, 0.02], [0, 0.32, 0.09]]); },
  valveGlobe() { const g = valveBody('globe'); return A(g, [[0, 0, 0.08], [0, 0.16, 0.03], [0, 0.25, 0.08]]); },
  valveBall() { const g = valveBody('ball'); return A(g, [[0, 0, 0.07], [0, 0.11, 0.04], [0.16, 0.13, 0]]); },
  valveButterfly() { const g = valveBody('butterfly'); return A(g, [[0, 0.04, 0], [0.012, 0, 0.03], [0, 0.2, 0.03]]); },
  valveCheck() { const g = valveBody('check'); return A(g, [[0, 0, 0.075], [0, 0.085, 0.04], [0.06, 0.03, 0]]); },
  valveRelief() { const g = valveBody('relief'); return A(g, [[0, 0, 0.05], [0, 0.15, 0.04], [0, 0.26, 0.02], [0.06, -0.01, 0]]); },
  valveNeedle() {
    const x = xm(), g = new THREE.Group();
    g.add(rbox(0.05, 0.04, 0.04, x.ss, 0.004)); [-1, 1].forEach(k => { g.add(put(hex(0.022, 0.016, x.ss), k * 0.033, 0, 0, 0, 0, Math.PI / 2)); g.add(put(cyl(0.007, 0.007, 0.02, x.thread, 16), k * 0.048, 0, 0, 0, 0, Math.PI / 2)); });
    g.add(put(hex(0.024, 0.02, x.ss), 0, 0.03, 0)); g.add(put(cyl(0.004, 0.004, 0.04, x.satin), 0, 0.055, 0)); g.add(put(rbox(0.05, 0.008, 0.008, x.ss, 0.003), 0, 0.075, 0));
    return A(g, [[0, 0, 0.02], [0, 0.075, 0.004], [0.05, 0, 0]]);
  },
  valveSDNR() { const g = valveBody('globe', true); return A(g, [[0, 0, 0.08], [0, 0.25, 0.08], [0.06, 0.06, 0.07]]); },
  stormValve() { const g = valveBody('check', true); return A(g, [[0, 0, 0.075], [0, 0.18, 0.05], [0.06, 0.03, 0]]); },
  // ---------------- strainers ----------------
  strainerY() {
    const x = xm(), g = new THREE.Group();
    g.add(AX(lathe([[0.03, -0.12], [0.05, -0.12], [0.05, -0.1], [0.06, -0.08], [0.06, 0.08], [0.05, 0.1], [0.05, 0.12], [0.03, 0.12]], x.castIron, 48)));
    [-1, 1].forEach(s => { const p = plate(0.229, 0.1, 0.022, 8, 0.1905, 0.019, x.castIron); p.position.x = s > 0 ? 0.12 : -0.142; g.add(p); });
    const leg = lathe([[0, 0], [0.045, 0], [0.045, 0.14], [0.055, 0.14], [0.055, 0.16], [0, 0.16]], x.castIron, 40); leg.rotation.z = Math.PI * 0.8; g.add(leg);
    const drain = put(hex(0.03, 0.02, x.oxide), 0.093, -0.128, 0, 0, 0, Math.PI * 0.8); g.add(drain);
    return A(g, [[-0.05, 0.06, 0], [0.06, -0.08, 0.04], [0.093, -0.128, 0.015], [0.13, 0.1, 0]]);
  },
  mudBox() {
    const x = xm(), g = new THREE.Group();
    g.add(put(rbox(0.26, 0.26, 0.26, x.castIron, 0.02), 0, 0, 0));
    g.add(put(rbox(0.28, 0.02, 0.28, x.castIron, 0.006), 0, 0.14, 0));
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.add(put(hex(0.024, 0.016, x.oxide), Math.cos(a) * 0.115, 0.158, Math.sin(a) * 0.115)); }
    [-1, 1].forEach(s => { g.add(put(pipe(0.0572, 0.05, 0, 0.06, x.cs), s * 0.13, -0.04, 0, 0, s > 0 ? 0 : Math.PI, 0)); const p = plate(0.229, 0.11, 0.022, 8, 0.1905, 0.019, x.castIron); p.position.set(s * 0.19 - (s < 0 ? 0.022 : 0), -0.04, 0); g.add(p); });
    return A(g, [[0, 0, 0.13], [0, 0.15, 0.1], [0.2, -0.04, 0.08]]);
  },
  // ---------------- joints ----------------
  bellows() {
    const x = xm(), g = new THREE.Group();
    for (let k = 0; k < 7; k++) g.add(put(new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 12, 64), x.ss), -0.06 + k * 0.02, 0, 0, 0, Math.PI / 2));
    g.add(pipe(0.062, 0.057, -0.075, 0.075, x.ss, x.ss));
    [-1, 1].forEach(s => { const p = plate(F4.od, ID4, F4.t, F4.n, F4.bc, F4.hd, x.forged); p.position.x = s > 0 ? 0.08 : -0.08 - F4.t; g.add(p); });
    [0, 1, 2].forEach(k => { const a = k / 3 * Math.PI * 2 + 0.3; g.add(put(cyl(0.006, 0.006, 0.24, x.thread, 12), 0, Math.cos(a) * 0.125, Math.sin(a) * 0.125, 0, 0, Math.PI / 2)); });
    return A(g, [[0, 0.073, 0], [0.09, 0.105, 0], [0, Math.cos(0.3) * 0.125, Math.sin(0.3) * 0.125]]);
  },
  hose() {
    const x = xm(), g = new THREE.Group();
    const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(-0.05, 0, 0), new THREE.Vector3(0.05, 0.12, 0), new THREE.Vector3(0.2, 0.12, 0));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.022, 24, false), x.braid));
    [[-0.2, 0, Math.PI], [0.2, 0.12, 0]].forEach(([px, py, r]) => { const e = new THREE.Group(); e.add(put(cyl(0.025, 0.025, 0.03, x.ss), 0.0, 0, 0, 0, 0, Math.PI / 2)); e.add(put(hex(0.05, 0.02, x.ss), 0.025, 0, 0, 0, 0, Math.PI / 2)); e.position.set(px, py, 0); e.rotation.y = r; g.add(e); });
    return A(g, [[0, 0.06, 0.022], [0.225, 0.12, 0.02]]);
  },
  groovedCoupling() {
    const x = xm(), g = new THREE.Group();
    g.add(pipe(OD4 / 2, ID4 / 2, -0.2, -0.002, x.cs)); g.add(pipe(OD4 / 2, ID4 / 2, 0.002, 0.2, x.cs));
    const hous = new THREE.Mesh(new THREE.TorusGeometry(OD4 / 2 + 0.008, 0.014, 16, 64), x.orange); hous.rotation.y = Math.PI / 2; hous.scale.set(1, 1, 1.8); g.add(hous);
    [-1, 1].forEach(k => { g.add(put(rbox(0.04, 0.026, 0.03, x.orange, 0.005), 0, k * 0.075, 0)); g.add(put(cyl(0.006, 0.006, 0.06, x.thread, 12), 0, k * 0.075, 0, Math.PI / 2)); });
    return A(g, [[0, OD4 / 2 + 0.02, 0.02], [0, 0.075, 0.03], [-0.1, 0, OD4 / 2]]);
  },
  sleeveCoupling() {
    const x = xm(), g = new THREE.Group();
    g.add(pipe(OD4 / 2, ID4 / 2, -0.2, -0.004, x.cuni, x.cuni)); g.add(pipe(OD4 / 2, ID4 / 2, 0.004, 0.2, x.cuni, x.cuni));
    g.add(pipe(OD4 / 2 + 0.006, OD4 / 2 + 0.0005, -0.06, 0.06, x.ss, x.ss));
    [-0.03, 0.03].forEach(px => { g.add(put(rbox(0.03, 0.02, 0.05, x.ss, 0.003), px, OD4 / 2 + 0.014, 0)); g.add(put(cyl(0.005, 0.005, 0.07, x.thread, 12), px, OD4 / 2 + 0.014, 0, Math.PI / 2)); });
    return A(g, [[0, 0, OD4 / 2 + 0.006], [0.03, OD4 / 2 + 0.024, 0], [-0.12, 0, OD4 / 2]]);
  },
  // ---------------- supports ----------------
  pipeShoe() {
    const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.2, 0.2, x.cs);
    g.add(put(rbox(0.2, 0.012, 0.12, x.galv, 0.002), 0, -OD4 / 2 - 0.05, 0)); g.add(put(rbox(0.2, 0.05, 0.01, x.galv, 0.002), 0, -OD4 / 2 - 0.022, 0));
    g.add(put(rbox(0.6, 0.012, 0.2, x.yellow, 0.002), 0, -OD4 / 2 - 0.062, 0));
    return A(g, [[0.06, -OD4 / 2 - 0.022, 0.005], [-0.25, -OD4 / 2 - 0.056, 0.08], [0.15, 0, OD4 / 2]]);
  },
  uBolt() {
    const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.15, 0.15, x.cs);
    const c = new THREE.CurvePath(), V = (a, b) => new THREE.Vector3(0, a, b);
    c.add(new THREE.LineCurve3(V(-0.08, OD4 / 2 + 0.006), V(0, OD4 / 2 + 0.006)));
    const arc = new THREE.EllipseCurve(0, 0, OD4 / 2 + 0.006, OD4 / 2 + 0.006, 0, Math.PI, false); const ap = arc.getPoints(40).map(p => V(p.y, p.x)); c.add(new THREE.CatmullRomCurve3(ap));
    c.add(new THREE.LineCurve3(V(0, -OD4 / 2 - 0.006), V(-0.08, -OD4 / 2 - 0.006)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 120, 0.0055, 12, false), x.galv));
    g.add(put(rbox(0.06, 0.012, 0.2, x.yellow, 0.002), 0, -0.064, 0));
    [-1, 1].forEach(k => g.add(put(hex(0.017, 0.01, x.galv), 0, -0.075, k * (OD4 / 2 + 0.006))));
    return A(g, [[0, OD4 / 2 + 0.012, 0], [0, -0.075, OD4 / 2 + 0.006], [-0.1, 0, OD4 / 2]]);
  },
  pipeClamp() {
    const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.15, 0.15, x.cs);
    [-1, 1].forEach(k => { const h = new THREE.Mesh(new THREE.TorusGeometry(OD4 / 2 + 0.004, 0.004, 8, 48, Math.PI), x.galv); h.scale.z = 4; h.rotation.set(0, Math.PI / 2, k > 0 ? 0 : Math.PI); g.add(h); g.add(put(rbox(0.016, 0.004, 0.03, x.galv, 0.001), 0, 0, k * (OD4 / 2 + 0.018))); });
    [-1, 1].forEach(k => g.add(put(cyl(0.004, 0.004, 0.03, x.thread, 10), 0, 0, k * (OD4 / 2 + 0.018))));
    g.add(put(cyl(0.006, 0.006, 0.12, x.thread, 12), 0, OD4 / 2 + 0.065, 0));
    g.add(put(new THREE.Mesh(new THREE.TorusGeometry(OD4 / 2 + 0.006, 0.004, 8, 64), x.rubber), 0, 0, 0, 0, Math.PI / 2));
    return A(g, [[0, OD4 / 2 + 0.008, 0.03], [0, 0, OD4 / 2 + 0.02], [0, OD4 / 2 + 0.09, 0]]);
  },
  springHanger() {
    const x = xm(), g = new THREE.Group();
    g.add(put(cyl(0.05, 0.05, 0.22, x.blue, 40), 0, 0.2, 0));
    const pts = []; for (let i = 0; i <= 300; i++) { const t = i / 300 * Math.PI * 2 * 7; pts.push(new THREE.Vector3(Math.cos(t) * 0.042, 0.1 + i / 300 * 0.2, Math.sin(t) * 0.042)); }
    const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.004, 6, false), x.yellow); g.add(sp);
    g.add(put(scalePlane(0.06, 0.12, (c, w, h) => { c.fillStyle = '#eee'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; for (let i = 0; i <= 20; i++) c.fillRect(0, i * h / 20, i % 5 ? w * .3 : w * .6, 3); c.fillStyle = '#e33'; c.fillRect(0, h * .45, w, 10); }, { metalness: 0 }), 0, 0.2, 0.0505));
    g.add(put(cyl(0.008, 0.008, 0.3, x.thread, 12), 0, -0.05, 0));
    g.add(pipe(OD4 / 2, ID4 / 2, -0.15, 0.15, x.cs).translateY(-0.26));
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(OD4 / 2 + 0.005, 0.005, 8, 48), x.galv); clamp.position.y = -0.26; clamp.rotation.y = Math.PI / 2; clamp.scale.z = 3; g.add(clamp);
    return A(g, [[0, 0.25, 0.05], [0, 0.2, 0.0506], [0, -0.1, 0.008], [0.1, -0.26, OD4 / 2]]);
  },
  // ---------------- instruments ----------------
  gauge() {
    const x = xm(), g = new THREE.Group();
    const face = scalePlane(0.09, 0.09, (c, w, h) => { c.fillStyle = '#fafafa'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill(); c.strokeStyle = '#111'; c.lineWidth = 6; c.translate(w / 2, h / 2); for (let i = 0; i <= 50; i++) { const a = Math.PI * 0.75 + i / 50 * Math.PI * 1.5; const r1 = w * 0.42, r0 = i % 5 ? w * 0.38 : w * 0.33; c.lineWidth = i % 5 ? 3 : 7; c.beginPath(); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.stroke(); } c.fillStyle = '#111'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; for (let i = 0; i <= 10; i += 2) { const a = Math.PI * 0.75 + i / 10 * Math.PI * 1.5; c.fillText(String(i * 2), Math.cos(a) * w * 0.25, Math.sin(a) * w * 0.25 + 20); } c.font = 'bold 50px sans-serif'; c.fillText('bar', 0, w * 0.2); c.strokeStyle = '#c00'; c.lineWidth = 12; c.beginPath(); c.moveTo(0, 0); const a = Math.PI * 0.75 + 0.42 * Math.PI * 1.5; c.lineTo(Math.cos(a) * w * 0.36, Math.sin(a) * w * 0.36); c.stroke(); }, { metalness: 0, roughness: 0.4, transparent: true });
    g.add(put(cyl(0.05, 0.05, 0.03, x.ss, 48), 0, 0, 0, Math.PI / 2)); g.add(put(face, 0, 0, 0.0155));
    g.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.046, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0, thickness: 0.002, transparent: true, opacity: 0.25 })), 0, 0, 0.017));
    g.add(put(cyl(0.01, 0.01, 0.03, x.brass, 16), 0, -0.064, 0)); g.add(put(hex(0.022, 0.012, x.brass), 0, -0.085, 0)); g.add(put(cyl(0.0065, 0.0065, 0.02, x.thread, 16), 0, -0.1, 0));
    return A(g, [[0.02, 0.02, 0.016], [0, 0.05, 0], [0, -0.085, 0.011], [0, -0.1, 0.0065]]);
  },
  thermowell() {
    const x = xm(), g = new THREE.Group();
    g.add(lathe([[0, -0.12], [0.006, -0.12], [0.009, 0], [0.012, 0], [0.012, 0.02]], x.ss, 32)); g.add(put(hex(0.03, 0.016, x.ss), 0, 0.028, 0));
    g.add(put(cyl(0.004, 0.004, 0.04, x.ss, 12), 0, 0.055, 0)); g.add(put(cyl(0.04, 0.04, 0.02, x.ss, 40), 0, 0.09, 0, Math.PI / 2));
    g.add(put(scalePlane(0.07, 0.07, (c, w, h) => { c.fillStyle = '#fafafa'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill(); c.fillStyle = '#111'; c.font = 'bold 120px sans-serif'; c.textAlign = 'center'; c.fillText('°C', w / 2, h * 0.62); c.strokeStyle = '#c00'; c.lineWidth = 12; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w * 0.78, h * 0.3); c.stroke(); }, { metalness: 0 }), 0, 0.09, 0.0105));
    return A(g, [[0, -0.08, 0.008], [0, 0.028, 0.013], [0, 0.11, 0.01]]);
  },
  sightGlass() {
    const x = xm(), g = pipe(OD4 / 2, ID4 / 2, -0.06, 0.06, x.castIron);
    [-1, 1].forEach(s => { const p = plate(F4.od, ID4, F4.t, F4.n, F4.bc, F4.hd, x.castIron); p.position.x = s > 0 ? 0.06 : -0.06 - F4.t; g.add(p); });
    [-1, 1].forEach(k => { g.add(put(cyl(0.035, 0.035, 0.01, x.castIron, 32), 0, 0, k * (OD4 / 2 + 0.004), Math.PI / 2)); g.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.026, 40), x.glass), 0, 0, k * (OD4 / 2 + 0.0095), 0, k > 0 ? 0 : Math.PI, 0)); });
    return A(g, [[0, 0, OD4 / 2 + 0.01], [0.072, 0.105, 0]]);
  },
  // ---------------- marine ----------------
  bulkheadPiece() {
    const x = xm(), g = new THREE.Group();
    g.add(put(rbox(0.02, 0.5, 0.5, x.castBlue, 0.002), 0, 0, 0));
    g.add(pipe(OD4 / 2, ID4 / 2, -0.18, 0.18, x.cs));
    [-1, 1].forEach(s => g.add(put(AX(lathe([[OD4 / 2, 0], [0.11, 0], [0.11, 0.012], [OD4 / 2, 0.012]], x.cs, 64)), s * 0.011 + (s < 0 ? -0.012 : 0), 0, 0)));
    [-1, 1].forEach(s => { const p = plate(F4.od, ID4, F4.t, F4.n, F4.bc, F4.hd, x.forged); p.position.x = s > 0 ? 0.18 : -0.18 - F4.t; g.add(p); });
    return A(g, [[0.011, 0.2, 0.15], [0.02, 0.09, 0], [0.1, 0, OD4 / 2], [0.19, 0.105, 0]]);
  },
  soundingHead() {
    const x = xm(), g = new THREE.Group();
    g.add(put(rbox(0.36, 0.014, 0.36, x.green, 0.002), 0, -0.007, 0));
    g.add(lathe([[0.03, -0.1], [0.033, -0.1], [0.033, 0.03], [0.045, 0.03], [0.045, 0.045], [0.03, 0.045]], x.brass, 48));
    g.add(lathe([[0, 0.045], [0.044, 0.045], [0.044, 0.065], [0, 0.065]], x.brass, 48)); g.add(put(rbox(0.05, 0.01, 0.012, x.brass, 0.003), 0, 0.072, 0));
    const ch = []; for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 6, 14), x.brass); l.position.set(0.05 + k * 0.009, 0.05 - k * 0.006, 0); l.rotation.y = k % 2 ? Math.PI / 2 : 0; g.add(l); }
    return A(g, [[0, 0.07, 0.01], [0.04, 0.02, 0.02], [0.08, 0.03, 0], [0.14, 0, 0.1]]);
  },
  airVentHead() {
    const x = xm(), g = new THREE.Group();
    g.add(put(rbox(0.36, 0.014, 0.36, x.green, 0.002), 0, -0.007, 0));
    g.add(put(lathe([[0.055, 0], [0.058, 0], [0.058, 0.25], [0.055, 0.25]], x.galv, 48), 0, 0, 0));
    g.add(put(cyl(0.085, 0.085, 0.14, x.galv, 48), 0, 0.32, 0)); g.add(put(lathe([[0, 0], [0.09, 0], [0.09, 0.012], [0.06, 0.04], [0, 0.045]], x.galv, 48), 0, 0.39, 0));
    g.add(put(sph(0.045, new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, roughness: 0.4, clearcoat: 0.6 })), 0.0, 0.31, 0.0));
    g.add(put(cyl(0.09, 0.09, 0.02, x.galv, 48), 0, 0.25, 0));
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.add(put(hex(0.018, 0.012, x.oxide), Math.cos(a) * 0.075, 0.262, Math.sin(a) * 0.075)); }
    return A(g, [[0, 0.33, 0.085], [0, 0.31, 0.045], [0, 0.12, 0.058], [0.15, 0, 0.12]]);
  },
  seaChest() {
    const x = xm(), g = new THREE.Group();
    g.add(put(rbox(0.5, 0.36, 0.3, x.castBlue, 0.01), 0, 0, 0));
    const grid = new THREE.Group(); for (let k = 0; k < 9; k++) grid.add(put(rbox(0.012, 0.3, 0.02, x.forged, 0.002), -0.2 + k * 0.05, 0, 0)); grid.position.z = 0.16; g.add(grid);
    g.add(put(rbox(0.46, 0.02, 0.03, x.forged, 0.004), 0, 0.16, 0.16)); g.add(put(rbox(0.46, 0.02, 0.03, x.forged, 0.004), 0, -0.16, 0.16));
    const v = pipe(OD4 / 2, ID4 / 2, 0, 0.12, x.cs); v.rotation.z = Math.PI / 2; v.position.set(0.1, 0.18, -0.04); g.add(v);
    const vp = plate(F4.od, ID4, F4.t, F4.n, F4.bc, F4.hd, x.forged); vp.rotation.set(-Math.PI / 2, 0, 0); vp.position.set(0.1, 0.3, -0.04); g.add(vp);
    g.add(put(cyl(0.012, 0.012, 0.1, x.thread, 12), -0.15, 0.22, -0.04)); g.add(put(hex(0.03, 0.02, x.brass), -0.15, 0.275, -0.04));
    return A(g, [[0, 0, 0.17], [0.1, 0.31, 0.06], [-0.15, 0.275, -0.03], [0.2, -0.1, 0.15]]);
  },
};

/** Flanged valve body family. kind: gate | globe | ball | butterfly | check | relief. marine = SDNR / storm valve extras. */
function valveBody(kind, marine = false) {
  const x = xm(), g = new THREE.Group(), body = x.castIron;
  const flangePair = (half) => [-1, 1].forEach(s => { const p = plate(F4.od, ID4, F4.t, F4.n, F4.bc, F4.hd, body); p.position.x = s > 0 ? half : -half - F4.t; g.add(p); });
  if (kind === 'butterfly') {
    g.add(AX(lathe([[0.05, -0.028], [0.09, -0.028], [0.09, 0.028], [0.05, 0.028]], body, 64)));
    const disc = put(cyl(0.05, 0.05, 0.008, x.ss, 48), 0, 0, 0, 0, 0, Math.PI / 2); disc.rotation.y = 0.5; g.add(disc);
    g.add(put(cyl(0.008, 0.008, 0.2, x.satin), 0, 0.05, 0)); g.add(put(rbox(0.06, 0.03, 0.06, body, 0.006), 0, 0.12, 0));
    const lever = put(rbox(0.2, 0.012, 0.026, x.blue, 0.004), 0.08, 0.15, 0); g.add(lever); g.add(put(rbox(0.04, 0.03, 0.03, x.rubber, 0.01), 0.18, 0.15, 0));
    g.add(put(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.004, 8, 48, Math.PI), x.satin), 0, 0.165, 0, Math.PI / 2, 0, 0));
    return g;
  }
  if (kind === 'relief') {
    g.add(lathe([[0, -0.07], [0.06, -0.07], [0.07, -0.02], [0.06, 0.05], [0.04, 0.08], [0.035, 0.1], [0, 0.1]], body, 48));
    const inlet = plate(0.19, 0.08, 0.02, 4, 0.152, 0.019, body); inlet.rotation.set(-Math.PI / 2, 0, 0); inlet.position.y = -0.09; g.add(inlet);
    const out = plate(0.19, 0.08, 0.02, 4, 0.152, 0.019, body); out.position.x = 0.09; g.add(out); g.add(put(cyl(0.045, 0.045, 0.09, body, 40), 0.045, -0.01, 0, 0, 0, Math.PI / 2));
    g.add(lathe([[0.035, 0.1], [0.045, 0.12], [0.03, 0.23], [0.022, 0.25], [0, 0.25]], x.red, 40));
    g.add(put(cyl(0.012, 0.012, 0.03, x.red, 16), 0, 0.265, 0)); g.add(put(rbox(0.1, 0.01, 0.014, x.satin, 0.004), 0.045, 0.27, 0, 0, 0, -0.2));
    g.add(put(scalePlane(0.05, 0.03, (c, w, h) => { c.fillStyle = '#d9d9d9'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = 'bold 120px sans-serif'; c.fillText('SET 10 bar', 20, 160); }, { metalness: 0.4 }), 0, 0.17, 0.04));
    return g;
  }
  if (kind === 'ball') {
    g.add(AX(lathe([[0.05, -0.1], [0.06, -0.1], [0.075, -0.05], [0.085, 0], [0.075, 0.05], [0.06, 0.1], [0.05, 0.1]], body, 48)));
    flangePair(0.1);
    g.add(put(cyl(0.025, 0.025, 0.05, body), 0, 0.095, 0)); g.add(put(cyl(0.01, 0.01, 0.03, x.satin), 0, 0.13, 0));
    g.add(put(rbox(0.22, 0.012, 0.03, x.red, 0.005), 0.085, 0.145, 0)); g.add(put(rbox(0.07, 0.03, 0.036, x.rubberRed, 0.012), 0.18, 0.145, 0));
    return g;
  }
  if (kind === 'check') {
    g.add(AX(lathe([[0.05, -0.12], [0.06, -0.12], [0.075, -0.06], [0.085, 0.02], [0.07, 0.09], [0.06, 0.12], [0.05, 0.12]], body, 48)));
    flangePair(0.12);
    g.add(put(cyl(0.07, 0.075, 0.03, body, 40), 0, 0.085, 0)); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.add(put(hex(0.02, 0.012, x.oxide), Math.cos(a) * 0.06, 0.104, Math.sin(a) * 0.06)); }
    g.add(put(scalePlane(0.08, 0.03, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#e8e8e8'; c.beginPath(); c.moveTo(40, h / 2 - 30); c.lineTo(w - 180, h / 2 - 30); c.lineTo(w - 180, h / 2 - 80); c.lineTo(w - 30, h / 2); c.lineTo(w - 180, h / 2 + 80); c.lineTo(w - 180, h / 2 + 30); c.lineTo(40, h / 2 + 30); c.fill(); }, { metalness: 0.3 }), 0, 0.0, 0.086));
    if (marine) { g.add(put(cyl(0.008, 0.008, 0.14, x.satin), 0, 0.16, 0)); const hw = handwheel(0.06, x.red); hw.position.y = 0.23; g.add(hw); }
    return g;
  }
  // gate / globe
  if (kind === 'globe') g.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 40, 24), body));
  else g.add(AX(lathe([[0.05, -0.1], [0.06, -0.1], [0.07, -0.05], [0.07, 0.05], [0.06, 0.1], [0.05, 0.1]], body, 48)));
  g.add(AX(lathe([[0.05, -0.13], [0.06, -0.13], [0.06, 0.13], [0.05, 0.13]], body, 40)));
  flangePair(0.13);
  const tall = kind === 'gate';
  g.add(lathe([[0, 0.06], [0.06, 0.06], [0.065, 0.075], [0.065, 0.085], [0.045, 0.1], [0.04, tall ? 0.2 : 0.15], [0.05, tall ? 0.2 : 0.15], [0.05, tall ? 0.215 : 0.165], [0, tall ? 0.215 : 0.165]], body, 40));
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; g.add(put(hex(0.02, 0.014, x.oxide), Math.cos(a) * 0.056, 0.092, Math.sin(a) * 0.056)); }
  g.add(put(cyl(0.009, 0.009, tall ? 0.16 : 0.12, x.thread, 16), 0, tall ? 0.29 : 0.22, 0));
  const hw = handwheel(tall ? 0.085 : 0.07, x.red); hw.position.y = tall ? 0.32 : 0.25; g.add(hw);
  if (marine) g.add(put(scalePlane(0.08, 0.03, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#e8e8e8'; c.beginPath(); c.moveTo(40, h / 2 - 30); c.lineTo(w - 180, h / 2 - 30); c.lineTo(w - 180, h / 2 - 80); c.lineTo(w - 30, h / 2); c.lineTo(w - 180, h / 2 + 80); c.lineTo(w - 180, h / 2 + 30); c.lineTo(40, h / 2 + 30); c.fill(); }, { metalness: 0.3 }), 0, -0.02, 0.0855));
  return g;
}

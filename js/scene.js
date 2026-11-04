// 3D world: workshop environment + procedurally modelled piping parts (units: metres).
// Dimensions follow a DN100 (4") line with a Class-150-style weld-neck flange — illustrative training values.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

export const DIM = {
  pipeOD: 0.1143, pipeID: 0.1023,
  flOD: 0.229, flT: 0.024, rfD: 0.157, rfH: 0.002, hubD: 0.135, hubL: 0.076,
  boltCircle: 0.1905, holeD: 0.019, bolts: 8,
  gasketID: 0.115, gasketOD: 0.149, gasketT: 0.003,
  elbowR: 0.1524, pipeY: 0.95,
};

// ---------- procedural textures ----------
function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.canvas = c;
  return t;
}
function speckle(g, w, h, n, colors, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * Math.random();
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rmin + Math.random() * (rmax - rmin), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}
const TEX = {};
function makeTextures() {
  TEX.concrete = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5b5f66'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 9000, ['#4a4e55', '#6c7078', '#53575e', '#777b82'], 0.5, 2.2, 0.6);
    speckle(g, w, h, 40, ['#3d4148', '#2f3238'], 20, 70, 0.12);
    g.strokeStyle = 'rgba(30,32,36,.5)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  }, { repeat: [10, 10] });
  TEX.steel = canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9aa1a9'); gr.addColorStop(1, '#868d95');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.globalAlpha = Math.random() * 0.18; g.fillStyle = Math.random() > .5 ? '#3c4046' : '#8d939a'; g.fillRect(Math.random() * w, 0, 1 + Math.random() * 2, h); }
    speckle(g, w, h, 500, ['#4b3a2e', '#3a3e44'], 1, 4, 0.25);
  });
  TEX.primer = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#8a3324'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 1800, ['#7a2c1f', '#9a3d2b', '#6d271b'], 0.6, 2.5, 0.5);
  });
  TEX.serration = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b8c0c9'; g.fillRect(0, 0, w, h);
    const cx = w / 2;
    for (let r = 4; r < cx; r += 3.2) { g.strokeStyle = (r | 0) % 2 ? 'rgba(80,88,98,.55)' : 'rgba(235,240,245,.5)'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cx, r, 0, 7); g.stroke(); }
  }, {});
  TEX.dirt = canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    speckle(g, w, h, 2600, ['#6b3a1c', '#8a4b22', '#4d2a14', '#5a3a26', '#3a2a20'], 1, 9, 0.95);
    speckle(g, w, h, 90, ['#7a4420', '#553018'], 10, 26, 0.7);
  }, {});
  TEX.thread = canvasTex(32, 256, (g, w, h) => {
    for (let y = 0; y < h; y += 8) { const gr = g.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, '#222'); gr.addColorStop(.5, '#fff'); gr.addColorStop(1, '#222'); g.fillStyle = gr; g.fillRect(0, y, w, 8); }
  }, { repeat: [1, 6], srgb: false });
  TEX.wall = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#1c2a44'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, 'rgba(255,255,255,.06)'); gr.addColorStop(.5, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(255,255,255,.06)'); g.fillStyle = gr; g.fillRect(x, 0, 32, h); }
  }, { repeat: [6, 1] });
  TEX.hazard = canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#f2b705'; g.fillRect(0, 0, w, h); g.fillStyle = '#16181c';
    for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  }, { repeat: [4, 1] });
}

// ---------- materials ----------
export const MAT = {};
function makeMaterials() {
  MAT.steel = new THREE.MeshStandardMaterial({ map: TEX.steel, color: 0xc4cad2, metalness: 0.55, roughness: 0.4, envMapIntensity: 1.6 });
  MAT.steelInside = new THREE.MeshStandardMaterial({ color: 0x2d3036, metalness: 0.6, roughness: 0.7, side: THREE.BackSide });
  MAT.flange = new THREE.MeshStandardMaterial({ color: 0x8c939b, metalness: 0.88, roughness: 0.33, envMapIntensity: 1.2 });
  MAT.face = new THREE.MeshStandardMaterial({ map: TEX.serration, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.3 });
  MAT.weld = new THREE.MeshStandardMaterial({ color: 0x4b4640, metalness: 0.55, roughness: 0.75 });
  MAT.gasket = new THREE.MeshStandardMaterial({ color: 0xd9d2c1, metalness: 0.0, roughness: 0.95 });
  MAT.gasketSmall = new THREE.MeshStandardMaterial({ color: 0x2a2b2e, metalness: 0.0, roughness: 0.9 });
  MAT.stud = new THREE.MeshStandardMaterial({ color: 0x6d6658, metalness: 0.85, roughness: 0.38, bumpMap: TEX.thread, bumpScale: 0.6 });
  MAT.nut = new THREE.MeshStandardMaterial({ color: 0x5b5751, metalness: 0.85, roughness: 0.4 });
  MAT.primer = new THREE.MeshStandardMaterial({ map: TEX.primer, metalness: 0.1, roughness: 0.75 });
  MAT.galv = new THREE.MeshStandardMaterial({ color: 0xaab2ba, metalness: 0.9, roughness: 0.3 });
  MAT.paintYellow = new THREE.MeshStandardMaterial({ color: 0xf2b705, metalness: 0.2, roughness: 0.55 });
  MAT.paintBlue = new THREE.MeshStandardMaterial({ color: 0x1f5fd1, metalness: 0.3, roughness: 0.5 });
  MAT.paintRed = new THREE.MeshStandardMaterial({ color: 0xc62a2f, metalness: 0.3, roughness: 0.45 });
  MAT.dark = new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.6, roughness: 0.5 });
  MAT.wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, metalness: 0, roughness: 0.8 });
  MAT.ghost = new THREE.MeshBasicMaterial({ color: 0x2ee6a6, transparent: true, opacity: 0.18, depthWrite: false });
  MAT.ghostLine = new THREE.LineBasicMaterial({ color: 0x2ee6a6, transparent: true, opacity: 0.7 });
}

// ---------- geometry helpers ----------
const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }

// hollow straight pipe along +Y from y0 to y1
export function pipeY(y0, y1, mat = MAT.steel) {
  const ro = DIM.pipeOD / 2, ri = DIM.pipeID / 2;
  const g = new THREE.Group();
  g.add(mesh(lathe([[ri, y0], [ro, y0], [ro, y1], [ri, y1]], 72), mat));
  g.add(mesh(lathe([[ri, y0], [ri, y1]], 48), MAT.steelInside, false, false));
  return g;
}
function weldBead(y) {
  const m = mesh(new THREE.TorusGeometry(DIM.pipeOD / 2 + 0.001, 0.0045, 10, 72), MAT.weld);
  m.rotation.x = Math.PI / 2; m.position.y = y; return m;
}

// Weld-neck flange, axis +Y, raised face top at y = 0. Returns { group, face, holes[] }
export function weldNeckFlange() {
  const D = DIM, ri = D.pipeID / 2;
  const group = new THREE.Group();
  // disc with bolt holes
  const s = new THREE.Shape(); s.absarc(0, 0, D.flOD / 2, 0, Math.PI * 2, false);
  const bore = new THREE.Path(); bore.absarc(0, 0, ri, 0, Math.PI * 2, true); s.holes.push(bore);
  const holes = [];
  for (let i = 0; i < D.bolts; i++) {
    const a = (Math.PI / 4) * i + Math.PI / 8; // bolts straddle the centre lines
    const p = new THREE.Path(); p.absarc(Math.cos(a) * D.boltCircle / 2, Math.sin(a) * D.boltCircle / 2, D.holeD / 2, 0, Math.PI * 2, true);
    s.holes.push(p); holes.push(a);
  }
  const depth = D.flT - D.rfH;
  const disc = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 48 });
  disc.rotateX(Math.PI / 2); disc.translate(0, -D.rfH, 0);
  group.add(mesh(disc, MAT.flange));
  // raised face (sides) + serrated face
  group.add(mesh(lathe([[ri, -D.rfH], [D.rfD / 2, -D.rfH], [D.rfD / 2, 0]], 72), MAT.flange));
  const faceGeo = new THREE.RingGeometry(ri, D.rfD / 2, 72, 1); faceGeo.rotateX(-Math.PI / 2);
  // planar UVs for concentric texture
  const pos = faceGeo.attributes.position, uv = faceGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / D.rfD, 0.5 - pos.getZ(i) / D.rfD);
  const face = mesh(faceGeo, MAT.face, false, true);
  group.add(face);
  // hub + bore
  group.add(mesh(lathe([[D.pipeOD / 2, -D.hubL], [D.hubD / 2, -D.flT - 0.008], [D.hubD / 2 + 0.002, -D.flT]], 72), MAT.flange));
  group.add(mesh(lathe([[ri, 0], [ri, -D.hubL]], 48), MAT.steelInside, false, false));
  group.add(weldBead(-D.hubL));
  // hole anchors (local, centre of hole on face plane)
  const anchors = holes.map(a => { const o = new THREE.Object3D(); o.position.set(Math.cos(a) * D.boltCircle / 2, 0, Math.sin(a) * D.boltCircle / 2); group.add(o); return o; });
  return { group, face, anchors };
}

export function gasket(small = false) {
  const D = DIM;
  const id = small ? 0.09 : D.gasketID, od = small ? 0.127 : D.gasketOD;
  const g = mesh(lathe([[id / 2, 0], [od / 2, 0], [od / 2, D.gasketT], [id / 2, D.gasketT], [id / 2, 0]], 72), small ? MAT.gasketSmall : MAT.gasket);
  g.geometry.rotateZ(-Math.PI / 2); // axis +X, thickness along +X
  const grp = new THREE.Group(); grp.add(g);
  grp.userData = { kind: small ? 'gasketSmall' : 'gasket' };
  return grp;
}

// Flanged 90° LR elbow assembly. Origin = raised-face centre, face normal -X, outlet (correct pose) +Y.
export function elbowAssembly() {
  const D = DIM, R = D.elbowR, ro = D.pipeOD / 2, ri = D.pipeID / 2;
  const root = new THREE.Group();
  const fl = weldNeckFlange();
  fl.group.rotation.z = Math.PI / 2; // +Y -> -X
  root.add(fl.group);
  const x0 = D.hubL;
  const arc = new THREE.Group();
  const outer = mesh(new THREE.TorusGeometry(R, ro, 36, 72, Math.PI / 2), MAT.steel);
  const inner = mesh(new THREE.TorusGeometry(R, ri, 24, 48, Math.PI / 2), MAT.steelInside, false, false);
  arc.add(outer, inner);
  arc.rotation.z = -Math.PI / 2; arc.position.set(x0, R, 0);
  root.add(arc);
  const stub = pipeY(R, R + 0.16); stub.position.x = x0 + R; root.add(stub);
  const b = weldBead(R); b.position.x = x0 + R; root.add(b);
  root.userData = { kind: 'elbow', anchors: fl.anchors, outlet: new THREE.Vector3(x0 + R, R + 0.16, 0) };
  return root;
}

export function studBolt() {
  const g = new THREE.Group();
  const rod = mesh(new THREE.CylinderGeometry(0.0079, 0.0079, 0.104, 20), MAT.stud);
  rod.rotation.z = Math.PI / 2; g.add(rod);
  const nutGeo = new THREE.CylinderGeometry(0.0146, 0.0146, 0.016, 6); nutGeo.rotateZ(Math.PI / 2);
  const back = mesh(nutGeo, MAT.nut); back.position.x = -0.0335; g.add(back);
  const front = mesh(nutGeo, MAT.nut); front.position.x = 0.0365; g.add(front);
  g.userData = { front, back, rod };
  return g;
}

// ---------- environment ----------
function wallBanner(logoImg) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 640;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, '#0d2152'); gr.addColorStop(1, '#081639');
  g.fillStyle = gr; g.fillRect(0, 0, 2048, 640);
  g.fillStyle = '#2F7CF6'; g.fillRect(0, 600, 2048, 40); g.fillStyle = '#E8323C'; g.fillRect(0, 600, 380, 40);
  if (logoImg) g.drawImage(logoImg, 1520, 90, 440, 440);
  g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#ffffff';
  g.font = '700 104px "Readex Pro", Tahoma, sans-serif';
  g.fillText('مركز تدريب شركة ترسانة الإسكندرية', 1460, 260);
  g.fillStyle = '#FFC23D'; g.font = '600 76px "Readex Pro", Tahoma, sans-serif';
  g.fillText('تخصص برادة وتركيبات خطوط المواسير', 1460, 400);
  g.fillStyle = '#8DB8FF'; g.font = '500 44px "Readex Pro", Tahoma, sans-serif';
  g.fillText('السلامة أولاً · ارتدِ مهمات الوقاية قبل بدء العمل', 1460, 510);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function buildWorkshop(scene, logoImg) {
  const floor = mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: TEX.concrete, roughness: 0.92, metalness: 0.02 }), false, true);
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  // walkway lines
  [[-1.6, 0], [1.6, 0]].forEach(([z]) => { const l = mesh(new THREE.PlaneGeometry(14, 0.09), MAT.paintYellow, false, true); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.002, z); scene.add(l); });
  const hz = mesh(new THREE.PlaneGeometry(2.4, 0.16), new THREE.MeshStandardMaterial({ map: TEX.hazard, roughness: 0.6 }), false, true); hz.rotation.x = -Math.PI / 2; hz.position.set(-0.6, 0.003, 0.75); scene.add(hz);
  // back wall + banner
  const wall = mesh(new THREE.PlaneGeometry(24, 7), new THREE.MeshStandardMaterial({ map: TEX.wall, metalness: 0.5, roughness: 0.6 }), false, true);
  wall.position.set(0, 3.5, -4.2); scene.add(wall);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.31), new THREE.MeshStandardMaterial({ map: wallBanner(logoImg), roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.18, emissiveMap: null }));
  banner.material.emissiveMap = banner.material.map;
  banner.position.set(0.4, 2.55, -4.17); scene.add(banner);
  // pipe stands under the spool
  [-0.38, -0.98].forEach(x => {
    const s = new THREE.Group();
    s.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, DIM.pipeY - 0.09, 16), MAT.paintBlue).translateY((DIM.pipeY - 0.09) / 2));
    const base = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 3), MAT.paintBlue); base.position.y = 0.015; s.add(base);
    const vhead = new THREE.Group();
    [-1, 1].forEach(k => { const p = mesh(new THREE.BoxGeometry(0.11, 0.012, 0.05), MAT.dark); p.rotation.z = k * 0.62; p.position.set(k * 0.042, 0, 0); vhead.add(p); });
    vhead.position.y = DIM.pipeY - DIM.pipeOD / 2 - 0.022; vhead.rotation.y = Math.PI / 2;
    s.add(vhead); s.position.x = x; scene.add(s);
  });
  // pipe rack (background left)
  const rack = new THREE.Group();
  [-1, 1].forEach(z => [0, 2.2].forEach(x => { rack.add(mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), MAT.paintYellow).translateX(x).translateY(0.95).translateZ(z * 0.45)); }));
  [0.5, 1.1, 1.7].forEach(y => [-1, 1].forEach(z => rack.add(mesh(new THREE.BoxGeometry(2.4, 0.06, 0.06), MAT.paintYellow).translateX(1.1).translateY(y).translateZ(z * 0.45))));
  [0.5, 1.1, 1.7].forEach((y, row) => {
    for (let i = 0; i < 6; i++) {
      const r = 0.045 + ((i + row) % 3) * 0.02;
      const p = mesh(new THREE.CylinderGeometry(r, r, 2.6, 24, 1, true), [MAT.primer, MAT.galv, MAT.steel][(i + row) % 3]);
      p.rotation.z = Math.PI / 2; p.position.set(1.1, y + 0.03 + r, -0.4 + i * 0.16); rack.add(p);
    }
  });
  rack.position.set(-4.2, 0, -2.4); rack.rotation.y = 0.35; scene.add(rack);
  // workbench + vise (background right)
  const bench = new THREE.Group();
  bench.add(mesh(new THREE.BoxGeometry(2.0, 0.06, 0.8), MAT.wood).translateY(0.9));
  [[-0.92, -0.34], [0.92, -0.34], [-0.92, 0.34], [0.92, 0.34]].forEach(([x, z]) => bench.add(mesh(new THREE.BoxGeometry(0.06, 0.88, 0.06), MAT.dark).translateX(x).translateY(0.44).translateZ(z)));
  bench.add(mesh(new THREE.BoxGeometry(1.9, 0.04, 0.7), MAT.dark).translateY(0.25));
  const vise = new THREE.Group();
  vise.add(mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14), MAT.paintBlue).translateY(0.06));
  vise.add(mesh(new THREE.BoxGeometry(0.03, 0.12, 0.16), MAT.paintBlue).translateX(0.12).translateY(0.12));
  vise.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 10), MAT.galv).rotateZ(Math.PI / 2).translateY(-0.2).translateX(0.08));
  vise.position.set(0.6, 0.93, 0.15); bench.add(vise);
  const box = mesh(new THREE.BoxGeometry(0.55, 0.28, 0.25), MAT.paintRed); box.position.set(-0.5, 1.07, -0.1); bench.add(box);
  bench.position.set(3.0, 0, -2.0); bench.rotation.y = -0.45; scene.add(bench);
  // tool cabinet
  const cab = mesh(new THREE.BoxGeometry(0.8, 1.1, 0.5), MAT.paintRed); cab.position.set(2.2, 0.55, 1.6); cab.rotation.y = -0.9; scene.add(cab);
  for (let i = 0; i < 5; i++) { const d = mesh(new THREE.BoxGeometry(0.7, 0.012, 0.01), MAT.galv); d.position.set(0, -0.4 + i * 0.2, 0.256); cab.add(d); }
}

// ---------- world ----------
export async function createWorld(container, logoImg) {
  makeTextures(); makeMaterials();
  const big = Math.max(innerWidth, innerHeight) > 2400;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, big ? 1.25 : 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1222);
  scene.fog = new THREE.Fog(0x0a1222, 6, 16);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.02, 60);
  camera.position.set(0.95, 1.45, 1.25);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.02, DIM.pipeY, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 0.35; controls.maxDistance = 4.5;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = true; controls.screenSpacePanning = true;

  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1f2a, 0.55));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(2.2, 4.2, 2.4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5; key.shadow.camera.top = 2.5; key.shadow.camera.bottom = -2.5; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key);
  const fill = new THREE.SpotLight(0x7fb0ff, 18, 9, 0.6, 0.6); fill.position.set(-2.4, 2.6, 1.8); fill.target.position.set(0, DIM.pipeY, 0); scene.add(fill, fill.target);
  const rim = new THREE.PointLight(0xffc23d, 3.5, 4); rim.position.set(0.6, 1.6, -1.2); scene.add(rim);

  buildWorkshop(scene, logoImg);

  // the fixed pipe spool (pipe + flange), face at world x = 0 pointing +X
  const spoolFl = weldNeckFlange();
  const spool = new THREE.Group();
  spool.add(spoolFl.group);
  const run = pipeY(-DIM.hubL - 1.15, -DIM.hubL); spool.add(run);
  spool.rotation.z = -Math.PI / 2; spool.position.set(0, DIM.pipeY, 0);
  scene.add(spool);
  // primer band label
  // dirt layer over the raised face
  const dirtTex = TEX.dirt;
  const dirtGeo = spoolFl.face.geometry.clone();
  const dirt = new THREE.Mesh(dirtGeo, new THREE.MeshStandardMaterial({ map: dirtTex, transparent: true, roughness: 1, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  dirt.position.y = 0.0004; spoolFl.group.add(dirt);

  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : 40;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', onResize); onResize();

  return { THREE, renderer, scene, camera, controls, spool, spoolFlange: spoolFl, dirt, dirtTex, onResize };
}

// circular soft sprite for water droplets
export function dropletSprite() {
  return canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(235,248,255,1)'); gr.addColorStop(.4, 'rgba(160,210,255,.8)'); gr.addColorStop(1, 'rgba(120,180,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
}
export function ringSprite(color = '#FFC23D') {
  return canvasTex(128, 128, (g) => {
    g.strokeStyle = color; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 44, 0, 7); g.stroke();
    g.globalAlpha = .35; g.lineWidth = 22; g.beginPath(); g.arc(64, 64, 44, 0, 7); g.stroke();
  });
}

// Shared pointer helpers for the 3D work stations: turn a part by hand, tap a 3D object.
import * as THREE from 'three';
import { unlockAudio } from './audio.js';

const ray = new THREE.Raycaster();
const toScreen = (V, w) => { const p = w.clone().project(V.camera), r = V.dom.getBoundingClientRect(); return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; };
const hits = (V, e, obj, px = 70) => {
  const r = V.dom.getBoundingClientRect(); ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1 }, V.camera);
  if (ray.intersectObject(obj, true).length) return true;
  const [hx, hy] = toScreen(V, obj.getWorldPosition(new THREE.Vector3())); return Math.hypot(e.clientX - hx, e.clientY - hy) < px;
};

/**
 * Twist gesture measured around a world point's screen position. d > 0 = clockwise on screen.
 * opts.hit: the gesture must start on this object (else opts.miss(e) is called); without it any press works.
 */
export function twist(V, centreW, onTurn, opts = {}) {
  const el = V.dom; let prev = null;
  const ang = e => { const [cx, cy] = toScreen(V, centreW()); return Math.atan2(e.clientY - cy, e.clientX - cx); };
  const down = e => {
    unlockAudio();
    if (opts.enabled && !opts.enabled()) return;
    if (opts.hit && !hits(V, e, opts.hit, opts.px)) { opts.miss && opts.miss(e); return; }
    if (opts.hit) e.stopImmediatePropagation();
    prev = ang(e); el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing';
  };
  const move = e => { if (prev == null) return; if (opts.hit) e.stopImmediatePropagation(); const a = ang(e); let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; prev = a; onTurn(d); };
  const up = () => { if (prev != null && opts.release) opts.release(); prev = null; el.style.cursor = ''; };
  const cap = !!opts.hit;
  el.addEventListener('pointerdown', down, cap); el.addEventListener('pointermove', move, cap); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  return { active: () => prev != null, off() { el.removeEventListener('pointerdown', down, cap); el.removeEventListener('pointermove', move, cap); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); } };
}

/** Tap a 3D object. Returns an unbind function. */
export function tap3d(V, obj, onTap, px = 60) {
  const el = V.dom;
  const down = e => { if (hits(V, e, obj, px)) { unlockAudio(); e.stopImmediatePropagation(); onTap(e); } };
  el.addEventListener('pointerdown', down, true);
  return () => el.removeEventListener('pointerdown', down, true);
}

/** Pulse an emissive material to show "grab me". */
export function glow(gsap, mat, on) { gsap.killTweensOf(mat); if (on) gsap.fromTo(mat, { emissiveIntensity: 0 }, { emissiveIntensity: 1.4, duration: .7, repeat: -1, yoyo: true }); else mat.emissiveIntensity = 0; }
export { toScreen };

/**
 * Floating controls on the 3D view (always visible, big for touch). buttons: [{ label, icon, hold: fn(dt), tap: fn() }].
 * A hold button calls hold(radians) every frame while pressed (one turn per `period` seconds). Returns an unbind function.
 */
export function floatControls(view, buttons, period = 1.6) {
  const bar = document.createElement('div'); bar.className = 'floatbar';
  const offs = buttons.map(b => {
    const el = document.createElement('button'); el.className = 'holdbtn holdbtn--spin' + (b.alt ? ' holdbtn--alt' : '');
    el.innerHTML = `<i></i><span>${b.icon || ''}${b.label}</span>`; bar.appendChild(el);
    if (b.tap) { const f = e => { e.preventDefault(); unlockAudio(); b.tap(); }; el.addEventListener('click', f); return () => {}; }
    let on = false, raf = 0, t0 = 0;
    const spin = now => { if (!on) return; const dt = Math.min(0.25, (now - t0) / 1000); t0 = now; b.hold(dt * Math.PI * 2 / period); raf = requestAnimationFrame(spin); };
    el.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); on = true; el.classList.add('is-on'); el.setPointerCapture?.(e.pointerId); t0 = performance.now(); raf = requestAnimationFrame(spin); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => { on = false; el.classList.remove('is-on'); cancelAnimationFrame(raf); }));
    return () => { on = false; cancelAnimationFrame(raf); };
  });
  view.appendChild(bar);
  return () => { offs.forEach(f => f()); bar.remove(); };
}

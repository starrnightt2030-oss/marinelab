// Shared helpers for "work" stations (side panel + large view): steps, narration, messages, scoring display.
import { $, $$, gsap, I, playLine, startSession, scoreNow, elapsed, fmt, LEVELS, penalize as basePenalize } from './ui.js';
import { VOICE } from './voice-lines.js';

let timer = 0, lastLine = null;
export function openWork({ id, title, sub, mode, level, cats, steps }) {
  startSession({ id, title, sub, mode, level, cats });
  $('#wkTitle').textContent = title; $('#wkSub').textContent = sub || '';
  $('#wkMode').textContent = mode === 'learn' ? 'تعلّم' : 'اختبار';
  $('#wkLevel').textContent = LEVELS[level].t; $('#wkLevel').dataset.level = level;
  $('#wkScore').textContent = scoreNow(); $('#wkMsg').hidden = true; $('#wkBody').innerHTML = ''; $('#wkView').innerHTML = '';
  clearInterval(timer); timer = setInterval(() => { $('#wkTimer').textContent = fmt(elapsed()); }, 500);
  workSteps(steps, 0);
}
export function closeWork() { clearInterval(timer); }
export function workSteps(steps, idx) {
  $('#wkSteps').innerHTML = steps.map((s, i) => `<li class="step ${i < idx ? 'is-done' : i === idx ? 'is-now' : ''}"><span class="step__dot">${i < idx ? '✓' : i + 1}</span><span class="step__label">${s}</span></li>`).join('');
  $('#wkStepNow').textContent = `المهمة ${Math.min(idx + 1, steps.length)} من ${steps.length}`;
}
/** Narrate a VOICE line in the work panel (falls back to the device voice when no clip exists). */
export function wsay(id) {
  lastLine = id; $('#wkSayText').textContent = VOICE[id]?.t || id;
  const box = $('#wkSay'); box.classList.add('is-speaking'); setTimeout(() => box.classList.remove('is-speaking'), 2500);
  playLine(id);
}
export const wreplay = () => lastLine && wsay(lastLine);
let msgT = 0;
export function wmsg(text, kind = 'err', ms = 4500) {
  const m = $('#wkMsg'); m.className = 'msg msg--' + kind; m.innerHTML = (kind === 'ok' ? I.ok : kind === 'info' ? I.info : I.warn) + `<span>${text}</span>`; m.hidden = false;
  gsap.fromTo(m, { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: .3 });
  clearTimeout(msgT); msgT = setTimeout(() => { m.hidden = true; }, ms);
}
export function wpenalize(cat, pts, text) { basePenalize(cat, pts, text); $('#wkScore').textContent = scoreNow(); }
export const body = (html) => { const b = $('#wkBody'); b.innerHTML = html; gsap.fromTo(b, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .3 }); return b; };
export const view = (html) => { const v = $('#wkView'); v.innerHTML = html; return v; };
/** Multiple-choice inside the panel; resolves with the picked option. Wrong picks are marked but the promise waits for the right one when keepTrying. */
export function choose(question, options) {
  return new Promise(res => {
    body(`<p class="wk__q">${question}</p><div class="qopts">${options.map((o, i) => `<button class="choice" data-i="${i}">${o.t}</button>`).join('')}</div>`);
    $$('#wkBody .choice').forEach(b => b.addEventListener('click', () => res({ ...options[+b.dataset.i], el: b }), { once: true }));
  });
}

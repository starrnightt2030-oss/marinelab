// Shared UI layer: DOM helpers, icons, profile, narration, station panel, scoring session, result screen.
import { audio, sfx, speak, stopSpeaking } from './audio.js';
import { textKey, normText } from './voice-key.js';
import { VOICE } from './voice-lines.js';

export const gsap = window.gsap;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const store = {
  get(k, d) { try { const v = localStorage.getItem('ml3d:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ml3d:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
export const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------- icons ----------------
export const I = {
  helmet: '<svg viewBox="0 0 48 48"><path d="M8 31a16 16 0 0 1 32 0"/><path d="M4 31h40v5H4z"/><path d="M20 15.5V12h8v3.5"/><path d="M24 15v16"/></svg>',
  goggles: '<svg viewBox="0 0 48 48"><rect x="5" y="17" width="16" height="13" rx="5"/><rect x="27" y="17" width="16" height="13" rx="5"/><path d="M21 23h6M5 22H2M43 22h3"/></svg>',
  gloves: '<svg viewBox="0 0 48 48"><path d="M16 42V22l-4-6a2.5 2.5 0 0 1 4-3l4 5V8a2.5 2.5 0 0 1 5 0v11-13a2.5 2.5 0 0 1 5 0v13-10a2.5 2.5 0 0 1 5 0v18c0 6-3 10-6 13v5z"/><path d="M16 36h17"/></svg>',
  boots: '<svg viewBox="0 0 48 48"><path d="M12 6h14v20l12 6c3 1.5 4 4 4 7v3H8V6z"/><path d="M8 36h34M12 14h14"/></svg>',
  watch: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9"/><path d="M24 19v5l3 3M19 16l1-10h8l1 10M19 32l1 10h8l1-10"/></svg>',
  scarf: '<svg viewBox="0 0 48 48"><path d="M10 10c8 4 20 4 28 0v8c-8 4-20 4-28 0z"/><path d="M28 19l4 22-6-3-4 4-2-22"/></svg>',
  sandal: '<svg viewBox="0 0 48 48"><path d="M18 6c8 0 12 6 12 16s-2 20-8 20-8-6-8-18 0-18 4-18z"/><path d="M22 14l-7 10M22 14l7 10"/></svg>',
  gasket: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="11"/></svg>',
  gasketSmall: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="12"/><circle cx="24" cy="24" r="8"/></svg>',
  elbow: '<svg viewBox="0 0 48 48"><path d="M6 30h10a14 14 0 0 0 14-14V6"/><path d="M6 40h10a24 24 0 0 0 24-24V6"/><path d="M4 26v18M26 4h18"/></svg>',
  brush: '<svg viewBox="0 0 48 48"><rect x="6" y="20" width="22" height="9" rx="2"/><path d="M8 29v6M12 29v6M16 29v6M20 29v6M24 29v6"/><path d="M28 23l15-5"/></svg>',
  file: '<svg viewBox="0 0 48 48"><path d="M6 30l26-14 4 6-26 14z"/><path d="M12 29l3 4M17 26l3 4M22 23l3 4M27 20l3 4"/><path d="M36 20l7-4"/></svg>',
  rag: '<svg viewBox="0 0 48 48"><path d="M8 14c6-4 10 2 16-2s10 2 16-2v22c-6 4-10-2-16 2s-10-2-16 2z"/></svg>',
  twrench: '<svg viewBox="0 0 48 48"><circle cx="12" cy="12" r="6"/><path d="M16 16l22 22"/><path d="M33 33l6 6"/><rect x="27" y="25" width="6" height="10" rx="2" transform="rotate(-45 30 30)"/></svg>',
  pipewrench: '<svg viewBox="0 0 48 48"><path d="M10 8h12v6H16v4h6v5H10z"/><path d="M16 23v19"/><path d="M13 42h6"/></svg>',
  hammer: '<svg viewBox="0 0 48 48"><path d="M8 10h20v8H8z"/><path d="M28 12h6v4h-6"/><path d="M16 18v24"/></svg>',
  caliper: '<svg viewBox="0 0 48 48"><path d="M4 16h40v6H4z"/><path d="M8 22v16l6-6V22M30 22v14l5-5v-9"/><path d="M28 12h10v4H28z"/><path d="M10 16v-3M14 16v-2M18 16v-3M22 16v-2M26 16v-3"/></svg>',
  drawing: '<svg viewBox="0 0 48 48"><rect x="5" y="6" width="38" height="36" rx="2"/><path d="M11 32l10-6 8 5 10-6M21 26V14"/><path d="M5 36h38"/></svg>',
  library: '<svg viewBox="0 0 48 48"><path d="M24 6l16 9v18l-16 9-16-9V15z"/><path d="M24 24l16-9M24 24v18M24 24L8 15"/></svg>',
  cutter: '<svg viewBox="0 0 48 48"><circle cx="16" cy="24" r="9"/><path d="M25 24h17"/><circle cx="16" cy="24" r="3"/><path d="M38 18v12"/></svg>',
  thread: '<svg viewBox="0 0 48 48"><rect x="6" y="18" width="36" height="12" rx="2"/><path d="M12 18l4 12M18 18l4 12M24 18l4 12M30 18l4 12"/></svg>',
  search: '<svg viewBox="0 0 48 48"><circle cx="20" cy="20" r="12"/><path d="M29 29l12 12"/><path d="M14 20h12"/></svg>',
  ship: '<svg viewBox="0 0 48 48"><path d="M4 30h40l-6 10H10z"/><path d="M12 30V20h18v10M30 24h8v6"/><path d="M18 20v-8h6v8"/></svg>',
  oil: '<svg viewBox="0 0 48 48"><path d="M10 42l7-28h14l7 28"/><path d="M14 28h20M12 36h24M24 6v8"/><path d="M19 14l5-8 5 8"/></svg>',
  shield: '<svg viewBox="0 0 48 48"><path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z"/><path d="M17 24l5 5 9-10"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>',
  roll: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></svg>',
  flip: '<svg viewBox="0 0 24 24"><path d="M12 3v18M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  wrench: '<svg viewBox="0 0 24 24"><path d="M14.5 6.5a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.5-1.5"/><path d="M3 21l6-6"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  explode: '<svg viewBox="0 0 24 24"><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>',
  rotate: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
};

// ---------------- profile ----------------
export const profile = Object.assign({ name: '', xp: 0, badges: [], best: {} }, store.get('profile', {}));
export function saveProfile() { store.set('profile', profile); }
export const level = () => Math.floor(profile.xp / 250) + 1;

// ---------------- screens ----------------
export function show(id) { $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === id)); window.scrollTo(0, 0); }

// ---------------- narration ----------------
let clip = null;
const sayEl = () => $('#say');
export function stopVoice() { stopSpeaking(); if (clip) { clip.pause(); clip = null; } sayEl()?.classList.remove('is-speaking'); }
export function playLine(id) {
  stopVoice();
  if (!audio.on || !VOICE[id]) return;
  const L = VOICE[id], a = new Audio(`assets/voice/${id}.mp3`);
  const on = () => sayEl()?.classList.add('is-speaking'), off = () => sayEl()?.classList.remove('is-speaking');
  let fell = false;
  const fallback = () => { if (fell || clip !== a) return; fell = true; clip = null; speak(L.s || L.t, on, off); };
  clip = a; a.onplay = on; a.onended = off; a.onerror = fallback;
  a.play().catch(fallback);
}
/** Speak any sentence: its Shakir clip if generated (assets/voice/x<hash>.mp3), else the device's Arabic voice. */
export function sayText(text) {
  stopVoice();
  const t = normText(text); if (!audio.on || !t) return;
  const a = new Audio(`assets/voice/${textKey(t)}.mp3`);
  let fell = false;
  const fallback = () => { if (fell || clip !== a) return; fell = true; clip = null; speak(t); };
  clip = a; a.onerror = fallback; a.play().catch(fallback);
}
let lastSay = null;
/** Show + speak a narration line (VOICE id) in the side panel. */
export function say(id) { lastSay = id; const t = $('#sayText'); if (t) t.textContent = VOICE[id]?.t || id; playLine(id); }
export function replay() { if (lastSay) say(lastSay); }

// ---------------- panel feedback (never covers the exercise) ----------------
let msgTimer = 0;
export function toast(msg, kind = 'err', ms = 4200, speakIt = true) {
  const t = $('#toast'); if (!t) return;
  t.className = 'msg msg--' + kind;
  t.innerHTML = (kind === 'ok' ? I.ok : kind === 'info' ? I.info : I.warn) + `<span>${msg}</span>`; t.hidden = false;
  gsap.fromTo(t, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: .3 });
  if (speakIt) sayText(msg);
  clearTimeout(msgTimer); msgTimer = setTimeout(() => gsap.to(t, { opacity: 0, duration: .3, onComplete: () => (t.hidden = true) }), ms);
}
export function fb(id, kind = 'err', ms) { toast(VOICE[id]?.t || id, kind, ms, !VOICE[id]); if (VOICE[id]) playLine(id); }

/** Tools / parts / actions area of the side panel. */
export function dock(items, label = '') {
  const d = $('#dock');
  d.innerHTML = items ? `${label ? `<span class="dock__label">${label}</span>` : ''}<div class="dock__row">${items}</div>` : '';
  if (items) gsap.fromTo(d, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: 'power2.out' });
}
export function extra(html) { const e = $('#extra'); e.innerHTML = html || ''; e.hidden = !html; return e; }

// ---------------- session (scoring) ----------------
export let SES = null;
/**
 * cats: { key: [label, maxPoints] } — points are deducted per category and floored at 0.
 */
export function startSession(cfg) {
  if (SES) clearInterval(SES.timer);
  SES = { ...cfg, t0: performance.now(), ded: Object.fromEntries(Object.keys(cfg.cats).map(k => [k, 0])), mistakes: [], step: 0, flags: {} };
  $('#stTitle').textContent = cfg.title;
  $('#stSub').textContent = cfg.sub || '';
  $('#modePill').textContent = cfg.mode === 'learn' ? 'تعلّم' : 'اختبار';
  $('#levelPill').textContent = LEVELS[cfg.level].t;
  $('#levelPill').dataset.level = cfg.level;
  $('#score').textContent = scoreNow();
  $('#toast').hidden = true; extra('');
  SES.timer = setInterval(() => { $('#timer').textContent = fmt(elapsed()); if (cfg.timeLimit && elapsed() > cfg.timeLimit && !SES.flags.overtime) { SES.flags.overtime = true; penalize(cfg.timeCat || Object.keys(cfg.cats)[0], 5, 'تجاوز الزمن المحدد للتمرين'); toast('انتهى الزمن المحدد. كمّل، بس اتخصم من الدرجة.', 'info'); } }, 500);
  return SES;
}
export const LEVELS = { easy: { t: 'مبتدئ', d: 'إرشاد كامل وأخطاء محدودة' }, mid: { t: 'متوسط', d: 'عيوب عشوائية ومشاكل في الخامات' }, pro: { t: 'محترف', d: 'عيوب أكتر، زمن محدد، ومن غير مساعدة' } };
export const elapsed = () => SES ? Math.floor((performance.now() - SES.t0) / 1000) : 0;
export function scoreNow() { return SES ? Object.entries(SES.cats).reduce((a, [k, [, max]]) => a + Math.max(0, max - SES.ded[k]), 0) : 100; }
export function penalize(cat, pts, text) {
  SES.ded[cat] += pts; SES.mistakes.push({ t: elapsed(), text, pts });
  $('#score').textContent = scoreNow();
  gsap.fromTo('.pill--score', { scale: 1.25 }, { scale: 1, duration: .4 });
}
export function endSession() { if (SES) clearInterval(SES.timer); stopVoice(); }

export function renderSteps(steps, idx) {
  if (SES) SES.step = idx;
  $('#steps').innerHTML = steps.map((s, i) => `<li class="step ${i < idx ? 'is-done' : i === idx ? 'is-now' : ''}"><span class="step__dot">${i < idx ? '✓' : i + 1}</span><span class="step__label">${s.title}</span></li>`).join('');
  $('#stepNow').textContent = `الخطوة ${idx + 1} من ${steps.length}`;
  const now = $('.step.is-now'); if (now) now.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export function burst(big = true) {
  if (!window.confetti) return;
  const colors = ['#3DD9FF', '#2F7CF6', '#FFC23D', '#2EE6A6', '#FFFFFF'];
  window.confetti({ particleCount: big ? 140 : 70, spread: 80, origin: { y: .6 }, colors, disableForReducedMotion: true });
  if (big) {
    setTimeout(() => window.confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0 }, colors, disableForReducedMotion: true }), 250);
    setTimeout(() => window.confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1 }, colors, disableForReducedMotion: true }), 400);
  }
}

export const BADGES = { safety: 'سلامة أولاً', noleak: 'من غير تسريب', star: 'ربط مثالي', fast: 'إيد سريعة', precise: 'دقة الورنية', reader: 'قارئ رسومات', inspector: 'عين المفتش' };

/** Result screen for any station. extra: { badges:[], again:fn } */
export function renderResult(station, ex = {}) {
  endSession();
  const time = elapsed(), total = scoreNow(), S = SES;
  const stars = total >= 90 ? 3 : total >= 70 ? 2 : 1;
  const earned = (ex.badges || []).filter(Boolean);
  const mult = { easy: 1, mid: 1.4, pro: 2 }[S.level];
  const xp = Math.round((S.mode === 'test' ? total : total / 2) * mult);
  profile.xp += xp; earned.forEach(b => profile.badges.includes(b) || profile.badges.push(b));
  const key = `${station.id}:${S.level}`; profile.best[key] = Math.max(profile.best[key] || 0, total); saveProfile();
  const verdict = total >= 90 ? 'ممتاز' : total >= 80 ? 'جيد جداً' : total >= 65 ? 'جيد' : 'محتاج تدريب أكتر';
  const crit = Object.entries(S.cats).map(([k, [name, max]]) => { const got = Math.max(0, max - S.ded[k]); return `<div class="crit__row"><span>${name}</span><b class="mono" dir="ltr">${got} / ${max}</b><div class="meter"><i class="${got === max ? 'full' : ''}" style="width:${got / max * 100}%"></i></div></div>`; }).join('');
  const log = S.mistakes.length ? S.mistakes.map(m => `<li><span class="mono muted">${fmt(m.t)}</span><span>${m.text}</span><b dir="ltr">−${m.pts}</b></li>`).join('') : '<li><span></span><span>مفيش أخطاء مسجلة. شغل نضيف.</span><span></span></li>';
  const tips = (ex.tips || []).map(t => `<li>${t}</li>`).join('');
  $('#resultBody').innerHTML = `
    <section class="glass result__top">
      <div class="stars" aria-label="${stars} من 3 نجوم">${[1, 2, 3].map(n => I.star.replace('<svg', `<svg class="${n <= stars ? 'on' : ''}"`)).join('')}</div>
      <div class="result__score"><div class="bigscore mono" dir="ltr">${total}<small> / 100</small></div><h2>${verdict}</h2></div>
      <div class="result__meta">
        <b>${station.title}</b>
        <span class="muted">${profile.name || 'المتدرب'} · ${S.mode === 'test' ? 'اختبار' : 'تعلّم'} · ${LEVELS[S.level].t}</span>
        <span class="mono">الزمن ${fmt(time)} · +${xp} XP</span>
        <span class="badgerow">${earned.map(b => `<span class="badge is-on">${I.star}${BADGES[b]}</span>`).join('')}</span>
      </div>
    </section>
    <div class="result__grid">
      <section class="glass crit"><h3>تفاصيل التقييم</h3>${crit}</section>
      <section class="glass log"><h3>سجل الأخطاء</h3><ul>${log}</ul>${tips ? `<h3>نصائح للمرة الجاية</h3><ul class="tips">${tips}</ul>` : ''}</section>
    </div>
    <div class="result__actions"><button class="btn btn--primary btn--xl" data-action="again">أعد المحاولة</button><button class="btn btn--xl" data-action="hub">محطات المعمل</button></div>`;
  show('result');
  gsap.from('.stars svg', { scale: 0, rotate: -90, duration: .6, stagger: .18, ease: 'back.out(2)' });
  gsap.from('.bigscore', { scale: .6, opacity: 0, duration: .6, ease: 'back.out(2)' });
  if (stars >= 2) { burst(); sfx.win(); }
}

/** Two-to-four choice question inside the panel. Resolves with the chosen value. */
export function ask(question, options) {
  return new Promise(resolve => {
    sayText(question);
    dock(options.map((o, i) => `<button class="choice" data-i="${i}">${o.t}</button>`).join(''), question);
    $$('#dock .choice').forEach(b => b.addEventListener('click', () => { sfx.tap(); resolve(options[+b.dataset.i]); }, { once: true }));
  });
}

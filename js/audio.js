// Synthesised workshop sounds (no audio files needed) + Arabic narration via the browser's speech engine.
let ctx = null, master = null, noiseBuf = null;
export const audio = { on: true };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}
export function unlockAudio() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); }

function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function noise(dur, type, freq, q, peak, t0 = 0) {
  const c = ensure(); if (!c || !audio.on) return;
  const t = c.currentTime + t0;
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); env(g, t, 0.005, peak, dur);
  s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
function tone(freq, dur, type = 'sine', peak = 0.2, t0 = 0, glideTo) {
  const c = ensure(); if (!c || !audio.on) return;
  const t = c.currentTime + t0;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  const g = c.createGain(); env(g, t, 0.008, peak, dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
// metallic: inharmonic partials
function metal(base, dur, peak, t0 = 0) {
  [1, 2.76, 5.4, 8.93].forEach((m, i) => tone(base * m, dur / (1 + i * 0.6), 'sine', peak / (1 + i), t0));
  noise(0.04, 'highpass', 2500, 0.7, peak * 0.8, t0);
}

export const sfx = {
  tap() { tone(880, 0.06, 'triangle', 0.08); },
  pick() { tone(520, 0.08, 'triangle', 0.1); tone(780, 0.1, 'triangle', 0.08, 0.05); },
  wear() { noise(0.18, 'bandpass', 900, 1.2, 0.25); tone(300, 0.12, 'sine', 0.12, 0.05); },
  clank() { metal(310, 0.6, 0.35); },
  thunk() { tone(140, 0.25, 'sine', 0.45, 0, 70); metal(520, 0.35, 0.18, 0.01); },
  brush() { noise(0.12, 'bandpass', 3800 + Math.random() * 1500, 0.9, 0.18); },
  slide() { noise(0.35, 'bandpass', 1800, 2, 0.12); metal(1200, 0.2, 0.05, 0.3); },
  ratchet(n = 6) { for (let i = 0; i < n; i++) { noise(0.025, 'highpass', 4000, 1, 0.3, i * 0.075); tone(2400, 0.02, 'square', 0.04, i * 0.075); } },
  error() { tone(220, 0.16, 'square', 0.12); tone(165, 0.24, 'square', 0.12, 0.15); },
  ok() { [523, 659, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.09)); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.15, i * 0.11)); },
  pump() { tone(60, 0.25, 'sawtooth', 0.08); noise(0.2, 'lowpass', 400, 1, 0.15); },
};

// continuous hiss for leaks
let hiss = null;
export function leakSound(level) {
  const c = ensure(); if (!c) return;
  if (!hiss) {
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = 0;
    s.connect(f).connect(g).connect(master); s.start();
    hiss = g;
  }
  hiss.gain.setTargetAtTime(audio.on ? level * 0.35 : 0, c.currentTime, 0.1);
}

// ---------- narration ----------
let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => /ar[-_]EG/i.test(v.lang)) || vs.find(v => /^ar/i.test(v.lang)) || null;
  return voice;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
export function hasArabicVoice() { return !!(voice || pickVoice()); }

export function speak(text, onStart, onEnd) {
  if (!('speechSynthesis' in window) || !audio.on) { onEnd && onEnd(); return; }
  speechSynthesis.cancel();
  if (!voice) pickVoice();
  const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, ''));
  u.lang = voice ? voice.lang : 'ar-EG';
  if (voice) u.voice = voice;
  u.rate = 0.98; u.pitch = 1;
  u.onstart = () => onStart && onStart();
  u.onend = u.onerror = () => onEnd && onEnd();
  speechSynthesis.speak(u);
}
export function stopSpeaking() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }

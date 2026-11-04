// Stable key for any spoken sentence, shared by the app (to find the clip) and the voice generator (to make it).
export const normText = t => String(t).replace(/<[^>]+>/g, ' ').replace(/[«»]/g, '').replace(/\s+/g, ' ').trim();
export function textKey(t) {
  const s = normText(t); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'x' + h.toString(16).padStart(8, '0');
}

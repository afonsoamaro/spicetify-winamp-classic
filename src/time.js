// @ts-check
// Time formatting for the display. Pure, no DOM.

/** @param {number} n */
const pad = (n) => String(n).padStart(2, '0');

/**
 * `m:ss`, or `h:mm:ss` past one hour. Anything that is not a non-negative
 * finite number reads as `0:00`, so a missing duration never breaks the text.
 * @param {unknown} ms
 * @returns {string}
 */
export function formatTime(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// @ts-check
// State of the spectrum analyser. Pure, no DOM: drawing and scheduling live
// in spectrum-dom.js. Values are 0..1 fractions of the full bar height.

// 3 px bars with 1 px gaps in a 76 px canvas, the geometry of Winamp's own
// analyser (19 bands in 75 px).
export const BARS = 19;
// Rows of 1 px in the 16 px canvas; the colour bands are counted in rows.
export const ROWS = 16;
// How much a bar drops per frame when its target is lower.
export const DECAY = 0.06;
// Weight of the previous target when a new random target comes in.
export const SMOOTHING = 0.7;
// Frames a peak waits above a lower bar before it starts to fall.
export const PEAK_HOLD = 15;
// How much a peak drops per frame once the hold is over.
export const PEAK_FALL = 0.02;

const BANDS = /** @type {const} */ (['green', 'yellow', 'orange', 'red']);

/**
 * @typedef {typeof BANDS[number]} Band
 * @typedef {{ values: number[], targets: number[], peaks: number[], holds: number[] }} SpectrumState
 */

/**
 * @param {number} [bars]
 * @returns {SpectrumState}
 */
export function createState(bars = BARS) {
  const zeros = () => new Array(bars).fill(0);
  return { values: zeros(), targets: zeros(), peaks: zeros(), holds: zeros() };
}

/**
 * Advances every bar by one frame, in place. While playing each bar chases a
 * smoothed random target, jumping up at once and falling at a fixed rate;
 * paused, the target is zero and everything decays. The peak rides on the
 * bar, holds for PEAK_HOLD frames once the bar drops under it, then falls.
 * @param {SpectrumState} state
 * @param {() => number} rng returns 0..1
 * @param {boolean} playing
 * @returns {SpectrumState}
 */
export function nextFrame(state, rng, playing) {
  const { values, targets, peaks, holds } = state;
  for (let i = 0; i < values.length; i += 1) {
    const target = playing ? SMOOTHING * (targets[i] ?? 0) + (1 - SMOOTHING) * rng() : 0;
    targets[i] = target;
    const value = values[i] ?? 0;
    values[i] = target > value ? target : Math.max(0, value - DECAY);

    const current = values[i] ?? 0;
    const peak = peaks[i] ?? 0;
    if (current >= peak) {
      peaks[i] = current;
      holds[i] = PEAK_HOLD;
    } else if ((holds[i] ?? 0) > 0) {
      holds[i] = (holds[i] ?? 0) - 1;
    } else {
      peaks[i] = Math.max(0, peak - PEAK_FALL);
    }
  }
  return state;
}

/**
 * Colour band of a row counted from the bottom: the lowest quarter green,
 * then yellow, orange and red at the top.
 * @param {number} row
 * @param {number} totalRows
 * @returns {Band}
 */
export function colorForRow(row, totalRows) {
  const band = Math.min(3, Math.max(0, Math.floor((row / totalRows) * 4)));
  return BANDS[band] ?? 'green';
}

/**
 * True when nothing is left to animate: every bar and every peak at zero.
 * @param {SpectrumState} state
 * @returns {boolean}
 */
export function isIdle(state) {
  return state.values.every((v) => v === 0) && state.peaks.every((p) => p === 0);
}

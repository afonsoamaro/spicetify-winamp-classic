// @ts-check
// The DOM side of the spectrum analyser: a canvas in the right padding of the
// display, drawn on requestAnimationFrame only while there is something to
// animate. Paused, the bars decay to zero and the loop stops on its own.
import { LOG_PREFIX } from './dom.js';
import { ROWS, colorForRow, createState, isIdle, nextFrame } from './spectrum.js';

export const SPECTRUM_CLASS = 'wa-spectrum';
export const CANVAS_W = 76;
export const CANVAS_H = 16;
export const BAR_W = 3;
export const GAP = 1;
// Below this display width the canvas would sit on top of the text.
export const MIN_DISPLAY_W = 200;

// Theme token per band, with the scheme's own value as the fallback when the
// token cannot be read (a detached canvas, or a test without the stylesheet).
export const COLOR_TOKENS = /** @type {const} */ ({
  green: ['--spice-text', '#00ff00'],
  yellow: ['--wa-vol-mid', '#ffff00'],
  orange: ['--spice-misc', '#ff9900'],
  red: ['--spice-notification-error', '#c60000'],
  peak: ['--wa-bevel-light', '#5a5a6e'],
});

/** @typedef {Record<keyof typeof COLOR_TOKENS, string>} Colors */

/**
 * @param {HTMLElement} el
 * @returns {Colors}
 */
export function readColors(el) {
  const style = getComputedStyle(el);
  const entries = Object.entries(COLOR_TOKENS).map(([band, [token, fallback]]) => {
    return [band, style.getPropertyValue(token).trim() || fallback];
  });
  return /** @type {Colors} */ (Object.fromEntries(entries));
}

/**
 * Paints one frame: per bar, one 1 px row per unit of height in the colour of
 * its band, and the peak as a single row above.
 * @param {Pick<CanvasRenderingContext2D, 'clearRect' | 'fillRect' | 'fillStyle'>} ctx
 * @param {import('./spectrum.js').SpectrumState} state
 * @param {Colors} colors
 */
export function drawFrame(ctx, state, colors) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  for (let i = 0; i < state.values.length; i += 1) {
    const x = i * (BAR_W + GAP);
    const rows = Math.round((state.values[i] ?? 0) * ROWS);
    for (let row = 0; row < rows; row += 1) {
      ctx.fillStyle = colors[colorForRow(row, ROWS)];
      ctx.fillRect(x, CANVAS_H - 1 - row, BAR_W, 1);
    }
    const peakRow = Math.round((state.peaks[i] ?? 0) * ROWS) - 1;
    if (peakRow >= 0) {
      ctx.fillStyle = colors.peak;
      ctx.fillRect(x, CANVAS_H - 1 - peakRow, BAR_W, 1);
    }
  }
}

/**
 * The slice of Spicetify.Player the analyser uses, so tests can pass a fake.
 * @typedef {object} PlayerLike
 * @property {() => boolean} isPlaying
 * @property {(type: string, callback: () => void) => void} addEventListener
 * @property {(type: string, callback: () => void) => void} removeEventListener
 */

/**
 * @param {{
 *   rng?: () => number,
 *   player?: () => PlayerLike,
 *   schedule?: (callback: () => void) => number,
 *   cancel?: (id: number) => void,
 * }} [options]
 * @returns {import('./dom.js').Injection}
 */
export function createSpectrumInjection({
  rng = Math.random,
  player = () => Spicetify.Player,
  schedule = (callback) => requestAnimationFrame(callback),
  cancel = (id) => cancelAnimationFrame(id),
} = {}) {
  /** @type {HTMLCanvasElement | null} */
  let canvas = null;
  /** @type {CanvasRenderingContext2D | null} */
  let ctx = null;
  /** @type {ResizeObserver | null} */
  let resize = null;
  /** @type {number | null} */
  let pending = null;
  let state = createState();
  /** @type {Colors | null} */
  let colors = null;

  // origin._state sits behind a getter that can be undefined for a moment.
  const playing = () => {
    try {
      return player().isPlaying();
    } catch {
      return false;
    }
  };

  const frame = () => {
    pending = null;
    if (!ctx || !colors) return;
    nextFrame(state, rng, playing());
    drawFrame(ctx, state, colors);
    if (playing() || !isIdle(state)) start();
  };

  const start = () => {
    if (pending === null && ctx) pending = schedule(frame);
  };

  return {
    name: 'spectrum',
    run(display) {
      const dpr = globalThis.devicePixelRatio || 1;
      canvas = document.createElement('canvas');
      canvas.className = SPECTRUM_CLASS;
      // Decorative: nothing in it is worth announcing.
      canvas.setAttribute('aria-hidden', 'true');
      canvas.width = CANVAS_W * dpr;
      canvas.height = CANVAS_H * dpr;
      ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn(`${LOG_PREFIX} spectrum: no 2d context, giving up`);
        canvas = null;
        return;
      }
      ctx.scale(dpr, dpr);
      display.append(canvas);
      colors = readColors(canvas);
      state = createState();
      player().addEventListener('onplaypause', start);
      if (typeof ResizeObserver !== 'undefined') {
        resize = new ResizeObserver(() => {
          if (canvas) canvas.hidden = display.clientWidth < MIN_DISPLAY_W;
        });
        resize.observe(display);
      }
      start();
    },
    cleanup() {
      if (pending !== null) cancel(pending);
      pending = null;
      resize?.disconnect();
      resize = null;
      try {
        player().removeEventListener('onplaypause', start);
      } catch (err) {
        console.warn(`${LOG_PREFIX} spectrum: could not remove the onplaypause listener`, err);
      }
      canvas?.remove();
      canvas = null;
      ctx = null;
      colors = null;
    },
  };
}

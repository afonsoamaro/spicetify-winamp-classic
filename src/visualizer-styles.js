// @ts-check
// How each visualizer style paints one frame of the signal. Pure drawing on a
// 2D context, no DOM and no scheduling: the loop decides when, the surfaces
// decide where.
import { BAND_COUNT, WAVE_SAMPLES } from './visualizer-signal.js';

// Theme token per colour, with the scheme's own value as the fallback when
// the token cannot be read (a detached canvas, or a test without the sheet).
export const VIZ_COLOR_TOKENS = /** @type {const} */ ({
  low: ['--spice-text', '#00ff00'],
  mid: ['--wa-vol-mid', '#ffff00'],
  high: ['--spice-notification-error', '#c60000'],
  accent: ['--spice-misc', '#ff9900'],
  back: ['--spice-main', '#000000'],
  peak: ['--wa-bevel-light', '#5a5a6e'],
});

/** @typedef {Record<keyof typeof VIZ_COLOR_TOKENS, string>} VizColors */

/**
 * The slice of CanvasRenderingContext2D the styles use, so tests can pass a fake.
 * @typedef {Pick<CanvasRenderingContext2D,
 *   'clearRect' | 'fillRect' | 'beginPath' | 'moveTo' | 'lineTo' | 'stroke' | 'arc' | 'fill' |
 *   'fillStyle' | 'strokeStyle' | 'lineWidth' | 'globalAlpha'>} DrawContext
 */

/**
 * @param {HTMLElement} el
 * @returns {VizColors}
 */
export function readVisualizerColors(el) {
  const style = getComputedStyle(el);
  const entries = Object.entries(VIZ_COLOR_TOKENS).map(([name, [token, fallback]]) => [name, style.getPropertyValue(token).trim() || fallback]);
  return /** @type {VizColors} */ (Object.fromEntries(entries));
}

/** @param {number} value @returns {number} */
function unit(value) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

// About one bar per this many CSS pixels, so a wide canvas gets thin bars
// instead of the same few stretched.
const BAR_TARGET_W = 6;
const MIN_BARS = 16;

/**
 * How many bars fit a canvas of this width, one signal band each at most.
 * @param {number} width in CSS pixels
 * @returns {number}
 */
export function barCountFor(width) {
  return Math.min(BAND_COUNT, Math.max(MIN_BARS, Math.round(width / BAR_TARGET_W)));
}

// The four colour bands of a bar, bottom to top, the same as the display spectrum's.
const BAR_BANDS = /** @type {const} */ (['low', 'mid', 'accent', 'high']);
// Thickness of the peak cap, in CSS pixels.
const PEAK_CAP_H = 2;

/**
 * Winamp-style columns, painted like the display spectrum: each bar reads one
 * band (not an average, which would iron the randomness out), is split into four
 * colour bands by height and wears the held peak as a cap.
 * @type {StyleDraw}
 */
function drawBars(ctx, signal, { w, h }, colors) {
  const count = barCountFor(w);
  const slot = w / count;
  const barW = Math.max(1, slot - 1);
  for (let i = 0; i < count; i += 1) {
    const band = Math.floor((i * BAND_COUNT) / count);
    const x = i * slot;
    const total = unit(signal.levels[band] ?? 0) * h;
    for (let k = 0; k < BAR_BANDS.length && total > 0; k += 1) {
      const bottom = (k / BAR_BANDS.length) * h;
      const top = Math.min(total, ((k + 1) / BAR_BANDS.length) * h);
      if (top <= bottom) break;
      ctx.fillStyle = colors[BAR_BANDS[k] ?? 'low'];
      ctx.fillRect(x, h - top, barW, top - bottom);
    }
    const peak = unit(signal.peaks[band] ?? 0) * h;
    if (peak > 0) {
      ctx.fillStyle = colors.peak;
      ctx.fillRect(x, Math.min(h - PEAK_CAP_H, Math.max(0, h - peak)), barW, PEAK_CAP_H);
    }
  }
}

/** The oscilloscope: one line through the waveform samples. @type {StyleDraw} */
function drawScope(ctx, signal, { w, h }, colors) {
  ctx.strokeStyle = colors.low;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < WAVE_SAMPLES; i += 1) {
    const x = (i / (WAVE_SAMPLES - 1)) * w;
    const y = h / 2 - Math.max(-1, Math.min(1, Number.isFinite(signal.wave[i]) ? (signal.wave[i] ?? 0) : 0)) * (h / 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** A soft pulse on the beat with a ring of dots that follow the bands. @type {StyleDraw} */
function drawGlow(ctx, signal, { w, h }, colors) {
  const cx = w / 2;
  const cy = h / 2;
  const reach = Math.min(w, h) / 2;
  const beat = unit(signal.beat);
  if (beat > 0) {
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.15 + 0.5 * beat;
    ctx.beginPath();
    ctx.arc(cx, cy, reach * (0.25 + 0.5 * beat), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = colors.low;
  const dots = 32;
  for (let d = 0; d < dots; d += 1) {
    const level = unit(signal.levels[Math.floor((d * BAND_COUNT) / dots)] ?? 0);
    if (level <= 0) continue;
    const angle = (d / dots) * Math.PI * 2;
    const radius = reach * (0.45 + 0.5 * level);
    ctx.globalAlpha = 0.35 + 0.65 * level;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 2 + 3 * level, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * @callback StyleDraw
 * @param {DrawContext} ctx
 * @param {import('./visualizer-signal.js').Signal} signal
 * @param {{ w: number, h: number }} size
 * @param {VizColors} colors
 * @returns {void}
 */

/** @type {Record<string, StyleDraw>} */
const STYLE_DRAWERS = { bars: drawBars, scope: drawScope, glow: drawGlow };

/**
 * Clears the canvas and paints the style. An unknown id paints bars.
 * @param {string} id
 * @param {DrawContext} ctx
 * @param {import('./visualizer-signal.js').Signal} signal
 * @param {{ w: number, h: number }} size
 * @param {VizColors} colors
 */
export function drawStyle(id, ctx, signal, size, colors) {
  ctx.clearRect(0, 0, size.w, size.h);
  (STYLE_DRAWERS[id] ?? drawBars)(ctx, signal, size, colors);
}

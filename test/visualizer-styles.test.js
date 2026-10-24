/** @vitest-environment jsdom */
// @ts-check
import { describe, expect, it } from 'vitest';
import { BAND_COUNT, WAVE_SAMPLES, createSignal } from '../src/visualizer-signal.js';
import { STYLE_IDS } from '../src/visualizer-settings.js';
import { VIZ_COLOR_TOKENS, barCountFor, drawStyle, readVisualizerColors } from '../src/visualizer-styles.js';

const COLORS = { low: '#0f0', mid: '#ff0', high: '#f00', accent: '#f90', back: '#000' };
const SIZE = { w: 200, h: 100 };

/** A 2D context stand-in that records every call. */
function fakeContext() {
  /** @type {{ name: string, args: unknown[] }[]} */
  const calls = [];
  /** @param {string} name */
  const rec = (name) => (/** @type {unknown[]} */ ...args) => void calls.push({ name, args });
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    clearRect: rec('clearRect'),
    fillRect: rec('fillRect'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    stroke: rec('stroke'),
    arc: rec('arc'),
    fill: rec('fill'),
  };
  return { ctx, calls };
}

/** @param {{ name: string }[]} calls @param {string} name */
const count = (calls, name) => calls.filter((c) => c.name === name).length;

/** @param {(s: ReturnType<typeof createSignal>) => void} fill */
function signalWith(fill) {
  const s = createSignal();
  fill(s);
  return s;
}

describe('bars', () => {
  it('paints no bars for a silent signal', () => {
    const { ctx, calls } = fakeContext();
    drawStyle('bars', ctx, createSignal(), SIZE, COLORS);
    expect(count(calls, 'fillRect')).toBe(0);
  });

  it('paints columns that stay inside the canvas when every band is full', () => {
    const { ctx, calls } = fakeContext();
    drawStyle('bars', ctx, signalWith((s) => s.levels.fill(1)), SIZE, COLORS);
    const rects = calls.filter((c) => c.name === 'fillRect');
    expect(rects.length).toBeGreaterThanOrEqual(barCountFor(SIZE.w));
    for (const { args } of rects) {
      const [x = 0, y = 0, w = 0, h = 0] = /** @type {number[]} */ (args);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(SIZE.w);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(SIZE.h + 0.0001);
    }
  });
});

describe('bar granularity', () => {
  it('uses about one bar per 6 px, between 16 and one per signal band', () => {
    expect(barCountFor(322)).toBe(54);
    expect(barCountFor(10)).toBe(16);
    expect(barCountFor(100000)).toBe(BAND_COUNT);
  });

  it('draws thin bars on a wide canvas, not the same few stretched', () => {
    const wide = { w: 1600, h: 100 };
    const narrow = fakeContext();
    const big = fakeContext();
    const full = signalWith((s) => s.levels.fill(1));
    drawStyle('bars', narrow.ctx, full, SIZE, COLORS);
    drawStyle('bars', big.ctx, full, wide, COLORS);
    const widths = big.calls.filter((c) => c.name === 'fillRect').map((c) => /** @type {number[]} */ (c.args)[2] ?? 0);
    expect(widths.length).toBeGreaterThan(narrow.calls.filter((c) => c.name === 'fillRect').length);
    expect(Math.max(...widths)).toBeLessThanOrEqual(7);
  });
});

describe('scope', () => {
  it('draws one polyline through every sample', () => {
    const { ctx, calls } = fakeContext();
    drawStyle('scope', ctx, signalWith((s) => s.wave.fill(0.5)), SIZE, COLORS);
    expect(count(calls, 'moveTo')).toBe(1);
    expect(count(calls, 'lineTo')).toBe(WAVE_SAMPLES - 1);
    expect(count(calls, 'stroke')).toBe(1);
  });
});

describe('glow', () => {
  it('draws on the beat and leaves the alpha at 1', () => {
    const { ctx, calls } = fakeContext();
    drawStyle('glow', ctx, signalWith((s) => (s.beat = 1)), SIZE, COLORS);
    expect(count(calls, 'arc')).toBeGreaterThan(0);
    expect(ctx.globalAlpha).toBe(1);
  });
});

describe('drawStyle', () => {
  it('draws bars for an unknown id', () => {
    const full = signalWith((s) => s.levels.fill(0.7));
    const a = fakeContext();
    const b = fakeContext();
    drawStyle('nope', a.ctx, full, SIZE, COLORS);
    drawStyle('bars', b.ctx, full, SIZE, COLORS);
    expect(a.calls).toEqual(b.calls);
  });

  it.each(STYLE_IDS)('%s never draws with a non-finite coordinate', (id) => {
    for (const fill of [(/** @type {ReturnType<typeof createSignal>} */ s) => s, (/** @type {ReturnType<typeof createSignal>} */ s) => {
      s.levels.fill(1);
      s.wave.fill(1);
      s.beat = 1;
    }]) {
      const { ctx, calls } = fakeContext();
      drawStyle(id, ctx, signalWith(fill), SIZE, COLORS);
      expect(calls.every((c) => c.args.every(Number.isFinite))).toBe(true);
    }
  });
});

describe('readVisualizerColors', () => {
  it('falls back to the scheme values when a token is missing', () => {
    const colors = readVisualizerColors(document.createElement('div'));
    expect(colors.low).toBe(VIZ_COLOR_TOKENS.low[1]);
    expect(colors.back).toBe(VIZ_COLOR_TOKENS.back[1]);
  });
});

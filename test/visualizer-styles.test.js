/** @vitest-environment jsdom */
// @ts-check
import { describe, expect, it } from 'vitest';
import { BAND_COUNT, WAVE_SAMPLES, createSignal } from '../src/visualizer-signal.js';
import { STYLE_IDS } from '../src/visualizer-settings.js';
import { VIZ_COLOR_TOKENS, drawStyle, readVisualizerColors } from '../src/visualizer-styles.js';

const COLORS = { low: '#0f0', mid: '#ff0', high: '#f00', accent: '#f90', back: '#000' };
const SIZE = { w: 200, h: 100 };

/** A 2D context stand-in that records every call and the fill state when it happened. */
function fakeContext() {
  /** @type {{ name: string, args: number[] }[]} */
  const calls = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
  };
  /** @param {string} name */
  const record = (name) => (/** @type {number[]} */ ...args) => void calls.push({ name, args });
  const methods = Object.fromEntries(['clearRect', 'fillRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'fill'].map((n) => [n, record(n)]));
  return { ctx: Object.assign(ctx, methods), calls };
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
    expect(rects.length).toBeGreaterThanOrEqual(BAND_COUNT);
    for (const { args: [x = 0, y = 0, w = 0, h = 0] } of rects) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(SIZE.w);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(SIZE.h + 0.0001);
    }
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

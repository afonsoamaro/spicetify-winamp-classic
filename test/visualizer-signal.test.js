// @ts-check
import { describe, expect, it } from 'vitest';
import { BAND_COUNT, WAVE_SAMPLES, bpmForTrack, createSignal, isSilent, stepSignal } from '../src/visualizer-signal.js';

/** Small deterministic generator so runs can be compared. @param {number} seed */
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

/** @param {import('../src/visualizer-signal.js').Signal} s */
const allFinite = (s) => [...s.levels, ...s.wave, s.beat].every(Number.isFinite);

describe('bpmForTrack', () => {
  it('is stable for a uri and stays an integer in 80..150', () => {
    const bpm = bpmForTrack('spotify:track:a');
    expect(bpmForTrack('spotify:track:a')).toBe(bpm);
    expect(Number.isInteger(bpm)).toBe(true);
    expect(bpm).toBeGreaterThanOrEqual(80);
    expect(bpm).toBeLessThanOrEqual(150);
  });

  it('spreads different uris over the range', () => {
    const values = new Set(Array.from({ length: 20 }, (_, i) => bpmForTrack(`spotify:track:${i}x${i * 7}`)));
    expect(values.size).toBeGreaterThanOrEqual(5);
  });

  it('gives one default for a missing or empty uri', () => {
    expect(bpmForTrack(undefined)).toBe(bpmForTrack(''));
  });
});

describe('stepSignal', () => {
  it('peaks on the beat and has decayed half a beat later', () => {
    const uri = 'spotify:track:a';
    const period = 60000 / bpmForTrack(uri);
    const on = stepSignal(createSignal(), { uri, progressMs: 0, playing: true, rng: seeded(1) });
    const off = stepSignal(createSignal(), { uri, progressMs: period / 2, playing: true, rng: seeded(1) });
    expect(on.beat).toBeGreaterThan(0.9);
    expect(off.beat).toBeLessThan(on.beat);
  });

  it('keeps every value finite and in range, even without a uri or with a bad progress', () => {
    for (const input of [
      { uri: undefined, progressMs: 1000 },
      { uri: 'spotify:track:a', progressMs: Number.NaN },
      { uri: 'spotify:track:a', progressMs: -5 },
    ]) {
      const signal = createSignal();
      const rng = Math.random;
      for (let i = 0; i < 500; i += 1) {
        stepSignal(signal, { ...input, playing: true, rng });
        expect(allFinite(signal)).toBe(true);
        expect(signal.levels.every((v) => v >= 0 && v <= 1)).toBe(true);
        expect(signal.wave.every((v) => v >= -1 && v <= 1)).toBe(true);
        expect(signal.beat >= 0 && signal.beat <= 1).toBe(true);
      }
    }
  });

  it('has no step where the beat boost ends, a third of the way up the bands', () => {
    const sums = new Array(BAND_COUNT).fill(0);
    const signal = createSignal();
    const rng = seeded(7);
    for (let i = 0; i < 400; i += 1) {
      stepSignal(signal, { uri: 'spotify:track:a', progressMs: i * 33, playing: true, rng });
      signal.levels.forEach((v, band) => (sums[band] += v));
    }
    const edge = Math.round(BAND_COUNT / 3);
    const mean = (/** @type {number} */ from, /** @type {number} */ to) => sums.slice(from, to).reduce((a, b) => a + b, 0) / (to - from) / 400;
    // A hard edge here showed as a vertical line across the fullscreen bars.
    expect(Math.abs(mean(edge, edge + 8) - mean(edge - 8, edge))).toBeLessThan(0.05);
  });

  it('has the declared sizes', () => {
    const signal = createSignal();
    expect(signal.levels).toHaveLength(BAND_COUNT);
    expect(signal.wave).toHaveLength(WAVE_SAMPLES);
  });

  it('decays to exact silence when paused', () => {
    const signal = createSignal();
    for (let i = 0; i < 30; i += 1) stepSignal(signal, { uri: 'spotify:track:a', progressMs: i * 40, playing: true, rng: seeded(i + 1) });
    expect(isSilent(signal)).toBe(false);
    for (let i = 0; i < 200; i += 1) stepSignal(signal, { uri: 'spotify:track:a', progressMs: 1200, playing: false, rng: seeded(9) });
    expect(isSilent(signal)).toBe(true);
  });

  it('is deterministic for the same inputs and random sequence', () => {
    const run = () => {
      const signal = createSignal();
      const rng = seeded(42);
      for (let i = 0; i < 50; i += 1) stepSignal(signal, { uri: 'spotify:track:a', progressMs: i * 33, playing: true, rng });
      return signal;
    };
    expect(run()).toEqual(run());
  });
});

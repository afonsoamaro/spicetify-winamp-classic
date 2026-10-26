// @ts-check
import { describe, expect, it } from 'vitest';
import { BARS, PEAK_FALL } from '../src/spectrum.js';
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
      let ok = true;
      for (let i = 0; i < 500; i += 1) {
        stepSignal(signal, { ...input, playing: true, rng: Math.random });
        ok &&= allFinite(signal) && signal.levels.every((v) => v >= 0 && v <= 1) && signal.wave.every((v) => v >= -1 && v <= 1) && signal.beat >= 0 && signal.beat <= 1;
      }
      expect(ok, `uri ${input.uri}, progress ${input.progressMs}`).toBe(true);
    }
  });

  /** Runs a seeded signal and returns each band's series of levels over the frames. @param {number} frames */
  function bandSeries(frames) {
    const signal = createSignal();
    const rng = seeded(11);
    /** @type {number[][]} */
    const series = Array.from({ length: BAND_COUNT }, () => []);
    for (let i = 0; i < frames; i += 1) {
      stepSignal(signal, { uri: 'spotify:track:a', progressMs: i * 33, playing: true, rng });
      signal.levels.forEach((v, band) => series[band]?.push(v));
    }
    return series;
  }

  /** @param {number[]} a @param {number[]} b */
  function correlation(a, b) {
    const mean = (/** @type {number[]} */ xs) => xs.reduce((x, y) => x + y, 0) / xs.length;
    const ma = mean(a);
    const mb = mean(b);
    let cov = 0;
    let va = 0;
    let vb = 0;
    for (let i = 0; i < a.length; i += 1) {
      const da = (a[i] ?? 0) - ma;
      const db = (b[i] ?? 0) - mb;
      cov += da * db;
      va += da * da;
      vb += db * db;
    }
    return cov / Math.sqrt(va * vb);
  }

  it('is as lively as the display spectrum: no band is pinned and the bars differ from each other', () => {
    const series = bandSeries(400);
    const means = series.map((s) => s.reduce((a, b) => a + b, 0) / s.length);
    // No repeated profile: the average height of a band does not slope from one end to the other.
    const first = means.slice(0, 32).reduce((a, b) => a + b, 0) / 32;
    const last = means.slice(-32).reduce((a, b) => a + b, 0) / 32;
    expect(Math.abs(first - last)).toBeLessThan(0.05);
    // Within one frame the bars spread out, as the 19 bars of the small analyser do.
    let spread = 0;
    for (let f = 0; f < 400; f += 1) {
      const frame = series.map((s) => s[f] ?? 0);
      const m = frame.reduce((a, b) => a + b, 0) / frame.length;
      spread += Math.sqrt(frame.reduce((a, b) => a + (b - m) ** 2, 0) / frame.length);
    }
    expect(spread / 400).toBeGreaterThan(0.12);
  });

  it('is organic: a bar follows its neighbours more than it follows a bar far away', () => {
    const series = bandSeries(600);
    let near = 0;
    let far = 0;
    let n = 0;
    for (let band = 0; band + 80 < BAND_COUNT; band += 4) {
      near += correlation(series[band] ?? [], series[band + 1] ?? []);
      far += correlation(series[band] ?? [], series[band + 80] ?? []);
      n += 1;
    }
    expect(near / n - far / n).toBeGreaterThan(0.1);
  });

  it('builds its broad shape from as many bars as the display spectrum has', () => {
    expect(BARS).toBe(19);
    expect(createSignal().peaks).toHaveLength(BAND_COUNT);
  });

  it('keeps a peak per band that holds above a falling bar, then falls', () => {
    const signal = createSignal();
    const rng = seeded(5);
    for (let i = 0; i < 40; i += 1) stepSignal(signal, { uri: 'spotify:track:a', progressMs: i * 33, playing: true, rng });
    // A falling peak can sit up to PEAK_FALL under its bar for one frame, as in the display spectrum.
    expect(signal.peaks.every((p, i) => p >= (signal.levels[i] ?? 0) - PEAK_FALL)).toBe(true);
    const before = [...signal.peaks];
    for (let i = 0; i < 5; i += 1) stepSignal(signal, { uri: 'spotify:track:a', progressMs: 2000, playing: false, rng });
    // Right after the music stops the bars are falling but the peaks are still held.
    expect(signal.peaks.every((p, i) => p >= (signal.levels[i] ?? 0) - PEAK_FALL && p <= (before[i] ?? 0) + 1e-9)).toBe(true);
    expect(signal.peaks.some((p, i) => p > (signal.levels[i] ?? 0))).toBe(true);
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

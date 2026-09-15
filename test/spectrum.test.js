// @ts-check
import { describe, expect, it } from 'vitest';
import { BARS, DECAY, PEAK_FALL, PEAK_HOLD, SMOOTHING, colorForRow, createState, isIdle, nextFrame } from '../src/spectrum.js';

const one = () => 1;
const zero = () => 0;

/**
 * Runs `n` frames and returns the state.
 * @param {import('../src/spectrum.js').SpectrumState} state
 * @param {() => number} rng
 * @param {boolean} playing
 * @param {number} n
 */
function frames(state, rng, playing, n) {
  for (let i = 0; i < n; i += 1) nextFrame(state, rng, playing);
  return state;
}

describe('createState', () => {
  it('starts every bar, target, peak and hold at zero', () => {
    const state = createState();
    expect(state.values).toHaveLength(BARS);
    expect(state.values.every((v) => v === 0)).toBe(true);
    expect(state.peaks.every((v) => v === 0)).toBe(true);
    expect(createState(3).values).toHaveLength(3);
  });
});

describe('nextFrame', () => {
  it('jumps up to the smoothed target while playing', () => {
    const state = createState(1);
    nextFrame(state, one, true);
    expect(state.values[0]).toBeCloseTo(1 - SMOOTHING);
    nextFrame(state, one, true);
    expect(state.values[0]).toBeCloseTo(SMOOTHING * (1 - SMOOTHING) + (1 - SMOOTHING));
  });

  it('falls DECAY per frame when the target is lower and clamps at zero', () => {
    const state = createState(1);
    state.values[0] = 0.1;
    nextFrame(state, zero, true);
    expect(state.values[0]).toBeCloseTo(0.1 - DECAY);
    nextFrame(state, zero, true);
    expect(state.values[0]).toBe(0);
  });

  it('decays to zero when paused, whatever the rng says', () => {
    const state = createState(2);
    state.values = [1, 0.5];
    state.targets = [1, 1];
    nextFrame(state, one, false);
    expect(state.targets).toEqual([0, 0]);
    expect(state.values[0]).toBeCloseTo(1 - DECAY);
    frames(state, one, false, 30);
    expect(state.values).toEqual([0, 0]);
  });

  it('the peak rides the bar up, holds PEAK_HOLD frames, then falls PEAK_FALL per frame', () => {
    const state = createState(1);
    nextFrame(state, one, true);
    const top = state.values[0] ?? 0;
    expect(state.peaks[0]).toBe(top);

    frames(state, zero, true, PEAK_HOLD);
    expect(state.peaks[0]).toBe(top);

    nextFrame(state, zero, true);
    expect(state.peaks[0]).toBeCloseTo(top - PEAK_FALL);
    nextFrame(state, zero, true);
    expect(state.peaks[0]).toBeCloseTo(top - 2 * PEAK_FALL);
  });

  it('the peak clamps at zero and the state becomes idle', () => {
    const state = createState(1);
    nextFrame(state, one, true);
    frames(state, zero, false, 200);
    expect(state.peaks[0]).toBe(0);
    expect(isIdle(state)).toBe(true);
  });

  it('returns the same state object', () => {
    const state = createState(1);
    expect(nextFrame(state, one, true)).toBe(state);
  });
});

describe('isIdle', () => {
  it('is false while a bar or a peak is above zero', () => {
    const state = createState(2);
    expect(isIdle(state)).toBe(true);
    state.peaks[1] = 0.02;
    expect(isIdle(state)).toBe(false);
    state.peaks[1] = 0;
    state.values[0] = 0.5;
    expect(isIdle(state)).toBe(false);
  });
});

describe('colorForRow', () => {
  it.each([
    [0, 'green'],
    [3, 'green'],
    [4, 'yellow'],
    [7, 'yellow'],
    [8, 'orange'],
    [11, 'orange'],
    [12, 'red'],
    [15, 'red'],
  ])('row %i of 16 is %s', (row, band) => {
    expect(colorForRow(row, 16)).toBe(band);
  });

  it('clamps rows outside the range', () => {
    expect(colorForRow(16, 16)).toBe('red');
    expect(colorForRow(-1, 16)).toBe('green');
  });
});

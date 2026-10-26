// @ts-check
// The synthetic signal behind every visualizer style. Pure, no DOM. It is not
// the playing audio (Spotify gives the page no way to hear it): the bars come
// from the same generator as the display spectrum in spectrum.js, so the big
// one is as lively as the small one, and a tempo taken from the track id gives
// the beat that the oscilloscope and the glow follow.
import { BARS, DECAY, createState, nextFrame, trackPeaks } from './spectrum.js';

// Enough bands for a full-width bar every few pixels; narrower canvases take fewer.
export const BAND_COUNT = 256;
export const WAVE_SAMPLES = 64;

// Used when there is no track uri to take a tempo from.
const DEFAULT_BPM = 120;
const MIN_BPM = 80;
const BPM_SPAN = 71;
// How fast the beat envelope falls inside one beat period.
const BEAT_FALL = 5;
// Per-step factors for the paused decay of the beat and the waveform.
const BEAT_RELEASE = 0.85;
const WAVE_RELEASE = 0.8;
// Below this a decaying value snaps to exactly 0, so silence is reachable.
const FLOOR = 0.002;
// A band is its place on a broad curve (as many bars as the small spectrum,
// interpolated between neighbours) plus a jitter of its own, each swinging
// around the middle. The two spreads add up to more than 1 so the mix is as
// lively as one generator on its own would be.
const COARSE_SPREAD = 0.8;
const FINE_SPREAD = 0.9;

/**
 * levels: 0..1 per band. peaks: the held peak of each band. wave: -1..1 samples
 * of a waveform. beat: 0..1, 1 on the beat. coarse and fine are the two
 * spectrum states the levels are mixed from, holds the peak timers; all three
 * are internal to stepSignal.
 * @typedef {{
 *   levels: number[],
 *   peaks: number[],
 *   wave: number[],
 *   beat: number,
 *   coarse: import('./spectrum.js').SpectrumState,
 *   fine: import('./spectrum.js').SpectrumState,
 *   holds: number[],
 * }} Signal
 */

/**
 * A tempo between 80 and 150 BPM derived from the track uri, so the same
 * track always beats the same way.
 * @param {string | undefined} uri
 * @returns {number}
 */
export function bpmForTrack(uri) {
  if (!uri) return DEFAULT_BPM;
  let hash = 0;
  for (let i = 0; i < uri.length; i += 1) hash = (hash * 31 + uri.charCodeAt(i)) >>> 0;
  return MIN_BPM + (hash % BPM_SPAN);
}

/** @returns {Signal} */
export function createSignal() {
  return {
    levels: new Array(BAND_COUNT).fill(0),
    peaks: new Array(BAND_COUNT).fill(0),
    wave: new Array(WAVE_SAMPLES).fill(0),
    beat: 0,
    coarse: createState(BARS),
    fine: createState(BAND_COUNT),
    holds: new Array(BAND_COUNT).fill(0),
  };
}

/**
 * Advances the signal by one frame, in place.
 * @param {Signal} signal
 * @param {{ uri?: string, progressMs: number, playing: boolean, rng: () => number }} input
 * @returns {Signal}
 */
export function stepSignal(signal, { uri, progressMs, playing, rng }) {
  const progress = Number.isFinite(progressMs) && progressMs > 0 ? progressMs : 0;
  const period = 60000 / bpmForTrack(uri);
  const phase = (progress % period) / period;

  if (playing) {
    signal.beat = Math.exp(-BEAT_FALL * phase);
  } else {
    signal.beat = signal.beat * BEAT_RELEASE < FLOOR ? 0 : signal.beat * BEAT_RELEASE;
  }

  nextFrame(signal.coarse, rng, playing);
  nextFrame(signal.fine, rng, playing);
  for (let i = 0; i < BAND_COUNT; i += 1) {
    if (playing) {
      const at = (i / (BAND_COUNT - 1)) * (BARS - 1);
      const low = Math.floor(at);
      const high = Math.min(BARS - 1, low + 1);
      const across = at - low;
      const broad = (signal.coarse.values[low] ?? 0) * (1 - across) + (signal.coarse.values[high] ?? 0) * across;
      const mixed = 0.5 + COARSE_SPREAD * (broad - 0.5) + FINE_SPREAD * ((signal.fine.values[i] ?? 0) - 0.5);
      signal.levels[i] = Math.min(1, Math.max(0, mixed));
    } else {
      signal.levels[i] = Math.max(0, (signal.levels[i] ?? 0) - DECAY);
    }
  }
  trackPeaks({ values: signal.levels, peaks: signal.peaks, holds: signal.holds });

  const seconds = progress / 1000;
  const amplitude = 0.25 + 0.6 * signal.beat;
  for (let i = 0; i < WAVE_SAMPLES; i += 1) {
    if (playing) {
      const x = i / WAVE_SAMPLES;
      const carrier = 0.7 * Math.sin(2 * Math.PI * (2 * x + seconds)) + 0.3 * Math.sin(2 * Math.PI * (5 * x + 1.3 * seconds));
      const value = amplitude * carrier + 0.08 * (rng() - 0.5);
      signal.wave[i] = Math.max(-1, Math.min(1, value));
    } else {
      const released = (signal.wave[i] ?? 0) * WAVE_RELEASE;
      signal.wave[i] = Math.abs(released) < FLOOR ? 0 : released;
    }
  }
  return signal;
}

/**
 * True when nothing is left to animate.
 * @param {Signal} signal
 * @returns {boolean}
 */
export function isSilent(signal) {
  return signal.beat === 0 && signal.levels.every((v) => v === 0) && signal.peaks.every((p) => p === 0) && signal.wave.every((v) => v === 0);
}

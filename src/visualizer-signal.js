// @ts-check
// The synthetic signal behind every visualizer style. Pure, no DOM. It is not
// the playing audio (Spotify gives the page no way to hear it): a tempo taken
// from the track id gives a beat, and smoothed random targets give the bands,
// in the same spirit as the display spectrum in spectrum.js.
import { DECAY, SMOOTHING } from './spectrum.js';

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

/**
 * levels: 0..1 per band. wave: -1..1 samples of a waveform. beat: 0..1,
 * 1 on the beat. targets: what each band is chasing, internal to stepSignal.
 * @typedef {{ levels: number[], wave: number[], beat: number, targets: number[] }} Signal
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
    wave: new Array(WAVE_SAMPLES).fill(0),
    beat: 0,
    targets: new Array(BAND_COUNT).fill(0),
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

  for (let i = 0; i < BAND_COUNT; i += 1) {
    // Low bands carry the beat, high bands sit lower. The beat boost fades
    // out over the first third of the bands instead of stopping at a line.
    const tilt = 1 - 0.5 * (i / (BAND_COUNT - 1));
    const lift = 0.8 + 0.5 * signal.beat * Math.max(0, 1 - i / (BAND_COUNT / 3));
    const target = playing ? Math.min(1, (SMOOTHING * (signal.targets[i] ?? 0) + (1 - SMOOTHING) * rng()) * tilt * lift * 1.4) : 0;
    signal.targets[i] = target;
    const level = signal.levels[i] ?? 0;
    signal.levels[i] = target > level ? target : Math.max(0, level - DECAY);
  }

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
  return signal.beat === 0 && signal.levels.every((v) => v === 0) && signal.wave.every((v) => v === 0);
}

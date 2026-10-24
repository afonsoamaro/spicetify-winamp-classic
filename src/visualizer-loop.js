// @ts-check
// The one animation loop every visualizer surface shares. It steps the
// synthetic signal once per frame and hands it to each visible surface, and it
// only runs while there is something to show: a visible surface, a visible
// window, and music playing or a signal still fading out.
import { LOG_PREFIX } from './dom.js';
import { createSignal, isSilent, stepSignal } from './visualizer-signal.js';

/**
 * Something that shows the visualizer: a canvas on a Spotify surface.
 * @typedef {object} Surface
 * @property {string} name
 * @property {() => boolean} isVisible whether it is on screen and switched on
 * @property {() => boolean} isConnected false once Spotify detached its canvas
 * @property {(signal: import('./visualizer-signal.js').Signal) => void} draw
 */

/**
 * The slice of Spicetify.Player the loop uses, so tests can pass a fake.
 * @typedef {{ isPlaying(): boolean, getProgress(): number }} LoopPlayer
 */

/**
 * @param {{
 *   player: () => LoopPlayer,
 *   getUri: () => string | undefined,
 *   schedule?: (callback: () => void) => number,
 *   cancel?: (id: number) => void,
 *   rng?: () => number,
 *   isHidden?: () => boolean,
 *   reducedMotion?: () => boolean,
 * }} options
 * @returns {{ register(surface: Surface): () => void, wake(): void, stop(): void, isRunning(): boolean }}
 */
export function createVisualizerLoop({
  player,
  getUri,
  schedule = (callback) => requestAnimationFrame(callback),
  cancel = (id) => cancelAnimationFrame(id),
  rng = Math.random,
  isHidden = () => typeof document !== 'undefined' && document.hidden,
  reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
}) {
  const signal = createSignal();
  /** @type {Set<Surface>} */
  const surfaces = new Set();
  /** @type {number | null} */
  let pending = null;

  // origin._state sits behind a getter that can be undefined for a moment.
  const playing = () => {
    try {
      return player().isPlaying();
    } catch {
      return false;
    }
  };

  const progress = () => {
    try {
      return player().getProgress();
    } catch {
      return 0;
    }
  };

  const anyVisible = () => [...surfaces].some((surface) => surface.isConnected() && surface.isVisible());

  const frame = () => {
    pending = null;
    for (const surface of [...surfaces]) {
      if (!surface.isConnected()) surfaces.delete(surface);
    }
    stepSignal(signal, { uri: getUri(), progressMs: progress(), playing: playing(), rng });
    for (const surface of [...surfaces]) {
      if (!surface.isVisible()) continue;
      try {
        surface.draw(signal);
      } catch (err) {
        console.warn(`${LOG_PREFIX} visualizer: ${surface.name} failed to draw, dropping it`, err);
        surfaces.delete(surface);
      }
    }
    if (!reducedMotion() && shouldRun()) pending = schedule(frame);
  };

  const shouldRun = () => !isHidden() && anyVisible() && (playing() || !isSilent(signal));

  const wake = () => {
    if (pending !== null) return;
    if (reducedMotion()) {
      // A still picture: one frame per wake, no continuation.
      if (!isHidden() && anyVisible()) frame();
      return;
    }
    if (shouldRun()) pending = schedule(frame);
  };

  return {
    register(surface) {
      surfaces.add(surface);
      wake();
      return () => void surfaces.delete(surface);
    },
    wake,
    stop() {
      if (pending !== null) cancel(pending);
      pending = null;
    },
    isRunning: () => pending !== null,
  };
}

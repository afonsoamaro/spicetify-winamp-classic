/** @vitest-environment jsdom */
// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOG_PREFIX } from '../src/dom.js';
import { CANVAS_H, CANVAS_W, COLOR_TOKENS, createSpectrumInjection, drawFrame } from '../src/spectrum-dom.js';
import { ROWS, createState } from '../src/spectrum.js';

/** @typedef {{ x: number, y: number, w: number, h: number, color: string }} Rect */

/** A 2D context stand-in that records what gets painted. */
function fakeContext() {
  /** @type {Rect[]} */
  const rects = [];
  const ctx = {
    fillStyle: '',
    scale: vi.fn(),
    clearRect: vi.fn(() => {
      rects.length = 0;
    }),
    /** @param {number} x @param {number} y @param {number} w @param {number} h */
    fillRect(x, y, w, h) {
      rects.push({ x, y, w, h, color: String(ctx.fillStyle) });
    },
    rects,
  };
  return ctx;
}

/** @typedef {() => void} Listener */

/**
 * A stand-in for Spicetify.Player with a switchable playing flag.
 * @param {boolean} playing
 */
function fakePlayer(playing) {
  /** @type {Map<string, Set<Listener>>} */
  const listeners = new Map();
  return {
    playing,
    isPlaying() {
      return this.playing;
    },
    /** @param {string} type @param {Listener} callback */
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(callback);
    },
    /** @param {string} type @param {Listener} callback */
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    /** @param {string} type */
    emit(type) {
      listeners.get(type)?.forEach((callback) => callback());
    },
    /** @param {string} type */
    count(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

/** A scheduler whose frames run only when the test drains them. */
function fakeScheduler() {
  /** @type {Map<number, () => void>} */
  const queue = new Map();
  let next = 1;
  return {
    /** @param {() => void} callback */
    schedule(callback) {
      queue.set(next, callback);
      return next++;
    },
    /** @param {number} id */
    cancel(id) {
      queue.delete(id);
    },
    /** Runs every queued frame once; frames scheduled meanwhile wait for the next drain. */
    drain() {
      const batch = [...queue.values()];
      queue.clear();
      batch.forEach((callback) => callback());
      return batch.length;
    },
    get size() {
      return queue.size;
    },
  };
}

function makeDisplay() {
  document.body.innerHTML = '<div data-testid="now-playing-widget"><div class="main-nowPlayingWidget-trackInfo"></div></div>';
  return /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-widget"]'));
}

const canvasEl = () => /** @type {HTMLCanvasElement | null} */ (document.querySelector('canvas.wa-spectrum'));

/** @type {ReturnType<typeof fakeContext>} */
let ctx;
/** @type {import('../src/dom.js').Injection | null} */
let injection = null;

beforeEach(() => {
  ctx = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => /** @type {any} */ (ctx),
  );
});

afterEach(() => {
  injection?.cleanup?.(makeDisplay());
  injection = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/**
 * @param {boolean} playing
 * @param {() => number} [rng]
 */
function mountWith(playing, rng = () => 1) {
  const display = makeDisplay();
  const player = fakePlayer(playing);
  const scheduler = fakeScheduler();
  injection = createSpectrumInjection({ rng, player: () => player, schedule: scheduler.schedule, cancel: scheduler.cancel });
  injection.run(display);
  return { display, player, scheduler };
}

describe('drawFrame', () => {
  it('paints one row per unit of height in the four bands and the peak on top', () => {
    const state = createState(1);
    state.values[0] = 1;
    state.peaks[0] = 1;
    const colors = { green: 'g', yellow: 'y', orange: 'o', red: 'r', peak: 'p' };

    drawFrame(ctx, state, colors);

    const bars = ctx.rects.filter((r) => r.color !== 'p');
    expect(bars).toHaveLength(ROWS);
    expect(bars.map((r) => r.color)).toEqual([...'gggg', ...'yyyy', ...'oooo', ...'rrrr']);
    expect(bars[0]).toMatchObject({ x: 0, y: CANVAS_H - 1, w: 3, h: 1 });
    expect(ctx.rects.find((r) => r.color === 'p')).toMatchObject({ x: 0, y: 0, w: 3, h: 1 });
  });

  it('places the second bar 4 px to the right and paints nothing for an idle state', () => {
    const state = createState(2);
    state.values[1] = 0.5;
    drawFrame(ctx, state, { green: 'g', yellow: 'y', orange: 'o', red: 'r', peak: 'p' });
    expect(ctx.rects.every((r) => r.x === 4)).toBe(true);
    expect(ctx.rects.filter((r) => r.color !== 'p')).toHaveLength(ROWS / 2);

    drawFrame(ctx, createState(2), { green: 'g', yellow: 'y', orange: 'o', red: 'r', peak: 'p' });
    expect(ctx.rects).toHaveLength(0);
  });
});

describe('createSpectrumInjection', () => {
  it('appends a canvas sized for the device pixel ratio and schedules the first frame', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const { scheduler } = mountWith(true);

    const canvas = canvasEl();
    expect(canvas?.width).toBe(CANVAS_W * 2);
    expect(canvas?.height).toBe(CANVAS_H * 2);
    expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    expect(scheduler.size).toBe(1);
    vi.unstubAllGlobals();
  });

  it('paints bars in the scheme fallback colours and keeps scheduling while playing', () => {
    const { scheduler } = mountWith(true);

    scheduler.drain();
    expect(ctx.rects.length).toBeGreaterThan(0);
    expect(ctx.rects[0]?.color).toBe(COLOR_TOKENS.green[1]);
    expect(scheduler.size).toBe(1);

    scheduler.drain();
    expect(scheduler.size).toBe(1);
  });

  it('keeps animating after a pause until every bar and peak is down, then stops', () => {
    const { player, scheduler } = mountWith(true);
    scheduler.drain();
    scheduler.drain();

    player.playing = false;
    let frames = 0;
    while (scheduler.size > 0 && frames < 500) {
      scheduler.drain();
      frames += 1;
    }

    expect(frames).toBeGreaterThan(1);
    expect(frames).toBeLessThan(500);
    expect(scheduler.size).toBe(0);
    expect(ctx.rects).toHaveLength(0);
  });

  it('does not schedule anything while paused with nothing to draw, and onplaypause restarts it', () => {
    const { player, scheduler } = mountWith(false);
    scheduler.drain();
    expect(scheduler.size).toBe(0);

    player.playing = true;
    player.emit('onplaypause');

    expect(scheduler.size).toBe(1);
    scheduler.drain();
    expect(ctx.rects.length).toBeGreaterThan(0);
  });

  it('treats a throwing isPlaying as paused', () => {
    const display = makeDisplay();
    const player = fakePlayer(false);
    player.isPlaying = () => {
      throw new Error('no state yet');
    };
    const scheduler = fakeScheduler();
    injection = createSpectrumInjection({ player: () => player, schedule: scheduler.schedule, cancel: scheduler.cancel });

    injection.run(display);
    scheduler.drain();

    expect(scheduler.size).toBe(0);
  });

  it('warns and gives up when there is no 2d context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { scheduler, player } = mountWith(true);

    expect(canvasEl()).toBeNull();
    expect(scheduler.size).toBe(0);
    expect(player.count('onplaypause')).toBe(0);
    expect(warn.mock.calls[0]?.[0]).toContain(`${LOG_PREFIX} spectrum`);
  });

  it('cleanup cancels the pending frame, removes the listener and the canvas', () => {
    const { display, player, scheduler } = mountWith(true);
    expect(scheduler.size).toBe(1);

    injection?.cleanup?.(display);

    expect(scheduler.size).toBe(0);
    expect(player.count('onplaypause')).toBe(0);
    expect(canvasEl()).toBeNull();
  });
});

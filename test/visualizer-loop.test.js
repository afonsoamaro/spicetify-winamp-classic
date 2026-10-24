// @ts-check
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVisualizerLoop } from '../src/visualizer-loop.js';
import { BAND_COUNT } from '../src/visualizer-signal.js';

/** Frame queue standing in for requestAnimationFrame. */
function fakeScheduler() {
  /** @type {Map<number, () => void>} */
  const queue = new Map();
  let next = 1;
  return {
    /** @param {() => void} cb */
    schedule(cb) {
      const id = next++;
      queue.set(id, cb);
      return id;
    },
    /** @param {number} id */
    cancel(id) {
      queue.delete(id);
    },
    /** Runs the oldest queued frame; returns false when none was queued. */
    runOne() {
      const first = queue.entries().next();
      if (first.done) return false;
      queue.delete(first.value[0]);
      first.value[1]();
      return true;
    },
    get size() {
      return queue.size;
    },
  };
}

/** @param {boolean} [playing] */
function fakePlayer(playing = true) {
  return { playing, isPlaying() { return this.playing; }, getProgress: () => 1234 };
}

/** @param {Partial<import('../src/visualizer-loop.js').Surface>} [over] */
function fakeSurface(over = {}) {
  return { name: 'fake', isVisible: () => true, isConnected: () => true, draw: vi.fn(), ...over };
}

/** @param {ReturnType<typeof fakePlayer>} player @param {ReturnType<typeof fakeScheduler>} sched @param {object} [extra] */
function makeLoop(player, sched, extra = {}) {
  return createVisualizerLoop({
    player: () => player,
    getUri: () => 'spotify:track:a',
    schedule: (cb) => sched.schedule(cb),
    cancel: (id) => sched.cancel(id),
    rng: () => 0.5,
    isHidden: () => false,
    reducedMotion: () => false,
    ...extra,
  });
}

afterEach(() => vi.restoreAllMocks());

/** @param {{ draw: unknown }} surface the arguments of every draw call */
const drawCalls = (surface) => /** @type {import('vitest').Mock} */ (surface.draw).mock.calls;

describe('createVisualizerLoop', () => {
  it('schedules nothing while no surface is registered', () => {
    const sched = fakeScheduler();
    const loop = makeLoop(fakePlayer(), sched);
    loop.wake();
    expect(loop.isRunning()).toBe(false);
    expect(sched.size).toBe(0);
  });

  it('draws a visible surface each frame and schedules the next one', () => {
    const sched = fakeScheduler();
    const loop = makeLoop(fakePlayer(), sched);
    const surface = fakeSurface();
    loop.register(surface);
    expect(loop.isRunning()).toBe(true);
    sched.runOne();
    expect(surface.draw).toHaveBeenCalledTimes(1);
    expect(drawCalls(surface)[0]?.[0].levels).toHaveLength(BAND_COUNT);
    expect(loop.isRunning()).toBe(true);
  });

  it('schedules nothing for an invisible surface or a hidden window', () => {
    const sched = fakeScheduler();
    makeLoop(fakePlayer(), sched).register(fakeSurface({ isVisible: () => false }));
    expect(sched.size).toBe(0);
    const hidden = makeLoop(fakePlayer(), sched, { isHidden: () => true });
    hidden.register(fakeSurface());
    expect(sched.size).toBe(0);
  });

  it('keeps running after a pause until the signal is silent, then stops by itself', () => {
    const sched = fakeScheduler();
    const player = fakePlayer(true);
    const loop = makeLoop(player, sched);
    loop.register(fakeSurface());
    for (let i = 0; i < 20; i += 1) sched.runOne();
    player.playing = false;
    let frames = 0;
    while (sched.runOne() && frames < 500) frames += 1;
    expect(frames).toBeGreaterThan(0);
    expect(frames).toBeLessThan(500);
    expect(loop.isRunning()).toBe(false);
  });

  it('drops a surface whose canvas was detached and never draws it again', () => {
    const sched = fakeScheduler();
    const loop = makeLoop(fakePlayer(), sched);
    let connected = true;
    const gone = fakeSurface({ isConnected: () => connected });
    const other = fakeSurface({ name: 'other' });
    const off = loop.register(gone);
    loop.register(other);
    sched.runOne();
    connected = false;
    sched.runOne();
    sched.runOne();
    expect(gone.draw).toHaveBeenCalledTimes(1);
    expect(drawCalls(other).length).toBeGreaterThan(1);
    expect(() => off()).not.toThrow();
  });

  it('keeps drawing the others when one surface throws, and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sched = fakeScheduler();
    const loop = makeLoop(fakePlayer(), sched);
    const bad = fakeSurface({ name: 'bad', draw: vi.fn(() => { throw new Error('boom'); }) });
    const good = fakeSurface({ name: 'good' });
    loop.register(bad);
    loop.register(good);
    for (let i = 0; i < 10; i += 1) sched.runOne();
    expect(good.draw).toHaveBeenCalledTimes(10);
    expect(bad.draw).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('[winamp-classic]');
  });

  it('draws exactly one frame under reduced motion', () => {
    const sched = fakeScheduler();
    const loop = makeLoop(fakePlayer(), sched, { reducedMotion: () => true });
    const surface = fakeSurface();
    loop.register(surface);
    expect(surface.draw).toHaveBeenCalledTimes(1);
    expect(loop.isRunning()).toBe(false);
  });

  it('stop cancels the pending frame', () => {
    const sched = fakeScheduler();
    const loop = makeLoop(fakePlayer(), sched);
    loop.register(fakeSurface());
    loop.stop();
    expect(loop.isRunning()).toBe(false);
    expect(sched.size).toBe(0);
  });
});

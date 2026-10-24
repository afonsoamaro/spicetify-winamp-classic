/** @vitest-environment jsdom */
// @ts-check
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULTS } from '../src/visualizer-settings.js';
import { createMiniplayerSurface } from '../src/visualizer-miniplayer-dom.js';

function fakeStore(initial = {}) {
  let current = { ...DEFAULTS, enabled: true, ...initial };
  /** @type {Set<(s: typeof DEFAULTS) => void>} */
  const listeners = new Set();
  return {
    get: () => ({ ...current }),
    set: vi.fn((/** @type {Partial<typeof DEFAULTS>} */ patch) => {
      current = { ...current, ...patch };
      for (const l of listeners) l({ ...current });
    }),
    subscribe: (/** @type {(s: typeof DEFAULTS) => void} */ l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}

function fakeLoop() {
  /** @type {import('../src/visualizer-loop.js').Surface[]} */
  const surfaces = [];
  const unregister = vi.fn();
  return {
    surfaces,
    unregister,
    register: vi.fn((/** @type {import('../src/visualizer-loop.js').Surface} */ surface) => {
      surfaces.push(surface);
      return unregister;
    }),
    wake: vi.fn(),
    stop: vi.fn(),
    isRunning: () => false,
  };
}

/**
 * The Document Picture-in-Picture API with a miniplayer-shaped document: a root
 * div with the player in it, as Spotify builds it, in a document of its own.
 * @param {boolean} open
 */
function fakePip(open) {
  const doc = document.implementation.createHTMLDocument('Spotify MiniPlayer');
  doc.body.innerHTML = '<div class="root"><div class="player">player</div></div>';
  /** @type {Map<string, Set<(event: unknown) => void>>} */
  const winListeners = new Map();
  const win = {
    document: doc,
    addEventListener: (/** @type {string} */ type, /** @type {(e: unknown) => void} */ cb) => void winListeners.set(type, (winListeners.get(type) ?? new Set()).add(cb)),
    removeEventListener: (/** @type {string} */ type, /** @type {(e: unknown) => void} */ cb) => void winListeners.get(type)?.delete(cb),
    close() {
      for (const cb of winListeners.get('pagehide') ?? []) cb({});
    },
  };
  /** @type {Map<string, Set<(event: unknown) => void>>} */
  const apiListeners = new Map();
  const api = {
    /** @type {typeof win | null} */
    window: open ? win : null,
    addEventListener: (/** @type {string} */ type, /** @type {(e: unknown) => void} */ cb) => void apiListeners.set(type, (apiListeners.get(type) ?? new Set()).add(cb)),
    removeEventListener: (/** @type {string} */ type, /** @type {(e: unknown) => void} */ cb) => void apiListeners.get(type)?.delete(cb),
    openNow() {
      api.window = win;
      for (const cb of apiListeners.get('enter') ?? []) cb({ window: win });
    },
    apiListenerCount: () => [...apiListeners.values()].reduce((n, set) => n + set.size, 0),
  };
  return { api, win, doc };
}

/** @type {{ unmount(): void }[]} */
const mounted = [];
afterEach(() => {
  for (const s of mounted.splice(0)) s.unmount();
  vi.restoreAllMocks();
});

/** @param {ReturnType<typeof fakePip>} pip @param {object} [options] */
function mountSurface(pip, options = {}) {
  const surface = createMiniplayerSurface({ store: fakeStore(), loop: fakeLoop(), pip: () => /** @type {import('../src/visualizer-miniplayer-dom.js').PipApi} */ (/** @type {unknown} */ (pip.api)), colorSource: () => document.documentElement, ...options });
  mounted.push(surface);
  surface.mount();
  return surface;
}

const canvasIn = (/** @type {Document} */ doc) => doc.querySelector('canvas.wa-viz-miniplayer');

describe('createMiniplayerSurface', () => {
  it('puts the canvas behind the player when the miniplayer is already open', () => {
    const pip = fakePip(true);
    mountSurface(pip);
    const canvas = canvasIn(pip.doc);
    expect(canvas).not.toBeNull();
    expect(canvas?.parentElement?.className).toBe('root');
    expect(canvas?.getAttribute('aria-hidden')).toBe('true');
    expect(/** @type {HTMLElement} */ (canvas).style.zIndex).toBe('-1');
  });

  it('attaches when the miniplayer opens later, and registers one surface', () => {
    const pip = fakePip(false);
    const loop = fakeLoop();
    mountSurface(pip, { loop });
    expect(canvasIn(pip.doc)).toBeNull();
    pip.api.openNow();
    expect(canvasIn(pip.doc)).not.toBeNull();
    expect(loop.register).toHaveBeenCalledTimes(1);
  });

  it('is visible only while the switches are on, and reports it is open', () => {
    const pip = fakePip(true);
    const loop = fakeLoop();
    const store = fakeStore();
    const surface = mountSurface(pip, { loop, store });
    const registered = /** @type {import('../src/visualizer-loop.js').Surface} */ (loop.surfaces.at(-1));
    expect(registered.isVisible()).toBe(true);
    expect(surface.isOpen()).toBe(true);
    store.set({ miniplayer: false });
    expect(registered.isVisible()).toBe(false);
    store.set({ miniplayer: true, enabled: false });
    expect(registered.isVisible()).toBe(false);
  });

  it('cleans up and unregisters when the miniplayer closes', () => {
    const pip = fakePip(true);
    const loop = fakeLoop();
    const surface = mountSurface(pip, { loop });
    pip.api.window = null;
    pip.win.close();
    expect(canvasIn(pip.doc)).toBeNull();
    expect(loop.unregister).toHaveBeenCalled();
    expect(surface.isOpen()).toBe(false);
  });

  it('tells its owner when the miniplayer window appears and goes away', () => {
    const pip = fakePip(false);
    const onChange = vi.fn();
    mountSurface(pip, { onChange });
    pip.api.openNow();
    expect(onChange).toHaveBeenCalledTimes(1);
    pip.api.window = null;
    pip.win.close();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the Picture-in-Picture API is missing', () => {
    const surface = createMiniplayerSurface({ store: fakeStore(), loop: fakeLoop(), pip: () => undefined, colorSource: () => document.documentElement });
    mounted.push(surface);
    expect(() => surface.mount()).not.toThrow();
    expect(surface.isOpen()).toBe(false);
  });

  it('puts the canvas back when Spotify re-renders the miniplayer root', async () => {
    const pip = fakePip(true);
    mountSurface(pip);
    pip.doc.body.innerHTML = '<div class="root"><div class="player">again</div></div>';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pip.doc.querySelectorAll('canvas.wa-viz-miniplayer')).toHaveLength(1);
  });

  it('unmount removes the canvas and the listeners', () => {
    const pip = fakePip(true);
    const surface = mountSurface(pip);
    surface.unmount();
    expect(canvasIn(pip.doc)).toBeNull();
    expect(pip.api.apiListenerCount()).toBe(0);
  });
});

/** @vitest-environment jsdom */
// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { labelsFor } from '../src/visualizer-i18n.js';
import { DEFAULTS } from '../src/visualizer-settings.js';
import { createSidebarSurface } from '../src/visualizer-sidebar-dom.js';
import { PLAYER_BAR_HTML, SIDEBAR_WITH_VIDEO_HTML, sidebarHtml } from './fixtures/sidebar.js';

const labels = labelsFor('en');

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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const panel = () => document.querySelector('.wa-viz-panel');

beforeEach(() => {
  document.body.innerHTML = PLAYER_BAR_HTML + sidebarHtml();
});
/** @type {{ unmount(): void }[]} */
const mounted = [];
afterEach(() => {
  for (const surface of mounted.splice(0)) surface.unmount();
  vi.restoreAllMocks();
});

/** Mounts a surface that the next test will not see: every test cleans up after itself. */
function mountSurface(/** @type {Parameters<typeof createSidebarSurface>[0]} */ options) {
  const surface = createSidebarSurface({ throttleMs: 0, ...options });
  mounted.push(surface);
  surface.mount();
  return surface;
}

describe('createSidebarSurface', () => {
  it('inserts one panel first in the sidebar content and registers one surface', () => {
    const loop = fakeLoop();
    mountSurface({ store: fakeStore(), loop, labels, onScreen: () => true });
    expect(document.querySelectorAll('.wa-viz-panel')).toHaveLength(1);
    expect(document.getElementById('content')?.firstElementChild).toBe(panel());
    expect(loop.register).toHaveBeenCalled();
  });

  it('flips sidebarOpen from the header button and then reports not visible', () => {
    const store = fakeStore();
    const loop = fakeLoop();
    mountSurface({ store, loop, labels, onScreen: () => true });
    const surface = /** @type {import('../src/visualizer-loop.js').Surface} */ (loop.surfaces.at(-1));
    expect(surface.isVisible()).toBe(true);
    panel()?.querySelector('button')?.click();
    expect(store.set).toHaveBeenCalledWith({ sidebarOpen: false });
    expect(surface.isVisible()).toBe(false);
  });

  it('is not visible when the master switch or the surface is off, or the sidebar is closed', () => {
    for (const settings of [{ enabled: false }, { sidebar: false }]) {
      document.body.innerHTML = PLAYER_BAR_HTML + sidebarHtml();
      const loop = fakeLoop();
      mountSurface({ store: fakeStore(settings), loop, labels, onScreen: () => true });
      expect(loop.surfaces.at(-1)?.isVisible()).toBe(false);
    }
    const loop = fakeLoop();
    document.body.innerHTML = PLAYER_BAR_HTML + sidebarHtml();
    mountSurface({ store: fakeStore(), loop, labels, onScreen: () => false });
    expect(loop.surfaces.at(-1)?.isVisible()).toBe(false);
  });

  it('puts the panel back, exactly once, when Spotify re-renders the sidebar', async () => {
    const loop = fakeLoop();
    mountSurface({ store: fakeStore(), loop, labels, onScreen: () => true });
    document.body.innerHTML = PLAYER_BAR_HTML + sidebarHtml();
    await tick();
    expect(document.querySelectorAll('.wa-viz-panel')).toHaveLength(1);
    panel()?.remove();
    await tick();
    expect(document.querySelectorAll('.wa-viz-panel')).toHaveLength(1);
  });

  it('mounts nothing when the sidebar is not in the page, and takes the player bar for none', () => {
    document.body.innerHTML = PLAYER_BAR_HTML;
    const loop = fakeLoop();
    mountSurface({ store: fakeStore(), loop, labels, onScreen: () => true });
    expect(panel()).toBeNull();
    expect(loop.surfaces.at(-1)?.isConnected() ?? false).toBe(false);
  });

  it('treats a playing video like a cover: the panel goes above it', () => {
    document.body.innerHTML = PLAYER_BAR_HTML + SIDEBAR_WITH_VIDEO_HTML;
    mountSurface({ store: fakeStore(), loop: fakeLoop(), labels, onScreen: () => true });
    const content = document.getElementById('content');
    expect(content?.firstElementChild).toBe(panel());
    expect(content?.children[1]?.querySelector('video')).not.toBeNull();
  });

  it('wakes the loop when the sidebar slides back into view', () => {
    /** @type {(() => void) | null} */
    let notify = null;
    /** @type {IntersectionObserverInit | undefined} */
    let options;
    vi.stubGlobal('IntersectionObserver', class {
      /** @param {() => void} callback @param {IntersectionObserverInit} [init] */
      constructor(callback, init) {
        notify = callback;
        options = init;
      }
      observe() {}
      disconnect() {}
    });
    const loop = fakeLoop();
    mountSurface({ store: fakeStore(), loop, labels, onScreen: () => true });
    loop.wake.mockClear();
    /** @type {(() => void) | null} */ (notify)?.();
    expect(loop.wake).toHaveBeenCalled();
    // The closed sidebar keeps a sliver of the panel inside the window, so the panel never
    // stops intersecting: only a threshold list reports it growing back.
    expect(Array.isArray(options?.threshold) && options.threshold.length > 2).toBe(true);
    vi.unstubAllGlobals();
  });

  it('does no layout work for changes elsewhere once the panel is in place', async () => {
    mountSurface({ store: fakeStore(), loop: fakeLoop(), labels, onScreen: () => true });
    const spy = vi.spyOn(window, 'getComputedStyle');
    document.body.append(document.createElement('span'));
    await tick();
    expect(spy).not.toHaveBeenCalled();
  });

  it('unmount removes the panel, stops observing and unregisters', async () => {
    const loop = fakeLoop();
    const surface = mountSurface({ store: fakeStore(), loop, labels, onScreen: () => true });
    surface.unmount();
    expect(panel()).toBeNull();
    expect(loop.unregister).toHaveBeenCalled();
    document.body.innerHTML = PLAYER_BAR_HTML + sidebarHtml();
    await tick();
    expect(panel()).toBeNull();
  });
});

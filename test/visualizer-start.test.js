/** @vitest-environment jsdom */
// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY } from '../src/visualizer-settings.js';
import { startVisualizer, startVisualizerIfEnabled } from '../src/visualizer-start.js';
import { FLAGS } from '../src/flags.js';
import { PLAYER_BAR_HTML, sidebarHtml } from './fixtures/sidebar.js';

/** An open miniplayer window: its own document, a root div, and the API around it. */
function openMiniplayer() {
  const doc = document.implementation.createHTMLDocument('Spotify MiniPlayer');
  doc.body.innerHTML = '<div class="root"><div>player</div></div>';
  const win = { document: doc, addEventListener() {}, removeEventListener() {} };
  return { doc, api: { window: win, addEventListener() {}, removeEventListener() {} } };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** @param {object} [saved] settings already in storage */
function fakeStorage(saved) {
  /** @type {Map<string, string>} */
  const map = new Map();
  if (saved) map.set(SETTINGS_KEY, JSON.stringify(saved));
  return { get: (/** @type {string} */ k) => map.get(k) ?? null, set: (/** @type {string} */ k, /** @type {string} */ v) => void map.set(k, v) };
}

function fakePlayer() {
  /** @type {Map<string, Set<() => void>>} */
  const listeners = new Map();
  return {
    isPlaying: () => true,
    getProgress: () => 500,
    addEventListener: vi.fn((/** @type {string} */ type, /** @type {() => void} */ cb) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(cb));
    }),
    removeEventListener: vi.fn((/** @type {string} */ type, /** @type {() => void} */ cb) => void listeners.get(type)?.delete(cb)),
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

function fakeMenu() {
  const calls = { register: 0, deregister: 0 };
  class FakeItem {
    register() { calls.register += 1; }
    deregister() { calls.deregister += 1; }
    setState() {}
  }
  return { calls, FakeItem };
}

/** @type {{ stop(): void }[]} */
const started = [];
afterEach(() => {
  for (const v of started.splice(0)) v.stop();
  vi.restoreAllMocks();
});

/** @param {{ saved?: object, pip?: ReturnType<typeof openMiniplayer> }} [options] */
function start({ saved, pip } = {}) {
  const player = fakePlayer();
  const menu = fakeMenu();
  const frames = { schedule: vi.fn(() => 1), cancel: vi.fn() };
  const visualizer = startVisualizer({
    storage: fakeStorage(saved),
    player: () => player,
    getUri: () => 'spotify:track:a',
    locale: () => 'en',
    MenuItem: menu.FakeItem,
    schedule: frames.schedule,
    cancel: frames.cancel,
    rng: () => 0.5,
    isHidden: () => false,
    reducedMotion: () => false,
    onScreen: () => true,
    pip: () => pip?.api,
  });
  started.push(visualizer);
  return { visualizer, player, menu, frames };
}

beforeEach(() => {
  document.body.innerHTML = PLAYER_BAR_HTML + sidebarHtml();
});

describe('startVisualizer', () => {
  it('is dormant by default: the menu entry and nothing else', () => {
    const docListener = vi.spyOn(document, 'addEventListener');
    const { player, menu, frames } = start();
    expect(menu.calls.register).toBe(1);
    expect(frames.schedule).not.toHaveBeenCalled();
    expect(player.addEventListener).not.toHaveBeenCalled();
    expect(docListener).not.toHaveBeenCalled();
    expect(document.querySelector('[class*="wa-viz"]')).toBeNull();
  });

  it('mounts the surfaces and runs when it starts enabled', () => {
    const { player, frames } = start({ saved: { enabled: true } });
    expect(document.querySelectorAll('.wa-viz-panel')).toHaveLength(1);
    expect(frames.schedule).toHaveBeenCalled();
    expect(player.count()).toBeGreaterThan(0);
  });

  it('turning the switch on and off mounts and unmounts everything', async () => {
    const { visualizer, player, frames } = start();
    visualizer.store.set({ enabled: true });
    expect(document.querySelectorAll('.wa-viz-panel')).toHaveLength(1);
    expect(frames.schedule).toHaveBeenCalled();
    visualizer.store.set({ enabled: false });
    await tick();
    expect(document.querySelector('.wa-viz-panel')).toBeNull();
    expect(frames.cancel).toHaveBeenCalled();
    expect(player.count()).toBe(0);
  });

  it('turning one surface off unmounts only that one', () => {
    const { visualizer } = start({ saved: { enabled: true } });
    visualizer.store.set({ sidebar: false });
    expect(document.querySelector('.wa-viz-panel')).toBeNull();
    visualizer.store.set({ sidebar: true });
    expect(document.querySelectorAll('.wa-viz-panel')).toHaveLength(1);
  });

  it('draws behind the miniplayer while it is on, and takes the canvas away when its switch goes off', () => {
    const pip = openMiniplayer();
    const { visualizer } = start({ saved: { enabled: true }, pip });
    expect(pip.doc.querySelectorAll('canvas.wa-viz-miniplayer')).toHaveLength(1);
    visualizer.store.set({ miniplayer: false });
    expect(pip.doc.querySelector('canvas.wa-viz-miniplayer')).toBeNull();
    visualizer.store.set({ miniplayer: true });
    expect(pip.doc.querySelectorAll('canvas.wa-viz-miniplayer')).toHaveLength(1);
  });

  it('is dormant in the miniplayer too while the master switch is off', () => {
    const pip = openMiniplayer();
    start({ pip });
    expect(pip.doc.querySelector('canvas')).toBeNull();
  });

  it('re-paces the loop onto the miniplayer window when Spotify goes to the background, and back again', () => {
    const mainRaf = vi.fn(() => 1);
    const mainCancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', mainRaf);
    vi.stubGlobal('cancelAnimationFrame', mainCancel);
    let hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    /** @type {Map<string, () => void>} */
    const pageEvents = new Map();
    const pipDoc = document.implementation.createHTMLDocument('Spotify MiniPlayer');
    pipDoc.body.innerHTML = '<div class="root"><div>player</div></div>';
    const pipWindow = {
      document: pipDoc,
      requestAnimationFrame: vi.fn(() => 2),
      cancelAnimationFrame: vi.fn(),
      addEventListener: (/** @type {string} */ type, /** @type {() => void} */ cb) => void pageEvents.set(type, cb),
      removeEventListener: (/** @type {string} */ type) => void pageEvents.delete(type),
    };
    const visualizer = startVisualizer({
      storage: fakeStorage({ enabled: true }),
      player: () => fakePlayer(),
      getUri: () => 'spotify:track:a',
      locale: () => 'en',
      MenuItem: fakeMenu().FakeItem,
      reducedMotion: () => false,
      onScreen: () => true,
      pip: () => ({ window: pipWindow, addEventListener() {}, removeEventListener() {} }),
    });
    started.push(visualizer);
    try {
      expect(mainRaf).toHaveBeenCalled();
      // Spotify goes to the background with the miniplayer open: no frames reach the main window.
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
      expect(mainCancel).toHaveBeenCalledWith(1);
      expect(pipWindow.requestAnimationFrame).toHaveBeenCalled();
      // The miniplayer closes while the main window is still hidden: nothing is left to draw for.
      pageEvents.get('pagehide')?.();
      expect(pipWindow.cancelAnimationFrame).toHaveBeenCalledWith(2);
      // Back in the foreground: frames come back on the main window.
      const before = mainRaf.mock.calls.length;
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
      expect(mainRaf.mock.calls.length).toBeGreaterThan(before);
    } finally {
      Reflect.deleteProperty(document, 'hidden');
      vi.unstubAllGlobals();
    }
  });

  it('stop removes the menu entry and stops listening', () => {
    const { visualizer, menu, player } = start({ saved: { enabled: true } });
    visualizer.stop();
    expect(menu.calls.deregister).toBe(1);
    expect(player.count()).toBe(0);
    expect(document.querySelector('.wa-viz-panel')).toBeNull();
  });
});

describe('startVisualizerIfEnabled', () => {
  it('ships with the visualizer switched off', () => {
    expect(FLAGS.visualizer).toBe(false);
  });

  it('does nothing at all while the flag is off: no menu entry, no listener, no frame, no element', () => {
    const player = fakePlayer();
    const menu = fakeMenu();
    const frames = { schedule: vi.fn(() => 1), cancel: vi.fn() };
    const docListener = vi.spyOn(document, 'addEventListener');
    const start = vi.fn();
    const result = startVisualizerIfEnabled({ flags: { visualizer: false }, start });
    expect(result).toBeNull();
    expect(start).not.toHaveBeenCalled();
    expect(menu.calls.register).toBe(0);
    expect(player.addEventListener).not.toHaveBeenCalled();
    expect(frames.schedule).not.toHaveBeenCalled();
    expect(docListener).not.toHaveBeenCalled();
    expect(document.querySelector('[class*="wa-viz"]')).toBeNull();
  });

  it('starts the visualizer when the flag is on and returns what start returns', () => {
    const handle = { store: /** @type {never} */ ({}), stop: vi.fn() };
    const start = vi.fn(() => handle);
    expect(startVisualizerIfEnabled({ flags: { visualizer: true }, start })).toBe(handle);
    expect(start).toHaveBeenCalledTimes(1);
  });
});

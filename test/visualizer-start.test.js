/** @vitest-environment jsdom */
// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY } from '../src/visualizer-settings.js';
import { startVisualizer } from '../src/visualizer-start.js';
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

  it('stop removes the menu entry and stops listening', () => {
    const { visualizer, menu, player } = start({ saved: { enabled: true } });
    visualizer.stop();
    expect(menu.calls.deregister).toBe(1);
    expect(player.count()).toBe(0);
    expect(document.querySelector('.wa-viz-panel')).toBeNull();
  });
});

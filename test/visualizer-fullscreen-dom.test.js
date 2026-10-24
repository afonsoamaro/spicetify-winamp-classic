/** @vitest-environment jsdom */
// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { labelsFor } from '../src/visualizer-i18n.js';
import { DEFAULTS } from '../src/visualizer-settings.js';
import { createFullscreenSurface } from '../src/visualizer-fullscreen-dom.js';
import { FULLSCREEN_VIEW_HTML, OTHER_COVERS_HTML } from './fixtures/fullscreen.js';

const labels = labelsFor('en');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

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

/** @type {{ unmount(): void }[]} */
const mounted = [];
afterEach(() => {
  for (const surface of mounted.splice(0)) surface.unmount();
  vi.restoreAllMocks();
});

/** @param {Partial<Parameters<typeof createFullscreenSurface>[0]>} options */
function mountSurface(options) {
  const surface = createFullscreenSurface({ store: fakeStore(), loop: fakeLoop(), labels, coverWidth: () => 557, ...options });
  mounted.push(surface);
  surface.mount();
  return surface;
}

const toggle = () => document.querySelector('.wa-viz-toggle');
const overlay = () => document.querySelector('.wa-viz-fullscreen');

beforeEach(() => {
  document.body.innerHTML = OTHER_COVERS_HTML + FULLSCREEN_VIEW_HTML;
});

describe('createFullscreenSurface', () => {
  it('adds one toggle to the header button group when the view is there', () => {
    mountSurface({});
    expect(document.querySelectorAll('.wa-viz-toggle')).toHaveLength(1);
    expect(toggle()?.parentElement?.id).toBe('group');
    expect(toggle()?.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows and hides the visualizer with the toggle', () => {
    const loop = fakeLoop();
    mountSurface({ loop });
    const press = () => /** @type {HTMLElement} */ (toggle()).click();
    press();
    expect(overlay()).not.toBeNull();
    expect(toggle()?.getAttribute('aria-pressed')).toBe('true');
    const surface = /** @type {import('../src/visualizer-loop.js').Surface} */ (loop.surfaces.at(-1));
    expect(surface.isVisible()).toBe(true);
    press();
    expect(overlay()).toBeNull();
    expect(toggle()?.getAttribute('aria-pressed')).toBe('false');
    expect(loop.unregister).toHaveBeenCalled();
  });

  it('adds nothing when the view is not in the page, and ignores the other covers', () => {
    document.body.innerHTML = OTHER_COVERS_HTML;
    mountSurface({});
    expect(toggle()).toBeNull();
  });

  it('finds the header even when the content has Encore buttons of its own, above or below in the document', () => {
    const view = /** @type {HTMLElement} */ (document.getElementById('view'));
    view.insertAdjacentHTML('afterbegin', '<div id="lower"><button data-encore-id="buttonTertiary">Show all</button></div>');
    view.querySelector('.body')?.insertAdjacentHTML('beforeend', '<div id="inside"><button data-encore-id="buttonTertiary">Credits</button></div>');
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(/** @this {HTMLElement} */ function () {
      const top = this.closest('#lower, #inside') ? 800 : 80;
      return /** @type {DOMRect} */ ({ top, bottom: top + 32, left: 0, right: 0, width: 0, height: 32, x: 0, y: top, toJSON: () => ({}) });
    });
    mountSurface({});
    expect(toggle()?.parentElement?.id).toBe('group');
  });

  it('ignores a cover that is too small to be the view', () => {
    mountSurface({ coverWidth: () => 120 });
    expect(toggle()).toBeNull();
  });

  it('removes the toggle and the overlay when the view goes away', async () => {
    mountSurface({});
    /** @type {HTMLElement} */ (toggle()).click();
    document.getElementById('view')?.remove();
    await tick();
    expect(toggle()).toBeNull();
    expect(overlay()).toBeNull();
  });

  it.each([{ fullscreen: false }, { enabled: false }])('has no toggle when %j', (settings) => {
    mountSurface({ store: fakeStore(settings) });
    expect(toggle()).toBeNull();
  });

  it('follows the master switch at runtime', () => {
    const store = fakeStore({ enabled: false });
    mountSurface({ store });
    expect(toggle()).toBeNull();
    store.set({ enabled: true });
    expect(document.querySelectorAll('.wa-viz-toggle')).toHaveLength(1);
    store.set({ enabled: false });
    expect(toggle()).toBeNull();
  });
});

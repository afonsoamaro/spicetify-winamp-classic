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
  const surface = createFullscreenSurface({ store: fakeStore(), loop: fakeLoop(), labels, coverWidth: () => 557, throttleMs: 0, ...options });
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
    expect(toggle()?.getAttribute('aria-checked')).toBe('false');
  });

  it('looks like its neighbours: their classes, role and Encore id, an icon and no text', () => {
    mountSurface({});
    const mine = /** @type {HTMLElement} */ (toggle());
    const sibling = /** @type {HTMLElement} */ (document.querySelector('#group button[aria-label="Show artwork"]'));
    for (const name of sibling.className.split(' ')) expect(mine.classList.contains(name)).toBe(true);
    expect(mine.getAttribute('role')).toBe('radio');
    expect(mine.getAttribute('data-encore-id')).toBe('buttonTertiary');
    expect(mine.getAttribute('aria-label')).toBe(labels.fullscreenToggle);
    expect(mine.textContent).toBe('');
    const icon = mine.querySelector('svg');
    expect(icon?.getAttribute('class')).toBe('icon-cls');
    expect(icon?.parentElement?.className).toBe('icon-wrap');
  });

  it('takes the size of the neighbours icon, not its own', () => {
    mountSurface({});
    const icon = toggle()?.querySelector('svg');
    expect(icon?.getAttribute('width')).toBe('16');
    expect(icon?.getAttribute('height')).toBe('16');
    expect(icon?.querySelector('path')?.getAttribute('d')).not.toBe('M0 0z');
  });

  it('covers only the space between the header and the player bar', () => {
    // The view can fill the whole window, with the header at the top and the player bar
    // at the bottom inside it: the overlay must leave both alone.
    const rects = new Map([
      ['view', { top: 8, bottom: 953 }],
      ['group', { top: 24, bottom: 64 }],
      ['bar', { top: 875, bottom: 953 }],
    ]);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(/** @this {HTMLElement} */ function () {
      const key = this.id === 'view' ? 'view' : this.id === 'group' || this.closest('#group') ? 'group' : this.matches('[data-testid="now-playing-bar"]') ? 'bar' : null;
      const r = (key && rects.get(key)) || { top: 100, bottom: 130 };
      return /** @type {DOMRect} */ ({ top: r.top, bottom: r.bottom, left: 0, right: 0, width: 0, height: r.bottom - r.top, x: 0, y: r.top, toJSON: () => ({}) });
    });
    mountSurface({});
    /** @type {HTMLElement} */ (toggle()).click();
    const ov = /** @type {HTMLElement} */ (overlay());
    expect(ov.style.top).toBe('56px');
    // 78 px of player bar plus 16 px of room for the track title that sits right above it.
    expect(ov.style.bottom).toBe('94px');
  });

  it('moves the overlay with the layout when the window is resized', () => {
    let barTop = 875;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(/** @this {HTMLElement} */ function () {
      const isBar = this.matches('[data-testid="now-playing-bar"]');
      const top = isBar ? barTop : 8;
      const bottom = isBar ? barTop + 78 : 953;
      return /** @type {DOMRect} */ ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });
    });
    mountSurface({});
    /** @type {HTMLElement} */ (toggle()).click();
    expect(/** @type {HTMLElement} */ (overlay()).style.bottom).toBe('94px');
    barTop = 800;
    window.dispatchEvent(new Event('resize'));
    expect(/** @type {HTMLElement} */ (overlay()).style.bottom).toBe('169px');
  });

  it('is turned off when another display mode is picked from the same group', () => {
    mountSurface({});
    /** @type {HTMLElement} */ (toggle()).click();
    expect(overlay()).not.toBeNull();
    /** @type {HTMLElement} */ (document.querySelector('#group button[aria-label="Show lyrics"]')).click();
    expect(overlay()).toBeNull();
    expect(toggle()?.getAttribute('aria-checked')).toBe('false');
  });

  it('shows and hides the visualizer with the toggle', () => {
    const loop = fakeLoop();
    mountSurface({ loop });
    const press = () => /** @type {HTMLElement} */ (toggle()).click();
    press();
    expect(overlay()).not.toBeNull();
    expect(toggle()?.getAttribute('aria-checked')).toBe('true');
    const surface = /** @type {import('../src/visualizer-loop.js').Surface} */ (loop.surfaces.at(-1));
    expect(surface.isVisible()).toBe(true);
    press();
    expect(overlay()).toBeNull();
    expect(toggle()?.getAttribute('aria-checked')).toBe('false');
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

  it('does not take an icon with role="img" for the cover', () => {
    document.getElementById('view')?.querySelector('.body')?.remove();
    document.getElementById('view')?.insertAdjacentHTML('beforeend', '<div><svg role="img" aria-label="icon"></svg></div>');
    mountSurface({});
    expect(toggle()).toBeNull();
  });

  it('searches the page at most a few times for a burst of changes while the view is closed', async () => {
    document.body.innerHTML = OTHER_COVERS_HTML;
    const search = vi.spyOn(document, 'querySelectorAll');
    mountSurface({ throttleMs: 100 });
    for (let i = 0; i < 12; i += 1) {
      document.body.append(document.createElement('span'));
      await tick();
    }
    const searches = search.mock.calls.filter(([selector]) => String(selector).includes('role="img"')).length;
    // Unthrottled this was one search per change, 13 in all.
    expect(searches).toBeLessThanOrEqual(5);
  });

  it('does not search the page again while its toggle is in place', async () => {
    mountSurface({});
    const search = vi.spyOn(document, 'querySelectorAll');
    document.body.append(document.createElement('span'));
    await tick();
    expect(search.mock.calls.filter(([selector]) => String(selector).includes('role="img"'))).toHaveLength(0);
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

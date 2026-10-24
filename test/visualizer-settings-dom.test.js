/** @vitest-environment jsdom */
// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { labelsFor } from '../src/visualizer-i18n.js';
import { DEFAULTS } from '../src/visualizer-settings.js';
import { createSettingsWindow, registerProfileMenu } from '../src/visualizer-settings-dom.js';

const labels = labelsFor('en');

/** A store stand-in that records writes. */
function fakeStore() {
  let current = { ...DEFAULTS };
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

/** @param {string} text @returns {HTMLInputElement} */
function control(text) {
  const label = [...document.querySelectorAll('label')].find((l) => l.textContent?.trim() === text);
  return /** @type {HTMLInputElement} */ (label?.control);
}

beforeEach(() => {
  document.body.innerHTML = '<button id="opener">open</button>';
});
afterEach(() => vi.restoreAllMocks());

describe('createSettingsWindow', () => {
  it('opens one dialog and keeps one when opened twice', () => {
    const win = createSettingsWindow({ store: fakeStore(), labels });
    win.open();
    win.open();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(win.isOpen()).toBe(true);
  });

  it('is a non-blocking dialog labelled by its title', () => {
    createSettingsWindow({ store: fakeStore(), labels }).open();
    const dialog = /** @type {HTMLElement} */ (document.querySelector('[role="dialog"]'));
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    const title = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '');
    expect(title?.textContent).toBe(labels.windowTitle);
  });

  it('writes a style change and a master switch change to the store', () => {
    const store = fakeStore();
    createSettingsWindow({ store, labels }).open();
    control(labels.styleGlow).click();
    expect(store.set).toHaveBeenCalledWith({ style: 'glow' });
    control(labels.enabled).click();
    expect(store.set).toHaveBeenCalledWith({ enabled: true });
    control(labels.surfaceSidebar).click();
    expect(store.set).toHaveBeenCalledWith({ sidebar: false });
  });

  it('closes on Escape and gives the focus back', () => {
    const opener = /** @type {HTMLElement} */ (document.getElementById('opener'));
    opener.focus();
    const win = createSettingsWindow({ store: fakeStore(), labels });
    win.open();
    expect(document.activeElement).not.toBe(opener);
    document.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(win.isOpen()).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('follows a change made through the store', () => {
    const store = fakeStore();
    createSettingsWindow({ store, labels }).open();
    store.set({ style: 'scope' });
    expect(control(labels.styleScope).checked).toBe(true);
  });
});

describe('registerProfileMenu', () => {
  it('registers one item that opens the window, and deregisters on cleanup', () => {
    const calls = { register: 0, deregister: 0 };
    /** @type {() => void} */
    let click = () => {};
    class FakeItem {
      /** @param {string} name @param {boolean} on @param {() => void} onClick */
      constructor(name, on, onClick) {
        click = onClick;
        this.name = name;
      }
      register() { calls.register += 1; }
      deregister() { calls.deregister += 1; }
      setState() {}
    }
    const settingsWindow = { open: vi.fn(), close: vi.fn(), isOpen: () => false };
    const off = registerProfileMenu({ store: fakeStore(), labels, settingsWindow, MenuItem: FakeItem });
    expect(calls.register).toBe(1);
    click();
    expect(settingsWindow.open).toHaveBeenCalledTimes(1);
    off();
    expect(calls.deregister).toBe(1);
  });
});

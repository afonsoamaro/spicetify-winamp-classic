// @ts-check
import { describe, expect, it, vi } from 'vitest';
import { DEFAULTS, SETTINGS_KEY, STYLE_IDS, createSettingsStore, normalizeSettings } from '../src/visualizer-settings.js';

/** @param {string | null} [initial] */
function fakeStorage(initial = null) {
  /** @type {Map<string, string>} */
  const map = new Map();
  if (initial !== null) map.set(SETTINGS_KEY, initial);
  return {
    /** @param {string} key */
    get: (key) => map.get(key) ?? null,
    /** @param {string} key @param {string} value */
    set: (key, value) => void map.set(key, value),
    map,
  };
}

describe('normalizeSettings', () => {
  it.each([undefined, null, 'x', 42])('returns the defaults for %s', (raw) => {
    expect(normalizeSettings(raw)).toEqual(DEFAULTS);
  });

  it('keeps valid fields and replaces invalid ones one by one', () => {
    const result = normalizeSettings({ style: 'nope', enabled: 'yes', sidebar: false });
    expect(result.style).toBe('bars');
    expect(result.enabled).toBe(false);
    expect(result.sidebar).toBe(false);
    expect(result.fullscreen).toBe(DEFAULTS.fullscreen);
  });

  it('accepts every known style', () => {
    for (const style of STYLE_IDS) expect(normalizeSettings({ style }).style).toBe(style);
  });
});

describe('createSettingsStore', () => {
  it('starts from the defaults when storage holds invalid JSON', () => {
    const store = createSettingsStore({ storage: fakeStorage('{broken') });
    expect(store.get()).toEqual(DEFAULTS);
  });

  it('persists a change and a new store reads it back', () => {
    const storage = fakeStorage();
    createSettingsStore({ storage }).set({ style: 'glow' });
    expect(JSON.parse(storage.map.get(SETTINGS_KEY) ?? '{}').style).toBe('glow');
    expect(createSettingsStore({ storage }).get().style).toBe('glow');
  });

  it('notifies subscribers once per set and stops after unsubscribe', () => {
    const store = createSettingsStore({ storage: fakeStorage() });
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.set({ enabled: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0].enabled).toBe(true);
    off();
    store.set({ enabled: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the change in memory when storage throws on write', () => {
    const storage = { get: () => null, set: () => { throw new Error('quota'); } };
    const store = createSettingsStore({ storage });
    expect(() => store.set({ style: 'scope' })).not.toThrow();
    expect(store.get().style).toBe('scope');
  });
});

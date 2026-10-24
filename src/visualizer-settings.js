// @ts-check
// Settings of the visualizer. Pure, no DOM: the profile menu window and the
// surfaces read and change them through the store, so one change reaches all.

export const SETTINGS_KEY = 'winamp-classic:visualizer';

export const STYLE_IDS = /** @type {const} */ (['bars', 'scope', 'glow']);

/**
 * @typedef {typeof STYLE_IDS[number]} StyleId
 * @typedef {{
 *   enabled: boolean,
 *   style: StyleId,
 *   fullscreen: boolean,
 *   sidebar: boolean,
 *   sidebarOpen: boolean,
 *   miniplayer: boolean,
 * }} VisualizerSettings
 */

/** @type {VisualizerSettings} */
export const DEFAULTS = {
  enabled: false,
  style: 'bars',
  fullscreen: true,
  sidebar: true,
  sidebarOpen: true,
  miniplayer: true,
};

/**
 * Turns whatever was stored into valid settings, field by field: a bad value
 * costs only that field, never the rest.
 * @param {unknown} raw
 * @returns {VisualizerSettings}
 */
export function normalizeSettings(raw) {
  const source = raw !== null && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {};
  /** @param {'enabled' | 'fullscreen' | 'sidebar' | 'sidebarOpen' | 'miniplayer'} key */
  const flag = (key) => (typeof source[key] === 'boolean' ? /** @type {boolean} */ (source[key]) : DEFAULTS[key]);
  const style = STYLE_IDS.find((id) => id === source.style) ?? DEFAULTS.style;
  return {
    enabled: flag('enabled'),
    style,
    fullscreen: flag('fullscreen'),
    sidebar: flag('sidebar'),
    sidebarOpen: flag('sidebarOpen'),
    miniplayer: flag('miniplayer'),
  };
}

/**
 * @typedef {{ get(key: string): string | null, set(key: string, value: string): void }} Storage
 */

/**
 * @param {Storage} storage
 * @returns {unknown} the parsed value, or null when it is missing or not JSON
 */
function readStored(storage) {
  try {
    return JSON.parse(storage.get(SETTINGS_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/**
 * @param {{ storage: Storage }} options
 * @returns {{
 *   get(): VisualizerSettings,
 *   set(patch: Partial<VisualizerSettings>): void,
 *   subscribe(listener: (settings: VisualizerSettings) => void): () => void,
 * }}
 */
export function createSettingsStore({ storage }) {
  let current = normalizeSettings(readStored(storage));
  /** @type {Set<(settings: VisualizerSettings) => void>} */
  const listeners = new Set();

  return {
    get: () => ({ ...current }),
    set(patch) {
      current = normalizeSettings({ ...current, ...patch });
      try {
        storage.set(SETTINGS_KEY, JSON.stringify(current));
      } catch {
        // Storage can be full or blocked; the change still holds in memory.
      }
      for (const listener of listeners) listener({ ...current });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

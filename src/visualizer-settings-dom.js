// @ts-check
// The one place where the visualizer is configured: a small non-blocking
// dialog opened from an entry in Spotify's profile menu. It only reads and
// writes the settings store, so a change reaches every surface at once.
import { STYLE_IDS } from './visualizer-settings.js';

export const SETTINGS_WINDOW_CLASS = 'wa-viz-settings';
const SETTINGS_TITLE_ID = 'wa-viz-settings-title';

/** @type {Record<typeof STYLE_IDS[number], 'styleBars' | 'styleScope' | 'styleGlow'>} */
const STYLE_LABEL_KEYS = { bars: 'styleBars', scope: 'styleScope', glow: 'styleGlow' };

/** @type {ReadonlyArray<readonly ['fullscreen' | 'sidebar' | 'miniplayer', 'surfaceFullscreen' | 'surfaceSidebar' | 'surfaceMiniplayer']>} */
const SURFACE_FIELDS = [
  ['fullscreen', 'surfaceFullscreen'],
  ['sidebar', 'surfaceSidebar'],
  ['miniplayer', 'surfaceMiniplayer'],
];

/**
 * The slice of the settings store the window uses.
 * @typedef {{
 *   get(): import('./visualizer-settings.js').VisualizerSettings,
 *   set(patch: Partial<import('./visualizer-settings.js').VisualizerSettings>): void,
 *   subscribe(listener: (s: import('./visualizer-settings.js').VisualizerSettings) => void): () => void,
 * }} SettingsStoreLike
 */

/**
 * @param {{ store: SettingsStoreLike, labels: import('./visualizer-i18n.js').Labels, doc?: Document }} options
 * @returns {{ open(): void, close(): void, isOpen(): boolean }}
 */
export function createSettingsWindow({ store, labels, doc = document }) {
  /** @type {HTMLElement | null} */
  let dialog = null;
  /** @type {HTMLElement | null} */
  let previousFocus = null;
  /** @type {(() => void) | null} */
  let unsubscribe = null;

  /**
   * A labelled input whose text is the label's only text.
   * @param {'checkbox' | 'radio'} type
   * @param {string} name
   * @param {string} text
   * @param {() => void} onChange
   */
  const field = (type, name, text, onChange) => {
    const label = doc.createElement('label');
    const input = doc.createElement('input');
    input.type = type;
    input.name = name;
    input.addEventListener('change', onChange);
    label.append(input, text);
    return { label, input };
  };

  const close = () => {
    unsubscribe?.();
    unsubscribe = null;
    dialog?.remove();
    dialog = null;
    previousFocus?.focus();
    previousFocus = null;
  };

  const open = () => {
    if (dialog) {
      dialog.focus();
      return;
    }
    previousFocus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;

    const el = doc.createElement('div');
    el.className = SETTINGS_WINDOW_CLASS;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-labelledby', SETTINGS_TITLE_ID);
    el.tabIndex = -1;
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    const title = doc.createElement('h2');
    title.id = SETTINGS_TITLE_ID;
    title.textContent = labels.windowTitle;

    const enabled = field('checkbox', 'enabled', labels.enabled, () => store.set({ enabled: enabled.input.checked }));

    const styles = doc.createElement('fieldset');
    const legend = doc.createElement('legend');
    legend.textContent = labels.style;
    styles.append(legend);
    const radios = STYLE_IDS.map((id) => {
      const radio = field('radio', 'style', labels[STYLE_LABEL_KEYS[id]], () => store.set({ style: id }));
      radio.input.value = id;
      styles.append(radio.label);
      return radio.input;
    });

    const surfaces = SURFACE_FIELDS.map(([key, labelKey]) => {
      const surface = field('checkbox', key, labels[labelKey], () => store.set({ [key]: surface.input.checked }));
      return { key, input: surface.input, label: surface.label };
    });

    const note = doc.createElement('p');
    note.textContent = labels.signalNote;

    const closeButton = doc.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = labels.close;
    closeButton.addEventListener('click', close);

    el.append(title, enabled.label, styles, ...surfaces.map((s) => s.label), note, closeButton);

    /** @param {import('./visualizer-settings.js').VisualizerSettings} settings */
    const sync = (settings) => {
      enabled.input.checked = settings.enabled;
      for (const radio of radios) radio.checked = radio.value === settings.style;
      for (const surface of surfaces) surface.input.checked = settings[surface.key];
    };
    sync(store.get());
    unsubscribe = store.subscribe(sync);

    doc.body.append(el);
    dialog = el;
    el.focus();
  };

  return { open, close, isOpen: () => dialog !== null };
}

/**
 * The profile menu entry that opens the window. Its tick follows the master
 * switch.
 * @param {{
 *   store: SettingsStoreLike,
 *   labels: import('./visualizer-i18n.js').Labels,
 *   settingsWindow: { open(): void },
 *   MenuItem?: new (name: string, isEnabled: boolean, onClick: () => void) => { register(): void, deregister(): void, setState(on: boolean): void },
 * }} options
 * @returns {() => void} removes the entry
 */
export function registerProfileMenu({ store, labels, settingsWindow, MenuItem = Spicetify.Menu.Item }) {
  const item = new MenuItem(labels.menuTitle, store.get().enabled, () => settingsWindow.open());
  item.register();
  const unsubscribe = store.subscribe((settings) => item.setState(settings.enabled));
  return () => {
    unsubscribe();
    item.deregister();
  };
}

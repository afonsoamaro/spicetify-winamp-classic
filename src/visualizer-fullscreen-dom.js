// @ts-check
// The visualizer in Spotify's expanded Now Playing view: a toggle in the
// header's button group that covers the view with the visualizer, and back.
// The view has no test id, role or readable class, so it is found by its big
// cover (a role="img" outside the player bar and the sidebar) and the header
// by the Encore buttons that sit before it.
import { drawStyle, readVisualizerColors } from './visualizer-styles.js';

export const FULLSCREEN_TOGGLE_CLASS = 'wa-viz-toggle';
export const FULLSCREEN_OVERLAY_CLASS = 'wa-viz-fullscreen';
// A cover narrower than this is the player bar's or a card's, not the view's.
const MIN_COVER_W = 400;
const HEADER_BUTTON = 'button[data-encore-id="buttonTertiary"]';

/** @param {Element} el @returns {number} */
function measuredWidth(el) {
  return el.getBoundingClientRect().width;
}

/**
 * The expanded view: the nearest ancestor of its big cover that holds the
 * header buttons.
 * @param {Document} root
 * @param {(el: Element) => number} coverWidth
 * @returns {HTMLElement | null}
 */
function findFullscreenView(root, coverWidth) {
  const covers = [...root.querySelectorAll('[role="img"]')].filter((el) => {
    return !el.closest('aside') && coverWidth(el) >= MIN_COVER_W;
  });
  for (const cover of covers) {
    let ancestor = cover.parentElement;
    while (ancestor && !ancestor.querySelector(HEADER_BUTTON)) ancestor = ancestor.parentElement;
    if (ancestor) return ancestor;
  }
  return null;
}

/**
 * @param {{
 *   store: import('./visualizer-settings-dom.js').SettingsStoreLike,
 *   loop: { register(surface: import('./visualizer-loop.js').Surface): () => void, wake(): void },
 *   labels: import('./visualizer-i18n.js').Labels,
 *   root?: Document,
 *   coverWidth?: (el: Element) => number,
 * }} options
 * @returns {{ mount(): void, unmount(): void }}
 */
export function createFullscreenSurface({ store, loop, labels, root = document, coverWidth = measuredWidth }) {
  /** @type {HTMLButtonElement | null} */
  let toggle = null;
  /** @type {HTMLElement | null} */
  let overlay = null;
  /** @type {HTMLCanvasElement | null} */
  let canvas = null;
  /** @type {MutationObserver | null} */
  let observer = null;
  /** @type {(() => void) | null} */
  let unsubscribe = null;
  /** @type {(() => void) | null} */
  let unregister = null;
  /** @type {import('./visualizer-styles.js').VizColors | null} */
  let colors = null;
  let active = false;

  const allowed = () => {
    const settings = store.get();
    return settings.enabled && settings.fullscreen;
  };

  /** @type {import('./visualizer-loop.js').Surface} */
  const surface = {
    name: 'fullscreen',
    isConnected: () => canvas?.isConnected === true,
    isVisible: () => active && allowed() && canvas?.isConnected === true,
    draw(signal) {
      if (!canvas || !colors) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = globalThis.devicePixelRatio || 1;
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStyle(store.get().style, ctx, signal, { w, h }, colors);
    },
  };

  const hideOverlay = () => {
    unregister?.();
    unregister = null;
    overlay?.remove();
    overlay = null;
    canvas = null;
    colors = null;
  };

  /** @param {HTMLElement} view @param {HTMLElement} host */
  const showOverlay = (view, host) => {
    if (overlay?.isConnected) return;
    if (getComputedStyle(view).position === 'static') view.style.position = 'relative';
    overlay = root.createElement('div');
    overlay.className = FULLSCREEN_OVERLAY_CLASS;
    // Starts below the header so the toggle and the minimise key stay reachable.
    overlay.style.top = `${Math.max(0, host.getBoundingClientRect().bottom - view.getBoundingClientRect().top)}px`;
    canvas = root.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    overlay.append(canvas);
    view.append(overlay);
    colors = readVisualizerColors(canvas);
    unregister = loop.register(surface);
  };

  const removeAll = () => {
    active = false;
    hideOverlay();
    toggle?.remove();
    toggle = null;
  };

  const sync = () => {
    const view = allowed() ? findFullscreenView(root, coverWidth) : null;
    const host = view?.querySelector(HEADER_BUTTON)?.parentElement ?? null;
    if (!view || !host) {
      removeAll();
      return;
    }
    if (!toggle?.isConnected) {
      toggle = root.createElement('button');
      toggle.type = 'button';
      toggle.className = FULLSCREEN_TOGGLE_CLASS;
      toggle.textContent = labels.fullscreenToggle;
      toggle.addEventListener('click', () => {
        active = !active;
        sync();
        loop.wake();
      });
      host.prepend(toggle);
    }
    toggle.setAttribute('aria-pressed', String(active));
    if (active) showOverlay(view, host);
    else hideOverlay();
  };

  return {
    mount() {
      if (observer) return;
      unsubscribe = store.subscribe(() => {
        sync();
        loop.wake();
      });
      observer = new MutationObserver(sync);
      observer.observe(root.body, { childList: true, subtree: true });
      sync();
    },
    unmount() {
      observer?.disconnect();
      observer = null;
      unsubscribe?.();
      unsubscribe = null;
      removeAll();
    },
  };
}

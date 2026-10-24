// @ts-check
// The visualizer in Spotify's expanded Now Playing view: a toggle in the
// header's button group that covers the view with the visualizer, and back.
// The view has no test id, role or readable class, so it is found by its big
// cover (a role="img" outside the player bar and the sidebar) and the header
// by the Encore buttons that sit before it.
import { drawStyle, readVisualizerColors } from './visualizer-styles.js';
import { createThrottled } from './visualizer-throttle.js';

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
 * The expanded view and its header. From the big cover, go up until an
 * ancestor holds an Encore button that is not in the branch already climbed
 * and sits above the cover: that is the header row, and the ancestor is the
 * view. Buttons of the content itself (a "Show all" row far below) are inside
 * the branch or below the cover, so they never qualify; a first-in-document
 * rule would trip on them.
 * @param {Document} root
 * @param {(el: Element) => number} coverWidth
 * @returns {{ view: HTMLElement, host: HTMLElement } | null}
 */
function findFullscreenView(root, coverWidth) {
  // Encore's icons are SVGs with role="img" too, and there are hundreds of them.
  const covers = [...root.querySelectorAll('[role="img"]:not(svg)')].filter((el) => {
    return !el.closest('aside') && coverWidth(el) >= MIN_COVER_W;
  });
  for (const cover of covers) {
    const coverTop = cover.getBoundingClientRect().top;
    let climbed = cover;
    let ancestor = cover.parentElement;
    while (ancestor) {
      const branch = climbed;
      const header = [...ancestor.querySelectorAll(HEADER_BUTTON)].find((button) => {
        return !branch.contains(button) && button.getBoundingClientRect().top <= coverTop;
      });
      if (header?.parentElement) return { view: ancestor, host: header.parentElement };
      climbed = ancestor;
      ancestor = ancestor.parentElement;
    }
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
 *   throttleMs?: number,
 * }} options
 * @returns {{ mount(): void, unmount(): void }}
 */
export function createFullscreenSurface({ store, loop, labels, root = document, coverWidth = measuredWidth, throttleMs = 120 }) {
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
    const frame = view;
    if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
    overlay = root.createElement('div');
    overlay.className = FULLSCREEN_OVERLAY_CLASS;
    // Starts below the header so the toggle and the minimise key stay reachable.
    const offset = Math.max(0, host.getBoundingClientRect().bottom - frame.getBoundingClientRect().top);
    overlay.style.top = `${offset}px`;
    canvas = root.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    overlay.append(canvas);
    frame.append(overlay);
    colors = readVisualizerColors(canvas);
    unregister = loop.register(surface);
  };

  const watcher = createThrottled(() => sync(), throttleMs);

  const removeAll = () => {
    active = false;
    hideOverlay();
    toggle?.remove();
    toggle = null;
  };

  const sync = () => {
    // The toggle lives inside the view, so while it is connected the view is
    // still there and there is nothing to search for.
    if (allowed() && toggle?.isConnected && (active ? overlay?.isConnected : !overlay)) return;
    const found = allowed() ? findFullscreenView(root, coverWidth) : null;
    if (!found) {
      removeAll();
      return;
    }
    const { view, host } = found;
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
    if (active) showOverlay(view, toggle.parentElement ?? host);
    else hideOverlay();
  };

  return {
    mount() {
      if (observer) return;
      unsubscribe = store.subscribe(() => {
        sync();
        loop.wake();
      });
      observer = new MutationObserver(() => watcher.call());
      observer.observe(root.body, { childList: true, subtree: true });
      sync();
    },
    unmount() {
      observer?.disconnect();
      observer = null;
      watcher.cancel();
      unsubscribe?.();
      unsubscribe = null;
      removeAll();
    },
  };
}

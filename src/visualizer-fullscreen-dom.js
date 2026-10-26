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
 * The overlay covers what lies between the header and the player bar. The view
 * can fill the whole window with both inside it, so it cannot simply fill the
 * view: it starts where the header ends, so the toggle and the minimise key stay
 * reachable, and ends where the player bar begins, so the controls stay usable.
 * @param {HTMLElement} overlay
 * @param {HTMLElement} view
 * @param {HTMLElement} header
 * @param {Document} root
 */
function placeOverlay(overlay, view, header, root = document) {
  const viewBox = view.getBoundingClientRect();
  const top = Math.max(0, header.getBoundingClientRect().bottom - viewBox.top);
  const bar = root.querySelector('[data-testid="now-playing-bar"]');
  const bottom = bar ? Math.max(0, viewBox.bottom - bar.getBoundingClientRect().top + TITLE_ROOM) : 0;
  overlay.style.top = `${top}px`;
  overlay.style.bottom = `${bottom}px`;
}

// The track title sits just above the player bar; the overlay stops short of it.
const TITLE_ROOM = 16;
const SVG_NS = 'http://www.w3.org/2000/svg';
// Four bars of different heights in a 16x16 box, drawn with the current colour.
const BARS_ICON_PATH = 'M1 14V9h2.5v5H1zm4 0V3h2.5v11H5zm4 0V6h2.5v8H9zm4 0V8h2.5v6H13z';

/**
 * The toggle, made as one more button of the group it joins: it takes the
 * neighbour's classes, role and Encore id, so Spotify's own stylesheet dresses
 * it (size, colours, the checked state) and the theme's rules for those keys
 * apply to it without a single rule of its own. It is an icon with a label for
 * assistive technology, like the others.
 * @param {Document} root
 * @param {HTMLElement} host the button group
 * @param {string} label
 * @returns {HTMLButtonElement}
 */
function buildToggle(root, host, label) {
  const sample = host.querySelector('button');
  const button = root.createElement('button');
  button.type = 'button';
  button.className = [sample?.className, FULLSCREEN_TOGGLE_CLASS].filter(Boolean).join(' ');
  button.setAttribute('role', sample?.getAttribute('role') ?? 'switch');
  const encoreId = sample?.getAttribute('data-encore-id');
  if (encoreId) button.setAttribute('data-encore-id', encoreId);
  button.setAttribute('aria-label', label);
  button.title = label;

  // Clone the neighbour's icon shell so the size and the classes match, then swap the drawing.
  const sampleWrapper = sample?.querySelector('span');
  const sampleIcon = sample?.querySelector('svg');
  const wrapper = /** @type {HTMLElement} */ (sampleWrapper ? sampleWrapper.cloneNode(false) : root.createElement('span'));
  wrapper.setAttribute('aria-hidden', 'true');
  const icon = /** @type {SVGElement} */ (sampleIcon ? sampleIcon.cloneNode(false) : root.createElementNS(SVG_NS, 'svg'));
  if (!sampleIcon) icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('role', 'img');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('fill', 'currentColor');
  const path = root.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', BARS_ICON_PATH);
  icon.append(path);
  wrapper.append(icon);
  button.append(wrapper);
  return button;
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
  /** @type {HTMLElement | null} */
  let group = null;
  /** @type {{ frame: HTMLElement, header: HTMLElement } | null} */
  let anchor = null;

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
    anchor = null;
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
    anchor = { frame, header: host };
    placeOverlay(overlay, frame, host, root);
    canvas = root.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    overlay.append(canvas);
    frame.append(overlay);
    colors = readVisualizerColors(canvas);
    unregister = loop.register(surface);
  };

  // The overlay's limits are pixels measured from the layout, so a new window size moves them.
  const onResize = () => {
    if (overlay && anchor) placeOverlay(overlay, anchor.frame, anchor.header, root);
  };

  const watcher = createThrottled(() => sync(), throttleMs);

  // Picking another display mode from the same group ends this one, as it does
  // for the others in the group.
  /** @param {Event} event */
  const onGroupClick = (event) => {
    if (!active || !(event.target instanceof Element) || event.target.closest('button') === toggle) return;
    active = false;
    sync();
    loop.wake();
  };

  const removeAll = () => {
    active = false;
    hideOverlay();
    group?.removeEventListener('click', onGroupClick);
    group = null;
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
      group?.removeEventListener('click', onGroupClick);
      toggle = buildToggle(root, host, labels.fullscreenToggle);
      toggle.addEventListener('click', () => {
        active = !active;
        sync();
        loop.wake();
      });
      group = host;
      group.addEventListener('click', onGroupClick);
      host.append(toggle);
    }
    toggle.setAttribute('aria-checked', String(active));
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
      root.defaultView?.addEventListener('resize', onResize);
      sync();
    },
    unmount() {
      observer?.disconnect();
      observer = null;
      watcher.cancel();
      root.defaultView?.removeEventListener('resize', onResize);
      unsubscribe?.();
      unsubscribe = null;
      removeAll();
    },
  };
}

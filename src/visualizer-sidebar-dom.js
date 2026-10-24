// @ts-check
// The visualizer panel of the right sidebar: a header with a show/hide button
// and a canvas, placed first in the Now Playing sidebar, above the cover or
// the video. It draws only while it is on, open and on screen.
import { LOG_PREFIX } from './dom.js';
import { drawStyle, readVisualizerColors } from './visualizer-styles.js';

export const SIDEBAR_PANEL_CLASS = 'wa-viz-panel';
// The sidebar is the only ASIDE without a test id (the player bar is the
// other, and has one). Its aria-label is translated by Spotify, so the
// selector does not use it.
export const SIDEBAR_SELECTOR = 'aside:not([data-testid])';
// Height of the drawing area, in CSS pixels.
const PANEL_CANVAS_H = 96;
// Below this many visible pixels a sidebar slid off-screen counts as closed.
const MIN_VISIBLE_W = 100;

/**
 * The scroller is the first descendant that scrolls vertically; the panel goes
 * first in its only child, the content.
 * @param {Element} aside
 * @returns {HTMLElement | null}
 */
function findSidebarContent(aside) {
  const scroller = [...aside.querySelectorAll('div')].find((div) => {
    const overflow = getComputedStyle(div).overflowY;
    return overflow === 'auto' || overflow === 'scroll';
  });
  return /** @type {HTMLElement | null} */ (scroller?.firstElementChild ?? null);
}

/**
 * Spotify keeps the closed sidebar in the page and slides it off-screen, so
 * presence says nothing: what counts is how much of it is inside the window.
 * @param {Element} aside
 * @returns {boolean}
 */
function asideOnScreen(aside) {
  const rect = aside.getBoundingClientRect();
  return Math.min(rect.right, innerWidth) - Math.max(rect.left, 0) > MIN_VISIBLE_W;
}

/**
 * The header of the sidebar floats over the top of the content, so the panel
 * starts below it: how far its lowest button reaches into the content.
 * @param {Element} aside
 * @param {Element} content
 * @returns {number}
 */
function headerOffset(aside, content) {
  const top = aside.getBoundingClientRect().top;
  const contentTop = content.getBoundingClientRect().top;
  const bottoms = [...aside.querySelectorAll('button')]
    .map((button) => button.getBoundingClientRect())
    .filter((rect) => rect.height > 0 && rect.top < top + 80)
    .map((rect) => rect.bottom);
  return Math.max(0, Math.max(0, ...bottoms) - contentTop);
}

/**
 * @param {{
 *   store: import('./visualizer-settings-dom.js').SettingsStoreLike,
 *   loop: { register(surface: import('./visualizer-loop.js').Surface): () => void, wake(): void },
 *   labels: import('./visualizer-i18n.js').Labels,
 *   root?: Document,
 *   onScreen?: (aside: Element) => boolean,
 * }} options
 * @returns {{ mount(): void, unmount(): void }}
 */
export function createSidebarSurface({ store, loop, labels, root = document, onScreen = asideOnScreen }) {
  /** @type {HTMLElement | null} */
  let panel = null;
  /** @type {HTMLCanvasElement | null} */
  let canvas = null;
  /** @type {HTMLButtonElement | null} */
  let toggle = null;
  /** @type {MutationObserver | null} */
  let observer = null;
  /** @type {(() => void) | null} */
  let unsubscribe = null;
  /** @type {(() => void) | null} */
  let unregister = null;
  /** @type {import('./visualizer-styles.js').VizColors | null} */
  let colors = null;

  /** @returns {boolean} */
  const settingsOn = () => {
    const settings = store.get();
    return settings.enabled && settings.sidebar && settings.sidebarOpen;
  };

  /** @type {import('./visualizer-loop.js').Surface} */
  const surface = {
    name: 'sidebar',
    isConnected: () => canvas?.isConnected === true,
    isVisible() {
      const aside = root.querySelector(SIDEBAR_SELECTOR);
      return settingsOn() && canvas?.isConnected === true && aside !== null && onScreen(aside);
    },
    draw(signal) {
      if (!canvas || !colors) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = globalThis.devicePixelRatio || 1;
      const w = canvas.clientWidth || canvas.width / dpr;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(PANEL_CANVAS_H * dpr)) canvas.height = Math.round(PANEL_CANVAS_H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStyle(store.get().style, ctx, signal, { w, h: PANEL_CANVAS_H }, colors);
    },
  };

  const build = () => {
    panel = root.createElement('div');
    panel.className = SIDEBAR_PANEL_CLASS;
    const header = root.createElement('div');
    const title = root.createElement('span');
    title.textContent = labels.menuTitle;
    toggle = root.createElement('button');
    toggle.type = 'button';
    toggle.addEventListener('click', () => store.set({ sidebarOpen: !store.get().sidebarOpen }));
    header.append(title, toggle);
    canvas = root.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.height = PANEL_CANVAS_H;
    panel.append(header, canvas);
  };

  const refresh = () => {
    if (!toggle || !canvas) return;
    const open = store.get().sidebarOpen;
    toggle.textContent = open ? labels.panelHide : labels.panelShow;
    toggle.setAttribute('aria-expanded', String(open));
    canvas.hidden = !open;
  };

  /** Puts the panel in the sidebar content and registers it, when both exist. */
  const attach = () => {
    const aside = root.querySelector(SIDEBAR_SELECTOR);
    const content = aside ? findSidebarContent(aside) : null;
    if (!aside || !content) return;
    if (!panel) build();
    if (!panel || !canvas) return;
    if (content.firstElementChild !== panel) {
      panel.style.marginTop = `${headerOffset(aside, content)}px`;
      content.prepend(panel);
      colors = readVisualizerColors(canvas);
    }
    unregister = loop.register(surface);
    refresh();
  };

  return {
    mount() {
      if (observer) return;
      unsubscribe = store.subscribe(() => {
        refresh();
        loop.wake();
      });
      observer = new MutationObserver(() => {
        const aside = root.querySelector(SIDEBAR_SELECTOR);
        const content = aside ? findSidebarContent(aside) : null;
        if (content && panel?.parentElement !== content) attach();
      });
      observer.observe(root.body, { childList: true, subtree: true });
      attach();
      if (!panel) console.warn(`${LOG_PREFIX} visualizer: sidebar not found, waiting for it`);
    },
    unmount() {
      observer?.disconnect();
      observer = null;
      unsubscribe?.();
      unsubscribe = null;
      unregister?.();
      unregister = null;
      panel?.remove();
      panel = null;
      canvas = null;
      toggle = null;
      colors = null;
    },
  };
}

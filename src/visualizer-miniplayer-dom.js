// @ts-check
// The visualizer behind Spotify's miniplayer. The miniplayer is a Document
// Picture-in-Picture window: a document of its own, reachable from the main
// window, that Spicetify's stylesheet does not reach. A canvas goes first in
// its root with a negative z-index, so it paints over the root's own
// background and under the player.
import { drawStyle, readVisualizerColors } from './visualizer-styles.js';

export const MINIPLAYER_CANVAS_CLASS = 'wa-viz-miniplayer';

/**
 * The slice of the Picture-in-Picture window the surface uses.
 * @typedef {{
 *   document: Document,
 *   addEventListener(type: string, callback: () => void): void,
 *   removeEventListener(type: string, callback: () => void): void,
 *   requestAnimationFrame?: (callback: () => void) => number,
 *   cancelAnimationFrame?: (id: number) => void,
 * }} PipWindow
 */

/**
 * `window.documentPictureInPicture`: the open window, if any, and an event when one opens.
 * @typedef {{
 *   window: PipWindow | null,
 *   addEventListener(type: string, callback: (event: { window: PipWindow }) => void): void,
 *   removeEventListener(type: string, callback: (event: { window: PipWindow }) => void): void,
 * }} PipApi
 */

/**
 * @param {{
 *   store: import('./visualizer-settings-dom.js').SettingsStoreLike,
 *   loop: { register(surface: import('./visualizer-loop.js').Surface): () => void, wake(): void },
 *   pip?: () => PipApi | undefined,
 *   colorSource?: () => HTMLElement,
 *   onChange?: () => void,
 * }} options
 * @returns {{ mount(): void, unmount(): void, isOpen(): boolean, window(): PipWindow | null }}
 */
export function createMiniplayerSurface({
  store,
  loop,
  pip = () => /** @type {PipApi | undefined} */ (/** @type {any} */ (globalThis).documentPictureInPicture),
  colorSource = () => document.documentElement,
  onChange = () => {},
}) {
  /** @type {PipWindow | null} */
  let win = null;
  /** @type {HTMLCanvasElement | null} */
  let canvas = null;
  /** @type {MutationObserver | null} */
  let observer = null;
  /** @type {(() => void) | null} */
  let unregister = null;
  /** @type {(() => void) | null} */
  let unsubscribe = null;
  /** @type {PipApi | undefined} */
  let api;
  /** @type {import('./visualizer-styles.js').VizColors | null} */
  let colors = null;

  /** @type {import('./visualizer-loop.js').Surface} */
  const surface = {
    name: 'miniplayer',
    isConnected: () => canvas?.isConnected === true,
    isVisible() {
      const settings = store.get();
      return win !== null && canvas?.isConnected === true && settings.enabled && settings.miniplayer;
    },
    draw(signal) {
      if (!canvas || !colors) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = win && 'devicePixelRatio' in win ? Number(win.devicePixelRatio) || 1 : globalThis.devicePixelRatio || 1;
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStyle(store.get().style, ctx, signal, { w, h }, colors);
    },
  };

  /** The miniplayer's root: the first div of its body. @param {Document} doc */
  const findRoot = (doc) => /** @type {HTMLElement | undefined} */ ([...doc.body.children].find((child) => child.tagName === 'DIV'));

  /** Puts the canvas first in the miniplayer root, when there is one. */
  const place = () => {
    if (!win) return;
    const root = findRoot(win.document);
    if (!root) return;
    if (!canvas) {
      canvas = win.document.createElement('canvas');
      canvas.className = MINIPLAYER_CANVAS_CLASS;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
    }
    if (canvas.parentElement === root && canvas.isConnected) return;
    const position = win.document.defaultView?.getComputedStyle(root).position;
    if (!position || position === 'static') root.style.position = 'relative';
    root.style.isolation = 'isolate';
    root.prepend(canvas);
    colors = readVisualizerColors(colorSource());
    unregister?.();
    unregister = loop.register(surface);
  };

  const onPageHide = () => detach(true);

  /** @param {PipWindow} next */
  const attach = (next) => {
    if (win === next) return;
    detach();
    win = next;
    win.addEventListener('pagehide', onPageHide);
    observer = new MutationObserver(() => {
      if (!canvas?.isConnected) place();
    });
    observer.observe(win.document.body, { childList: true, subtree: true });
    place();
    loop.wake();
    onChange();
  };

  /** @param {boolean} [notify] tell the owner the window went away */
  const detach = (notify = false) => {
    const hadWindow = win !== null;
    observer?.disconnect();
    observer = null;
    win?.removeEventListener('pagehide', onPageHide);
    unregister?.();
    unregister = null;
    canvas?.remove();
    canvas = null;
    colors = null;
    win = null;
    if (notify && hadWindow) onChange();
  };

  /** @param {{ window: PipWindow }} event */
  const onEnter = (event) => attach(event.window);

  return {
    mount() {
      api = pip();
      if (!api) return;
      api.addEventListener('enter', onEnter);
      if (api.window) attach(api.window);
      unsubscribe = store.subscribe(() => loop.wake());
    },
    unmount() {
      api?.removeEventListener('enter', onEnter);
      api = undefined;
      unsubscribe?.();
      unsubscribe = null;
      detach();
    },
    isOpen: () => win !== null,
    window: () => win,
  };
}

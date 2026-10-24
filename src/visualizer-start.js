// @ts-check
// Starts the visualizer. The profile menu entry always exists, because it is
// how the visualizer is turned on. Everything else (the loop, the surfaces,
// the Player and window listeners) is created only while the master switch is
// on and dropped when it goes off, so a visualizer nobody enabled costs
// nothing at run time.
import { LOG_PREFIX } from './dom.js';
import { labelsFor } from './visualizer-i18n.js';
import { createVisualizerLoop } from './visualizer-loop.js';
import { createFullscreenSurface } from './visualizer-fullscreen-dom.js';
import { createMiniplayerSurface } from './visualizer-miniplayer-dom.js';
import { createSettingsStore } from './visualizer-settings.js';
import { createSettingsWindow, registerProfileMenu } from './visualizer-settings-dom.js';
import { createSidebarSurface } from './visualizer-sidebar-dom.js';

/**
 * Everything is injectable so tests run without Spotify; the defaults read the
 * Spicetify globals when they are called.
 * @param {{
 *   storage?: import('./visualizer-settings.js').Storage,
 *   player?: () => import('./visualizer-loop.js').LoopPlayer & {
 *     addEventListener(type: string, callback: () => void): void,
 *     removeEventListener(type: string, callback: () => void): void,
 *   },
 *   getUri?: () => string | undefined,
 *   locale?: () => string | undefined,
 *   MenuItem?: Parameters<typeof registerProfileMenu>[0]['MenuItem'],
 *   schedule?: (callback: () => void) => number,
 *   cancel?: (id: number) => void,
 *   rng?: () => number,
 *   isHidden?: () => boolean,
 *   reducedMotion?: () => boolean,
 *   root?: Document,
 *   onScreen?: (aside: Element) => boolean,
 *   pip?: Parameters<typeof createMiniplayerSurface>[0]['pip'],
 * }} [options]
 * @returns {{ store: ReturnType<typeof createSettingsStore>, stop(): void }}
 */
export function startVisualizer({
  storage = Spicetify.LocalStorage,
  player = () => Spicetify.Player,
  getUri = () => Spicetify.Player.data?.item?.uri,
  locale = () => Spicetify.Locale?.getLocale?.() || document.documentElement.lang,
  MenuItem,
  schedule,
  cancel,
  rng,
  isHidden,
  reducedMotion,
  root = document,
  onScreen,
  pip,
} = {}) {
  const store = createSettingsStore({ storage });
  const labels = labelsFor(locale());
  const settingsWindow = createSettingsWindow({ store, labels, doc: root });
  const removeMenu = registerProfileMenu({ store, labels, settingsWindow, MenuItem });

  /** @type {ReturnType<typeof createVisualizerLoop> | null} */
  let loop = null;
  /** @type {ReturnType<typeof createSidebarSurface> | null} */
  let sidebar = null;
  /** @type {ReturnType<typeof createFullscreenSurface> | null} */
  let fullscreen = null;
  /** @type {ReturnType<typeof createMiniplayerSurface> | null} */
  let miniplayer = null;
  let sidebarMounted = false;
  let fullscreenMounted = false;
  let miniplayerMounted = false;

  // With Spotify in the background and the miniplayer open, the main window gets
  // no animation frames, so the miniplayer's own window paces the loop instead.
  /** @type {{ requestAnimationFrame(callback: () => void): number, cancelAnimationFrame(id: number): void }} */
  let frameWindow = window;
  const frameSchedule = (/** @type {() => void} */ callback) => {
    const pipWindow = root.hidden ? miniplayer?.window() : null;
    const paced = pipWindow && typeof pipWindow.requestAnimationFrame === 'function' && typeof pipWindow.cancelAnimationFrame === 'function';
    frameWindow = paced ? /** @type {typeof frameWindow} */ (pipWindow) : window;
    return /** @type {number} */ (frameWindow.requestAnimationFrame(callback));
  };
  const frameCancel = (/** @type {number} */ id) => frameWindow.cancelAnimationFrame(id);
  const mainHidden = () => root.hidden && !miniplayer?.isOpen();

  const wake = () => loop?.wake();
  const retarget = () => loop?.retarget();

  const enable = () => {
    if (loop) return;
    loop = createVisualizerLoop({
      player,
      getUri,
      schedule: schedule ?? frameSchedule,
      cancel: cancel ?? frameCancel,
      rng,
      isHidden: isHidden ?? mainHidden,
      reducedMotion,
    });
    sidebar = createSidebarSurface({ store, loop, labels, root, onScreen });
    fullscreen = createFullscreenSurface({ store, loop, labels, root });
    miniplayer = createMiniplayerSurface({ store, loop, pip, onChange: retarget });
    player().addEventListener('onplaypause', wake);
    player().addEventListener('songchange', wake);
    root.addEventListener('visibilitychange', retarget);
  };

  const disable = () => {
    if (!loop) return;
    sidebar?.unmount();
    fullscreen?.unmount();
    miniplayer?.unmount();
    sidebarMounted = false;
    fullscreenMounted = false;
    miniplayerMounted = false;
    loop.stop();
    try {
      player().removeEventListener('onplaypause', wake);
      player().removeEventListener('songchange', wake);
    } catch (err) {
      console.warn(`${LOG_PREFIX} visualizer: could not remove the Player listeners`, err);
    }
    root.removeEventListener('visibilitychange', retarget);
    loop = null;
    sidebar = null;
    fullscreen = null;
    miniplayer = null;
  };

  /** @param {import('./visualizer-settings.js').VisualizerSettings} settings */
  const reconcile = (settings) => {
    if (!settings.enabled) {
      disable();
      return;
    }
    enable();
    if (settings.sidebar && !sidebarMounted) {
      sidebar?.mount();
      sidebarMounted = true;
    } else if (!settings.sidebar && sidebarMounted) {
      sidebar?.unmount();
      sidebarMounted = false;
    }
    if (settings.miniplayer && !miniplayerMounted) {
      miniplayer?.mount();
      miniplayerMounted = true;
    } else if (!settings.miniplayer && miniplayerMounted) {
      miniplayer?.unmount();
      miniplayerMounted = false;
    }
    // The fullscreen surface follows its own switch inside; it only has to exist.
    if (!fullscreenMounted) {
      fullscreen?.mount();
      fullscreenMounted = true;
    }
    loop?.wake();
  };

  reconcile(store.get());
  const unsubscribe = store.subscribe(reconcile);

  return {
    store,
    stop() {
      unsubscribe();
      disable();
      removeMenu();
      settingsWindow.close();
    },
  };
}

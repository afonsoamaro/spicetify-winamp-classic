// @ts-check
// The one module that touches the DOM and the Spicetify globals. The other
// modules in src/ stay pure so they can be tested without a browser.
//
// An injection is a small feature (marquee, spectrum, title bar) that mounts
// into the display of the now playing bar. Each one runs in isolation: a
// throw is logged with the theme prefix and the next injection still runs.

/**
 * @typedef {object} Injection
 * @property {string} name
 * @property {(display: HTMLElement) => void} run
 * @property {(display: HTMLElement) => void} [cleanup]
 */

export const LOG_PREFIX = '[winamp-classic]';

// The display is the track info block that user.css turns into the LED
// panel. It only exists while something is playing.
export const DISPLAY_SELECTOR = '.main-nowPlayingBar-nowPlayingBar [data-testid="now-playing-widget"]';

// The stable parent of the bar. Spotify remounts the bar inside it in some
// flows, so this is what the observer watches.
export const BAR_SELECTOR = '[data-testid="now-playing-bar"]';

// The inner bar that holds the three columns. The outer testid element is an
// ASIDE container; this DIV is where bar-wide strips belong.
export const NOW_PLAYING_BAR_SELECTOR = '.main-nowPlayingBar-nowPlayingBar';

/** @returns {boolean} */
export function isSpicetifyReady() {
  return typeof Spicetify !== 'undefined' && Boolean(Spicetify.Player) && Boolean(Spicetify.Platform);
}

/**
 * Resolves once `isReady` reports true, polling on a timer. Rejects after
 * `timeoutMs` so a broken Spicetify never leaves the poll running forever.
 * @param {{ isReady?: () => boolean, intervalMs?: number, timeoutMs?: number }} [options]
 * @returns {Promise<void>}
 */
export function waitForSpicetify({ isReady = isSpicetifyReady, intervalMs = 100, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      if (isReady()) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`Spicetify not ready after ${Math.round(timeoutMs / 1000)}s`));
        return;
      }
      setTimeout(poll, intervalMs);
    };
    poll();
  });
}

/**
 * @param {ParentNode} [root]
 * @returns {HTMLElement | null}
 */
export function findDisplay(root = document) {
  return root.querySelector(DISPLAY_SELECTOR);
}

/**
 * Runs every injection against the display. Returns the ones whose `run` did
 * not throw, which is the set that later needs a cleanup.
 * @param {Injection[]} injections
 * @param {HTMLElement} display
 * @returns {Injection[]}
 */
export function runInjections(injections, display) {
  return injections.filter((injection) => {
    try {
      injection.run(display);
      return true;
    } catch (err) {
      console.warn(`${LOG_PREFIX} ${injection.name}:`, err);
      return false;
    }
  });
}

/**
 * @param {Injection[]} injections
 * @param {HTMLElement} display
 */
export function cleanupInjections(injections, display) {
  for (const injection of injections) {
    try {
      injection.cleanup?.(display);
    } catch (err) {
      console.warn(`${LOG_PREFIX} ${injection.name} cleanup:`, err);
    }
  }
}

/**
 * Mounts the injections into the display and keeps them mounted: a
 * MutationObserver on the bar re-runs them whenever the display element is
 * replaced, appears or goes away. Cleanup always runs before a new round, so
 * nothing gets duplicated.
 * @param {Injection[]} injections
 * @param {{ root?: Document }} [options]
 * @returns {{ remount: () => void, disconnect: () => void }}
 */
export function mount(injections, { root = document } = {}) {
  /** @type {HTMLElement | null} */
  let display = null;
  /** @type {Injection[]} */
  let mounted = [];

  const sync = () => {
    const next = findDisplay(root);
    if (next === display) return;
    if (display) cleanupInjections(mounted, display);
    display = next;
    mounted = display ? runInjections(injections, display) : [];
  };

  const bar = root.querySelector(BAR_SELECTOR);
  const observer = new MutationObserver(sync);
  observer.observe(bar ?? root.body, { childList: true, subtree: true });

  sync();
  if (!display) console.warn(`${LOG_PREFIX} display not found, waiting for it`);

  return { remount: sync, disconnect: () => observer.disconnect() };
}

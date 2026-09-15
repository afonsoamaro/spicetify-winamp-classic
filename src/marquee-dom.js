// @ts-check
// The DOM side of the marquee: an element next to Spotify's track info that
// shows the display text and scrolls it when it does not fit. user.css hides
// the track info while this element is present, so nothing React renders is
// ever rewritten and a remount is safe.
import { LOG_PREFIX } from './dom.js';
import { describeItem, displayText, scrollStep } from './marquee.js';

export const MARQUEE_CLASS = 'wa-marquee';
export const TICK_MS = 200;
export const DATA_POLL_MS = 250;
export const TRACK_INFO_SELECTOR = '.main-nowPlayingWidget-trackInfo';

/**
 * Width in pixels of `text` in the element's computed font. Silkscreen is
 * proportional, so this is the honest measure; the character count of the
 * visible window comes from the average width of the text being shown.
 * @param {HTMLElement} el
 * @param {string} text
 * @returns {number}
 */
export function canvasMeasure(el, text) {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 8;
  ctx.font = getComputedStyle(el).font;
  return ctx.measureText(text).width;
}

/**
 * The slice of Spicetify.Player the marquee uses, so tests can pass a fake.
 * @typedef {object} PlayerLike
 * @property {Partial<Spicetify.PlayerState>} [data]
 * @property {(type: string, callback: () => void) => void} addEventListener
 * @property {(type: string, callback: () => void) => void} removeEventListener
 */

/**
 * @param {{ measure?: (el: HTMLElement, text: string) => number, player?: () => PlayerLike }} [options]
 * @returns {import('./dom.js').Injection}
 */
export function createMarqueeInjection({ measure = canvasMeasure, player = () => Spicetify.Player } = {}) {
  /** @type {HTMLElement | null} */
  let el = null;
  // The text lives in one node whose data is rewritten in place. Assigning
  // textContent would replace the node, and that childList mutation makes
  // Spicetify's body observer rescan every element on the page (its version
  // gate misreads 1.3.x), which costs about half a core at five ticks a second.
  /** @type {Text | null} */
  let node = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let timer = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let pending = null;
  /** @type {ResizeObserver | null} */
  let resize = null;
  let text = '';
  let offset = 0;
  let width = 0;

  const stop = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };

  const tick = () => {
    if (!node) return;
    ({ view: node.data, offset } = scrollStep(text, offset, width));
  };

  // Decides between static text and scrolling from the element's current
  // width. Called on mount, on every song change and when the display resizes.
  const layout = () => {
    stop();
    if (!el || !node) return;
    const px = el.clientWidth;
    const needed = measure(el, text);
    // A zero width means the element is not laid out (hidden display, or a
    // test without layout): show the text whole and keep the timer off.
    if (px <= 0 || needed <= px) {
      node.data = text;
      return;
    }
    width = Math.max(1, Math.floor(px / (needed / text.length)));
    tick();
    timer = setInterval(tick, TICK_MS);
  };

  const refresh = () => {
    text = displayText(describeItem(player().data?.item));
    offset = 0;
    layout();
  };

  // Spicetify fills Player.data a moment after the bar renders and fires
  // songchange only when the track uri changes, so a mount that lands before
  // the data would show WINAMP until the next track. Poll until it is there.
  const waitForData = () => {
    if (pending !== null) clearInterval(pending);
    pending = setInterval(() => {
      if (!player().data?.item) return;
      if (pending !== null) clearInterval(pending);
      pending = null;
      refresh();
    }, DATA_POLL_MS);
  };

  return {
    name: 'marquee',
    run(display) {
      el = document.createElement('div');
      el.className = MARQUEE_CLASS;
      node = document.createTextNode('');
      el.append(node);
      const info = display.querySelector(TRACK_INFO_SELECTOR);
      if (info) info.insertAdjacentElement('afterend', el);
      else display.append(el);
      refresh();
      if (!player().data?.item) waitForData();
      player().addEventListener('songchange', refresh);
      if (typeof ResizeObserver !== 'undefined') {
        resize = new ResizeObserver(layout);
        resize.observe(display);
      }
    },
    cleanup() {
      stop();
      if (pending !== null) clearInterval(pending);
      pending = null;
      resize?.disconnect();
      resize = null;
      try {
        player().removeEventListener('songchange', refresh);
      } catch (err) {
        console.warn(`${LOG_PREFIX} marquee: could not remove the songchange listener`, err);
      }
      el?.remove();
      el = null;
      node = null;
    },
  };
}

// @ts-check
// The DOM side of the WINAMP title bar: a 14px decorative strip prepended to
// the now playing bar, with the word WINAMP centered and three inert squares
// on the right (minimize, shade, close), echoing the Winamp 2.x main window.
// user.css makes the bar the positioning context and grows it 14px, so the
// strip never covers the controls. Visual only: the squares have no handler.
import { BAR_SELECTOR, NOW_PLAYING_BAR_SELECTOR } from './dom.js';

export const TITLEBAR_CLASS = 'wa-titlebar';
export const TITLEBAR_TEXT = 'WINAMP';
export const SQUARES = 3;

/**
 * @returns {import('./dom.js').Injection}
 */
export function createTitlebarInjection() {
  /** @type {HTMLElement | null} */
  let el = null;

  return {
    name: 'titlebar',
    run(display) {
      // The inner bar when it is there (the outer testid element is an ASIDE
      // container, and the bar CSS only matches the inner DIV), the display
      // itself otherwise (miniplayer and fullscreen keep the widget but drop
      // the bar).
      const bar = display.closest(NOW_PLAYING_BAR_SELECTOR) ?? display.closest(BAR_SELECTOR) ?? display;
      if (bar.querySelector(`:scope > .${TITLEBAR_CLASS}`)) return;
      el = document.createElement('div');
      el.className = TITLEBAR_CLASS;
      // Decorative: nothing in it is worth announcing.
      el.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = TITLEBAR_TEXT;
      el.append(label);
      for (let i = 0; i < SQUARES; i += 1) {
        el.append(document.createElement('span'));
      }
      bar.prepend(el);
    },
    cleanup() {
      el?.remove();
      el = null;
    },
  };
}

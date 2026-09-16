/** @vitest-environment jsdom */
// @ts-check
import { afterEach, describe, expect, it } from 'vitest';
import { SQUARES, TITLEBAR_CLASS, TITLEBAR_TEXT, createTitlebarInjection } from '../src/titlebar-dom.js';

/** The display wrapped in the inner bar inside the ASIDE container, like the real footer. */
function makeBar() {
  document.body.innerHTML =
    '<aside data-testid="now-playing-bar"><div class="main-nowPlayingBar-nowPlayingBar"><div class="left"></div>' +
    '<div data-testid="now-playing-widget"><div class="main-nowPlayingWidget-trackInfo"></div></div></div></aside>';
  return /** @type {HTMLElement} */ (document.querySelector('.main-nowPlayingBar-nowPlayingBar'));
}

/** @param {ParentNode} bar */
const displayIn = (bar) =>
  /** @type {HTMLElement} */ (bar.querySelector('[data-testid="now-playing-widget"]'));

/** @param {ParentNode} bar */
const titlebar = (bar) => bar.querySelector(`:scope > .${TITLEBAR_CLASS}`);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createTitlebarInjection', () => {
  it('prepends one strip to the bar with the label and three squares', () => {
    const bar = makeBar();
    const injection = createTitlebarInjection();

    injection.run(displayIn(bar));

    const el = titlebar(bar);
    expect(el?.tagName).toBe('DIV');
    expect(bar.firstElementChild).toBe(el);
    expect(el?.getAttribute('aria-hidden')).toBe('true');
    const spans = [...(el?.querySelectorAll('span') ?? [])];
    expect(spans).toHaveLength(1 + SQUARES);
    expect(spans[0]?.textContent).toBe(TITLEBAR_TEXT);
    expect(spans.slice(1).every((s) => s.textContent === '')).toBe(true);
  });

  it('inserts only one strip even when it runs twice', () => {
    const bar = makeBar();
    const injection = createTitlebarInjection();

    injection.run(displayIn(bar));
    injection.run(displayIn(bar));

    expect(bar.querySelectorAll(`:scope > .${TITLEBAR_CLASS}`)).toHaveLength(1);
  });

  it('mounts on the inner bar, not on the ASIDE container', () => {
    document.body.innerHTML =
      '<aside data-testid="now-playing-bar"><div class="main-nowPlayingBar-nowPlayingBar">' +
      '<div data-testid="now-playing-widget"></div></div></aside>';
    const aside = /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-bar"]'));
    const inner = /** @type {HTMLElement} */ (aside.querySelector('.main-nowPlayingBar-nowPlayingBar'));
    const injection = createTitlebarInjection();

    injection.run(displayIn(aside));

    expect(inner.firstElementChild?.className).toBe(TITLEBAR_CLASS);
    expect(aside.firstElementChild).not.toBe(inner.firstElementChild);
  });

  it('falls back to the display when the bar ancestor is missing', () => {
    document.body.innerHTML = '<div data-testid="now-playing-widget"></div>';
    const display = /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-widget"]'));
    const injection = createTitlebarInjection();

    injection.run(display);

    expect(display.firstElementChild?.className).toBe(TITLEBAR_CLASS);
  });

  it('cleanup removes the strip', () => {
    const bar = makeBar();
    const injection = createTitlebarInjection();
    injection.run(displayIn(bar));

    injection.cleanup?.(displayIn(bar));

    expect(titlebar(bar)).toBeNull();
    expect(document.querySelector(`.${TITLEBAR_CLASS}`)).toBeNull();
  });
});

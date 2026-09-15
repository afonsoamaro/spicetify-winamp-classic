/** @vitest-environment jsdom */
// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA_POLL_MS, MARQUEE_CLASS, TICK_MS, createMarqueeInjection } from '../src/marquee-dom.js';
import { SEPARATOR } from '../src/marquee.js';

const QUEEN = { type: 'artist', uri: 'spotify:artist:1dfeR4HaWDbWqFHLkxsg1d', name: 'Queen' };
/** @type {Partial<Spicetify.PlayerTrack>} */
const SHORT = { name: 'Bohemian', artists: [QUEEN], duration: { milliseconds: 60000 } };
/** @type {Partial<Spicetify.PlayerTrack>} */
const LONG = { name: 'Spread Your Wings', artists: [QUEEN], duration: { milliseconds: 274000 } };

/**
 * Every character is 8 px wide, so a 80 px element shows 10 characters.
 * @param {HTMLElement} _el
 * @param {string} text
 */
const measure = (_el, text) => text.length * 8;

/** @typedef {(event?: Event) => void} Listener */

/**
 * A stand-in for Spicetify.Player that records its listeners.
 * @param {Partial<Spicetify.PlayerTrack> | undefined} item
 */
function fakePlayer(item) {
  /** @type {Map<string, Set<Listener>>} */
  const listeners = new Map();
  return {
    /** @type {Partial<Spicetify.PlayerState> | undefined} */
    data: item ? { item: /** @type {Spicetify.PlayerTrack} */ (item) } : undefined,
    /** @param {string} type @param {Listener} callback */
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(callback);
    },
    /** @param {string} type @param {Listener} callback */
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    /** @param {string} type */
    emit(type) {
      listeners.get(type)?.forEach((callback) => callback());
    },
    /** @param {string} type */
    count(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

/** Builds the display with Spotify's track info inside. */
function makeDisplay() {
  document.body.innerHTML =
    '<div data-testid="now-playing-widget"><div class="cover"></div>' +
    '<div class="main-nowPlayingWidget-trackInfo">spotify text</div><div class="actions"></div></div>';
  return /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-widget"]'));
}

const marquee = () => /** @type {HTMLElement | null} */ (document.querySelector(`.${MARQUEE_CLASS}`));

/**
 * jsdom has no layout, so the element gets a fixed clientWidth and the
 * injection is asked to lay out again through a songchange.
 * @param {ReturnType<typeof fakePlayer>} player
 * @param {number} px
 */
function setWidth(player, px) {
  const el = marquee();
  if (!el) throw new Error('marquee not mounted');
  Object.defineProperty(el, 'clientWidth', { value: px, configurable: true });
  player.emit('songchange');
}

/** @type {import('../src/dom.js').Injection | null} */
let injection = null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  injection?.cleanup?.(makeDisplay());
  injection = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('createMarqueeInjection', () => {
  it('mounts right after the track info and shows the text', () => {
    const display = makeDisplay();
    const player = fakePlayer(SHORT);
    injection = createMarqueeInjection({ measure, player: () => player });

    injection.run(display);

    const el = marquee();
    expect(el?.previousElementSibling?.className).toBe('main-nowPlayingWidget-trackInfo');
    expect(el?.textContent).toBe('QUEEN - BOHEMIAN (1:00)');
    expect(player.count('songchange')).toBe(1);
  });

  it('rewrites one text node in place instead of replacing children', () => {
    const display = makeDisplay();
    const player = fakePlayer(LONG);
    injection = createMarqueeInjection({ measure, player: () => player });
    injection.run(display);
    const node = marquee()?.firstChild;
    setWidth(player, 80);

    vi.advanceTimersByTime(TICK_MS * 3);

    expect(marquee()?.childNodes).toHaveLength(1);
    expect(marquee()?.firstChild).toBe(node);
    expect(node?.nodeType).toBe(Node.TEXT_NODE);
  });

  it('keeps short text still and runs no timer', () => {
    const display = makeDisplay();
    const player = fakePlayer(SHORT);
    injection = createMarqueeInjection({ measure, player: () => player });
    injection.run(display);
    setWidth(player, 'QUEEN - BOHEMIAN (1:00)'.length * 8);

    vi.advanceTimersByTime(TICK_MS * 5);

    expect(marquee()?.textContent).toBe('QUEEN - BOHEMIAN (1:00)');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the text whole and runs no timer while the element has no width', () => {
    const display = makeDisplay();
    const player = fakePlayer(LONG);
    injection = createMarqueeInjection({ measure, player: () => player });

    injection.run(display);

    expect(marquee()?.textContent).toBe('QUEEN - SPREAD YOUR WINGS (4:34)');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('scrolls long text one character per tick with the separator', () => {
    const display = makeDisplay();
    const player = fakePlayer(LONG);
    injection = createMarqueeInjection({ measure, player: () => player });
    injection.run(display);
    setWidth(player, 80);

    const full = 'QUEEN - SPREAD YOUR WINGS (4:34)';
    expect(marquee()?.textContent).toBe(full.slice(0, 10));
    vi.advanceTimersByTime(TICK_MS);
    expect(marquee()?.textContent).toBe(full.slice(1, 11));
    vi.advanceTimersByTime(TICK_MS * (full.length - 4));
    expect(marquee()?.textContent).toBe(`${full.slice(-3)}${SEPARATOR}`);
  });

  it('restarts from the new item on songchange', () => {
    const display = makeDisplay();
    const player = fakePlayer(LONG);
    injection = createMarqueeInjection({ measure, player: () => player });
    injection.run(display);
    setWidth(player, 80);
    vi.advanceTimersByTime(TICK_MS * 3);

    player.data = { item: /** @type {Spicetify.PlayerTrack} */ (SHORT) };
    player.emit('songchange');

    // Still 80 px wide, so the new text scrolls too, but from offset zero.
    expect(marquee()?.textContent).toBe('QUEEN - BO');
    vi.advanceTimersByTime(TICK_MS);
    expect(marquee()?.textContent).toBe('UEEN - BOH');
  });

  it('shows WINAMP when the player has no data', () => {
    const display = makeDisplay();
    const player = fakePlayer(undefined);
    injection = createMarqueeInjection({ measure, player: () => player });

    injection.run(display);

    expect(marquee()?.textContent).toBe('WINAMP');
  });

  it('picks the item up when the player data arrives after the mount', () => {
    const display = makeDisplay();
    const player = fakePlayer(undefined);
    injection = createMarqueeInjection({ measure, player: () => player });
    injection.run(display);

    vi.advanceTimersByTime(DATA_POLL_MS * 2);
    expect(marquee()?.textContent).toBe('WINAMP');

    player.data = { item: /** @type {Spicetify.PlayerTrack} */ (SHORT) };
    vi.advanceTimersByTime(DATA_POLL_MS);

    expect(marquee()?.textContent).toBe('QUEEN - BOHEMIAN (1:00)');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('appends to the display when the track info is missing', () => {
    document.body.innerHTML = '<div data-testid="now-playing-widget"></div>';
    const display = /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-widget"]'));
    const player = fakePlayer(SHORT);
    injection = createMarqueeInjection({ measure, player: () => player });

    injection.run(display);

    expect(marquee()?.parentElement).toBe(display);
  });

  it('cleanup removes the element, the timer and the listener', () => {
    const display = makeDisplay();
    const player = fakePlayer(LONG);
    injection = createMarqueeInjection({ measure, player: () => player });
    injection.run(display);
    setWidth(player, 80);

    injection.cleanup?.(display);

    expect(marquee()).toBeNull();
    expect(player.count('songchange')).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

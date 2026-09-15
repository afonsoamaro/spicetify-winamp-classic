// @ts-check
// Text of the display and the scroll step. Pure, no DOM: the DOM side that
// measures the display and drives the timer lives in marquee-dom.js.
import { formatTime } from './time.js';

// Winamp put this between the end of the text and its next lap.
export const SEPARATOR = '  ***  ';

/**
 * @typedef {object} Track
 * @property {string} artist
 * @property {string} title
 * @property {number} durationMs
 */

/**
 * Reduces Spicetify's player item to what the display needs. Every read is
 * optional so a missing item, a podcast without artists or a local file
 * without metadata still yields something to show.
 * @param {Partial<Spicetify.PlayerTrack> | undefined | null} item
 * @returns {Track}
 */
export function describeItem(item) {
  const artists = item?.artists?.map((artist) => artist.name).filter(Boolean) ?? [];
  return {
    artist: artists.length > 0 ? artists.join(', ') : (item?.metadata?.artist_name ?? ''),
    title: item?.name ?? item?.metadata?.title ?? '',
    durationMs: item?.duration?.milliseconds ?? 0,
  };
}

/**
 * `ARTIST - TITLE (m:ss)`, uppercase. Without an artist only the title; with
 * nothing at all, the word WINAMP, which is what an idle Winamp showed.
 * @param {Track} track
 * @returns {string}
 */
export function displayText({ artist, title, durationMs }) {
  const a = artist.trim();
  const t = title.trim();
  const base = a && t ? `${a} - ${t}` : t || a || 'WINAMP';
  const time = durationMs > 0 ? ` (${formatTime(durationMs)})` : '';
  return `${base}${time}`.toUpperCase();
}

/**
 * The window of `width` characters visible at `offset`, and the offset for
 * the next step. Text that fits is returned whole with the offset pinned at
 * zero; text that does not fit scrolls through `text + SEPARATOR` and wraps.
 * @param {string} text
 * @param {number} offset
 * @param {number} width
 * @returns {{ view: string, offset: number }}
 */
export function scrollStep(text, offset, width) {
  if (width <= 0) return { view: '', offset: 0 };
  if (text.length <= width) return { view: text, offset: 0 };
  const loop = text + SEPARATOR;
  const start = offset % loop.length;
  return { view: (loop + loop).slice(start, start + width), offset: (start + 1) % loop.length };
}

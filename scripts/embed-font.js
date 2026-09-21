// @ts-check
// Rewrites the @font-face block in user.css from the woff2 files in assets/.
// The font is inlined as a data URI so the theme works the same whether it is
// loaded from disk or installed from the Marketplace, which rewrites relative
// url() paths to a CDN.
//
// Run with `pnpm embed:font` after changing anything in assets/.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isMain, repoRoot } from './lib/main.js';
import { replaceBlock as replaceBetween } from './lib/markers.js';

export const START = '/* @font-face:start */';
export const END = '/* @font-face:end */';

// The latin subset published by Google Fonts. Anything outside it falls back
// to the monospace stack in --wa-font-pixel.
export const LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

/** @type {{ weight: number, file: string }[]} */
export const FONTS = [
  { weight: 400, file: 'silkscreen-regular.woff2' },
  { weight: 700, file: 'silkscreen-bold.woff2' },
];

/**
 * Builds the @font-face rules for the given fonts.
 * `font-display: swap`, not block. Block was the first choice, on the theory
 * that an inline font has no network wait to swap away from. In Spotify it
 * left every styled label blank instead: the block period starts and the
 * swap never becomes visible. Swap renders the fallback and replaces it.
 * @param {{ weight: number, bytes: Uint8Array }[]} fonts
 * @returns {string}
 */
export function fontFaceBlock(fonts) {
  return fonts
    .map(({ weight, bytes }) => {
      const base64 = Buffer.from(bytes).toString('base64');
      return [
        '@font-face {',
        '  font-family: Silkscreen;',
        '  font-style: normal;',
        `  font-weight: ${weight};`,
        '  font-display: swap;',
        `  src: url("data:font/woff2;base64,${base64}") format("woff2");`,
        `  unicode-range: ${LATIN_RANGE};`,
        '}',
      ].join('\n');
    })
    .join('\n\n');
}

/**
 * Replaces the @font-face block between the markers, keeping the markers.
 * @param {string} css
 * @param {string} block
 * @returns {string}
 */
export function replaceBlock(css, block) {
  return replaceBetween(css, block, { start: START, end: END });
}

/**
 * @param {{ assetsDir: string, cssFile: string }} options
 * @returns {Promise<string>} the written CSS
 */
export async function embed({ assetsDir, cssFile }) {
  const fonts = await Promise.all(
    FONTS.map(async ({ weight, file }) => ({
      weight,
      bytes: await readFile(path.join(assetsDir, file)),
    })),
  );
  const css = await readFile(cssFile, 'utf8');
  const output = replaceBlock(css, fontFaceBlock(fonts));
  await writeFile(cssFile, output);
  return output;
}

if (isMain(import.meta.url)) {
  const root = repoRoot(import.meta.url);
  await embed({ assetsDir: path.join(root, 'assets'), cssFile: path.join(root, 'user.css') });
}

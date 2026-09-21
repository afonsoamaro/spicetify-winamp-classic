// @ts-check
// Rewrites the colour-scheme block in user.css from the first scheme in
// color.ini, as the same --spice-* / --spice-rgb-* variables Spicetify and
// the Marketplace derive from that file.
//
// Spicetify injects them itself, so the copy is redundant in the normal
// case. It exists for a Marketplace bug: installing a theme that has
// `include` (this one loads theme.js) over a theme already installed nulls
// the new theme's active scheme, and the Marketplace's boot code has no
// fallback, so the page keeps Spotify's stock colours. With the block here
// the theme is complete on its own. The Marketplace appends its scheme
// style after user.css, so when it does work it still wins.
//
// Run with `pnpm embed:scheme` after changing color.ini.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isMain, repoRoot } from './lib/main.js';
import { replaceBlock } from './lib/markers.js';

export const START = '/* @scheme:start */';
export const END = '/* @scheme:end */';

/** @typedef {{ name: string, colors: Record<string, string> }} Scheme */

/**
 * Parses the first `[section]` of a Spicetify color.ini into its colours.
 * Values are six hex digits without `#`, the format Spicetify expects.
 * @param {string} ini
 * @returns {Scheme}
 */
export function parseScheme(ini) {
  /** @type {Scheme | null} */
  let scheme = null;
  for (const raw of ini.split('\n')) {
    const line = raw.replace(/;.*$/, '').trim();
    if (line === '') continue;
    const section = line.match(/^\[(.+)\]$/);
    if (section) {
      if (scheme) break;
      scheme = { name: section[1] ?? '', colors: {} };
      continue;
    }
    if (!scheme) continue;
    const [key, value] = line.split('=').map((part) => part.trim());
    if (!key || value === undefined || !/^[0-9a-fA-F]{6}$/.test(value)) {
      throw new Error(`color.ini: "${key ?? line}" must be six hex digits, got "${value ?? ''}"`);
    }
    scheme.colors[key] = value;
  }
  if (!scheme) throw new Error('color.ini has no [scheme] section');
  return scheme;
}

/**
 * The :root block Spicetify would generate for the scheme.
 * @param {Scheme} scheme
 * @returns {string}
 */
export function schemeBlock({ colors }) {
  const lines = Object.entries(colors).flatMap(([key, hex]) => {
    const lower = hex.toLowerCase();
    const rgb = [0, 2, 4].map((i) => parseInt(lower.slice(i, i + 2), 16)).join(', ');
    return [`  --spice-${key}: #${lower};`, `  --spice-rgb-${key}: ${rgb};`];
  });
  return [`:root {`, ...lines, '}'].join('\n');
}

/**
 * @param {{ iniFile: string, cssFile: string }} options
 * @returns {Promise<string>} the written CSS
 */
export async function embed({ iniFile, cssFile }) {
  const scheme = parseScheme(await readFile(iniFile, 'utf8'));
  const css = await readFile(cssFile, 'utf8');
  const output = replaceBlock(css, schemeBlock(scheme), { start: START, end: END });
  await writeFile(cssFile, output);
  return output;
}

if (isMain(import.meta.url)) {
  const root = repoRoot(import.meta.url);
  await embed({ iniFile: path.join(root, 'color.ini'), cssFile: path.join(root, 'user.css') });
}

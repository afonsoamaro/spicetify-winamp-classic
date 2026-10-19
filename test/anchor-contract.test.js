// @ts-check
// The rule behind FN-21 and FN-23, as a test: what a selector of the theme
// hangs on has to be something Spotify keeps. The readable main-* names are
// not Spotify's (they come from the Spicetify class map, which does not cover
// every Spotify version) and the hashed ones change with every build, so a new
// selector on either fails here, before it ships. Anchor on data-testid,
// data-encore-id, ARIA, roles, native elements or structure instead.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractClasses } from '../scripts/compat-check.js';

const root = path.resolve(import.meta.dirname, '..');

/** The theme's own classes and Encore's design system ones, whose build number changes. */
const OWN_OR_ENCORE = /^(?:wa-|e-\d+-|encore-)/;

/**
 * Classes that are not the theme's, not Encore's and not mapped, each with the
 * reason it is allowed. Add to this list only for a readable class that belongs
 * to Spotify itself, to its own libraries or to the Marketplace, never for one
 * from the Spicetify class map or a hash.
 * @type {Record<string, string>}
 */
const ALLOWED = {
  'main-view-container': "Spotify's own class for the page area; it is in the bundle as written, not mapped",
  GenericModal: "Spotify's own modal, a readable BEM name present in the bundle",
  GenericModal__overlay: "the same modal's backdrop",
  'os-scrollbar-handle': 'OverlayScrollbars, the library Spotify draws its scrollbars with',
  'os-scrollbar-track': 'OverlayScrollbars, as above',
  'marketplace-tabBar-active': "the Spicetify Marketplace's own markup, an extension and not Spotify",
  'marketplace-tabBar-headerItemLink': 'the Marketplace again',
};

async function themeClasses() {
  const srcDir = path.join(root, 'src');
  const scripts = await Promise.all(
    (await readdir(srcDir)).filter((name) => name.endsWith('.js')).map((name) => readFile(path.join(srcDir, name), 'utf8')),
  );
  return extractClasses({ css: await readFile(path.join(root, 'user.css'), 'utf8'), scripts });
}

describe('the anchor contract', () => {
  it('hangs every selector on the theme, Encore or a listed class, never on a mapped or hashed one', async () => {
    const strangers = (await themeClasses()).filter((name) => !OWN_OR_ENCORE.test(name) && !(name in ALLOWED));
    expect(
      strangers,
      'these classes are not Spotify-stable: use data-testid, data-encore-id, ARIA, a role or structure (see the comment at the top of this file)',
    ).toEqual([]);
  });

  it('keeps the allow list honest: every entry is still used by a selector', async () => {
    const used = new Set(await themeClasses());
    expect(Object.keys(ALLOWED).filter((name) => !used.has(name))).toEqual([]);
  });
});

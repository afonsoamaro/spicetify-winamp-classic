// @ts-check
// Checks the theme's anchors in Spotify's markup against a Spotify bundle, so
// a release that breaks the theme is found before anyone opens the app.
//
// An anchor is what a selector in user.css or src/*.js hangs on:
//   - data-testid and data-encore-id values, which Spotify itself keeps;
//   - mapped class names (main-*, x-*, Root__*, player-controls__*), which
//     are not Spotify's. Spicetify maps hashed classes to readable ones from
//     its css-map.json, and only for the Spotify versions it was updated for.
//
// The bundle is Spotify's xpui (the folder, or the xpui.spa it ships in). A
// testid has to appear in it as a quoted string (or as the tail of a template
// literal, for the ids Spotify builds at runtime). Encore ids cannot be checked
// this way: the Encore library is loaded at runtime and is not in the bundle
// (a bundle Spicetify patched has them only because Spicetify injects them),
// so they are listed as unchecked, never as missing. A mapped class is
// present when its name is there already (a bundle Spicetify patched) or when
// a hash that the class map sends to that name is (a raw bundle): the same
// condition Spicetify applies when it patches.
//
// Run with `pnpm compat <xpui dir or .spa> [--css-map <file|url>]
// [--version <x.y.z>] [--out <report.md>]`. Exits 1 when any anchor is missing.
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isMain, repoRoot } from './lib/main.js';

export const CSS_MAP_URL = 'https://raw.githubusercontent.com/spicetify/cli/main/css-map.json';

const TESTID = /\[data-testid=["']?([\w-]+)["']?\]/g;
const ENCORE_ID = /\[data-encore-id=["']?([\w-]+)["']?\]/g;
const CLASS = /\.([A-Za-z_][\w-]*)/g;
const SCRIPT_CLASS = /(?:^|[\s>+~,)\]])\.([A-Za-z_][\w-]*)/gm;
// The names the Spicetify class map produces. The theme's own classes (wa-*)
// and Encore's generated ones (e-*, encore-*) are not part of it.
const MAPPED = /^(?:main-[A-Za-z]+-|x-[A-Za-z]+-|Root__|player-controls__|progress-bar)/;

/**
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * The selector text of a stylesheet: what comes before each `{`.
 * @param {string} css
 * @returns {string}
 */
function cssSelectors(css) {
  return [...stripComments(css).matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1] ?? '')
    .filter((text) => !text.trim().startsWith('@'))
    .join('\n');
}

/**
 * The quoted strings of a script: where its selectors live.
 * @param {string} js
 * @returns {string}
 */
function jsStrings(js) {
  return [...stripComments(js).matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((match) => match[2] ?? '').join('\n');
}

/**
 * @param {string} text
 * @param {RegExp} pattern
 * @returns {Set<string>}
 */
function collect(text, pattern) {
  return new Set([...text.matchAll(pattern)].map((match) => match[1] ?? ''));
}

/**
 * Every class a selector of the theme hangs on, mapped or not.
 * @param {{ css: string, scripts: string[] }} sources
 * @returns {string[]}
 */
export function extractClasses({ css, scripts }) {
  // In a stylesheet a class may follow an element (a.nav-link). In a script's
  // strings it only counts at the start or after a space or a combinator, so
  // file names (dom.js) and property paths (error.message) are not read as one.
  const fromScripts = scripts.map(jsStrings).join('\n');
  return [...new Set([...collect(cssSelectors(css), CLASS), ...collect(fromScripts, SCRIPT_CLASS)])].sort();
}

/**
 * Every anchor the theme depends on.
 * @param {{ css: string, scripts: string[] }} sources
 * @returns {{ testids: string[], encoreIds: string[], mapped: string[] }}
 */
export function extractAnchors({ css, scripts }) {
  const text = [cssSelectors(css), ...scripts.map(jsStrings)].join('\n');
  const classes = [...collect(text, CLASS)].filter((name) => MAPPED.test(name));
  return {
    testids: [...collect(text, TESTID)].sort(),
    encoreIds: [...collect(text, ENCORE_ID)].sort(),
    mapped: classes.sort(),
  };
}

/**
 * Which anchors the bundle has and which it lacks.
 * @param {{ testids: string[], encoreIds: string[], mapped: string[] }} anchors
 * @param {string} bundle every script and stylesheet of the bundle, joined
 * @param {Record<string, string>} cssMap hash to readable name
 * @returns {{ missing: { testids: string[], mapped: string[] }, unchecked: string[], total: number }}
 */
export function checkAnchors(anchors, bundle, cssMap) {
  /** @type {Map<string, string[]>} */
  const hashes = new Map();
  for (const [hash, name] of Object.entries(cssMap)) hashes.set(name, [...(hashes.get(name) ?? []), hash]);

  const literal = (/** @type {string} */ value) => bundle.includes(value);
  // A testid is a whole string in the bundle, so it is matched between quotes:
  // a bare substring would let "bar" pass on "now-playing-bar".
  const quoted = (/** @type {string} */ value) => ['"', "'", '`'].some((quote) => bundle.includes(`${quote}${value}${quote}`));
  // Some ids are built from a template, like `${type}-image` for playlist-image,
  // so no quoted literal exists. The id counts as present when the bundle has a
  // template literal with the same suffix or the same prefix at a dash.
  const escape = (/** @type {string} */ text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const templated = (/** @type {string} */ value) =>
    [...value.matchAll(/-/g)].some(({ index = 0 }) =>
      new RegExp(`\`\\$\\{[^}]*\\}${escape(value.slice(index))}\``).test(bundle) ||
      new RegExp(`\`${escape(value.slice(0, index + 1))}\\$\\{[^}]*\\}[^\`]*\``).test(bundle),
    );
  const mapped = (/** @type {string} */ name) => literal(name) || (hashes.get(name) ?? []).some(literal);
  return {
    missing: {
      testids: anchors.testids.filter((id) => !quoted(id) && !templated(id)),
      mapped: anchors.mapped.filter((name) => !mapped(name)),
    },
    unchecked: anchors.encoreIds,
    total: anchors.testids.length + anchors.mapped.length,
  };
}

/**
 * @param {{ missing: { testids: string[], mapped: string[] } }} result
 * @returns {number}
 */
export function missingCount({ missing }) {
  return missing.testids.length + missing.mapped.length;
}

/**
 * A short Markdown report, written to be read as an issue body.
 * @param {{ missing: { testids: string[], mapped: string[] }, unchecked: string[], total: number }} result
 * @param {{ version?: string }} [options]
 * @returns {string}
 */
export function renderReport(result, { version } = {}) {
  const count = missingCount(result);
  const lines = [`# Spotify ${version ?? '(unknown version)'}: ${count} of ${result.total} anchors missing`, ''];
  const section = (/** @type {string} */ title, /** @type {string} */ note, /** @type {string[]} */ names) => {
    if (names.length === 0) return;
    lines.push(`## ${title} (${names.length})`, '', note, '', ...names.map((name) => `- \`${name}\``), '');
  };
  section(
    'Test ids',
    'Spotify keeps these on purpose, so a miss here is a real change in its markup.',
    result.missing.testids.map((id) => `[data-testid="${id}"]`),
  );
  section(
    'Mapped classes',
    'Names from the Spicetify class map, not from Spotify. They stop matching when the map does not cover this Spotify version.',
    result.missing.mapped.map((name) => `.${name}`),
  );
  if (count === 0) lines.push('Every anchor the theme depends on is present.', '');
  section(
    'Not checked',
    'Encore ids live in a library Spotify loads at runtime, so the bundle cannot confirm them. Check them on screen.',
    result.unchecked.map((id) => `[data-encore-id="${id}"]`),
  );
  return lines.join('\n');
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function bundleFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((entry) => entry.isFile() && /\.(js|css)$/.test(entry.name)).map((entry) => path.join(entry.parentPath, entry.name));
}

/**
 * Reads a bundle from a folder or from the .spa archive (a zip) it ships in.
 * @param {string} location
 * @returns {Promise<string>}
 */
export async function readBundle(location) {
  let dir = location;
  let temp = '';
  if (location.endsWith('.spa')) {
    temp = await mkdtemp(path.join(tmpdir(), 'winamp-xpui-'));
    // Spotify's archive has an entry with an absolute path, which unzip strips
    // with a warning and a non-zero exit after extracting everything else, so
    // its exit code says nothing; what was extracted does (checked below).
    const unzip = spawnSync('unzip', ['-q', '-o', location, '-d', temp], { encoding: 'utf8' });
    if (unzip.error) {
      await rm(temp, { recursive: true, force: true });
      throw new Error(`unzip ${location}: ${unzip.error.message}`);
    }
    dir = temp;
  }
  try {
    const files = await bundleFiles(dir);
    if (files.length === 0) throw new Error(`no scripts or stylesheets found in ${location}`);
    const parts = await Promise.all(files.map((file) => readFile(file, 'utf8')));
    return parts.join('\n');
  } finally {
    if (temp) await rm(temp, { recursive: true, force: true });
  }
}

/**
 * @param {string} source a file path or an http(s) URL
 * @returns {Promise<Record<string, string>>}
 */
async function loadCssMap(source) {
  if (!/^https?:/.test(source)) return JSON.parse(await readFile(source, 'utf8'));
  const response = await fetch(source);
  if (!response.ok) throw new Error(`css-map: ${source} answered ${response.status}`);
  return /** @type {Record<string, string>} */ (await response.json());
}

/**
 * @param {string[]} args
 * @returns {{ bundle: string, cssMap: string, version: string | undefined, out: string | undefined }}
 */
export function parseArgs(args) {
  const flags = new Map();
  const rest = [];
  // pnpm 12 hands a bare `--` on to the script; it separates nothing here.
  const words = args.filter((arg) => arg !== '--');
  for (let i = 0; i < words.length; i += 1) {
    const arg = words[i] ?? '';
    if (arg.startsWith('--')) flags.set(arg, words[++i]);
    else rest.push(arg);
  }
  if (rest.length !== 1) throw new Error('usage: compat-check <xpui dir or .spa> [--css-map <file|url>] [--version <x.y.z>] [--out <report.md>]');
  return { bundle: /** @type {string} */ (rest[0]), cssMap: flags.get('--css-map') ?? CSS_MAP_URL, version: flags.get('--version'), out: flags.get('--out') };
}

async function main() {
  const root = repoRoot(import.meta.url);
  const options = parseArgs(process.argv.slice(2));
  const srcDir = path.join(root, 'src');
  const scripts = await Promise.all((await readdir(srcDir)).filter((name) => name.endsWith('.js')).map((name) => readFile(path.join(srcDir, name), 'utf8')));
  const anchors = extractAnchors({ css: await readFile(path.join(root, 'user.css'), 'utf8'), scripts });
  const result = checkAnchors(anchors, await readBundle(options.bundle), await loadCssMap(options.cssMap));
  const report = renderReport(result, { version: options.version });
  if (options.out) await writeFile(options.out, report);
  process.stdout.write(`${report}\n`);
  process.exitCode = missingCount(result) === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`compat-check: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  });
}

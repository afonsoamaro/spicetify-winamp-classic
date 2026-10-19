// @ts-check
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { badgeJson, checkAnchors, extractAnchors, extractClasses, missingCount, parseArgs, readBundle, renderReport } from '../scripts/compat-check.js';

/** @type {string[]} */
const dirs = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const CSS = `
/* .main-commented-out [data-testid="in-a-comment"] */
.main-nowPlayingBar-nowPlayingBar [data-testid="player-controls"] button,
.wa-titlebar span,
.e-10860-legacy-button[data-encore-id="buttonPrimary"] { color: red; content: ".main-in-a-value"; }
@media (min-width: 1px) { .x-progressBar-fillColor { color: blue; } }
`;
const SCRIPT = `
// '.main-in-a-line-comment'
export const SELECTOR = '.main-trackInfo-name [data-testid="now-playing-widget"]';
const note = 'not a selector at all';
`;

describe('extractAnchors', () => {
  const anchors = extractAnchors({ css: CSS, scripts: [SCRIPT] });

  it('finds testids and encore ids in selectors', () => {
    expect(anchors.testids).toEqual(['now-playing-widget', 'player-controls']);
    expect(anchors.encoreIds).toEqual(['buttonPrimary']);
  });

  it('finds mapped classes in stylesheets and script strings, and only those', () => {
    expect(anchors.mapped).toEqual(['main-nowPlayingBar-nowPlayingBar', 'main-trackInfo-name', 'x-progressBar-fillColor']);
  });

  it('ignores comments and declaration values', () => {
    const all = JSON.stringify(anchors);
    expect(all).not.toContain('commented-out');
    expect(all).not.toContain('in-a-comment');
    expect(all).not.toContain('in-a-value');
    expect(all).not.toContain('line-comment');
  });
});

describe('extractClasses', () => {
  it('lists every class of a selector, mapped or not, once', () => {
    const classes = extractClasses({ css: CSS, scripts: [SCRIPT] });
    expect(classes).toEqual(
      expect.arrayContaining(['main-nowPlayingBar-nowPlayingBar', 'wa-titlebar', 'e-10860-legacy-button', 'x-progressBar-fillColor', 'main-trackInfo-name']),
    );
    expect(new Set(classes).size).toBe(classes.length);
  });

  it('ignores comments, declaration values and strings that are not selectors', () => {
    const classes = extractClasses({ css: CSS, scripts: [SCRIPT] });
    expect(classes).not.toContain('main-commented-out');
    expect(classes).not.toContain('main-in-a-value');
    expect(classes).not.toContain('main-in-a-line-comment');
  });

  it('does not read file names or property paths in a script as classes', () => {
    const scripts = [`import './dom.js'; const m = error.message; const sel = '.wa-box .wa-inner'; const x = Math.round(1);`];
    expect(extractClasses({ css: '', scripts })).toEqual(['wa-box', 'wa-inner']);
  });
});

describe('checkAnchors', () => {
  const anchors = { testids: ['now-playing-bar', 'bar'], encoreIds: ['buttonPrimary'], mapped: ['main-x-one', 'main-x-two', 'main-x-three'] };
  const cssMap = { H1hashhashhashhash: 'main-x-one', H2hashhashhashhash: 'main-x-two' };

  it('counts literals, class names and mapped hashes as present', () => {
    const bundle = '"data-testid":"now-playing-bar" data-encore-id:"buttonPrimary" class:"main-x-three" class:"H1hashhashhashhash"';
    const result = checkAnchors(anchors, bundle, cssMap);
    expect(result.missing).toEqual({ testids: ['bar'], mapped: ['main-x-two'] });
    expect(result.total).toBe(5);
    expect(missingCount(result)).toBe(2);
  });

  it('counts an id built by a template literal as present, by suffix or by prefix', () => {
    const bundle = '"data-testid":`${kind}-image` "data-testid":`entity-${slot}`';
    const result = checkAnchors({ testids: ['playlist-image', 'entity-title', 'playlist-banner'], encoreIds: [], mapped: [] }, bundle, {});
    expect(result.missing.testids).toEqual(['playlist-banner']);
  });

  it('lists encore ids as unchecked instead of missing, even when the bundle has none', () => {
    const result = checkAnchors(anchors, '', cssMap);
    expect(result.unchecked).toEqual(['buttonPrimary']);
    expect(result.missing.testids).toEqual(['now-playing-bar', 'bar']);
  });

  it('reports a mapped class missing when the map has no hash for it', () => {
    const result = checkAnchors({ testids: [], encoreIds: [], mapped: ['main-x-new'] }, 'anything', cssMap);
    expect(result.missing.mapped).toEqual(['main-x-new']);
  });
});

describe('renderReport', () => {
  it('headlines the count and lists each missing anchor by kind', () => {
    const report = renderReport(
      { missing: { testids: ['a'], mapped: ['main-x-two'] }, unchecked: ['buttonPrimary'], total: 10 },
      { version: '1.3.5.3058' },
    );
    expect(report).toContain('# Spotify 1.3.5.3058: 2 of 10 anchors missing');
    expect(report).toContain('- `[data-testid="a"]`');
    expect(report).toContain('- `.main-x-two`');
    expect(report).toContain('## Not checked (1)');
    expect(report).toContain('- `[data-encore-id="buttonPrimary"]`');
  });

  it('says so when nothing is missing', () => {
    const report = renderReport({ missing: { testids: [], mapped: [] }, unchecked: [], total: 3 });
    expect(report).toContain('0 of 3 anchors missing');
    expect(report).toContain('Every anchor the theme depends on is present.');
  });
});

describe('badgeJson', () => {
  it('shows the version, cut to three parts, in green when nothing is missing', () => {
    expect(badgeJson({ version: '1.3.5.3058', missing: 0 })).toEqual({
      schemaVersion: 1,
      label: 'Spotify',
      message: '1.3.5',
      color: '00b800',
      labelColor: '14141c',
    });
  });

  it('says broken, in red, when an anchor is missing', () => {
    expect(badgeJson({ version: '1.3.6.100', missing: 2 })).toMatchObject({ message: '1.3.6 broken', color: 'd93f0b' });
  });
});

describe('parseArgs', () => {
  it('takes one bundle path and the optional flags', () => {
    expect(parseArgs(['xpui', '--version', '1.3.5', '--out', 'r.md', '--css-map', 'map.json', '--badge', 'b.json'])).toMatchObject({
      badge: 'b.json',
      bundle: 'xpui',
      version: '1.3.5',
      out: 'r.md',
      cssMap: 'map.json',
    });
  });

  it('ignores the bare -- pnpm passes on', () => {
    expect(parseArgs(['--', 'xpui', '--version', '1.3.5'])).toMatchObject({ bundle: 'xpui', version: '1.3.5' });
  });

  it('refuses a missing or extra bundle path', () => {
    expect(() => parseArgs([])).toThrow(/usage/);
    expect(() => parseArgs(['a', 'b'])).toThrow(/usage/);
  });
});

describe('readBundle', () => {
  it('joins the scripts and stylesheets of a folder, nested ones included', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'winamp-compat-'));
    dirs.push(dir);
    await mkdir(path.join(dir, 'sub'));
    await writeFile(path.join(dir, 'a.js'), 'alpha');
    await writeFile(path.join(dir, 'sub', 'b.css'), 'beta');
    await writeFile(path.join(dir, 'c.png'), 'gamma');
    const bundle = await readBundle(dir);
    expect(bundle).toContain('alpha');
    expect(bundle).toContain('beta');
    expect(bundle).not.toContain('gamma');
  });

  it('refuses a folder with nothing to check, so an empty extraction cannot pass as clean', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'winamp-compat-'));
    dirs.push(dir);
    await expect(readBundle(dir)).rejects.toThrow(/no scripts or stylesheets/);
  });
});

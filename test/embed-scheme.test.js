// @ts-check
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { embed, END, parseScheme, schemeBlock, START } from '../scripts/embed-scheme.js';

/** @type {string[]} */
const dirs = [];

async function tempDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'winamp-scheme-'));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const INI = [
  '; a comment',
  '',
  '[Classic]',
  'text     = 00FF00',
  'main     = 000000 ; trailing comment',
  'selected-row=0000C6',
  '',
  '[Other]',
  'text = FFFFFF',
].join('\n');

describe('parseScheme', () => {
  it('returns the first scheme with its name and hex values', () => {
    expect(parseScheme(INI)).toEqual({
      name: 'Classic',
      colors: { text: '00FF00', main: '000000', 'selected-row': '0000C6' },
    });
  });

  it('throws when the file has no scheme section', () => {
    expect(() => parseScheme('; nothing here\n')).toThrow('no [scheme] section');
  });

  it('throws on a value that is not six hex digits', () => {
    expect(() => parseScheme('[X]\ntext = #00FF00')).toThrow('text');
  });
});

describe('schemeBlock', () => {
  it('emits the --spice and --spice-rgb pair for every colour, wrapped in :root', () => {
    const block = schemeBlock({ name: 'Classic', colors: { text: '00FF00', 'selected-row': '0000c6' } });

    expect(block).toContain(':root {');
    expect(block).toContain('--spice-text: #00ff00;');
    expect(block).toContain('--spice-rgb-text: 0, 255, 0;');
    expect(block).toContain('--spice-selected-row: #0000c6;');
    expect(block).toContain('--spice-rgb-selected-row: 0, 0, 198;');
  });

  it('keeps the colours in the order given', () => {
    const block = schemeBlock({ name: 'X', colors: { b: '000000', a: 'ffffff' } });

    expect(block.indexOf('--spice-b')).toBeLessThan(block.indexOf('--spice-a'));
  });
});

describe('embed', () => {
  it('writes the block from color.ini and a second run changes nothing', async () => {
    const dir = await tempDir();
    const cssFile = path.join(dir, 'user.css');
    const iniFile = path.join(dir, 'color.ini');
    await writeFile(iniFile, INI);
    await writeFile(cssFile, `a { color: red; }\n${START}\n${END}\n`);

    const first = await embed({ iniFile, cssFile });
    expect(first).toContain('--spice-text: #00ff00;');
    expect(first).toContain('--spice-rgb-main: 0, 0, 0;');
    expect(first.startsWith('a { color: red; }')).toBe(true);

    const second = await embed({ iniFile, cssFile });
    expect(second).toBe(first);
    expect(await readFile(cssFile, 'utf8')).toBe(first);
  });
});

describe('the committed user.css', () => {
  it('matches color.ini, so the two cannot drift', async () => {
    const root = path.resolve(import.meta.dirname, '..');
    const ini = await readFile(path.join(root, 'color.ini'), 'utf8');
    const css = await readFile(path.join(root, 'user.css'), 'utf8');

    // `pnpm embed:scheme` runs on demand, not as part of `pnpm check`, so
    // without this color.ini and the CSS could drift apart unnoticed.
    expect(css).toContain(schemeBlock(parseScheme(ini)));
  });
});

// @ts-check
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { embed, END, FONTS, fontFaceBlock, LATIN_RANGE, replaceBlock, START } from '../scripts/embed-font.js';

/** @type {string[]} */
const dirs = [];

async function tempDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'winamp-font-'));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('fontFaceBlock', () => {
  it('emits one rule per font, with its weight and the base64 of its bytes', () => {
    const bytes = new Uint8Array([119, 79, 70, 50]);
    const block = fontFaceBlock([{ weight: 400, bytes }]);

    expect(block.match(/@font-face/g)).toHaveLength(1);
    expect(block).toContain('font-weight: 400;');
    expect(block).toContain(`base64,${Buffer.from(bytes).toString('base64')}")`);
    expect(block).toContain('font-family: Silkscreen;');
    expect(block).toContain(`unicode-range: ${LATIN_RANGE};`);
    expect(block).toContain('font-display: block;');
  });

  it('keeps the fonts in the order given', () => {
    const block = fontFaceBlock([
      { weight: 400, bytes: new Uint8Array([1]) },
      { weight: 700, bytes: new Uint8Array([2]) },
    ]);

    expect(block.indexOf('font-weight: 400;')).toBeLessThan(block.indexOf('font-weight: 700;'));
  });
});

describe('replaceBlock', () => {
  const css = `a { color: red; }\n${START}\nold\n${END}\nb { color: blue; }`;

  it('replaces what is between the markers and leaves the rest alone', () => {
    const out = replaceBlock(css, 'new');

    expect(out).toContain(`${START}\nnew\n\n${END}`);
    expect(out).not.toContain('old');
    expect(out.startsWith('a { color: red; }')).toBe(true);
    expect(out.endsWith('b { color: blue; }')).toBe(true);
  });

  it('is idempotent', () => {
    expect(replaceBlock(replaceBlock(css, 'new'), 'new')).toBe(replaceBlock(css, 'new'));
  });

  it('throws when a marker is missing', () => {
    expect(() => replaceBlock(`${START}\nonly the start`, 'new')).toThrow(START);
    expect(() => replaceBlock('no markers at all', 'new')).toThrow(END);
  });

  it('throws when the markers are out of order', () => {
    expect(() => replaceBlock(`${END}\n${START}`, 'new')).toThrow();
  });
});

describe('embed', () => {
  it('writes the block from the asset files and a second run changes nothing', async () => {
    const dir = await tempDir();
    const cssFile = path.join(dir, 'user.css');
    await writeFile(path.join(dir, 'silkscreen-regular.woff2'), new Uint8Array([1, 2, 3]));
    await writeFile(path.join(dir, 'silkscreen-bold.woff2'), new Uint8Array([4, 5, 6]));
    await writeFile(cssFile, `:root { --x: 1; }\n${START}\n${END}\n`);

    const first = await embed({ assetsDir: dir, cssFile });
    expect(first).toContain(`base64,${Buffer.from([1, 2, 3]).toString('base64')}")`);
    expect(first).toContain(`base64,${Buffer.from([4, 5, 6]).toString('base64')}")`);
    expect(first).toContain(':root { --x: 1; }');

    const second = await embed({ assetsDir: dir, cssFile });
    expect(second).toBe(first);
    expect(await readFile(cssFile, 'utf8')).toBe(first);
  });
});

describe('the committed user.css', () => {
  it('matches the font files in assets/, so the block cannot drift', async () => {
    const root = path.resolve(import.meta.dirname, '..');
    const fonts = await Promise.all(
      FONTS.map(async ({ weight, file }) => ({
        weight,
        bytes: await readFile(path.join(root, 'assets', file)),
      })),
    );
    const css = await readFile(path.join(root, 'user.css'), 'utf8');

    // `pnpm embed:font` runs on demand, not as part of `pnpm check`, so
    // without this the assets and the CSS could drift apart unnoticed.
    expect(css).toContain(fontFaceBlock(fonts));
  });
});

# [PP-01] Prototype: base, pixel font and bevel utilities

## Type
Prototype (visual only)

## Description
The foundation of `user.css`: the embedded pixel font, the utility classes for the 3D bevels, and the global removal of rounded corners. Everything the other PP issues build on.

## Visual Elements
- `@font-face` for Silkscreen (SIL OFL) with `src: url(data:font/woff2;base64,...)`, generated from the official woff2 by a single Node script in `scripts/embed-font.js`.
- Variables in `:root`: `--wa-bevel-light` #5a5a6e, `--wa-bevel-dark` #14141c, `--wa-titlebar-start` #1c1c2a, `--wa-titlebar-end` #3a3a52, `--wa-white` #ffffff, and `--wa-font-pixel` with Silkscreen plus a monospace fallback.
- Reusable utility selectors that work as mixins inside the CSS: raised bevel (light on the top and left, dark on the bottom and right) and sunken bevel (the reverse), always through a 1px inset `box-shadow`.
- A global `border-radius: 0` rule on every element of the app.

## Layout Notes
- Pixel font at a minimum size of 11px, and only where the following PP issues ask for it. The rest of the app keeps Spotify's default font.
- No literal color outside `:root` and `color.ini`. Rules use `var(--spice-*)` and `var(--wa-*)`.

## Mock Data
- Not applicable. The check happens in Spotify with the palette from FN-00.

## Acceptance Criteria
- [ ] The font loads in local Spotify with no external request (confirm in DevTools that no font request goes out).
- [ ] No element of the app has a rounded corner.
- [ ] stylelint passes, with no `border-radius` other than 0 and no literal color outside `:root`.
- [ ] `user.css` stays under 200 KB with the font embedded.

## Dependencies
- FN-00

---

# Implementation Plan

Research done on 2026-09-10. The Silkscreen files were downloaded from the Google Fonts CDN and measured; the OFL text was fetched from the upstream font repo.

## Prerequisites
- FN-00 done: `pnpm check` green, theme applied locally through the symlink.
- Nothing else. This issue is CSS plus one Node script; no new runtime dependency.

## Reusable Code Found
- `user.css:12-21`: the `:root` block already exists with `--wa-bevel-light`, `--wa-bevel-dark`, `--wa-titlebar-start`, `--wa-titlebar-end`, `--wa-white` and `--wa-font-pixel`, wrapped in a `stylelint-disable color-no-hex` pair. Extend it, do not recreate it.
- `user.css:23-51`: the commented area markers are already in place, one per future issue. Fill `/* === Font === */` and `/* === Bevel utilities === */`, leave the rest alone.
- `scripts/build.js`: the shape to copy for a Node script here, including `// @ts-check`, JSDoc types, an exported function and the `import.meta.url === pathToFileURL(process.argv[1]).href` main guard so a test can import it without side effects.
- `test/build.test.js`: the test shape, including `mkdtemp` for a scratch directory and an `afterEach` that removes what it created.
- `~/.spicetify/css-map.json` (2584 entries) maps Spotify's obfuscated class names to readable ones. Not needed here, but it is the tool for PP-02 onward.

## Architecture Decisions
- **Embed regular and bold, latin subset only.** Measured from the Google Fonts CDN: regular latin 3528 bytes raw and 4704 base64, bold latin 3208 and 4280. Around 9 KB of base64 in total, far under the 200 KB budget in the acceptance criteria. Bold is embedded rather than skipped because Spotify sets `font-weight: 700` in many places, and without a real bold the browser synthesizes one, which smears a pixel font.
- **Latin-ext stays out.** It is another 1488 bytes of base64 for glyphs outside `U+0000-00FF`. Latin-1 already covers accented Portuguese and Spanish track titles. Anything beyond it falls back to the monospace stack, which is the honest outcome for a bitmap font.
- **The font files are committed, and the CSS block is generated from them.** `assets/silkscreen-regular.woff2` and `assets/silkscreen-bold.woff2` go in the repo so the build never depends on the network. `scripts/embed-font.js` reads them and rewrites the block between two markers in `user.css`. This keeps the huge base64 string reproducible and diffable instead of hand-pasted.
- **Markers, not full-file generation.** `user.css` is hand-written everywhere else, so the script replaces only what sits between `/* @font-face:start */` and `/* @font-face:end */`. Running it twice produces the same file.
- **The OFL is shipped, not just cited.** SIL Open Font License 1.1 requires the copyright notice and license to travel with the font, so `assets/Silkscreen-OFL.txt` is committed and the README already points at the font.
- **The radius reset is global and uses `!important`.** Spotify sets radii at high specificity and inline in places, and Winamp has no rounded corner anywhere. `border-radius: 0 !important` on `*`, `*::before` and `*::after` is the smallest rule that holds. The project's stylelint rule reads `decl.value` without `!important`, so `0 !important` passes, as verified in FN-00.
- **Bevels are custom properties holding shadow lists**, not classes: CSS in a theme cannot add classes to Spotify's DOM. `--wa-raised` and `--wa-sunken` get consumed as `box-shadow: var(--wa-raised)` by the later prototype issues.

## Files to Create
| File | Purpose |
|------|---------|
| `assets/silkscreen-regular.woff2` | Silkscreen 400, latin subset, from the Google Fonts CDN |
| `assets/silkscreen-bold.woff2` | Silkscreen 700, latin subset |
| `assets/Silkscreen-OFL.txt` | SIL Open Font License 1.1, as required for redistribution |
| `scripts/embed-font.js` | Reads the woff2 files and rewrites the `@font-face` block in `user.css` |
| `test/embed-font.test.js` | Covers the marker replacement and idempotency |

### scripts/embed-font.js
- Export `fontFaceBlock(fonts)` where `fonts` is a list of `{ weight, bytes }`, returning the `@font-face` rules as a string with `src: url(data:font/woff2;base64,...) format("woff2")`, `font-display: block` and the latin `unicode-range` from the Google Fonts CSS.
- `font-display: block` rather than `swap`: the file is inline, so there is no network wait, and `swap` would flash the fallback on every Spotify reload.
- Export `replaceBlock(css, block)` that swaps whatever is between the two markers, keeping the markers. Throw a clear error if either marker is missing, so a malformed `user.css` fails loudly instead of silently skipping.
- Export `embed({ assetsDir, cssFile })` that wires the two and writes the file. Main guard as in `scripts/build.js`.
- Add an `embed:font` script to `package.json`. It is not part of `check`, because it only needs to run when the font files change.

### test/embed-font.test.js
- `fontFaceBlock` with one fake font: output has one `@font-face`, the right `font-weight`, the base64 of the input bytes and the `unicode-range`.
- `replaceBlock` replaces the content between markers and keeps them, leaves everything outside untouched, and running it twice on its own output gives the same string.
- `replaceBlock` throws when a marker is missing.
- `embed` against a scratch directory: writes the file, and a second run leaves it byte-identical.

## Files to Modify
| File | Changes |
|------|---------|
| `user.css` | `@font-face` block between markers, bevel variables in `:root`, global radius reset |
| `package.json` | `embed:font` script |
| `README.md` | one line pointing at `assets/Silkscreen-OFL.txt` |

### user.css
- Under `/* === Font === */`: the two markers with the generated block between them. Do not hand-edit what sits between them.
- In the existing `:root` block, after `--wa-white`: `--wa-raised` as `inset 1px 1px 0 0 var(--wa-bevel-light), inset -1px -1px 0 0 var(--wa-bevel-dark)` and `--wa-sunken` with the two colors swapped. These are shadow lists, not colors, so they sit fine inside the `color-no-hex` disable pair.
- Under `/* === Bevel utilities === */`: the global radius reset, with a comment saying why `!important` is there.
- Nothing else. The other area markers stay empty for their own issues.

## Data Requirements
- None.

## Testing Strategy
- Unit tests as listed above, run by `pnpm test`.
- `pnpm check` green: eslint over the new script and test, stylelint over `user.css`, `tsc --noEmit` with `checkJs`.
- In Spotify, with the theme applied: open DevTools, run `await document.fonts.load('12px Silkscreen')` then `document.fonts.check('12px Silkscreen')`, which must return `true`. Nothing in `user.css` uses the font yet, so this is the only way to prove it resolves.
- In the DevTools Network tab, filter by `font` and reload: there must be no request. The data URI means the font never leaves the file.
- Visually: no rounded corner anywhere in the app. Check the profile avatar, the play button and cards, which are the roundest things Spotify draws.

## Implementation Order
1. `assets/` with the two woff2 files and the OFL text.
2. `scripts/embed-font.js` and `test/embed-font.test.js`, red then green.
3. Markers in `user.css`, run `pnpm embed:font`, confirm the block lands and a second run changes nothing.
4. Bevel variables and the radius reset in `user.css`.
5. `package.json` script and the README line.
6. `pnpm check`, then the DevTools and visual checks in Spotify.

## Unknowns
- The Google Fonts URLs carry a version segment (`v6`) and can change. The files are committed, so this only matters if the font is ever refreshed, and then the URLs get looked up again.
- A global `!important` radius reset may fight a Spotify component that needs a radius to clip correctly, for example a circular progress ring. If something clips wrong, the fix is a narrow exception with a comment, not dropping the reset.

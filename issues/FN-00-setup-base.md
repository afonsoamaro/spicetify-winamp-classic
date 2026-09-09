# [FN-00] Base setup and quality gate

## Type
Functional (infra, do first)

## Description
Get the empty repo to a green quality gate (lint, typecheck, test, build) with the theme loading in the local Spotify, before any real CSS or JS.

## Requirements
- `package.json` with `packageManager` pinned to pnpm, `.nvmrc` on the current Node LTS and `lint`, `typecheck`, `test`, `build` and `check` scripts (`check` runs the four).
- eslint with a flat config covering `theme.js`, `src/`, `scripts/` and `test/`.
- stylelint on `user.css` with a rule that forbids any `border-radius` other than 0.
- `tsconfig.json` with `allowJs`, `checkJs`, `noEmit`, including `types/globals.d.ts` copied from `~/.spicetify/globals.d.ts`.
- vitest with at least one real test in `test/` covering the build script.
- `scripts/build.js` generating a minimal `theme.js` from `src/` (skeleton only, the logic comes in the following FNs).
- `color.ini` with the `[Classic]` section and the 18 fields of Spicetify's default `color.ini`, using the values from the spec.
- `user.css` with nothing but the `:root` block of `--wa-*` variables and one comment per future area.
- `manifest.json` with the fields the Marketplace requires and `include` pointing at the jsdelivr URL for `theme.js` on `main`.
- Symlink of the repo at `~/.config/spicetify/Themes/WinampClassic`, `spicetify config current_theme WinampClassic color_scheme Classic` and `spicetify apply`, with Spotify opening in the new palette.
- `.gitignore` with `node_modules`.

## Acceptance Criteria
- [ ] Every key dependency pinned to the latest stable version looked up in the registry at the time (`npm view <pkg> version`), never from memory: Node, pnpm, eslint, stylelint, typescript, vitest. Staying on an earlier line needs a reason recorded in this issue.
- [ ] `pnpm check` green with 0 lint errors, 0 type errors, the build test passing and the build producing `theme.js`.
- [ ] `pnpm build` generates `theme.js` without errors.
- [ ] Spotify opens with the `WinampClassic` theme applied and the `color.ini` colors visible.
- [ ] `spicetify watch -s` reloads when `user.css` and `theme.js` are saved.

## Dependencies
- none

---

# Implementation Plan

Research done on 2026-09-07. Versions looked up in the registry at the time, and `tsc` 7 probed in a temporary directory with `checkJs` and Spicetify's `globals.d.ts`.

## Prerequisites
- Node 24 active via nvm (local is on 24.19.0, current LTS is 24.20.0; `.nvmrc` pins the `24` major, same as `omni-status`).
- corepack enabled so `packageManager` is respected.
- Spotify closed when `spicetify apply` runs, because the command restarts the client.

## Reusable Code Found
- `~/code/afonsoamaro/omni-status/.gitignore`: base for the `.gitignore`, minus the Next and `.env` entries.
- `~/code/afonsoamaro/omni-status/eslint.config.mjs`: template for the flat config. Here without `typescript-eslint` and without prettier, because the code is plain JS checked by `tsc`.
- `~/code/afonsoamaro/omni-status/vitest.config.ts` and `tsconfig.base.json`: reference for the options, adapted for `allowJs` and `checkJs`.
- `~/.spicetify/globals.d.ts` (2409 lines): Spicetify's types, copied to `types/globals.d.ts`. It references the `React` namespace, so `@types/react` comes in as a devDependency for types only.
- `~/.spicetify/Themes/SpicetifyDefault/color.ini`: canonical list of the 18 fields and what each one does, used as comments in our `color.ini`.
- `~/.config/spicetify/config-xpui.ini`: already has `inject_theme_js 1`, `inject_css 1`, `replace_colors 1`. Only `current_theme` and `color_scheme` change.

## Architecture Decisions
- Plain JS with `// @ts-check` and JSDoc instead of compiled TypeScript. Reason: Spicetify loads a single `theme.js` with no bundler, and `tsc --noEmit` with `checkJs` gives the same type gate without a transpile step. Probed with TypeScript 7.0.2: it catches type errors in JS and comes out clean once `@types/react` is installed.
- No prettier in this project. The `user.css` is formatted by stylelint and the JS is small. Keeps a third formatter from fighting stylelint.
- Pinned versions (registry on 2026-09-07): pnpm 12.3.4, eslint 10.10.0, @eslint/js 10.0.1, globals 17.12.0, stylelint 17.15.0, stylelint-config-standard 40.0.0 (peer stylelint ^17), typescript 7.0.2, vitest 5.0.0 (engine node ^24 ok), @types/react 19.2.18. No `jiti`, because the eslint config is `.mjs`, not `.ts`.
- The `include` in `manifest.json` points at jsdelivr, not GitHub raw: raw serves `text/plain` with `nosniff` and the browser refuses it as a script. Comfy uses GitHub Pages for the same reason.
- The watch flag is `-s` (active theme: `color.ini`, `user.css`, `theme.js`), not `-le`. Fixed in the spec.
- Hover color: the original spec had no `main-elevated`, `highlight` or `highlight-elevated`. They come in as #1a1a22, #0000c6 and #0000c6.

## Files to Create
| File | Purpose |
|------|---------|
| `.nvmrc` | `24` |
| `package.json` | `name` `spicetify-winamp-classic`, `private: true`, `type: module`, `packageManager: pnpm@12.3.4`, `engines.node >=24`, plus the scripts and devDependencies above |
| `.gitignore` | `node_modules/`, `coverage/`, `.DS_Store`, `*.log` |
| `eslint.config.mjs` | flat config: `js.configs.recommended`, `globals.browser` for `src/`, `globals.node` for `scripts/` and `test/`, global `Spicetify: 'readonly'`, `ignores: ['theme.js']` because it is a generated artifact |
| `.stylelintrc.json` | `extends: stylelint-config-standard`, `rules`: `declaration-property-value-disallowed-list` with `border-radius` rejecting any value that does not start with `0`; `color-no-hex: true` and `color-named: never` to force `var()`; the `:root` block uses `/* stylelint-disable color-no-hex */` |
| `tsconfig.json` | `allowJs`, `checkJs`, `noEmit`, `strict`, `target ES2023`, `module ESNext`, `moduleResolution bundler`, `lib ["ES2023","DOM"]`, `types ["react"]`, `include ["src/**/*.js","scripts/**/*.js","test/**/*.js","types/**/*.d.ts"]` |
| `vitest.config.js` | `test.include ['test/**/*.test.js']` |
| `types/globals.d.ts` | copy of `~/.spicetify/globals.d.ts`, with a first line commenting its origin and version 2.44.0 |
| `src/index.js` | minimal DOM entry point: `// @ts-check`, a `main()` that logs `[winamp-classic] loaded`, and the `waitForSpicetify` skeleton left for FN-01 |
| `scripts/build.js` | reads `src/*.js` in a fixed order declared in an array at the top (`index.js` last), strips `import`/`export` lines with a start-of-line regex, wraps the result in `(function () { 'use strict'; ... })();` and writes `theme.js` with a `// generated by scripts/build.js, do not edit` header |
| `test/build.test.js` | test that imports `build` from `scripts/build.js` and checks the output. Covers the build already and gets reused in FN-01 |
| `color.ini` | `[Classic]` with the 18 fields, values from the spec, header comment copied from the default |
| `user.css` | header, `:root` block with the `--wa-*` variables, and one comment per area: font, now playing bar, track list, sidebar, top bar, scrollbars, cards and controls |
| `manifest.json` | required fields and the jsdelivr `include` |
| `theme.js` | artifact generated by `pnpm build`, versioned |
| `pnpm-lock.yaml` | lockfile |
| `pnpm-workspace.yaml` | created by pnpm 12: minimum publish age exception for `@types/node` 26.5.0, published the same day. The latest-version criterion outweighs the release quarantine here, because the package is types only and runs in dev |

Delivered beyond the original table, all of them necessary: `@types/node` (`scripts/build.js` uses `node:fs` and does not typecheck without it), `types: ["node","react"]`, `noUncheckedIndexedAccess` and `skipLibCheck` in the tsconfig, and `vitest.config.js` in `include`.

### scripts/build.js
- Order: `['time.js','marquee.js','spectrum.js','dom.js','index.js']`, skipping the ones that do not exist yet, so the script already serves the following FNs.
- Export `build({ srcDir, outFile })` as a function and only run it when it is the main module (`import.meta.url === pathToFileURL(process.argv[1]).href`), so the test can import it without side effects.

### package.json scripts
- `lint`: `eslint . && stylelint "**/*.css"`
- `typecheck`: `tsc --noEmit`
- `test`: `vitest run`
- `build`: `node scripts/build.js`
- `check`: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

## Files to Modify
| File | Changes |
|------|---------|
| `~/.config/spicetify/config-xpui.ini` | via CLI: `spicetify config current_theme WinampClassic color_scheme Classic` |

## Data Requirements
- None.

## Testing Strategy
- `test/build.test.js`: calls `build` with a temporary `srcDir` holding two modules that use `export`, checks that the output has the IIFE, has no `export` or `import`, and respects the order.
- Manual check in Spotify: after `spicetify apply`, the content background turns black and the text green. The Spotify console (`spicetify enable-devtools`, Cmd+Option+I) shows `[winamp-classic] loaded`.

## Implementation Order
1. `nvm use 24`, `corepack enable`, `.nvmrc`, `package.json`, `pnpm install`.
2. eslint, stylelint, tsconfig and vitest configs plus `types/globals.d.ts`. Run `pnpm lint` and `pnpm typecheck` on the empty repo.
3. `scripts/build.js`, `src/index.js`, `test/build.test.js`, `pnpm test`, `pnpm build`.
4. `color.ini`, `user.css`, `manifest.json`.
5. Symlink at `~/.config/spicetify/Themes/WinampClassic`, `spicetify config`, `spicetify apply`, check in Spotify.
6. Full `pnpm check`, then report the four statuses with counts.

## Unknowns
- Symlink inside the `Themes` folder: not confirmed that Spicetify follows a directory symlink. If `spicetify apply` complains about the theme, the fallback is copying the files with a `pnpm sync` script that `rsync`s the repo into the folder, and the watch then runs over the copy.
- `spicetify apply` restarts Spotify. Run it with the user aware.

## Security Considerations
- None. No secrets, no network and no user data in this issue.

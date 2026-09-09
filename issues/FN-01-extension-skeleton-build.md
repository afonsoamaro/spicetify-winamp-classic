# [FN-01] Extension skeleton and build script

## Type
Functional

## Description
`theme.js` gets the structure that the later injections rely on: it waits for Spicetify to be ready, finds the display in the now playing bar, re-injects when Spotify remounts the DOM, and isolates each injection in a try/catch with a prefixed log. `scripts/build.js` concatenates the modules in `src/` together with the DOM entry point.

## User Flow
1. Spotify opens with the theme applied.
2. The extension waits for `Spicetify.Player` and `Spicetify.Platform` to exist, polling every 100ms and giving up after 30s with an error log.
3. It finds the display container (created by the CSS from PP-02) and registers the injections.
4. A `MutationObserver` on the now playing bar re-runs the injections when the container disappears and comes back.

## Requirements
- `src/dom.js` with `waitForSpicetify()`, `findDisplay()` and `mount(injections)`, where each injection is `{ name, run, cleanup }`.
- Every `run` executes inside a try/catch. A failure logs `console.warn('[winamp-classic] <name>:', err)` and doesn't stop the others.
- `cleanup` is called before re-injecting so the canvas or the marquee never gets duplicated.
- `scripts/build.js` reads `src/*.js` in a fixed order, strips `export` and `import`, wraps everything in an IIFE and writes `theme.js`. No bundler.
- The committed `theme.js` is the generated artifact. `pnpm build` has to run before committing changes under `src/`.

## Scenarios
### Happy Path
- Spotify opens, the extension mounts, `[winamp-classic] mounted` shows up in the console.

### Edge Cases
- Now playing bar remounted when switching devices: the injections come back without duplicating.
- Display not found because a selector changed: warning log, the rest of the theme keeps working.

### Error Handling
- 30s timeout waiting for Spicetify: a single `console.error` and the extension stops.

## Data Requirements
- None.

## External Dependencies
- Spicetify types in `types/globals.d.ts`.

## Acceptance Criteria
- [ ] `pnpm build` produces `theme.js` as an IIFE with no `import` or `export`.
- [ ] Vitest test for the build: an input with two modules becomes a single file with no `export` and in the expected order.
- [ ] Vitest test for `mount`: an injection that throws doesn't stop the next one, and `cleanup` runs before the re-injection (DOM simulated with jsdom).
- [ ] In Spotify, the console shows `[winamp-classic] mounted` and re-injection works when switching devices.
- [ ] `pnpm check` green.

## Dependencies
- FN-00, PP-02

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

---

# Implementation Plan

## Prerequisites
- FN-00 and PP-02 are done. `scripts/build.js` already exists with `ORDER = ['time.js', 'marquee.js', 'spectrum.js', 'dom.js', 'index.js']`, IIFE wrapping, `import`/`export` stripping and two Vitest tests, so the build half of this issue is already delivered; this plan only adds the DOM half.
- `jsdom` is not installed. Add it as a devDependency (`jsdom@30.0.1` at planning time) and use the `@vitest-environment jsdom` docblock on the one test file that needs it, so the build and font tests keep running on Node.
- Spicetify runs with `inject_theme_js 1` locally and `theme.js` loads as `https://xpui.app.spotify.com/extensions/theme.js` (confirmed through the debug port on 1.3.0.277).

## Reusable Code Found
- `scripts/build.js` — already concatenates `src/` in a fixed order, strips module syntax and wraps in an IIFE. `dom.js` and `index.js` are in `ORDER`. Nothing to change.
- `test/build.test.js` — already covers "two modules become one file with no `export` and in the expected order" and "stray file fails". This satisfies the build criterion as is.
- `src/index.js` — the current entry point only logs `[winamp-classic] loaded`; it becomes the caller of `waitForSpicetify` and `mount`.
- `types/globals.d.ts` — declares `Spicetify.Player` (`isPlaying`, `addEventListener("songchange")`), `Spicetify.Platform`, `Spicetify.getAudioData`. The check for readiness uses these names.
- `user.css` lines 104-112 — the display is `.main-nowPlayingBar-nowPlayingBar .main-nowPlayingBar-left [data-testid="now-playing-widget"]`, with right padding `--wa-spectrum-w` reserved for the canvas. The extension's `findDisplay` uses the same anchor.
- Official Spicetify extensions (`~/.spicetify/Extensions/keyboardShortcut.js`) wait by retrying on a specific global with `setTimeout`; the same idea, with a bounded timeout, is what the issue asks for.

## Live DOM (1.3.0.277, read through `--remote-debugging-port`)
- `aside.main-nowPlayingBar-container[data-testid="now-playing-bar"]` is the stable parent; `.main-nowPlayingBar-nowPlayingBar` sits inside it and is the piece Spotify remounts.
- `[data-testid="now-playing-widget"]` is `div.main-nowPlayingWidget-nowPlaying` with children cover slot, `.main-nowPlayingWidget-trackInfo` and the action button wrapper. It is absent when nothing is playing, so "display not found at startup" is a normal state, not only a broken-selector state: the observer has to pick the display up when it appears later.
- `Spicetify.Player.addEventListener` is a function and `Spicetify.Platform.version` reads `1.3.0.277`.

## Architecture Decisions
- **One module, `src/dom.js`, no classes.** Functions with explicit parameters so Vitest can drive them: `root` for the document, `isReady` for the readiness probe. Defaults point at the real globals.
- **Readiness is a polled predicate, not an event.** Spicetify has no "ready" event; the predicate is `typeof Spicetify !== 'undefined' && Spicetify.Player && Spicetify.Platform`. 100 ms interval, 30 s timeout, single `console.error` on timeout and the extension stops. Nothing else in the theme depends on it.
- **The observer watches the bar container, not the display.** `MutationObserver` on `[data-testid="now-playing-bar"]` with `{ childList: true, subtree: true }`. On every batch it compares `findDisplay(root)` with the element currently mounted; only an identity change (including `null` to element and element to `null`) triggers cleanup and re-run. This makes remounts cheap and also covers the "nothing playing at startup" case. If the container itself is missing, observe `root.body` with the same options and switch to the container once it appears (keep it simple: observing `body` for the whole session is acceptable if the container never shows up; log a warning once).
- **Injections are `{ name, run, cleanup }`.** `run(display)` may return nothing; `cleanup(display)` is optional. Each call sits in its own try/catch and a failure logs `console.warn('[winamp-classic] <name>:', err)`. `cleanup` of every injection that ran is called before any `run` of the next round, so the canvas and the marquee never duplicate. The list of injections stays empty in this issue; FN-02, FN-03 and FN-05 each add one entry in `src/index.js`.
- **`mount` returns a handle `{ remount(), disconnect() }`** so tests can force a round and stop the observer; the app never calls `disconnect`.
- **No timers in `dom.js` beyond the readiness poll.** Debouncing observer batches is not needed: the identity comparison is O(1) and a `querySelector` per batch on the bar subtree is cheap.

## Files to Create
| File | Purpose |
|------|---------|
| `src/dom.js` | readiness wait, display lookup, injection runner, observer |
| `test/dom.test.js` | Vitest with `@vitest-environment jsdom` for `waitForSpicetify` and `mount` |

### src/dom.js
- `// @ts-check` header and a comment stating that this module is the only one that touches the DOM and the Spicetify globals; the others stay pure.
- `export const LOG_PREFIX = '[winamp-classic]';`
- `export const DISPLAY_SELECTOR = '.main-nowPlayingBar-nowPlayingBar [data-testid="now-playing-widget"]';` and `export const BAR_SELECTOR = '[data-testid="now-playing-bar"]';`
- `export function isSpicetifyReady()`: `typeof Spicetify !== 'undefined' && Boolean(Spicetify.Player) && Boolean(Spicetify.Platform)`.
- `export function waitForSpicetify({ isReady = isSpicetifyReady, intervalMs = 100, timeoutMs = 30000 } = {})`: returns a Promise that resolves when `isReady()` is true, polling with `setTimeout`, and rejects with `new Error('Spicetify not ready after 30s')` (message built from `timeoutMs`) once elapsed. Check `isReady()` once synchronously before scheduling the first timer.
- `export function findDisplay(root = document)`: `root.querySelector(DISPLAY_SELECTOR)`; the return type is `HTMLElement | null` via JSDoc.
- `export function runInjections(injections, display)`: for each, `try { injection.run(display) } catch (err) { console.warn(\`${LOG_PREFIX} ${injection.name}:\`, err) }`; returns the array of injections whose `run` did not throw, so the caller knows what to clean.
- `export function cleanupInjections(injections, display)`: same shape, calling `injection.cleanup?.(display)`, warning on throw, never rethrowing.
- `export function mount(injections, { root = document } = {})`: keeps `let display = null` and `let mounted = []`. `sync()` does: `const next = findDisplay(root); if (next === display) return; if (display) cleanupInjections(mounted, display); display = next; mounted = display ? runInjections(injections, display) : [];`. On first call, if `next` is null, `console.warn(\`${LOG_PREFIX} display not found, waiting for it\`)` once. Creates a `MutationObserver(sync)` and observes `root.querySelector(BAR_SELECTOR) ?? root.body` with `{ childList: true, subtree: true }`. Calls `sync()` once, returns `{ remount: sync, disconnect: () => observer.disconnect() }`.
- JSDoc typedef at the top: `@typedef {{ name: string, run: (display: HTMLElement) => void, cleanup?: (display: HTMLElement) => void }} Injection`. `src/index.js` imports the typedef with `@import` or `@typedef {import('./dom.js').Injection} Injection` (the build strips only `import` statements, not JSDoc, so the JSDoc form is safe with the concatenation).

### test/dom.test.js
- Docblock `/** @vitest-environment jsdom */` on line 1.
- Imports `{ describe, it, expect, vi, afterEach }` from vitest and the functions from `../src/dom.js`.
- Helper `makeBar(root)` that builds `<aside data-testid="now-playing-bar"><div class="main-nowPlayingBar-nowPlayingBar"><div data-testid="now-playing-widget"></div></div></aside>` into `document.body` and returns the widget.
- Helper `tick()` = `new Promise((r) => setTimeout(r, 0))` so MutationObserver callbacks (microtask) have run.
- `waitForSpicetify` with `vi.useFakeTimers()`: resolves once `isReady` flips true after two intervals; rejects with a message containing `30s` when it never does, after advancing past `timeoutMs`. Restore real timers in `afterEach`.
- `mount`: (1) an injection whose `run` throws is followed by the next one's `run`, and `console.warn` was called once with the prefix and the name (`vi.spyOn(console, 'warn').mockImplementation(() => {})`); (2) replacing the widget node (remove old, append new) then `await tick()` calls `cleanup` of the first round before the `run` of the second, asserted through a shared call log array like `['run:a', 'cleanup:a', 'run:a']`; (3) with no widget at start, `mount` warns "display not found" once, and appending the widget later triggers the first `run`; (4) a `cleanup` that throws does not prevent the re-run. Use `handle.disconnect()` in `afterEach` and clear `document.body.innerHTML`.

## Files to Modify
| File | Changes |
|------|---------|
| `src/index.js` | call `waitForSpicetify`, then `mount([])`, log `mounted`; `console.error` and return on timeout |
| `package.json` | add `jsdom` to devDependencies |
| `eslint.config.mjs` | `test/**/*.js` gets `globals.browser` alongside `globals.node` so `document` and `MutationObserver` are known |
| `theme.js` | regenerated by `pnpm build` |

### src/index.js
- Replace the body with: `import { LOG_PREFIX, mount, waitForSpicetify } from './dom.js';`, `/** @type {import('./dom.js').Injection[]} */ const INJECTIONS = [];`, and `async function main() { try { await waitForSpicetify(); } catch (err) { console.error(\`${LOG_PREFIX} ${err instanceof Error ? err.message : err}\`); return; } mount(INJECTIONS); console.log(\`${LOG_PREFIX} mounted\`); } main();`.
- Keep the file comment about becoming the tail of `theme.js`. Add a line saying later issues push their injection into `INJECTIONS` here.

### eslint.config.mjs
- In the `scripts/test/config` block, change `globals: { ...globals.node }` to `globals: { ...globals.node, ...globals.browser }`. Scripts do not use browser globals, so the widening is harmless and keeps one block.

## Data Requirements
None.

## Testing Strategy
- `test/dom.test.js` as described: readiness resolve and timeout with fake timers; injection isolation; cleanup-before-run on remount; display appearing after start; cleanup that throws.
- `test/build.test.js` stays as the build coverage (criterion 2 already met).
- On screen, through the debug port: `[winamp-classic] mounted` in the console (read with `Runtime.evaluate` after hooking `console.log`, or through `Log.enable` on the CDP session); force a remount by removing the widget node via CDP and confirm the observer picks the new one (a device switch is the real trigger but cannot be scripted; the DOM swap is the same event from the observer's point of view).

## Implementation Order
1. `pnpm add -D jsdom@30.0.1`, eslint globals.
2. `src/dom.js`.
3. `test/dom.test.js`, red then green.
4. `src/index.js`, `pnpm build`, commit `theme.js`.
5. `pnpm check`, `spicetify apply`, relaunch with the debug port and read the console.

## Unknowns
- Whether Spotify remounts `.main-nowPlayingBar-nowPlayingBar` or the whole `aside` when switching devices. Observing the `aside` covers the first; the `body` fallback covers the second only if the `aside` was missing at start. If the `aside` itself is replaced at runtime, the observer dies silently. Mitigation, if it shows up on screen: observe `root.body` always and accept the wider subtree. Decide with evidence, not up front.
- jsdom 30 with Vitest 5 has no known incompatibility at planning time; if the environment fails to load, `happy-dom` (20.14.5) is the fallback and the test file changes only its docblock.

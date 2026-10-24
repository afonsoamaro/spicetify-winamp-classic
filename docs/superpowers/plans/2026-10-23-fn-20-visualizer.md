# FN-20 Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A synthetic-signal visualizer with three styles, shown on fullscreen and the right sidebar (miniplayer conditional), configured from one window in the profile menu.

**Architecture:** Pure modules hold the settings store, the synthetic signal and the drawing of each style. One shared animation loop renders every visible surface from one signal and stops when nothing is visible or nothing plays. DOM modules mount surfaces and the settings window, and `index.js` starts them only after the master switch is read. With the switch off, nothing but the profile menu entry exists.

**Tech Stack:** Plain ES modules concatenated by `scripts/build.js` into `theme.js`, vitest 5 with jsdom, Spicetify 2.46 APIs (`Spicetify.Menu.Item`, `Spicetify.LocalStorage`, `Spicetify.Player`).

**Spec:** `issues/FN-20-visualizer.md`

## Global Constraints

- Node `^24`, pnpm 12 (`packageManager`). The gate is `pnpm check` (lint, typecheck, test, build), zero errors and no new warnings.
- Every `src/*.js` starts with `// @ts-check`, uses one `import` per line and named exports only (the build script strips imports and `export` and cannot handle multi-line imports or `export default`).
- Every new `src/` file is added to `ORDER` in `scripts/build.js` in the same task that creates it, after the modules it uses.
- New CSS classes start with `wa-`. Selectors hang on `data-testid`, ARIA, roles, native elements or structure, never on `main-*` or hashed classes (`test/anchor-contract.test.js` fails otherwise). Colours, fonts and radii come from theme tokens, never literals (`user.css` is checked by stylelint).
- Log lines use `LOG_PREFIX` (`[winamp-classic]`). Comments and README in English. No em dashes.
- Storage key is `winamp-classic:visualizer`. Style ids are `bars`, `scope`, `glow`.
- Master switch default is off. With it off: no animation loop, no canvas, no listener, no network.
- Interface labels exist in `en`, `pt-BR` and `es`.
- Commit messages carry no attribution lines. Branch from `main`, never commit to it directly.

## Review Focus

- Storage holds invalid JSON, a wrong type or an unknown style: settings fall back to defaults field by field (Task 2).
- No track, a track without a uri, or a NaN progress: the signal stays finite and inside 0..1 (Task 3).
- Spotify re-renders and detaches a surface's canvas while the loop runs: the loop drops it and does not leak or throw (Task 5).
- One surface's `draw` throws: the others keep drawing and the failure is logged once (Task 5).
- The window is hidden, or the sidebar is closed or showing a video: no frame is scheduled (Tasks 5 and 8).

---

### Task 1: Spikes on the real client (fullscreen, sidebar, locale)

Nothing is built here. The output is facts and anchors that Tasks 7 to 9 depend on, written into the issue.

**Files:**
- Modify: `issues/FN-20-visualizer.md` (add a `## Spike results` section)
- Scratch only (not committed): the probing scripts

**Produces:** the constants Tasks 7 to 9 use, recorded in the issue as: `FULLSCREEN_ROOT` (selector of the fullscreen view), `FULLSCREEN_TOGGLE_HOST` (where a toggle can attach), `SIDEBAR_COVER_ANCHOR` (stable selector for the cover or video block of the right sidebar), `LOCALE_SOURCE` (the expression that returns the UI locale).

- [ ] **Step 1: Open the debug channel.** Quit Spotify, run `open -a Spotify --args --remote-debugging-port=9222`, fetch `http://localhost:9222/json`, and attach to the `page` target with `websocket-client` using `suppress_origin=True`. Run all probes with `Runtime.evaluate` and `awaitPromise`.
- [ ] **Step 2: Fullscreen.** With a track playing, click the button labelled "Enter Full screen". Record the root element of the view, its `data-testid` and roles, where a small button can attach without sitting inside a React-controlled list, and whether a canvas appended there survives a track change (skip to next, wait 3 s, check the canvas is still connected). Expected: a selector built only from test ids, ARIA or structure.
- [ ] **Step 3: Sidebar.** Click "Show Now Playing view". Record the stable selector of the cover block, what the panel holds when the item is a video, and what is in the DOM when the sidebar is closed. Expected: `SIDEBAR_COVER_ANCHOR` plus the closed and video behaviours in one line each.
- [ ] **Step 4: Locale.** Evaluate `Spicetify.Locale`, `document.documentElement.lang` and `navigator.language` and record which one follows Spotify's language setting.
- [ ] **Step 5: Write the results.** Add the constants and one line per finding under `## Spike results` in the issue. If a surface has no stable anchor, say so and mark that surface blocked in the issue.
- [ ] **Step 6: Commit.** `git add issues/FN-20-visualizer.md && git commit -m "docs(FN-20): spike results for fullscreen, sidebar and locale"`

---

### Task 2: Settings store

**Files:**
- Create: `src/visualizer-settings.js`
- Modify: `scripts/build.js` (`ORDER`: after `spectrum.js`)
- Test: `test/visualizer-settings.test.js`

**Produces:**
- `STYLE_IDS = ['bars', 'scope', 'glow']`, `SETTINGS_KEY`
- `@typedef VisualizerSettings = { enabled: boolean, style: StyleId, fullscreen: boolean, sidebar: boolean, sidebarOpen: boolean, miniplayer: boolean }`
- `DEFAULTS: VisualizerSettings` with `enabled: false, style: 'bars', fullscreen: true, sidebar: true, sidebarOpen: true, miniplayer: true`
- `normalizeSettings(raw: unknown): VisualizerSettings`
- `createSettingsStore({ storage }: { storage: { get(key: string): string | null, set(key: string, value: string): void } }): { get(): VisualizerSettings, set(patch: Partial<VisualizerSettings>): void, subscribe(listener: (s: VisualizerSettings) => void): () => void }`

- [ ] **Step 1: Write the failing tests** in `test/visualizer-settings.test.js`:
  - `normalizeSettings` of `undefined`, `null`, `'x'`, `42` equals `DEFAULTS`.
  - `normalizeSettings({ style: 'nope', enabled: 'yes', sidebar: false })` gives `style: 'bars'`, `enabled: false`, `sidebar: false` (invalid fields fall back one by one, valid ones are kept).
  - `createSettingsStore` over a storage returning `'{broken'` yields `DEFAULTS` from `get()` and does not throw.
  - `set({ style: 'glow' })` writes JSON under `SETTINGS_KEY`, `get().style === 'glow'`, and a fresh store over the same storage reads it back.
  - `subscribe` listeners run once per `set`, receive the new settings, and the returned function unsubscribes.
  - A storage whose `set` throws does not break `set()`: `get()` still reflects the change in memory.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-settings.test.js`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the interface above in `src/visualizer-settings.js`; add the file to `ORDER`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/visualizer-settings.js scripts/build.js test/visualizer-settings.test.js && git commit -m "feat(FN-20): visualizer settings store"`

---

### Task 3: Synthetic signal

**Files:**
- Create: `src/visualizer-signal.js`
- Modify: `scripts/build.js` (`ORDER`: after `visualizer-settings.js`)
- Test: `test/visualizer-signal.test.js`

**Produces:**
- `BAND_COUNT = 32`, `WAVE_SAMPLES = 64`
- `@typedef Signal = { levels: number[], wave: number[], beat: number }` (levels and wave values in 0..1, beat in 0..1)
- `bpmForTrack(uri: string | undefined): number` deterministic, integer in 80..150, a fixed default for `undefined` or empty
- `createSignal(): Signal`
- `stepSignal(signal: Signal, input: { uri?: string, progressMs: number, playing: boolean, rng: () => number }): Signal` mutates and returns `signal`
- `isSilent(signal: Signal): boolean` true when every level, wave sample and the beat are 0

**Behaviour the tests pin:** `beat` is 1 at a beat boundary and decays within the beat period (`progressMs` multiple of `60000 / bpm`); paused input decays everything to exactly 0 within a bounded number of steps; the same `uri`, `progressMs` and `rng` sequence gives the same output.

- [ ] **Step 1: Write the failing tests:**
  - `bpmForTrack('spotify:track:a')` is stable across calls, is an integer in 80..150, and two different uris give a spread (assert 20 distinct uris yield at least 5 distinct values).
  - `bpmForTrack(undefined)` and `bpmForTrack('')` return the same default.
  - Playing, at `progressMs = 0` the `beat` is above 0.9; at half a beat period it is lower than at 0.
  - All of `levels`, `wave` and `beat` stay finite and inside 0..1 for 500 steps with `rng = Math.random`, for `uri: undefined` and for `progressMs: NaN` and `-5`.
  - Paused: after stepping a playing signal, 200 paused steps make `isSilent` true.
  - Determinism: two signals stepped with the same inputs and a seeded `rng` are deeply equal.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-signal.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** in `src/visualizer-signal.js`: BPM from a string hash mapped into 80..150; beat envelope from the fractional beat phase; each level chases a smoothed random target (same idea as `nextFrame` in `spectrum.js`, reuse `DECAY` and `SMOOTHING` from there) with the low bands boosted by `beat`; `wave` is a sum of two sines whose amplitude follows `beat` plus a little noise. Treat non-finite `progressMs` as 0. Add the file to `ORDER`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(FN-20): synthetic visualizer signal"` (add the three files).

---

### Task 4: Style drawing

**Files:**
- Create: `src/visualizer-styles.js`
- Modify: `scripts/build.js` (`ORDER`: after `visualizer-signal.js`)
- Test: `test/visualizer-styles.test.js`

**Consumes:** `Signal`, `STYLE_IDS`.
**Produces:**
- `COLOR_TOKENS`: `{ low: ['--spice-text', '#00ff00'], mid: ['--wa-vol-mid', '#ffff00'], high: ['--spice-notification-error', '#c60000'], accent: ['--spice-misc', '#ff9900'], back: ['--spice-main', '#000000'] }`
- `readVisualizerColors(el: HTMLElement): VizColors` (token first, fallback second, as `readColors` in `spectrum-dom.js`)
- `drawStyle(id: string, ctx: DrawContext, signal: Signal, size: { w: number, h: number }, colors: VizColors): void` where an unknown `id` draws `bars`. `DrawContext` is the subset: `clearRect, fillRect, beginPath, moveTo, lineTo, stroke, arc, fill, fillStyle, strokeStyle, lineWidth, globalAlpha`.

- [ ] **Step 1: Write the failing tests** with a recording fake context (as in `spectrum-dom.test.js`):
  - `bars`: for an all-zero signal paints only the background clear and no bars; for all levels 1 paints `BAND_COUNT` columns that stay inside `0..size.w` and `0..size.h`.
  - `scope`: issues one `moveTo` and `WAVE_SAMPLES - 1` `lineTo` calls and one `stroke`.
  - `glow`: paints at least one `arc` when `beat > 0`, and sets `globalAlpha` back to 1 afterwards.
  - Unknown id (`'nope'`) produces the same calls as `'bars'`.
  - No style ever calls a drawing method with `NaN` coordinates, for a signal full of zeros and one full of ones.
  - `readVisualizerColors` on an element without the tokens returns the fallbacks.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-styles.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the three styles as small functions in a record keyed by style id, and `drawStyle` as the lookup with the `bars` fallback. Add the file to `ORDER`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(FN-20): visualizer styles"` (add the three files).

---

### Task 5: Shared animation loop

**Files:**
- Create: `src/visualizer-loop.js`
- Modify: `scripts/build.js` (`ORDER`: after `visualizer-styles.js`)
- Test: `test/visualizer-loop.test.js`

**Consumes:** `createSignal`, `stepSignal`, `isSilent`.
**Produces:**
- `@typedef Surface = { name: string, isVisible(): boolean, isConnected(): boolean, draw(signal: Signal): void }`
- `createVisualizerLoop(options: { player: () => PlayerLike, getUri: () => string | undefined, schedule?: (cb: () => void) => number, cancel?: (id: number) => void, rng?: () => number, isHidden?: () => boolean, reducedMotion?: () => boolean }): { register(surface: Surface): () => void, wake(): void, stop(): void, isRunning(): boolean }`
- `PlayerLike` is the one in `spectrum-dom.js` plus `getProgress(): number`.

**Behaviour:** a frame is scheduled only when at least one registered surface is visible and connected, the window is not hidden, and either the player is playing or the signal is not silent. `wake()` is how play/pause, visibility and settings changes restart it. A surface whose `isConnected()` is false is unregistered. With `reducedMotion()` true (default reads `matchMedia('(prefers-reduced-motion: reduce)')`) a wake draws one frame and schedules no continuation, so the picture is static. A surface whose `draw` throws is logged once with `LOG_PREFIX` and skipped from then on, and the rest still draw.

- [ ] **Step 1: Write the failing tests** with fake `schedule` that queues callbacks and a fake player:
  - Nothing registered, `wake()` schedules nothing (`isRunning()` false).
  - One visible surface and a playing player: `wake()` schedules a frame, running it calls `draw` once with a `Signal` and schedules the next.
  - Surface invisible, or `isHidden()` true: no frame is scheduled.
  - Paused with a non-silent signal keeps running until the signal is silent, then stops by itself.
  - A surface with `isConnected()` false is dropped: its `draw` is never called and `register`'s returned unregister is safe to call afterwards.
  - Two surfaces, the first `draw` throws: the second still draws on the same frame, a `console.warn` with the prefix is emitted exactly once across 10 frames, the first is not called again after failing.
  - With `reducedMotion: () => true`, `wake()` draws exactly one frame and `isRunning()` is false afterwards.
  - `stop()` cancels the pending frame.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-loop.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `createVisualizerLoop` in `src/visualizer-loop.js`; `getProgress` read inside a try, failing to `0`. Add the file to `ORDER`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(FN-20): shared visualizer loop"` (add the three files).

---

### Task 6: Labels in three languages

**Files:**
- Create: `src/visualizer-i18n.js`
- Modify: `scripts/build.js` (`ORDER`: after `visualizer-loop.js`)
- Test: `test/visualizer-i18n.test.js`

**Produces:** `LABEL_KEYS` (the key list below), `labelsFor(locale: string | undefined): Labels` where `Labels` maps each key to a string.

Keys: `menuTitle`, `windowTitle`, `enabled`, `style`, `styleBars`, `styleScope`, `styleGlow`, `surfaceFullscreen`, `surfaceSidebar`, `surfaceMiniplayer`, `panelShow`, `panelHide`, `close`, `fullscreenToggle`, `signalNote` (says the signal is simulated, not the playing audio).

- [ ] **Step 1: Write the failing tests:** every locale (`en`, `pt-BR`, `es`) defines every key as a non-empty string; `labelsFor('pt-BR')` and `labelsFor('pt')` return Portuguese; `labelsFor('es-MX')` returns Spanish; `labelsFor('de')`, `labelsFor('')` and `labelsFor(undefined)` return English; the three languages differ for `windowTitle`.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-i18n.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** with proper accents in the Portuguese and Spanish text. Add the file to `ORDER`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(FN-20): visualizer labels in en, pt-BR and es"` (add the three files).

---

### Task 7: Settings window and profile menu entry

**Files:**
- Create: `src/visualizer-settings-dom.js`
- Modify: `scripts/build.js` (`ORDER`: after `dom.js`), `user.css` (a `wa-viz-settings` block using tokens)
- Test: `test/visualizer-settings-dom.test.js`

**Consumes:** `createSettingsStore`, `STYLE_IDS`, `labelsFor`, `LOG_PREFIX`.
**Produces:**
- `createSettingsWindow({ store, labels, doc? }): { open(): void, close(): void, isOpen(): boolean }`
- `registerProfileMenu({ store, labels, settingsWindow, MenuItem? }): () => void` where `settingsWindow` is the object from `createSettingsWindow` and `MenuItem` defaults to `Spicetify.Menu.Item`; it creates `new MenuItem(labels.menuTitle, store.get().enabled, () => settingsWindow.open())`, calls `register()`, and the returned function calls `deregister()`.

**Behaviour:** the window is an element with `role="dialog"`, `aria-modal="false"` and `aria-labelledby` pointing at its title, not blocking the page. It holds: a checkbox for `enabled`, a radio group for `style` (one radio per `STYLE_IDS`), a checkbox per surface (`fullscreen`, `sidebar`, `miniplayer`), the `signalNote` text and a close button. Changing any control calls `store.set` immediately. Focus moves to the dialog on open and back to the previously focused element on close. Escape closes it. Opening twice does not create two windows.

- [ ] **Step 1: Write the failing tests** (jsdom, fake store and fake `MenuItem` recording `register`/`deregister`):
  - Opening adds exactly one `[role="dialog"]`; a second `open()` keeps one.
  - Clicking the `glow` radio calls `store.set({ style: 'glow' })`; toggling `enabled` calls `store.set({ enabled: true })`.
  - Escape on the dialog closes it and returns focus to the element focused before `open()`.
  - The dialog title is the id referenced by `aria-labelledby`, and the inputs are reachable by their label text.
  - `registerProfileMenu` registers one item, clicking it opens the window, and the returned function deregisters.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-settings-dom.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `createSettingsWindow` and `registerProfileMenu`; style the window like the theme's other panels with tokens only. Add the file to `ORDER`.
- [ ] **Step 4: Run** the test, then `pnpm lint` for the CSS. Expected: PASS and clean.
- [ ] **Step 5: Commit.** `git commit -m "feat(FN-20): visualizer settings window and profile menu entry"` (add the four files).

---

### Task 8: Right-sidebar surface

Needs the Task 1 results (`SIDEBAR_COVER_ANCHOR`). If Task 1 marked it blocked, stop and report.

**Files:**
- Create: `src/visualizer-sidebar-dom.js`
- Modify: `scripts/build.js` (`ORDER`: after `visualizer-settings-dom.js`), `user.css` (`wa-viz-panel`)
- Test: `test/visualizer-sidebar-dom.test.js`, fixture markup under `test/fixtures/`

**Consumes:** `Surface`, `createVisualizerLoop`, `drawStyle`, `readVisualizerColors`, the store.
**Produces:** `createSidebarSurface({ store, loop, labels, root?: Document }): { mount(): void, unmount(): void }`.

**Behaviour:** `mount()` inserts a panel with a header (title and a show/hide button using `panelShow`/`panelHide`) and a canvas above the anchor from `SIDEBAR_COVER_ANCHOR`, and registers a `Surface` with the loop. The button flips `sidebarOpen` in the store. `isVisible()` is true only when `sidebar` and `sidebarOpen` are on, the canvas is connected and the panel is laid out. A MutationObserver re-inserts the panel when Spotify re-renders the sidebar, and the surface is unregistered on `unmount()`. A closed sidebar or a missing anchor mounts nothing and logs one prefixed warning only when the anchor is expected.

- [ ] **Step 1: Write the failing tests** (jsdom fixture of the sidebar built from the spike's findings, fake loop recording `register`):
  - `mount()` registers one surface and inserts one `.wa-viz-panel` immediately before the anchor.
  - Clicking the header button sets `sidebarOpen` false in the store and the surface's `isVisible()` becomes false (hidden means nothing is drawn).
  - Removing the panel from the DOM (simulating a re-render) and notifying the observer re-inserts exactly one panel.
  - A document with no anchor (sidebar closed) mounts nothing and `register` is not called.
  - With a video item in the fixture (per the spike), `isVisible()` is false.
  - `unmount()` removes the panel, disconnects the observer and calls the surface's unregister.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-sidebar-dom.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `createSidebarSurface`. Add the file to `ORDER`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(FN-20): visualizer panel in the right sidebar"` (add the files).

---

### Task 9: Fullscreen surface

Needs the Task 1 results (`FULLSCREEN_ROOT`, `FULLSCREEN_TOGGLE_HOST`). If blocked, stop and report.

**Files:**
- Create: `src/visualizer-fullscreen-dom.js`
- Modify: `scripts/build.js` (`ORDER`: after `visualizer-sidebar-dom.js`), `user.css` (`wa-viz-fullscreen`)
- Test: `test/visualizer-fullscreen-dom.test.js`, fixture under `test/fixtures/`

**Produces:** `createFullscreenSurface({ store, loop, labels, root?: Document }): { mount(): void, unmount(): void }`.

**Behaviour:** while Spotify's fullscreen view exists, a toggle button (label `fullscreenToggle`, `aria-pressed`) is attached at `FULLSCREEN_TOGGLE_HOST`. Pressing it covers the view with a canvas (`wa-viz-fullscreen`) and registers a visible surface; pressing again removes the cover and the surface becomes invisible. Leaving fullscreen removes everything. The toggle exists only when `fullscreen` and `enabled` are on in the store.

- [ ] **Step 1: Write the failing tests** (jsdom fixture of the fullscreen view from the spike):
  - With the view present the toggle appears once; absent, nothing is created.
  - Pressing the toggle shows the canvas and the surface's `isVisible()` is true; pressing again hides it and `isVisible()` is false, `aria-pressed` follows.
  - Removing the view from the DOM removes the toggle and canvas and unregisters.
  - `fullscreen: false` or `enabled: false` in the store: no toggle.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-fullscreen-dom.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add the file to `ORDER`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(FN-20): visualizer toggle in fullscreen"` (add the files).

---

### Task 10: Wiring, dormancy, compat anchors, README

**Files:**
- Modify: `src/index.js`, `scripts/build.js` (`ORDER` final check), `README.md`, `issues/FN-20-visualizer.md` (tick criteria), `issues/_index.md`
- Test: `test/visualizer-start.test.js`, `test/build.test.js` (if the `ORDER` test needs the new names)

**Produces:** `startVisualizer({ storage?, player?, labels?, deps? }): { stop(): void }`, exported from the new `src/visualizer-start.js` (add to `ORDER` before `index.js`). `index.js` calls it after `mount(INJECTIONS)`.

**Behaviour:** reads the store, registers the profile menu entry always, and only when `enabled` is true creates the loop and mounts the surfaces. Subscribing to the store mounts or unmounts the surfaces when `enabled` or a surface switch changes, and calls `loop.wake()` on every change.

- [ ] **Step 1: Write the failing tests** (`test/visualizer-start.test.js`, fake `schedule`, fake player counting listeners, fake storage):
  - **Dormant:** with default settings, `startVisualizer` registers the menu entry, schedules no frame, adds no `Player` listener, creates no canvas in the document. This is the test for the acceptance criterion about the master switch.
  - Turning `enabled` on through the store mounts the surfaces whose switches are on; turning it off unmounts all and `loop.isRunning()` is false.
  - `stop()` deregisters the menu entry and unsubscribes.
- [ ] **Step 2: Run** `pnpm vitest run test/visualizer-start.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/visualizer-start.js`, wire it into `src/index.js`, and confirm `ORDER` lists every new file in dependency order (`pnpm build` runs without the "missing from ORDER" error).
- [ ] **Step 4: Compat anchors.** Run `pnpm compat` on the installed bundle's extracted `xpui` directory. Expected: the new `data-testid` anchors from Tasks 8 and 9 appear as checked and none is reported missing. If one is reported missing, the anchor is wrong: fix the selector, not the check.
- [ ] **Step 5: README.** Add a "Visualizer" section: how to turn it on from the profile menu, the three styles, the surfaces, and one sentence saying the signal is simulated, not the playing audio.
- [ ] **Step 6: Gate.** Run `pnpm check`. Expected: lint, typecheck, test and build all green with counts reported, zero new warnings. Fix and rerun until green.
- [ ] **Step 7: Verify on the real client.** `spicetify apply`, open the profile menu, enable the visualizer, check each surface and the dormancy (switch off: the page has no `wa-viz` elements). Tick the acceptance criteria in the issue that this proves and update `issues/_index.md`.
- [ ] **Step 8: Commit.** `git commit -m "feat(FN-20): start the visualizer from the entry point"` (add the files).

---

### Task 11: Miniplayer (conditional follow-up)

Not required to close FN-20. Run it only after Task 10, and only if the spike below says yes.

**Files:**
- Modify: `issues/FN-20-visualizer.md` (spike result), then, if feasible, create `src/visualizer-miniplayer-dom.js` with its test and `ORDER` entry.

- [ ] **Step 1: Spike.** With the debug channel from Task 1, click "Open Miniplayer" and inspect `documentPictureInPicture.window` from the main page: whether Spotify's stylesheets (and so `user.css`) are present in that document, whether `theme.js` code in the main window can append a canvas to it, whether the main window's JS context is the same one (so the loop and store are shared), and how Spotify's miniplayer settings panel (Background color, Queue) is built.
- [ ] **Step 2: Decide.** Write the findings in the issue. If the theme can reach the window but not the native settings panel, the option lives in the central window only (per the issue). If the theme cannot reach the window, mark the surface not possible and open a separate issue; stop here.
- [ ] **Step 3: If feasible, implement** a surface in the same shape as Task 8 (`createMiniplayerSurface({ store, loop, labels }): { mount(), unmount() }`), test-first with a jsdom fixture of the PiP document, covering: mounts into the PiP document when it opens, unregisters and cleans up when it closes, respects `miniplayer: false`. Add to `ORDER`, wire it in `startVisualizer`, rerun `pnpm check`.
- [ ] **Step 4: Commit** the spike result alone first (`docs(FN-20): miniplayer spike`), then the surface if any.

# [FN-03] Synthetic spectrum analyzer in the display

## Type
Functional

## Description
A canvas next to the display text shows 19 bars (the owner accepted 19 over the twenty first written here: 3 px bars with 1 px gaps in 76 px, Winamp's own count) that rise and fall while the music plays, colored green, yellow, orange and red from bottom to top, with gray peaks that drop slowly, like the Winamp analyzer. The movement is synthetic because Spotify doesn't expose the audio.

## User Flow
1. Track playing: the bars move at 60fps.
2. Paused: the bars decay to zero and the animation loop stops.
3. Play again: the loop comes back.

## Requirements
- `src/spectrum.js` exports `createState(bars)`, `nextFrame(state, rng, playing)` and `colorForRow(row, totalRows)`.
- `nextFrame`: with `playing` true, each bar gets a target `rng()` smoothed against the previous target (weight 0.7 on the previous one). The bar jumps straight to the target when the target is higher, and falls 0.06 per frame when it's lower. With `playing` false, the target is 0.
- Peak per bar: it rises with the bar, and once the bar sits below the peak, the peak waits 15 frames and then falls 0.02 per frame.
- `colorForRow`: the bottom 25% green, the next 25% yellow, the next 25% orange (`--spice-misc`) and the top red.
- The `spectrum` injection in `src/dom.js` creates a `<canvas>` of 76x16 CSS pixels accounting for `devicePixelRatio`, draws 3px bars with 1px gaps and the peak as a 1px gray line, and uses `requestAnimationFrame` only while `Spicetify.Player.isPlaying()` is true or some bar is still above zero.
- It listens to `onplaypause` to restart the loop. `cleanup` cancels the frame and removes the canvas.
- `rng` is injectable so the tests stay deterministic.

## Scenarios
### Happy Path
- Music playing: lively bars, peaks dropping with a delay.

### Edge Cases
- Spotify in the background with the window hidden: `requestAnimationFrame` pauses on its own, no extra handling.
- Display too narrow for the canvas: the CSS hides the canvas below 200px of display width.

### Error Handling
- `getContext('2d')` returns null: the injection logs and gives up.

## Data Requirements
- None.

## External Dependencies
- None.

## Acceptance Criteria
- [x] Tests for `nextFrame`: the bar rises to the target, falls 0.06 per frame, goes to zero when paused, the peak holds for 15 frames and then falls.
- [x] Tests for `colorForRow` across the four bands and at the boundaries.
- [x] In Spotify, the bars move while playing and stop after a pause. Spotify's CPU usage while paused matches running without the extension (check in Activity Monitor). Met for the analyser itself and for the whole extension with a static marquee; a long title scrolling keeps the FN-02 marquee's layout cost until FN-09, see the record below.
- [x] `pnpm build` run and `theme.js` updated. `pnpm check` green.

## Dependencies
- FN-01

---

# Implementation Plan

## Prerequisites
- FN-01 (`mount`, `Injection`) and FN-02 (the `<feature>-dom.js` pattern, `ORDER` in the build, `INJECTIONS` in `src/index.js`) are done.
- Spotify with `--remote-debugging-port=9222` for the on-screen check; Activity Monitor for the CPU criterion.

## Reusable Code Found
- `src/dom.js` — `mount`, `Injection`, `LOG_PREFIX`. The spectrum is the second entry in `INJECTIONS`.
- `src/marquee-dom.js` — the shape to copy: factory with injectable collaborators, closure state, `run(display)` inserting an element, `cleanup` tolerant of a half-failed run. Its `ResizeObserver` guard is the pattern for the "narrow display" edge case.
- `scripts/build.js` — `ORDER` already has `spectrum.js` before `dom.js`; `spectrum-dom.js` needs an entry after `marquee-dom.js`.
- `test/marquee-dom.test.js` — jsdom test conventions: fake player, `vi.useFakeTimers`, `afterEach` cleanup, injection stubs.
- `user.css` `:root` — `--wa-spectrum-w: 84px` reserves the strip; the widget is `position: relative` (checked live), so the canvas can sit absolutely inside the padding. Colour tokens available: `--spice-text` (green #00ff00), `--wa-vol-mid` (yellow #ff0), `--spice-misc` (orange #ff9900), `--spice-notification-error` (red #c60000), `--wa-bevel-light` (#5a5a6e) for the peak.

## Live DOM (1.3.0.277, through the debug port)
- Display 491x64 px, `display: flex`, `align-items: center`, `position: relative`, padding `4px 84px 4px 4px`. Children end at x=399; the strip 407..487 is free. `devicePixelRatio` is 2.
- `Spicetify.Player.isPlaying()` is `!Spicetify.Player.origin._state.isPaused` (read in `spicetifyWrapper.js`): it does not go through `Player.data`, so it answers correctly right after `waitForSpicetify` and the FN-02 data poll is not needed here. `onplaypause` fires from the wrapper's `update` listener when `isPaused` flips.

## Architecture Decisions
- **19 bars, not 20.** 3 px bars with 1 px gaps in a 76 px canvas give 19 (19 × 4 − 1 = 75); 20 need 79 px. Winamp's own analyser was 75 px wide with 19 bands, so 19 is the faithful number and the strip stays 84 px. The issue text says twenty; flagged below.
- **Pure state in `src/spectrum.js`, drawing and scheduling in `src/spectrum-dom.js`.** `nextFrame` mutates the state in place and returns it (one object per injection, 60 fps, no allocation), `colorForRow` returns a band name (`green | yellow | orange | red`); the DOM side maps bands to CSS tokens read once from the canvas's computed style, with the hex values above as fallbacks in one `COLOR_TOKENS` table.
- **Rows, not pixels, in the pure module.** The canvas is 16 CSS px tall so `ROWS = 16`; `drawFrame` paints `round(value × ROWS)` 1 px rows per bar and one gray row for the peak. `colorForRow(row, ROWS)` is called per row, giving the discrete bands the spec asks for.
- **The loop runs only while there is something to animate.** `frame()` calls `nextFrame(state, rng, playing())`, draws, and schedules the next frame only if `playing()` or any bar or peak is above zero. `onplaypause` calls `start()`, which schedules a frame if none is pending. Pausing therefore lets the bars decay to zero, then the loop stops on its own; no timer runs while paused.
- **Collaborators are injectable:** `createSpectrumInjection({ rng = Math.random, player = () => Spicetify.Player, schedule = requestAnimationFrame, cancel = cancelAnimationFrame })`. Tests drive frames by capturing `schedule` callbacks; `rng` is a fixed sequence. jsdom has no canvas 2D context, so tests stub `HTMLCanvasElement.prototype.getContext` with a recorder, and the null-context path is the "logs and gives up" case.
- **The canvas is absolutely positioned inside the display's right padding** (`right: 4px; top: 50%; translateY(-50%)`), so it does not take part in the flex row and the marquee keeps its width. A `ResizeObserver` on the display toggles the `hidden` attribute when `display.clientWidth < 200`, the same guard as the marquee; no container query, because `container-type` on a flex item changes its intrinsic sizing.
- **`playing()` is guarded**: `try { return player().isPlaying() } catch { return false }`, since `origin._state` is reached through a getter that can be undefined for a moment.

## Files to Create
| File | Purpose |
|------|---------|
| `src/spectrum.js` | `createState`, `nextFrame`, `colorForRow`, constants |
| `src/spectrum-dom.js` | canvas, drawing, animation loop, `onplaypause`, resize guard |
| `test/spectrum.test.js` | pure tests from the criteria |
| `test/spectrum-dom.test.js` | jsdom test with fake player, rng, scheduler and 2D context |

### src/spectrum.js
- `export const BARS = 19; export const ROWS = 16; export const DECAY = 0.06; export const SMOOTHING = 0.7; export const PEAK_HOLD = 15; export const PEAK_FALL = 0.02;`
- `export function createState(bars = BARS)`: `{ values: Float64Array | number[], targets, peaks, holds }` all length `bars`, zeros. Plain arrays are fine.
- `export function nextFrame(state, rng, playing)`: for each bar `i`: `target = playing ? SMOOTHING * targets[i] + (1 - SMOOTHING) * rng() : 0`; `targets[i] = target`; `values[i] = target > values[i] ? target : Math.max(0, values[i] - DECAY)`; peak: `if (values[i] >= peaks[i]) { peaks[i] = values[i]; holds[i] = PEAK_HOLD } else if (holds[i] > 0) holds[i] -= 1; else peaks[i] = Math.max(0, peaks[i] - PEAK_FALL)`. Returns `state`.
- `export function colorForRow(row, totalRows)`: `band = Math.floor((row / totalRows) * 4)` clamped to 0..3; returns `['green', 'yellow', 'orange', 'red'][band]`. With 16 rows: 0-3 green, 4-7 yellow, 8-11 orange, 12-15 red.
- `export function isIdle(state)`: true when every value and peak is 0; the DOM side uses it to stop the loop.

### src/spectrum-dom.js
- Imports `LOG_PREFIX` from `./dom.js` and the module above.
- `export const SPECTRUM_CLASS = 'wa-spectrum'; export const CANVAS_W = 76; export const CANVAS_H = 16; export const BAR_W = 3; export const GAP = 1; export const MIN_DISPLAY_W = 200;`
- `export const COLOR_TOKENS = { green: ['--spice-text', '#00ff00'], yellow: ['--wa-vol-mid', '#ffff00'], orange: ['--spice-misc', '#ff9900'], red: ['--spice-notification-error', '#c60000'], peak: ['--wa-bevel-light', '#5a5a6e'] }`; `readColors(el)` resolves each through `getComputedStyle(el).getPropertyValue(token).trim() || fallback`.
- `export function drawFrame(ctx, state, colors)`: `clearRect`, then per bar `x = i * (BAR_W + GAP)`, `rows = Math.round(values[i] * ROWS)`, for `row` in `0..rows-1` `fillStyle = colors[colorForRow(row, ROWS)]`, `fillRect(x, CANVAS_H - 1 - row, BAR_W, 1)`; peak row `Math.round(peaks[i] * ROWS) - 1` painted with `colors.peak` when `>= 0`. Pure over `ctx`, so a recorder can assert it.
- `export function createSpectrumInjection({ rng, player, schedule, cancel } = {})`: closure `canvas`, `ctx`, `state`, `pending` (frame id or null), `resize`, `colors`. `run(display)`: create `canvas.wa-spectrum`, size `CANVAS_W * dpr` × `CANVAS_H * dpr` with CSS size in px, `ctx = canvas.getContext('2d')`; if null `console.warn(\`${LOG_PREFIX} spectrum: no 2d context\`)`, remove the canvas and return; `ctx.scale(dpr, dpr)`; append to `display`; `colors = readColors(canvas)`; `state = createState()`; register `onplaypause` → `start`; resize guard as in the marquee; `start()`. `frame()`: `pending = null; nextFrame(state, rng, playing()); drawFrame(ctx, state, colors); if (playing() || !isIdle(state)) start();`. `start()`: `if (pending === null) pending = schedule(frame)`. `cleanup`: `cancel(pending)` if pending, disconnect resize, remove the listener, remove the canvas, null the refs.
- Keep it under ~130 lines.

## Files to Modify
| File | Changes |
|------|---------|
| `src/index.js` | `INJECTIONS = [createMarqueeInjection(), createSpectrumInjection()]` |
| `scripts/build.js` | `ORDER` gains `'spectrum-dom.js'` after `'marquee-dom.js'` |
| `user.css` | `.wa-spectrum` rule in the now playing bar block; `--wa-spectrum-w` comment updated |
| `theme.js` | regenerated |

### user.css
- Next to the marquee rule: `.main-nowPlayingBar-nowPlayingBar .wa-spectrum { position: absolute; right: 4px; top: 50%; width: 76px; height: 16px; transform: translateY(-50%); image-rendering: pixelated; }`. The `hidden` attribute from the resize guard already yields `display: none` through the UA stylesheet; no extra rule.
- The `--wa-spectrum-w` comment stops saying "that FN-03 mounts there" and states the 76 px canvas plus 4 px on each side.

## Data Requirements
None.

## Testing Strategy
- `test/spectrum.test.js`: `createState` shape; `nextFrame` with `rng = () => 1` and `playing` true rises to the smoothed target (`0.3` on the first frame, then `0.51`, …); with `rng = () => 0` the bar falls exactly `DECAY` per frame and clamps at 0; `playing` false drives targets to 0 so bars decay; the peak follows the bar up, holds for `PEAK_HOLD` frames while the bar is lower, then falls `PEAK_FALL` per frame; `isIdle` is false while any peak is above zero and true once all are 0. `colorForRow` at rows 0, 3, 4, 7, 8, 11, 12, 15 of 16 and a clamp check at `row = total`.
- `test/spectrum-dom.test.js` (jsdom): stub `HTMLCanvasElement.prototype.getContext` to return a recorder `{ scale, clearRect, fillRect, fillStyle }` collecting `fillRect` calls; fake player `{ isPlaying, addEventListener, removeEventListener, emit }`; `schedule` pushes callbacks into a queue, `cancel` marks them; `rng = () => 1`. Cases: `run` appends a canvas with `width = 76 * devicePixelRatio` and the CSS size; the first frame paints bars (fillRect calls with the green colour at the bottom row); while playing each drained frame schedules another; after `isPlaying` flips false and `onplaypause` fires, frames continue until `isIdle` and then no new frame is scheduled (queue empty); a null context warns with the prefix, leaves no canvas and schedules nothing; `cleanup` cancels the pending frame, removes the listener and the canvas. `drawFrame` alone: a state with one bar at 1.0 paints 16 rows in the four bands and the peak row.
- On screen: `spicetify apply`, relaunch with the port, play; sample `canvas` presence and, through CDP, `Spicetify.Player.isPlaying()` plus a snapshot of the canvas (`toDataURL`) twice to see change; pause, wait 2 s, confirm no `requestAnimationFrame` activity (wrap `requestAnimationFrame` with a counter through CDP and read it after a pause). Activity Monitor for the CPU criterion, paused vs. the no-extension baseline, recorded in the issue.
- Refresh `docs/screenshots/player.png` with the analyser visible.

## Implementation Order
1. `src/spectrum.js` and `test/spectrum.test.js`.
2. `scripts/build.js` `ORDER`, `src/spectrum-dom.js`, `test/spectrum-dom.test.js`.
3. `user.css`.
4. `src/index.js`, `pnpm build`, `pnpm check`.
5. On-screen check, CPU check, screenshot.

## Unknowns
- **20 vs 19 bars.** The issue and the spec say twenty; the geometry (3 px + 1 px in 76 px) and Winamp's own analyser say 19. The plan goes with 19; if the owner wants 20, the canvas becomes 79 px and `--wa-spectrum-w` 87 px.
- Whether `requestAnimationFrame` keeps firing in Spotify's CEF when the window is in the background; the spec assumes it pauses. Checked with the counter during the on-screen step and recorded.

---

# Found during execution

- On screen (1.3.0.277): the canvas is 152x32 device pixels for 76x16 CSS pixels at dpr 2, 4 px from the display's right edge; `toDataURL` differs between two samples 300 ms apart while playing; after a pause the `requestAnimationFrame` rate measured through a counter on `window` drops to 0 per second and the canvas stops changing. Playing, the analyser loop costs about 14% of a core in the CPU profile (paint at 60 fps), inside what Spotify itself spends while playing.
- **Paused CPU, the criterion, exposed two problems outside this issue.** With a short title (static marquee) the profile is 98.7% idle, the same as the no-extension baseline. With a long title the FN-02 marquee cost about 90% of a core: `spicetifyWrapper.js` observes `body` for `childList` mutations and on each one runs `querySelectorAll('*')` plus `getComputedStyle` on every element (its "scroll optimization"), behind a version gate `e[1] >= 2 && e[2] >= 57` that reads 1.3.0 as `3 >= 2 && 0 >= 57` and so never turns the scan off on 1.3.x. `textContent = view` replaces the text node and is a childList mutation. Fixed here by rewriting one text node's `data` in place (`src/marquee-dom.js`, with a test): the wrapper drops from 52% to 0.2% of the profile. Reported upstream with the css-map findings.
- Even without the wrapper, a DOM text change at 5 Hz leaves about 34% of a core: `Performance.getMetrics` shows 20 layouts in 4 s at 30 to 60 ms each, and a `position: fixed; contain: strict` probe outside the bar pays the same, so every layout pass on this page is that expensive. Probes in the display: DOM text 34%, `transform` on its own layer 14%, canvas `fillText` 1.4%. The marquee moves to a canvas in FN-09; the CPU criterion here is met with the static marquee and depends on FN-09 for long titles.
- Baseline measured with `inject_theme_js 0` and a relaunch: renderer at 23 to 27% paused (Spotify's own now playing view video), 27 to 60% playing. `ps %cpu` is a lifetime average and useless for this; `top -l N -pid` gives the instantaneous figure, and the CDP `Profiler` plus `Performance.getMetrics` say where the time goes.
- `Spicetify.Player.playUri` on a wrong track id empties the player and removes the widget; the observer picked it back up when a playlist was played.

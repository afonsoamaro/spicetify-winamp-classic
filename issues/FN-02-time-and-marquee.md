# [FN-02] Time formatting and display marquee

## Type
Functional

## Description
The now playing bar display shows `ARTIST - TITLE (mm:ss)` in uppercase and scrolls the text when it doesn't fit, the way Winamp did.

## User Flow
1. A track starts playing.
2. The display shows the formatted text. If it fits, it stays still.
3. If it doesn't fit, it scrolls one character to the left every 200ms, with `  ***  ` between loops.
4. On track change (`songchange`), the text and the offset reset.

## Requirements
- `src/time.js` exports `formatTime(ms)`, returning `m:ss`, and `h:mm:ss` past one hour. Negative or non-numeric values return `0:00`.
- `src/marquee.js` exports `displayText({ artist, title, durationMs })` and `scrollStep(text, offset, width)`, which returns the visible window of `width` characters plus the next offset with wrap.
- The `marquee` injection in `src/dom.js` replaces the text content of the display, measures the width in characters from the container width and the font size, and uses a 200ms `setInterval` only when the text doesn't fit.
- It listens to `Spicetify.Player.addEventListener('songchange')` and clears the interval in `cleanup`.
- Names come from `Spicetify.Player.data.item`, falling back to an empty string.

## Scenarios
### Happy Path
- Short track: the text stays still. Long track: it scrolls and comes back to the start after the separator.

### Edge Cases
- Track with no artist (podcast): shows the title only.
- Title with non-ASCII characters: kept as is, the pixel font falls back to monospace.
- Resizing the window changes the width: recalculated on the next track change, or every 2s.

### Error Handling
- `Spicetify.Player.data` undefined: the display shows `WINAMP` and nothing breaks.

## Data Requirements
- None.

## External Dependencies
- None.

## Acceptance Criteria
- [ ] Tests for `formatTime` with 0, 59s, 1min, 59min59s, 1h, a negative value and `NaN`.
- [ ] Tests for `displayText` with and without an artist, and with duration.
- [ ] Tests for `scrollStep` with text shorter than the width (fixed offset), equal to it, and longer (wrap with separator).
- [ ] In Spotify, the display scrolls with a long title and stays still with a short one.
- [ ] `pnpm build` run and `theme.js` updated. `pnpm check` green.

## Dependencies
- FN-01

---

# Implementation Plan

## Prerequisites
- FN-01 is done: `src/dom.js` exports `mount` and the `Injection` shape `{ name, run(display), cleanup?(display) }`, and `src/index.js` holds the `INJECTIONS` list this issue fills.
- Spotify running with `--remote-debugging-port=9222` for the on-screen check (`cdp.mjs` and `cdp-console.mjs` in the session scratchpad).

## Reusable Code Found
- `src/dom.js` — `mount` handles readiness, lookup and remount; the injection only has to mount into the `display` it receives and undo itself in `cleanup`. `LOG_PREFIX` for logs.
- `scripts/build.js` — `ORDER` already lists `time.js` and `marquee.js` before `dom.js`; `build` skips files that do not exist, so creating them needs no build change. The new DOM-side file does need an `ORDER` entry (see decisions).
- `test/dom.test.js` — pattern for jsdom tests: docblock on line 1, `vi.useFakeTimers()` with `vi.advanceTimersByTimeAsync`, `afterEach` restoring mocks and timers, injection stubs with a shared `log` array.
- `types/globals.d.ts` — `Spicetify.Player.data: PlayerState` (a plain value updated by Spicetify's wrapper, not a getter; checked live), `PlayerState.item: PlayerTrack` with `name`, `artists?: { name }[]`, `duration.milliseconds`, `metadata.artist_name`; `Player.addEventListener("songchange", cb)` and `Player.removeEventListener`.
- `user.css` block `=== Now playing bar ===` lines 104-135 — the display rule (`[data-testid="now-playing-widget"]`, right padding `--wa-spectrum-w`) and the track info font rules. The marquee element gets its rule in the same block, next to them.

## Live DOM (1.3.0.277, through the debug port)
- The display `div.main-nowPlayingWidget-nowPlaying` is a flex row: cover slot (`[data-testid="CoverSlotCollapsed__container"]`), `div.main-nowPlayingWidget-trackInfo.main-trackInfo-container` (291x34 px, two lines: name and artists, each a React tree of links), then `div.main-nowPlayingWidget-actionButtonWrapper`. Display 491x64 px with padding `4px 84px 4px 4px`.
- Silkscreen is proportional at 11px: `I` 4.13 px, `M` 9.63 px, digit 8.25 px, average of A-T 7.9 px. "Width in characters" is therefore an estimate; canvas `measureText` with the element's computed font is the honest measure, and `document.fonts.check('11px Silkscreen')` is true once the theme loads.
- Replacing a React-owned node with a clone (the FN-01 probe did that) leaves a dead copy on screen; the extension must never rewrite the text React renders. It adds its own element and hides the original through CSS.

## Architecture Decisions
- **The marquee is a sibling element, not a rewrite of Spotify's text.** `run(display)` inserts `<div class="wa-marquee">` right after `.main-nowPlayingWidget-trackInfo` (fallback: append to `display`), and `user.css` hides the track info while a `.wa-marquee` is present through `:has()`. `cleanup` removes the element and the track info comes back on its own. No React node is touched, so a remount is safe and the theme without JS still shows Spotify's text.
- **The DOM side of the marquee lives in `src/marquee-dom.js`, not in `src/dom.js`.** The issue text says "in `src/dom.js`", but that module is the generic mounting layer verified in FN-01 and three injections (FN-02, FN-03, FN-05) would push it past 300 lines with mixed responsibilities. One file per injection, named `<feature>-dom.js` next to the pure `<feature>.js`, keeps the pure/DOM split the spec asks for. `ORDER` in `scripts/build.js` gains `marquee-dom.js` after `dom.js` and before `index.js`. Flagged below as a deviation for the owner to veto.
- **Measuring is injectable.** `createMarqueeInjection({ measure, player })` takes a `measure(el, text) -> px` (default: canvas `measureText` with the element's computed `font`) and a `player()` accessor (default: `Spicetify.Player`). jsdom has no canvas and no Spicetify, so the tests pass fakes; production uses the defaults. The visible window in characters is `floor(availablePx / (measure(text) / text.length))`, the per-text average width. `overflow: hidden` on the element absorbs the rounding.
- **Fits or scrolls, decided per text.** `measure(el, text) <= el.clientWidth` means static text and no timer. Otherwise `setInterval` at 200 ms drives `scrollStep`. `songchange` rebuilds text and offset. A `ResizeObserver` on the display (guarded by `typeof ResizeObserver !== 'undefined'`) re-evaluates on width changes, which covers the "resize" edge case without a 2 s poll; when the API is missing, the next `songchange` recalculates, which the issue accepts.
- **Text shape.** `describeItem(item)` (pure, in `marquee.js`) reduces `PlayerTrack` to `{ artist, title, durationMs }`: artist is `artists.map(name).join(', ')`, else `metadata.artist_name`, else `''`; title is `name`, else `metadata.title`, else `''`; duration from `duration.milliseconds`. `displayText` then gives `ARTIST - TITLE (m:ss)`, `TITLE (m:ss)` without artist, and `WINAMP` when both are empty (which is also the `Player.data` undefined case). Duration is appended only when `> 0`.
- **`formatTime` is our own** even though `Spicetify.Player.formatTime` exists: the spec names `time.js`, the hours case and the `0:00` fallback are ours, and the pure module stays testable outside Spotify.

## Files to Create
| File | Purpose |
|------|---------|
| `src/time.js` | `formatTime(ms)` |
| `src/marquee.js` | `describeItem`, `displayText`, `scrollStep`, `SEPARATOR` |
| `src/marquee-dom.js` | `createMarqueeInjection` with measure, timer, `songchange` and resize handling |
| `test/time.test.js` | `formatTime` cases from the criteria |
| `test/marquee.test.js` | `describeItem`, `displayText`, `scrollStep` |
| `test/marquee-dom.test.js` | jsdom test of the injection with fake measure, fake player and fake timers |

### src/time.js
- `// @ts-check`, comment: pure, no DOM.
- `export function formatTime(ms)`: `if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '0:00'`; `total = Math.floor(ms / 1000)`; `h = floor(total / 3600)`, `m = floor((total % 3600) / 60)`, `s = total % 60`; `h > 0 ? \`${h}:${pad(m)}:${pad(s)}\` : \`${m}:${pad(s)}\`` with `pad = (n) => String(n).padStart(2, '0')`.

### src/marquee.js
- Imports `formatTime` from `./time.js`.
- `export const SEPARATOR = '  ***  ';`
- `export function describeItem(item)`: JSDoc param `Spicetify.PlayerTrack | undefined`; returns `{ artist, title, durationMs }` as decided above; every read optional-chained.
- `export function displayText({ artist, title, durationMs })`: trims both strings; `base = artist && title ? \`${artist} - ${title}\` : title || artist || 'WINAMP'`; append `\` (${formatTime(durationMs)})\`` when `durationMs > 0`; return `base.toUpperCase()`.
- `export function scrollStep(text, offset, width)`: `if (width <= 0) return { view: '', offset: 0 }`; `if (text.length <= width) return { view: text, offset: 0 }`; `loop = text + SEPARATOR`; `start = offset % loop.length`; `view = (loop + loop).slice(start, start + width)`; return `{ view, offset: (start + 1) % loop.length }`.

### src/marquee-dom.js
- Imports `LOG_PREFIX` from `./dom.js` and `describeItem, displayText, scrollStep` from `./marquee.js`.
- `export const MARQUEE_CLASS = 'wa-marquee'`, `export const TICK_MS = 200`, `export const TRACK_INFO_SELECTOR = '.main-nowPlayingWidget-trackInfo'`.
- `export function canvasMeasure(el, text)`: `ctx = document.createElement('canvas').getContext('2d')`; if null return `text.length * 8`; `ctx.font = getComputedStyle(el).font`; return `ctx.measureText(text).width`.
- `export function createMarqueeInjection({ measure = canvasMeasure, player = () => Spicetify.Player } = {})`: closure state `el`, `timer`, `resize`, `text`, `offset`, `onSongChange`. Returns `{ name: 'marquee', run(display), cleanup() }`.
  - `run`: create `div.wa-marquee`, insert after `display.querySelector(TRACK_INFO_SELECTOR)` or append; `refresh()`; `player().addEventListener('songchange', onSongChange)`; `ResizeObserver` on `display` calling `layout()` when available.
  - `refresh()`: `text = displayText(describeItem(player().data?.item))`; `offset = 0`; `layout()`.
  - `layout()`: clear timer; `px = el.clientWidth`; if `measure(el, text) <= px` set `el.textContent = text` and return; `width = Math.max(1, Math.floor(px / (measure(el, text) / text.length)))`; `tick()` once, then `timer = setInterval(tick, TICK_MS)`.
  - `tick()`: `({ view, offset } = scrollStep(text, offset, width))`, `el.textContent = view`.
  - `cleanup`: clear timer, disconnect resize, `removeEventListener('songchange', onSongChange)`, `el.remove()`, null the refs. Every step tolerant of a missing ref so a half-failed `run` still cleans.
- Keep the file under ~120 lines.

## Files to Modify
| File | Changes |
|------|---------|
| `src/index.js` | import `createMarqueeInjection`, `INJECTIONS = [createMarqueeInjection()]` |
| `scripts/build.js` | `ORDER` gains `'marquee-dom.js'` between `'dom.js'` and `'index.js'` |
| `user.css` | `.wa-marquee` rule and the `:has()` rule hiding the track info, in the now playing bar block |
| `theme.js` | regenerated |

### src/index.js
- `import { createMarqueeInjection } from './marquee-dom.js';` and `const INJECTIONS = [createMarqueeInjection()];`. Nothing else changes.

### scripts/build.js
- `ORDER = ['time.js', 'marquee.js', 'spectrum.js', 'dom.js', 'marquee-dom.js', 'index.js']`. The comment above it already explains the dependency rule.

### user.css
- After the track info color rules (line 135), add: `.main-nowPlayingBar-nowPlayingBar .wa-marquee { flex: 1 1 auto; min-width: 0; overflow: hidden; align-self: center; font-family: var(--wa-font-pixel); font-size: 11px; line-height: 1; white-space: pre; color: var(--spice-text); text-transform: uppercase; letter-spacing: 0; }` and `.main-nowPlayingBar-nowPlayingBar .main-nowPlayingWidget-nowPlaying:has(.wa-marquee) .main-nowPlayingWidget-trackInfo { display: none; }`. A short comment saying the element is created by `marquee-dom.js` and that Spotify's text stays in the DOM for the no-JS case.
- `white-space: pre` matters: the separator has double spaces.

## Data Requirements
None.

## Testing Strategy
- `test/time.test.js`: `0 -> 0:00`, `59000 -> 0:59`, `60000 -> 1:00`, `3599000 -> 59:59`, `3600000 -> 1:00:00`, `-5 -> 0:00`, `NaN -> 0:00`, plus `'12'` (string) `-> 0:00` and `61500 -> 1:01` (floor, not round).
- `test/marquee.test.js`: `displayText` with artist and title and duration (`QUEEN - SPREAD YOUR WINGS (4:34)`), without artist (`TITLE (m:ss)`), with neither (`WINAMP`), with `durationMs` 0 (no parentheses), non-ASCII kept; `describeItem` with `artists` array of two, with `metadata.artist_name` only, with `undefined` item; `scrollStep` shorter than width (view is the text, offset 0), equal to width (same), longer (window slides one char per call, separator appears, wraps back to the start after `text.length + SEPARATOR.length` calls), `width` 0.
- `test/marquee-dom.test.js` (jsdom, fake timers): fake player `{ data: { item }, addEventListener, removeEventListener }` recording listeners; fake `measure = (el, text) => text.length * 8`; `Object.defineProperty(el, 'clientWidth', { value: 80 })` on the created element (jsdom has no layout, so define it after `run` through a `MutationObserver`-free approach: read the element back from the display and define it, then call the `songchange` listener to re-layout). Cases: short text is static (textContent equals text, no interval fired after 1 s); long text advances one char per 200 ms and shows the separator; `songchange` resets to offset 0 with the new item; `cleanup` removes the element, stops the timer and removes the listener; `player().data` undefined shows `WINAMP`.
- On screen: `spicetify apply`, relaunch with the port, play a track with a long title and one with a short title; `cdp.mjs` reads `.wa-marquee` textContent twice 400 ms apart to see the shift; capture `docs/screenshots/player.png` again if the display changed visibly.

## Implementation Order
1. `src/time.js` and `test/time.test.js`.
2. `src/marquee.js` and `test/marquee.test.js`.
3. `scripts/build.js` `ORDER`, `src/marquee-dom.js`, `test/marquee-dom.test.js`.
4. `user.css` rules.
5. `src/index.js`, `pnpm build`, `pnpm check`.
6. On-screen check through the debug port; screenshot.

## Unknowns
- Whether `:has()` on the widget performs fine in Spotify's CEF; it is Chromium 120+ so it should. If not, `run` can toggle a class on `display` instead and `cleanup` removes it.
- Hiding the track info removes the title and artist links from the bar. Winamp had no links there, and the info is still reachable through the cover button and the now playing view; if the owner wants the links back, the marquee can sit above the track info with `pointer-events: none` instead of replacing it.
- The deviation from the issue text (`marquee-dom.js` instead of `dom.js`) is a call for the owner; the rest of the plan does not change if it goes back into `dom.js`.

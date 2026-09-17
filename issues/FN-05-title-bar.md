# [FN-05] WINAMP title bar

## Type
Functional

## Description
A 14px strip above the now playing bar with the classic gradient, the word "WINAMP" centered in white pixel font and three decorative squares on the right (minimize, shade, close), visual only.

## User Flow
1. Spotify opens with the theme.
2. The strip appears at the top of the now playing bar and stays there when switching screens.

## Requirements
- The `titlebar` injection in `src/dom.js` creates a `div` with class `wa-titlebar` as the first child of the now playing bar, holding the text and three decorative `span` elements.
- The styling comes from `user.css`: gradient from `--wa-titlebar-start` to `--wa-titlebar-end`, `--wa-white` text in the pixel font, 9px squares with a raised bevel.
- The now playing bar grows 14px taller via CSS so the strip fits without covering the controls.
- `cleanup` removes the `div`. Re-injection doesn't duplicate it.
- The squares have no click handler.

## Scenarios
### Happy Path
- Strip visible on every screen, never overlapping the progress bar.

### Edge Cases
- Miniplayer or full screen: the strip follows the bar or disappears along with it, leaving nothing behind in the DOM.

### Error Handling
- Now playing bar not found: warning log and nothing gets inserted.

## Data Requirements
- None.

## External Dependencies
- None.

## Acceptance Criteria
- [ ] Vitest test with jsdom: the injection inserts a single `.wa-titlebar` even when it runs twice, and `cleanup` removes it.
- [ ] In Spotify, the strip shows up without covering the controls and without duplicating after switching devices.
- [ ] `pnpm build` run and `theme.js` updated. `pnpm check` green.

## Dependencies
- FN-01, PP-02

## Verification (automated + live, 2026-09-16, branch `feat/fn-05-title-bar`)

- `pnpm check` green: 9 files, 93/93 tests (4 new titlebar suites), `theme.js` rebuilt with `titlebar-dom.js` registered in `scripts/build.js` ORDER.
- Live (Spotify 1.3.0.277): strip is the first child of the inner `DIV.main-nowPlayingBar-nowPlayingBar`, 14px tall, full width, gradient `rgb(28,28,42)→rgb(58,…)`, Silkscreen label, bar `padding-top: 14px`, three 9x9 squares. Screenshot confirms no overlap with the transport controls.
- Follow-up found live: `[data-testid="now-playing-bar"]` is an ASIDE container, not the bar; the mount target is the inner `.main-nowPlayingBar-nowPlayingBar` (new `NOW_PLAYING_BAR_SELECTOR` in `dom.js`), with fallback to the container and then the display. Device-switch duplication is covered by the shared cleanup-before-rerun in `mount()`.

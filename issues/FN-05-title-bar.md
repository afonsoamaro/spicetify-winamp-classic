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

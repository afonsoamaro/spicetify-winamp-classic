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

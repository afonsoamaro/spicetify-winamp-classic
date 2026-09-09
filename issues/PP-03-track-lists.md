# [PP-03] Prototype: track list as the playlist window

## Type
Prototype (visual only)

## Description
Every track list (playlist, album, queue, search results) becomes Winamp's playlist window: black, green pixel text, the playing track in white, selection in blue.

## Visual Elements
- Black `var(--spice-main)` background on the table and on the container.
- Rows in `var(--spice-text)` with the pixel font at 12px.
- The playing track in `var(--wa-white)`.
- Hover and selection with a `var(--spice-selected-row)` background and white text.
- Number, artist and title on the same line, as `1. Artist - Title`, done in CSS where the DOM allows it. Where it doesn't, keep Spotify's columns and only apply color and font.
- Duration right-aligned in green.
- Table header with the panel background, a raised bevel and white text, like the bar of the playlist window.
- Row action buttons (like, more options) in green, no background.

## Layout Notes
- Commented block `/* === Track lists === */`.
- Cover every list variant: playlist, album, queue, search, artist.

## Mock Data
- A playlist with more than 50 tracks and one of them playing. An album. The queue.

## Acceptance Criteria
- [ ] All five list variants show up green on black with the playing track in white.
- [ ] Hover and selection in blue with white text.
- [ ] Header with a bevel and no rounding.
- [ ] Scrolling and clicking still work.
- [ ] Screenshot at `docs/screenshots/playlist.png`.

## Dependencies
- PP-01

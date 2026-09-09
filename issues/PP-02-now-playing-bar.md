# [PP-02] Prototype: now playing bar as Winamp's main window

## Type
Prototype (visual only)

## Description
Spotify's now playing bar becomes the Winamp 2.x main window: gray with bevels, a black display with green text in the pixel font, square 3D buttons and sliders with a rectangular knob. CSS only. The marquee, the spectrum analyzer and the title bar come with the FN issues.

## Visual Elements
- `var(--spice-player)` background with a raised bevel on the outer edge.
- The track info block as a sunken black display, title and artist in `var(--spice-text)` in the pixel font, with room reserved on the right for the spectrum analyzer canvas (FN-03).
- Elapsed time in a bigger pixel font than the duration, both in green.
- Transport buttons (previous, play/pause, next, shuffle, repeat) square, `var(--spice-button)` background, raised bevel, black icon. Pressed and active states use a sunken bevel.
- Progress bar with a dark sunken track and a rectangular gray knob with a bevel, track height 10px.
- Volume with a track in a green, yellow and red gradient from left to right, and the same knob.
- The buttons on the right (queue, devices, lyrics, miniplayer) in the same style as the transport buttons.
- Cover art with a 2px sunken border.

## Layout Notes
- Keep Spotify's default bar height so the layout of the rest of the app doesn't break.
- Selectors grouped in a single commented block `/* === Now playing bar === */`, independent from the other areas.

## Mock Data
- Any track playing. Check with a long title and a short one.

## Acceptance Criteria
- [ ] The bar renders with a gray panel, a black display and green pixel text.
- [ ] Buttons, progress and volume have bevels and no rounding.
- [ ] Hover, pressed and active states on the buttons are visible.
- [ ] No control lost its click or its drag.
- [ ] Screenshot of the bar saved to `docs/screenshots/player.png`.

## Dependencies
- PP-01

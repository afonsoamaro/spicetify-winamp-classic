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
- [x] The bar renders with a gray panel, a black display and green pixel text.
- [x] Buttons, progress and volume have bevels and no rounding.
- [x] Hover, pressed and active states on the buttons are visible.
- [x] No control lost its click or its drag.
- [x] Screenshot of the bar saved to `docs/screenshots/player.png`.

## Dependencies
- PP-01

---

# Implementation Plan

Research done on 2026-09-10 against Spotify 1.2.99.317 with the theme applied, reading the unpacked bundle at `/Applications/Spotify.app/Contents/Resources/Apps/xpui/`.

## Prerequisites
- PP-01 done: the pixel font is embedded, `--wa-raised` and `--wa-sunken` exist, and every corner is already square.
- Spotify 1.2.99.317. After a Spotify update the theme has to be reapplied with `spicetify backup apply`, because an update rewrites the app files and the old backup no longer matches.

## Reusable Code Found
- `user.css:23-24`: `--wa-raised` and `--wa-sunken`, the bevel shadow lists from PP-01. Every panel and button here consumes them; do not write new inset shadows.
- `user.css:19`: `--wa-font-pixel`, already loaded and ready. This issue is the first consumer.
- `user.css:13-18`: `--wa-bevel-light`, `--wa-bevel-dark`, `--wa-titlebar-start`, `--wa-titlebar-end`, `--wa-white`. Any new value belongs in this block, never inline in a rule.
- `user.css:60-65`: the global radius reset already covers this area. Do not repeat `border-radius` anywhere.
- `color.ini`: `player`, `button`, `text`, `subtext`, `misc`, `selected-row` reach the CSS as `var(--spice-*)`. No literal color in a rule; stylelint fails the build on one.

## Selectors, verified in the 1.2.99.317 bundle
Spicetify's preprocessing leaves readable class names in the now playing bar markup, so these are literal in the DOM, not hashes:

- `.main-nowPlayingBar-nowPlayingBar`: the whole bar.
- `.main-nowPlayingBar-left`, `.main-nowPlayingBar-center`, `.main-nowPlayingBar-right`: the three columns.
- `.main-nowPlayingBar-extraControls` and `.main-nowPlayingBar-volumeBar`: the right-hand buttons and the volume slider.

The rest is addressed by `data-testid`, which is stable across releases and easier to read than a hash:

- `now-playing-bar`, `now-playing-widget`, `player-controls`.
- `context-item-info-title` and `context-item-info-subtitles`: track title and artist.
- `control-button-playpause`, `control-button-skip-back`, `control-button-skip-forward`, `control-button-shuffle`, `control-button-repeat`.
- `playback-progressbar` wrapping `playback-position`, `progress-bar` and `playback-duration`.
- `progress-bar-background` and `progress-bar-handle`: the slider track and knob.
- `volume-bar`.

**The progress bar and the volume bar share the `progress-bar` testid.** Every rule has to be scoped through its ancestor, `[data-testid="playback-progressbar"]` or `.main-nowPlayingBar-volumeBar`, or the volume slider inherits the seek bar's styling.

## Architecture Decisions
- **Readable classes for structure, `data-testid` for parts.** Both survive obfuscation. A hashed class like `.cThC7cU_cw1SCx50` would break on the next Spotify release.
- **The display is the track info block, not the whole left column.** Winamp's main window has no album art, so mapping the cover onto the display would be wrong twice over. The cover keeps its place with a sunken border, and the text next to it becomes the black LED panel.
- **Room for the canvas is reserved with padding, not an element.** The spectrum analyzer belongs to FN-03, which injects its own canvas. This issue leaves `padding-right` on the display so the canvas has somewhere to land and the text never runs under it.
- **The knob is always visible.** Spotify reveals `progress-bar-handle` on hover only. Winamp's slider always shows it, so opacity is forced to 1 in both sliders.
- **The bar keeps its height.** Changing it shifts the whole app layout, and the issue asks for the opposite. The title bar strip that adds 14px is FN-05's job, not this one.
- **No `pointer-events`, no `position` changes on interactive parts.** Seek and volume are drag targets; touching their layout is the fastest way to break them silently. Only color, shadow, font and size change.
- **One commented block, `/* === Now playing bar === */`.** If a selector dies in a Spotify release, only this block degrades.

## Files to Create
None.

## Files to Modify
| File | Changes |
|------|---------|
| `user.css` | fills the now playing bar block; adds the display and knob variables to `:root` |

### user.css, `:root`
- `--wa-display-bg` at `#000`, the LED panel background. It is a literal, so it goes inside the existing `stylelint-disable color-no-hex` pair with the others.
- `--wa-knob-w` at `7px` and `--wa-knob-h` at `14px`, the slider knob size, so both sliders stay in sync from one place.

### user.css, `/* === Now playing bar === */`
- The bar itself: `var(--spice-player)` background, `box-shadow: var(--wa-raised)`, and a top border in `--wa-bevel-light` so it reads as a separate panel from the content above.
- The display: `[data-testid="now-playing-widget"]` gets `--wa-display-bg`, `var(--wa-sunken)`, and `padding-right` reserving the canvas strip. Title and artist get `--wa-font-pixel` at 11px, title in `var(--spice-text)` and artist in `var(--spice-subtext)`, both with `text-transform: uppercase` and `white-space: nowrap`.
- The cover: 2px sunken border, no rounding, unchanged size.
- Transport buttons: `var(--spice-button)` background, `var(--wa-raised)`, square, black icon through `color`. `:active` swaps to `var(--wa-sunken)` so the press reads as a physical button. The play button does not get a different shape from the others, because Winamp's do not.
- Position and duration: pixel font, `var(--spice-text)`, position larger than duration, mirroring Winamp's big elapsed counter.
- Seek bar: `progress-bar-background` sunken and dark; the filled part in `var(--spice-text)`; `progress-bar-handle` becomes a `--wa-knob-w` by `--wa-knob-h` raised rectangle, always visible.
- Volume: the track gets the green, yellow and red gradient from left to right, and the same knob. Scoped through `.main-nowPlayingBar-volumeBar` so the seek bar is untouched.
- Right-hand buttons: same treatment as the transport buttons, smaller.

## Data Requirements
None.

## Testing Strategy
- **No unit test applies.** This issue is CSS only; the project's test tooling covers the Node scripts, and there is nothing importable here. `pnpm check` still has to be green, and stylelint is the automated gate: no `border-radius` other than 0, no literal color outside `:root`.
- Visual check in Spotify with a track playing, comparing against the Winamp 2.x main window: gray bevelled panel, black display with green pixel text, square buttons, rectangular knobs, gradient volume.
- Interaction check, which matters more than the look: click every transport button, drag the seek bar to the middle of a track, drag the volume, and hover each button. Nothing may stop responding.
- Check with a long title and a short one. The text must clip, not wrap and not push the layout, because the marquee that solves overflow is FN-02.
- Screenshot saved to `docs/screenshots/player.png`, which the issue asks for.

## Implementation Order
1. Variables in `:root`.
2. The bar panel and the display, then look at it in Spotify before going further: this is the part that either reads as Winamp or does not.
3. Transport buttons and their states.
4. Seek bar and time labels.
5. Volume.
6. Right-hand buttons and the cover border.
7. `pnpm check`, interaction pass, screenshot.

## Unknowns
- Spotify renders a second progress bar in the fullscreen and miniplayer views, reusing the same testids. If those look wrong, the fix is scoping the rules under `.main-nowPlayingBar-nowPlayingBar` rather than writing new ones.
- The gradient volume track may need `background-image` on the parent rather than the fill element, depending on how Spotify composes the filled portion. Decide while looking at the DOM, and keep whichever keeps dragging intact.

## Found during execution

- **`font-display: block` hid every label the theme styled.** PP-01 chose block on the theory that an inline font has no network wait to swap away from. In Spotify the result was the opposite: the title, artist and time labels rendered blank while the rest of the app was fine. Switching the generator to `swap` fixed it. The font itself was never the problem: the injected CSS is byte identical to the repo's, and the base64 decodes to the committed woff2 files.
- **The class names in the plan were partly wrong.** `context-item-info-title` and `context-item-info-subtitles` exist in the bundle but belong to the mini player, not the now playing bar. The bar uses `main-trackInfo-name` and `main-trackInfo-artists`. Likewise the progress bar has no `progress-bar-handle` testid here; the real names are `x-progressBar-progressBarBg`, `x-progressBar-fillColor` and `progress-bar__slider`, read from the class map object in the bundle.
- **stylelint's `selector-class-pattern` had to be turned off.** It enforces kebab-case, and every class this issue targets belongs to Spotify and is camelCase. Renaming is not an option, so the rule is off with the reason recorded in the `user.css` header.
- **The slider knob is hidden by `display: none`, not by opacity.** Spotify only reveals it on hover or focus. Winamp always shows it, and on the volume groove the knob is the only level indicator, so the theme forces `display: flex`.
- **Play stays green, by the owner's call.** The plan wanted the whole transport in one shade of gray, as Winamp has it. Three attempts failed before the reason surfaced: the play button is not a descendant of `player-controls`, which is the ancestor every other control rule is scoped through. Once that was clear the override worked, and the owner preferred the green after seeing it. The rule was removed rather than kept and disabled, which also takes an `!important` back out of the theme.
- **The right-hand column sat flush against the window edge.** The last control read as cut off rather than placed. The column now carries a right padding and its controls are centred on one line.

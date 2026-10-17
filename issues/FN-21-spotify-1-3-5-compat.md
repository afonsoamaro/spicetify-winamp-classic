# [FN-21] Spotify 1.3.5 compatibility

## Type
Functional (maintenance)

## Description
Spotify 1.3.5.3058 (released 2026-10-15) breaks the theme widely. The readable `main-*` class names the theme leans on are not Spotify's: they come from the Spicetify class map, which only covers the Spotify versions Spicetify has been updated for (Spicetify 2.45.3 lists macOS up to 1.3.3). On 1.3.5 the map no longer matches, so the bundle ships hashed names only.

A static audit of the raw 1.3.5 bundle against `user.css` and `src/*.js` (FN-22's `pnpm compat`) found that **68 of the 70 mapped classes the theme uses are gone**, while all 8 `data-testid` values it uses are still there (the 37 `data-testid` and `data-encore-id` anchors are all still there), including the whole now playing bar root (`.main-nowPlayingBar-nowPlayingBar`), which also stops the WINAMP strip, the marquee and the spectrum from mounting (`src/dom.js`, `src/marquee-dom.js`, `src/titlebar-dom.js` anchor on it). What survives is the contract Spotify itself keeps: `data-testid`, `data-encore-id`, ARIA attributes, roles and native elements (the 11 Encore ids cannot be checked from the bundle, since that library loads at runtime; they were seen on screen).

## What is wrong
| Symptom | Cause |
|---|---|
| Now playing bar has no bevel, no WINAMP strip, no marquee, no spectrum, transport keys at Spotify's 32 px | `.main-nowPlayingBar-*`, `.main-nowPlayingWidget-*`, `.main-trackInfo-*`, `player-controls__*`, `x-progressBar-*` are all absent. `[data-testid="now-playing-bar"]`, `now-playing-widget`, `player-controls`, `playback-position`, `playback-duration`, `playback-progressbar`, `volume-bar` and `control-button-*` are still there. |
| Other surfaces with the same cause (track lists, library rows, top bar, context menu, action bars, entity header) | The other mapped names in the missing list below. |

Mapped classes missing on 1.3.5 (from `pnpm compat`, FN-22), grouped: Root__right-sidebar, main-actionBar-*, main-actionButtons-spacer, main-avatar-image, main-contextMenu-*, main-dropDown-dropDown, main-entityHeader-*, main-globalNav-*, main-nowPlayingBar-*, main-nowPlayingWidget-*, main-playButton-PlayButton, main-playlistEditDetailsModal-title, main-shelf-title, main-topBar-background, main-trackInfo-*, main-trackList-*, main-yourLibraryX-*, player-controls__buttons, progress-bar__slider, x-filterBox-filterInput, x-progressBar-*.

## Requirements
- Phase 1, the now playing bar and the extension: every selector in `user.css` and `src/*.js` that reaches the bar goes through `data-testid`, `data-encore-id`, role, ARIA or structure (`:has`, child combinators), never a mapped or hashed class. The extension keeps working with no mapped class anywhere.
- Phase 2, the rest of the surfaces from the list above, one surface at a time, each verified live on 1.3.5.
- Where a selector cannot be anchored on the stable contract, the exception is named in a comment with the reason, and the compat check (FN-22) lists it as a known dependency.
- Keep the rules working on 1.3.0 to 1.3.4 where the stable anchor exists there too; do not keep a second copy of a rule for the old names.
- Spicetify upstream: report that 2.45.3 does not map 1.3.5 (and which hashes) if no issue exists yet.

## Acceptance Criteria
- [ ] Now playing bar on 1.3.5: bevelled panel, WINAMP strip centered over the controls, marquee, spectrum, 26 px transport keys at 8 px spacing, seek and volume bars styled, confirmed on screen.
- [ ] `theme.js` mounts on 1.3.5 (title bar, marquee and spectrum present), confirmed via CDP.
- [ ] `pnpm compat` against the 1.3.5 bundle reports 0 missing test ids and lists any remaining mapped-class dependency by name.
- [ ] Phase 2 surfaces each verified live (home, playlist, artist, library, top bar, context menu, dialogs).
- [ ] `docs/screenshots/*` refreshed where the crop changes.
- [ ] `pnpm check` green.

## Dependencies
- FN-07, FN-08, FN-22

## Progress

### Phase 1, now playing bar and extension (2026-10-17, live on Spotify 1.3.5.3058)
- `src/dom.js`: the bar, the inner bar and the display (the widget's text block, the child with no test id and no button) are found through `data-testid` and structure. `src/marquee-dom.js` mounts its canvas inside the display. Tests moved to a fixture shaped like the 1.3.5 bar (`test/fixtures/now-playing.js`); 113 pass.
- `user.css` bar section rewritten on `data-testid` and structure only: `now-playing-bar`, `now-playing-widget`, `cover-art-button`, `player-controls`, `general-controls`, `volume-bar`, `playback-progressbar`, `progress-bar`, `progress-bar-background`, `progress-bar-handle`, `playback-position`, `playback-duration`.
- Shuffle and repeat on-state now read from `aria-checked` and Encore's `encore-internal-color-text-bright-accent`. The old rule needed generated classes read out of the 1.2.99 bundle and never reached shuffle.
- Verified live: title strip centered on the controls (830 px, same as the buttons), marquee scrolling in a LED panel that fills the widget, spectrum mounted, five 26 px keys with 8 px spacing, seek and volume grooves with the knob. The on-state was checked by setting the ARIA attribute on the node (both controls), not by toggling playback.
- Learned on the way: the `now-playing-widget` of 1.3.5 wraps the cover, the text and the action buttons, so the display is its text block, not the widget.

### Phase 2, other surfaces (in progress)

Done, verified live on 1.3.5.3058 (2026-10-17), `pnpm compat` down from 56 to 37 mapped classes missing:
- **Track lists** on the ARIA grid (`role="grid"` in the main view, rows with `aria-selected`, `columnheader`, `gridcell` by `aria-colindex`): black list, pixel face, title lit and the rest muted at 12 px, raised header strip, selection bar and white text (set `aria-selected` on a row to check, since the app has nothing selected). Open: the playing row is white through Encore's bright accent class on the title cell, not confirmed with a track playing; the queue in the right sidebar is a separate surface.
- **Top bar** on `#global-nav-bar`, `form[role="search"]`, the Encore ids and `[data-testid="topbar"]`: LED search display (hover and focus stay black), 32 px keys for back, forward, Marketplace, Home, What's New and Listening activity, page strip title. Open: the active Home key has no stable marker in 1.3.5 (no attribute changes), the open search dropdown panel is unverified.

Still open: library rows in the sidebar, context menu and dropdown, cards and the shortcut grid, action bars (play key, explore), entity header and avatar, right sidebar and the queue, the edit-details dialog title, and the seek and volume groove fills.

Phase 1 leaves two mapped names of the bar itself unmigrated: `x-progressBar-fillColor` and `x-progressBar-progressFillColor`: the seek and volume grooves have two absolute full-width layers (the elapsed fill and the hover preview) with one more level inside, which was not mapped. At rest the fill is already the right green, so what is lost is the rule that keeps it green and hides the white preview while hovering.

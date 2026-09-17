# [FN-10] Playlist action row + traffic-light clearance

## Type
Functional (visual)

## Description
Two visual defects reported by the owner with a screenshot on 2026-09-16, both confirmed through the live DOM (Spotify 1.3.0.277, CDP) on the "Extreme Metal Workout" playlist page:

1. The playlist action row is irregular: the play key is a 56px green block while its siblings are 32px dark keys of mixed heights, with icons from 12px to 32px.
2. The topbar-left back/forward keys start at x=8, directly underneath the macOS traffic lights.

## Diagnosis (live DOM, 2026-09-16)

### Action row (`main-actionBar-ActionBarRow` in `main-actionBar-ActionBar`)

| Button | Box | Icon | Fill |
|---|---|---|---|
| Play | 56x56 (`e-10860-legacy-button-primary`, transparent) | 24px | green comes from the inner `e-10860-button-primary__inner` span (48x48, `rgb(0,255,0)`) |
| Explore (`main-actionBar-exploreButton`) | 38x48 | 12px | `--spice-button` |
| Shuffle | 32x32 | 32px (full box, cramped) | `--spice-button` |
| Mix, Library, Download, More | 32x56 | 32px (full box, cramped) | `--spice-button` |

Readable scope exists: the row is `DIV.main-actionBar-ActionBarRow`, the play wrapper is `DIV.main-actionBar-ActionBarPlayButtonContainer`, explore is `main-actionBar-exploreButton`. The PP-05 controls block never claimed this row, so it renders in a mix of Spotify sizes.

### Traffic lights

`.main-globalNav-historyButtonsContainer` sits at x=8, y=16. Matched margin/padding rules: only the reset. Spotify gives it no clearance on this build, so the 32px keys (x 8-40) sit under the traffic-light cluster (ends ~x 64). The document carries a platform hook for exactly this: `html.spotify__os--is-macos` (alongside `spotify__container--is-desktop`).

## Requirements
- Action row, scoped under `main-actionBar-ActionBar`: uniform 32x32 raised keys, vertically centered in the row; icons centered with max 20-24px (max-, never upscale); play keeps the green accent at the same 32px box, following the PP-02 call (play stays green, everything else gray).
- Explore button folds into the same key recipe instead of its 38x48 shape.
- Traffic-light clearance only on macOS: `html.spotify__os--is-macos .main-globalNav-historyButtonsContainer` gains a left margin (~72px: clears the ~64px cluster with an 8px gap). No other platform is touched; Windows caption buttons are out of scope (owner is on macOS).
- No generated class names in the theme; the row already offers readable containers.

## Scenarios
### Edge Cases
- Narrow window: the row must not wrap or clip after uniform sizing.
- Non-macOS: clearance rule must not shift the nav (hook-scoped, verify by selector non-match).

### Error Handling
- If a readable container is gone in a later build, the block degrades to stock Spotify shapes (independent rules per area, as everywhere else).

## Acceptance Criteria
- [ ] Play, explore, shuffle, mix, library, download and more render as uniform 32px keys with centered icons, confirmed on screen and measured via CDP.
- [ ] History keys clear the traffic lights at 1280-1920px window widths, confirmed on a top-left screenshot crop.
- [ ] `docs/screenshots/` refreshed where the playlist page or the top-left crop appears.
- [ ] `pnpm check` green.

## Dependencies
- PP-05 (controls language), FN-08 (top bar area)

## Verification (automated + live, 2026-09-17, branch `feat/fn-10-playlist-actions`)

- `pnpm check` green (CSS-only change, 88/88 tests untouched).
- Live (Spotify 1.3.0.277, playlist + album pages): every action-row key measures 32x32, icons 12-20px; play inner span exactly 32x32 green; history container at x=80 (was x=8).
- Follow-up found live: the play button ships in two readable wrappers (`ActionBarPlayButtonContainer`, `playButton-PlayButton`); both are listed. Encore sizes the green inner span with its own min rules, so the span is pinned with min+max caps (max beats min, no `!important`).
- `docs/screenshots/playlist.png` and `docs/screenshots/home.png` refreshed from the verified state. Incident on the way: a debug-flag relaunch raced the patch and showed "Something went wrong"; `Page.reload` via CDP recovered it, theme intact.

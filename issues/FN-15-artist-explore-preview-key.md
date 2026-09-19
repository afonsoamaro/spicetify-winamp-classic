# [FN-15] Bevel the artist page's preview-scroll key

## Type
Functional (visual)

## Description
On artist pages, the key next to Play that lets you "scroll through previews of tracks from this artist" (Spotify's Canvas preview card) still renders as Spotify's plain floating thumbnail, unlike the rest of the action row, which FN-10/FN-12 already normalized to bevelled 32x32 keys. Reported by the owner on 2026-09-19 from a screenshot; every other button in that row is confirmed already correct.

## Diagnosis (live DOM, 2026-09-19, Spotify 1.3.0.277, CDP)
- The outer element is `button.main-actionBar-exploreButton`, a child of `.main-actionBar-ActionBar .main-actionBar-ActionBarRow`, so it does inherit the FN-10 row recipe: the button itself measures 32x32 with the raised bevel background and shadow, confirmed via computed style.
- What's visible is not the button but `.main-actionBar-exploreButtonImageWrapper` inside it: `position: absolute; width: 30px; height: 40px`, deliberately taller than the 32px row so the card pokes above and below it (Spotify's own affordance for a scrollable preview stack). Being absolutely positioned with explicit dimensions, it sits outside every sizing rule the row recipe sets on the button, and Spotify ships it with no border or shadow of its own: a plain image floating over the bevelled row.
- **First pass only added the border and left the 30x40 size in place** (recessing a card still visibly bigger than every other key). The owner caught it from a screenshot: the button stayed smaller than the card sitting on top of it. Pinning the wrapper's own `top`/`left`/`width`/`height` to the button's 32x32 box, and the `img` inside it to `100%/100%` with `object-fit: cover`, is what actually brings it in line with the row.

## Requirements
- Pin `.main-actionBar-exploreButtonImageWrapper` to the button's own 32x32 box (`top: 0; left: 0; width: 32px; height: 32px`), the same uniform-key rule the rest of the row already follows, instead of leaving Spotify's 30x40 size in place.
- Recess it like the theme's other artwork (the now playing bar cover recipe: `--wa-bevel-dark` border, `--wa-sunken` shadow), with `--wa-display-bg` behind it for the instant before the thumbnail loads.
- The `img` inside fills the box at `100%/100%` with `object-fit: cover`, so the crop stays centered instead of Spotify's own 30x40 intrinsic size peeking past the new border.
- Scoped under `.main-actionBar-ActionBar` so nothing outside the action row is touched; no generated class name involved.

## Acceptance Criteria
- [x] The preview key is the same 32x32 size as Play, Shuffle and Follow, sitting flush in the row instead of poking above and below it.
- [x] The preview key reads as a recessed panel matching the theme's other thumbnails, confirmed on screen.
- [x] The other three keys in the row (Play, Shuffle, Follow) are unchanged.
- [x] `pnpm check` green.

## Dependencies
- FN-10, FN-12

## Verification (2026-09-19, branch `fix/fn-15-explore-key-bevel`)
- `pnpm check` green (CSS-only change): lint, typecheck, 93 tests, build.
- First pass (bevel only, size untouched) confirmed insufficient by the owner from a screenshot: the wrapper still measured 30x40 against the button's 32x32.
- Second pass, live (Spotify 1.3.0.277, artist pages for Fleetwood Mac and Klimt 1918): wrapper's `getBoundingClientRect()` now matches the button's exactly (168,496,32,32 in the sampled run), confirmed via computed style and a screenshot showing Play, the preview key, Shuffle and Follow all flush and the same size in the row.

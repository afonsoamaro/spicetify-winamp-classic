# [FN-19] Marketplace tab bar as keys

## Type
Functional (visual, minor)

## Description
Reported by the owner on 2026-09-30: at the top of the Marketplace, the active tab (Themes) renders as a solid green block with no readable label. The other tabs are bare green text in SpotifyMix at 16px, unlike every other key in the theme. The owner asked for them to follow the filter chips already themed on Home and in the library.

## Diagnosis (live DOM, 2026-09-30, Spotify 1.3.0, Marketplace 1.0.11, CDP)
- Markup: `li.marketplace-tabBar-headerItem > a.marketplace-tabBar-headerItemLink > span.main-type-mestoBold`, with `marketplace-tabBar-active` added to the link of the current tab.
- The Marketplace's own stylesheet paints `.marketplace-tabBar-active` with `background-color: var(--spice-tab-active)` and `.marketplace-tabBar-headerItemLink` with `color: var(--spice-text)`. In the Classic scheme both are `#00FF00`: measured background `rgb(0, 255, 0)` and label `rgb(0, 255, 0)` on the active tab.
- The Marketplace's route stylesheet loads after `user.css`, so a bare class selector in the theme loses the tie.

## Requirements
- `a.marketplace-tabBar-headerItemLink` becomes a key with the chip recipe: `--spice-button` fill, raised bevel, black label, pixel face at 11px uppercase, square corners. The element name in the selector outranks the Marketplace's bare class rules.
- Hover lightens the fill to `--wa-bevel-light` and lights the label green, like the library chips.
- The active tab is sunken with a green label on the gray fill, replacing the `--spice-tab-active` block.

## Acceptance Criteria
- [x] Active tab readable: gray fill, green label, sunken, confirmed on screen.
- [x] Inactive tabs are raised gray keys in the pixel face, matching the library chips.
- [x] Switching tabs moves the sunken state; hover lightens the key.
- [x] `pnpm check` green.

## Dependencies
- PP-04 (top bar keys), PP-05 (chips)

## Verification (2026-09-30, branch `fix/fn-19-marketplace-tab-keys`)
- Live, with the local `user.css` swapped into the Marketplace's injected style: the five tabs measure `rgb(60, 60, 76)` with the raised bevel, `Silkscreen` 11px uppercase; the active one sunken with a `rgb(0, 255, 0)` label. Clicking Extensions and back moved the sunken state each time; hover on Snippets measured `rgb(90, 90, 110)` with a green label.
- `pnpm check` green: lint, typecheck, 100 tests, build (CSS-only change).

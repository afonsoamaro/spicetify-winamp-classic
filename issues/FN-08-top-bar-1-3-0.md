# [FN-08] Top bar fixes on Spotify 1.3.0

## Type
Functional (maintenance)

## Description
Three parts of the top bar look wrong on 1.3.0.277 with Spicetify 2.45.0, reported by the owner from screenshots on 2026-09-15 and diagnosed through the live DOM.

## What is wrong
| Symptom | Cause found in the live DOM |
|---|---|
| Back, forward, home and the Marketplace cart overflow their bevelled keys; the cart shows a dark box behind a bigger icon | The theme sizes the nav keys at 26x26 (`user.css` top bar block) while 1.3.0 renders these buttons with a 24 px icon and 12 px padding (`e-10860-button-tertiary--icon-only-medium`), so the icon is larger than the key. |
| Home key sits glued to the search field and the field has black bands on both sides | The home button has `margin-left: 8px` and no gap to the sunken section; inside the section the `input` keeps Spotify's `--spice-main-elevated` background, so the section's own 8 px padding shows as pure black around a dark gray field. |
| A bright green vertical bar with a blue dot next to the avatar; the What's New and Listening activity buttons are invisible | Spicetify's class map sends two different hashes to `main-actionButtons-spacer`: the 1 px divider and the wrapper of the two buttons. Spotify's own rule `.main-actionButtons-spacer { width: 1px; margin: 16px; background: var(--text-base) }` (translated to `--spice-text`, green in this scheme) then squeezes the wrapper to 1 px, the buttons inside to 0 px, and paints the wrapper green. The blue dot is the What's New badge, still visible at 0 px width. |

## Requirements
- Nav keys sized for the 24 px icon: 32x32 with 4 px padding, or the icon scaled to fit 26x26. One rule for history buttons, home, Marketplace and custom navlinks.
- The search field is one LED display: the `input` background transparent inside the sunken section, and a gap between the home key and the field.
- `.main-actionButtons-spacer:has(button)` restored to `width: auto; margin: 0; background: transparent` so the two buttons render; the real divider (no buttons inside) painted `--wa-bevel-dark`. The badge keeps Spotify's colour.
- The class map problem reported upstream together with the FN-07 names (`main-actionButtons-spacer` mapped from two hashes).

## Acceptance Criteria
- [ ] Back, forward, home, Marketplace keys show the whole icon inside the bevel, confirmed on screen.
- [ ] Search field reads as one black display with the home key detached from it.
- [ ] What's New and Listening activity buttons visible as keys, no green bar, confirmed on screen.
- [ ] `docs/screenshots/home.png` refreshed if the top bar is in the crop.
- [ ] `pnpm check` green.

## Dependencies
- FN-07

## Verification (automated, 2026-09-16, branch `fix/fn-08-top-bar-1-3-0`)

- `pnpm check` green: eslint + stylelint 0 errors, `tsc --noEmit` 0 errors, 88/88 tests, `theme.js` rebuilt (CSS-only change, no JS touched).
- Bundle evidence (Spotify 1.3.0.277, `xpui-modules.js`): `main-actionButtons-spacer` renders on exactly two elements, the empty divider div and the buttons wrapper div, which is what the `:has(button)` split targets. `Spicetify._renderNavLinks(["marketplace"])` renders Marketplace links with `main-globalNav-navLink`, so the single 32x32 key rule covers history, home, Marketplace and custom navlinks.
- `main-actionButtons-spacer` is fed by three hashes in `css-map.json` (`YaU17q8G6eTc2eoKRwnL`, `NA8gTZ4nPFEEcDYv`, `MtYp_qNgYodAxs42_Z7u`); reported upstream together with the two FN-07 track-list hashes (see issue link below).

Pending owner validation (needs Spotify with the theme applied):

- Back, forward, home and Marketplace keys show the whole icon inside the bevel.
- Search reads as one black display with the home key detached.
- What's New and Listening activity buttons visible as keys, no green bar.
- `docs/screenshots/home.png` refreshed if the top bar is in the crop.

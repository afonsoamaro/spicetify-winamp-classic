# [FN-17] Colour scheme fallback for a Marketplace install over another theme

## Type
Functional (bug, compatibility with the Marketplace)

## Description
Installing Winamp Classic from the Marketplace while another Marketplace theme is already installed leaves Spotify with the stock colours: white text, `#121212` panels, the green `#1db954` buttons. The pixel font, the bevels, the marquee and the spectrum all land, so the result looks like a half-applied theme rather than no theme. Reported by the owner on 2026-09-21 after switching between StarryNight and this theme; a clean install (no theme installed before) is fine, which is why FN-06 and FN-14 never saw it.

## Diagnosis (live, 2026-09-21, Spotify 1.3.0, Marketplace 1.0.11, CDP)
- After the install and the reload the Marketplace asks for, `user.css` is injected in full (124 rules) and `theme.js` loads from jsDelivr, but there is no `style.marketplaceScheme` element, `Spicetify.Config.color_scheme` is `null` and the stored record for the theme has `activeScheme: null` although `schemes` holds `Classic`.
- The cause is in the Marketplace's `installPreparedTheme`. For a theme with `include` (this one loads `theme.js`) installed over an existing theme, it writes the new record and points `theme-installed` at it, then calls `updateColourSchemes(null, null)` to clear the previous theme. That function reads `theme-installed`, which is already the new theme, and saves `activeScheme = null` into it.
- On boot the Marketplace extension does `schemes[activeScheme]` with no fallback to the first scheme, so nothing is injected and Spotify's stock `:root` variables from the `userCSS` link stay in effect.
- Order of the style elements in `<body>`: the stock `link.userCSS` first, our `style.marketplaceUserCSS` later, and the Marketplace's scheme style appended last when it exists. A `:root` block in `user.css` therefore beats the stock values and still yields to a working Marketplace scheme, album-art colours and colour shift.

## Requirements
- `user.css` carries the first scheme of `color.ini` as `--spice-*` and `--spice-rgb-*` variables in a `:root` block, generated between markers by a script so `color.ini` stays the only place a colour is defined.
- A test keeps the committed `user.css` in sync with `color.ini`, the same way the font test does for `assets/`.
- The marker replacement is shared by both embed scripts instead of duplicated.

## Acceptance Criteria
- [x] `pnpm embed:scheme` regenerates the block; a second run changes nothing.
- [x] With the Marketplace's scheme style absent, the page shows the Classic colours from `user.css` alone.
- [x] `pnpm check` green.

## Dependencies
- FN-06

## Verification (2026-09-21, branch `fix/fn-17-marketplace-scheme-fallback`)
- Reproduced first: StarryNight installed, then Winamp Classic through the card's install path, reload. Stock colours, `activeScheme: null` in the record, no scheme style.
- The new `user.css` swapped into the live `style.marketplaceUserCSS` with no scheme style present: `--spice-main #000000`, `--spice-text #00ff00`, `--spice-button #3c3c4c`, and the screenshot shows the full Classic look.
- `pnpm check` green: lint, typecheck, 100 tests, build.
- Upstream: the ordering bug in `installPreparedTheme` belongs to spicetify/marketplace; this issue works around it on the theme side.

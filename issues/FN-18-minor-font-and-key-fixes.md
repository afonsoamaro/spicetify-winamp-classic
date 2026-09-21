# [FN-18] Minor fixes: pixel face leftovers and the shortcut Pause key

## Type
Functional (visual, minor)

## Description
A batch of small leftovers reported by the owner on 2026-09-21 from the Marketplace-installed build:
- Artist page header: the artist name and the "monthly listeners" line render in SpotifyMix.
- Now playing view: the related music video titles, the "Show all" and "Open queue" links and the "Following" buttons (artist card and credits) render in SpotifyMix.
- Queue panel: the "Queue" and "Recently played" tabs and the "Start a Jam" button render in SpotifyMix.
- Home shortcuts: the shortcut whose context is playing shows an empty gray square where its play button sits.

## Diagnosis (live DOM, 2026-09-21, Spotify 1.3.0, CDP)
- The artist name is `span[data-encore-id="adaptiveTitle"]` inside `.main-entityHeader-title`, carrying `font-family: var(--encore-variable-font-stack)` inline. An inline value outranks any selector, so the container rule never reached it. The listener count is a span with a generated class only, under `.main-entityHeader-headerText`.
- The video titles are `p[data-encore-id="cardTitle"]` inside `[data-encore-id="card"]`; the theme's card rule is scoped to `.main-card-cardContainer`, which the now playing view does not use.
- The panel buttons are Encore `buttonPrimary` (Start a Jam), `buttonSecondary` (Following) and `buttonTertiary` (Show all, Open queue); the tabs are `tabItem`. All of them live in `.Root__right-sidebar`, outside every scope the theme's button rules use (`.main-view-container`, `.GenericModal`, `.main-contextMenu-menu`, `.main-actionBar-ActionBar`).
- The shortcut square: Spotify hides the play button's content (icon and green circle, the inner span) at rest and reveals it on card hover or focus-within, for Play and Pause alike. The theme already excludes `[aria-label^="Play"]` from the generic gray fill and paints it transparent; while the shortcut's context plays, the label flips to "Pause ..." and the button fell back into the generic rule, so the gray key showed with nothing in it. The action bar's play key is unaffected: its green comes from Spotify's own inner span, visible at rest there.

## Requirements
- `.main-entityHeader-title` redefines `--encore-variable-font-stack` to the pixel stack, so the inline value resolves to it without `!important`; the adaptiveTitle span joins the section-title rule for casing and color. `.main-entityHeader-headerText` takes the family, and the listener count inherits it.
- `body [data-encore-id="cardTitle"]` and `cardSubtitle` join the family-only Encore block, so cards outside Home take the face while Home's card rule keeps its sizes.
- Right sidebar keys: `buttonPrimary`/`buttonSecondary` become gray keys (bevel, black text, hover and sunken states like the action bar's text keys), `buttonTertiary` stays flat in the text color, `tabItem` takes the face; all at 11px uppercase.
- "Pause" joins "Play" in every exclusion and in the transparent rule for play buttons.

## Acceptance Criteria
- [x] Artist name and listener count pixel, name uppercase and white, confirmed on screen.
- [x] Now playing view: no text leaf left in SpotifyMix (measured: zero remaining), Follow keys, Show all and Open queue confirmed on screen.
- [x] Queue tabs and Start a Jam pixel, confirmed on screen.
- [x] Home shortcut of the playing context shows nothing at rest, like the others; the action bar play key unchanged.
- [x] `pnpm check` green.

## Dependencies
- FN-13 (Encore family-only precedent), FN-12 (action bar text keys), FN-15

## Verification (2026-09-21, branch `fix/fn-18-minor-font-and-key-fixes`)
- Live, with the local `user.css` swapped into the Marketplace's injected style: artist header `Silkscreen` at 96px uppercase white and 16px for listeners; right sidebar scan of every text leaf returns zero non-pixel nodes with the now playing view open; queue tabs 11px uppercase; Follow keys `#3c3c4c` with the raised bevel; shortcut Pause button `background transparent, box-shadow none` while Rock Classics plays, action bar key still green.
- `pnpm check` green: lint, typecheck, 100 tests, build (CSS-only change).

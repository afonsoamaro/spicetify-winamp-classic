# [FN-11] Search focus fill, dropdown panel, home key alignment

## Type
Functional (visual)

## Description
When the search field is focused it fills blue (`--background-elevated-highlight` through the scheme) while the section padding stays black: blue middle, black bars at both ends. The open search dropdown renders as a full blue panel. The home key reads as floating next to the 48px field instead of aligned with it.

## Diagnosis (live DOM, 2026-09-18, Spotify 1.3.0.277, CDP)

- Focus blue: `.main-globalNav-searchInputContainer .<hash>:focus` sets `background: var(--background-elevated-highlight)` at (0,3,0) on the input, which carries the per-build hash class. Our transparent rule sits at (0,2,1) and loses. Same shape on `:hover` (`.main-globalNav-searchInputContainer:hover .<hash>`).
- Dropdown blue: the open panel is `DIV.main-actionBar-ActionBarContainer` inside `.main-globalNav-searchInputContainer`, painted by the generated `.nQNDoLQu7Gplkrpjy2DU` rule (`background-color: var(--background-elevated-highlight)`, (0,1,0)). Readable scope exists; no hash needed.
- Black bars: with the input blue, the section's own 8px black padding shows at both ends. They vanish with the blue, no separate fix.
- Home alignment: home key (32x32, y=16) and field (48px, y=8) share center y=32 at 590-1680px widths, parent `align-items: center`. The key still reads as floating because it is 16px shorter than the field it sits next to.

## Requirements
- Input stays a black display on `:hover` and `:focus`: `.main-globalNav-searchContainer .main-globalNav-searchInputSection input:hover, :focus` → transparent. At (0,3,1) it beats the (0,3,0) hash rule with no hash and no `!important`. The caret keeps focus visible.
- Dropdown becomes a panel: `.main-globalNav-searchInputContainer .main-actionBar-ActionBarContainer` → `var(--spice-sidebar)` fill + `var(--wa-raised)`, scoped so the playlist action bar (same container class, different ancestor) is untouched.
- Home key: explicit `align-self: center` on the nav keys (structural no-op that documents the intent and holds under any row height).
- No `!important`, no generated names.

## Acceptance Criteria
- [ ] Focused/hovered search reads as one black display, no blue, no black bars, confirmed on screen.
- [ ] Open search dropdown reads as a panel, confirmed on screen.
- [ ] Home key visually aligned with the field, confirmed on a cropped screenshot.
- [ ] `pnpm check` green.

## Dependencies
- FN-08 (top bar area)

## Verification (automated + live, 2026-09-18, branch `fix/fn-11-search-focus`)

- `pnpm check` green (CSS-only change).
- Live (Spotify 1.3.0.277, real click into the field): input, dropdown panel and kbd hints all black/panel, zero blue elements in the search subtree; home key (32x32) shares the field's center line at 590-1680px widths.
- Follow-ups found live: the kbd hints carry Spotify's own blue gradient on the readable `.main-globalNav-searchInputKBDWrapper` (neutralized by scoping one level up), and the dropdown panel is painted by a generated class (replaced through the readable `.main-actionBar-ActionBarContainer` scope, which cannot reach the playlist action bar).

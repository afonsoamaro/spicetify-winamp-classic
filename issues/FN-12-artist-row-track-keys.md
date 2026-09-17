# [FN-12] Artist action row text keys + track-row action keys

## Type
Functional (visual)

## Description
Two breakages from the FN-10 uniform-key rule, both reported by the owner with screenshots on 2026-09-18:

1. The Follow/Following key on the artist page is squeezed to 32px and its label wraps vertically ("Fol lo wi ng").
2. The like/add/more keys on track rows render as 16px-wide slabs (16x32) instead of keys.

## Diagnosis (live DOM, 2026-09-18, Spotify 1.3.0.277, CDP)

- FN-10 scopes the 32px box to every `.main-actionBar-ActionBarRow button`, including the text-key Follow button. Icon buttons carry `SPAN > svg` children; the Follow button carries bare text and no svg.
- Track-row keys (like/add/more, Encore tertiary, no readable class) measure 16x32 inside `.main-trackList-rowSectionEnd` (the FN-07 duration anchor). Nothing in the theme claims them.

## Requirements
- Split the row rule by content, not by class: `.main-actionBar-ActionBarRow button:has(svg)` keeps the 32x32 key box; `button:not(:has(svg))` becomes a label key (auto width, `white-space: nowrap`, pixel label). Play and explore both contain svg, so they stay 32px.
- Track rows: `.main-trackList-rowSectionEnd button` takes the key recipe at 32x32 with icons capped at 20px. Duration text in the same section is untouched (buttons only).
- No `!important`, no generated names. `:has()` is fine (Chromium, and stylelint accepts it).

## Acceptance Criteria
- [ ] Following renders as one readable label key, no wrap, confirmed on screen.
- [ ] Track-row like/add/more render as 32px keys with centered icons, confirmed on screen.
- [ ] Playlist action row still uniform 32px (no regression), confirmed on screen.
- [ ] `pnpm check` green.

## Dependencies
- FN-10 (action row), FN-07 (rowSectionEnd anchor)

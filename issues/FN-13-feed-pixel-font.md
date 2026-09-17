# [FN-13] Pixel typeface in feed, What's New and now-playing views

## Type
Functional (visual)

## Description
Body prose renders in SpotifyMix instead of the theme's pixel face in three places reported by the owner on 2026-09-18: the buddy feed names, the What's New feed (titles, artists, meta) and the now-playing side panel (title, artist, listeners, bio, credits). Chips and section headers in the same views already render pixel.

## Diagnosis (live DOM, 2026-09-18, Spotify 1.3.0.277, CDP)

- All three areas render prose through Encore components whose public contract is `data-encore-id` (the FN-07 precedent): `text` (titles, artists, bios, meta), `listRowTitle`, `listRowSubtitle`, `listRowDetails`.
- `ASIDE.NowPlayingView` scopes the panel with zero blast radius (verified live, with `sectionHeaderText` already half-themed).
- `/content-feed` (What's New route) has no readable root hook, and `listRowTitle` also feeds Home shelves and the library, so a bare component rule is unsafe. The fix swaps only the typeface (never size, color or casing), which keeps every context's own rhythm: shelf headers, library rows and feed rows keep their sizes and colors, all gain the pixel face.
- Buddy rows were not rendering at diagnosis time (no friends active); they use the same Encore prose components, so the same rule covers them when they appear. Visual confirmation there stays pending.

## Requirements
- One block: `body [data-encore-id="text"], body [data-encore-id="listRowTitle"], body [data-encore-id="listRowSubtitle"], body [data-encore-id="listRowDetails"]` → `font-family: var(--wa-font-pixel)`. The `body` ancestor lifts specificity to (0,1,1) over Encore's (0,1,0) without changing semantics. Family only: no size, no color, no uppercase (bios and descriptions must stay readable).
- No `!important`, no generated names.

## Acceptance Criteria
- [ ] What's New titles, artists and meta render pixel, confirmed on screen.
- [ ] Now-playing title, artist, listeners, bio and credits render pixel, confirmed on screen.
- [ ] Home shelves, library rows and track lists unchanged (same sizes/colors, pixel where already pixel), confirmed on screen.
- [ ] Buddy feed: covered by component; visual check pending friends activity.
- [ ] `pnpm check` green.

## Dependencies
- PP-04 (chips precedent), FN-07 (encore-id precedent)

## Verification (automated + live, 2026-09-18, branch `fix/fn-13-feed-font`)

- `pnpm check` green (CSS-only change).
- Live (Spotify 1.3.0.277): What's New H1 32px, feed titles/meta and NPV title/artist/listeners/bio/credits all Silkscreen, sizes and colors untouched. Home shelves (24px white), library rows, card titles (11px) and track titles (12px green) unchanged.
- Buddy feed: same Encore prose components, covered by the rule; visual check pending friends activity.

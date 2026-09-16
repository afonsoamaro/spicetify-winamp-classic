# [FN-07] Spotify 1.3.0 compatibility

## Type
Functional (maintenance)

## Description
Spotify updated from 1.2.99.317 to 1.3.0.277 during PP-05 and stopped emitting some of the readable class names the theme relies on. Spicetify 2.45.0 brought a class map that restored most of them. Six did not come back, and the parts of the theme built on them render in Spotify's own font and colour.

## Requirements
- Find the name each broken selector now resolves to in 1.3.0, reading the bundle for `className:"..."` rather than counting occurrences, since the Marketplace app ships copies of the old names.
- Prefer, in this order: a readable name the new map restored, an ARIA attribute, a substring match on a design-system class, and only then a generated class recorded with its Spotify build.
- Where a name has no replacement in the map, contribute it upstream to Spicetify's class map, so the next theme does not have to find it again.

## Broken in 1.3.0
| Selector | Where it is used | What stopped rendering |
|---|---|---|
| `main-yourLibraryX-listItem` | sidebar block | library entries fell back to Spotify's font |
| `main-trackList-rowMainContentTitle` | track list block | track titles fell back to Spotify's font |
| `main-trackList-duration` | track list block | durations turned white |
| `main-cardHeader-text` | cards block | card titles fell back to Spotify's font |
| `main-cardSubHeader-root` | cards block | card subtitles fell back to Spotify's font |
| `main-shelf-title` | top bar block | shelf headings on Home fell back to Spotify's font |

Everything else survived, including the three generated class names for the playing row, repeat and shuffle.

## Acceptance Criteria
- [x] Each of the six renders again on 1.3.0, confirmed on screen.
- [x] No new generated class name unless the issue records why nothing better exists.
- [x] The post-update ritual is in the README: `spicetify update`, then `spicetify backup apply`.
- [x] Any name found by hand is proposed to Spicetify's class map (`spicetify/cli#3949`, opened 2026-09-16 together with the FN-08 spacer collision).

## Dependencies
- PP-05

---

# Implementation Plan

Research done on 2026-09-14 against Spotify 1.3.0.277 with Spicetify 2.45.0, reading the class map objects and `className` strings in the bundle, not counting occurrences.

## Prerequisites
- Spicetify 2.45.0 installed and `spicetify backup apply` run against 1.3.0, which is the state the theme is in now.

## Reusable Code Found
- The blocks in `user.css` that hold the broken selectors: sidebar (library entries), track lists (title and duration), cards (title and subtitle), top bar (shelf titles). Each fix is a selector swap inside an existing rule; no new rule shapes.
- The lesson from every earlier issue, now the rule: ARIA and readable containers before structure, structure before generated names.

## What each broken name resolves to in 1.3.0
| Broken | Still readable nearby | Replacement |
|---|---|---|
| `main-yourLibraryX-listItem` | `main-yourLibraryX-libraryItemContainer` wraps each entry; the entry keeps `aria-selected` | `.main-yourLibraryX-libraryItemContainer` for font and colour; `[aria-selected="true"]` on or inside it for the current entry |
| `main-trackList-rowMainContentTitle` | `main-trackList-rowMainContent` wraps title and artist; the title link carries `data-testid="internal-track-link"` | `.main-trackList-rowMainContent [data-testid="internal-track-link"]`, with `.main-trackList-rowMainContent > :first-child` as the structural fallback if the testid does not render |
| `main-trackList-duration` | `main-trackList-rowSectionEnd` is the last column and holds the duration | `.main-trackList-rowSectionEnd` and its descendants |
| `main-cardHeader-text` | the card is now an Encore component; the title carries `data-encore-id="cardTitle"` | `.main-card-cardContainer [data-encore-id="cardTitle"]` |
| `main-cardSubHeader-root` | the line under the title carries `data-encore-id="cardSubtitle"` | `.main-card-cardContainer [data-encore-id="cardSubtitle"]` |
| `main-shelf-title` | nothing readable is left on the shelf; the title is the only `h2` in the content column | `.main-view-container h2` |

The generated names behind two of them, for the record and for the upstream proposal: `rowTitle` is `k_CUvHNLoYcwpmUhV5jN` and `rowDuration` is `buwCyhSufWYlHJ5_Wffd` in this build. Neither is used in the theme.

## Architecture Decisions
- **No generated name enters the theme.** Every replacement is a readable container, an ARIA attribute or a child position. The two hashes above go to Spicetify's class map as `main-trackList-rowTitle` and `main-trackList-rowDuration`, which is where they belong.
- **Encore `data-encore-id` attributes are the anchor for design-system components.** They are the component's public contract (the same attribute Spotify uses for `card`, `cardTitle`, `cardSubtitle`, `listRow`), and they do not carry the build number the `e-NNNNN-*` classes do.
- **The old names stay in the selector lists.** A release that brings them back should light up without an edit. The rules become `.old, .new { ... }`.
- **The README gains the post-update ritual**, which is a real user-facing need now that two updates in a week wiped the theme.

## Files to Create
None.

## Files to Modify
| File | Changes |
|------|---------|
| `user.css` | selector swaps in four blocks, old names kept alongside |
| `README.md` | a short section on what to do after Spotify updates |

## Data Requirements
None.

## Testing Strategy
- `pnpm check` green.
- On screen, on 1.3.0: library entries in green pixel with the current one on the blue bar, track titles in green pixel, durations in green, card titles and subtitles in pixel, shelf headings in white pixel.
- `docs/screenshots/playlist.png`, `sidebar.png` and `home.png` refreshed, since all three show the regression today.

## Implementation Order
1. Track list: title and duration.
2. Library entries.
3. Cards.
4. Shelf titles.
5. README section.
6. `pnpm check`, screen check, screenshots.
7. Open the class map proposal upstream with the two names.

## Unknowns
- Whether `internal-track-link` renders as a DOM attribute. PP-02 showed per-button testids do not on the now playing bar; links may differ. The structural fallback is in the same rule so nothing depends on the answer.
- Whether `aria-selected` sits on the container or on the hashed entry inside it. Both forms are in the selector.

---

# Found during execution

- The card map in css-map.json still names `main-card-cardContainer`, `main-card-cardTitle` and `main-card-imageContainer` on 1.3.0, but `main-card-card` and `main-card-cardMetadata` are gone: the shelf card is now the Encore `card` component, with `[data-encore-id="cardTitle"]` and `[data-encore-id="cardSubtitle"]` for the text. Three attempts anchored on the old names painted nothing; the fix was to read the live DOM.
- Spotify accepts `--remote-debugging-port=9222` (`open -a Spotify --args --remote-debugging-port=9222`), which exposes the Chrome DevTools Protocol. A 10-line Node script over `Runtime.evaluate` reads the DOM, computed styles and navigates through `Spicetify.Platform.History`. This replaces guessing from the bundle for every selector question from here on.
- `spicetify apply` restarts Spotify without the flag; relaunch it by hand after each apply when the port is needed.
- Track title (`k_CUvHNLoYcwpmUhV5jN`) and duration (`buwCyhSufWYlHJ5_Wffd`) are resolved through `[data-testid="internal-track-link"]`, `.main-trackList-rowMainContent > :first-child` and `.main-trackList-rowSectionEnd`, so the theme carries no hash. The two names still go upstream to the class map (criterion 4, opened after merge).
- The Home shortcut grid, the "Made For" kicker and the "Show all" links were never in the theme's font, before or after 1.3.0; out of scope here.

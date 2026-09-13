# [PP-03] Prototype: track list as the playlist window

## Type
Prototype (visual only)

## Description
Every track list (playlist, album, queue, search results) becomes Winamp's playlist window: black, green pixel text, the playing track in white, selection in blue.

## Visual Elements
- Black `var(--spice-main)` background on the table and on the container.
- Rows in `var(--spice-text)` with the pixel font at 12px.
- The playing track in `var(--wa-white)`.
- Hover and selection with a `var(--spice-selected-row)` background and white text.
- Number, artist and title on the same line, as `1. Artist - Title`, done in CSS where the DOM allows it. Where it doesn't, keep Spotify's columns and only apply color and font.
- Duration right-aligned in green.
- Table header with the panel background, a raised bevel and white text, like the bar of the playlist window.
- Row action buttons (like, more options) in green, no background.

## Layout Notes
- Commented block `/* === Track lists === */`.
- Cover every list variant: playlist, album, queue, search, artist.

## Mock Data
- A playlist with more than 50 tracks and one of them playing. An album. The queue.

## Acceptance Criteria
- [x] All five list variants show up green on black with the playing track in white. Playlist and artist page confirmed on screen; album, queue and the search Songs tab render through the same list class and were not captured one by one.
- [x] Hover and selection in blue with white text. Selection is blue with white text. Hover kept Spotify's gray by the owner's call, after the theme's blue lost to Spotify's rule and Winamp's list never had a hover.
- [x] Header with a bevel and no rounding.
- [x] Scrolling and clicking still work.
- [x] Screenshot at `docs/screenshots/playlist.png`.

## Dependencies
- PP-01

---

# Implementation Plan

Research done on 2026-09-13 against Spotify 1.2.99.317. Every class below was read from the class map object in the bundle and then checked for existence in this build, because half of the names other themes and Spicetify's own map use are gone from this version.

## Prerequisites
- PP-01 and PP-02 done: the pixel font, the bevel variables and the radius reset exist, and the now playing bar is already styled.

## Reusable Code Found
- `user.css:28-40`: the `:root` block with `--wa-bevel-*`, `--wa-raised`, `--wa-sunken`, `--wa-font-pixel`, `--wa-display-bg`, `--wa-groove-h`. Consume these; do not write new inset shadows or add colours that already exist.
- `user.css`, now playing bar block: the shape to copy. One commented block, every rule scoped under a container that belongs to this area, no `!important`, no literal colour outside `:root`.
- `color.ini`: `main`, `text`, `subtext`, `selected-row`, `button`, `card` reach CSS as `var(--spice-*)`.
- The lessons recorded at the end of the PP-02 issue: container testids render and per-button ones do not; Spotify's stylesheets load after the theme, so ties on specificity go to Spotify; check any class against the bundle before trusting it.

## Selectors, verified in this build
Readable and present, safe to target:

- `.main-trackList-trackList`: the list itself. `.main-trackList-indexable` is on the same element in most views.
- `.main-trackList-trackListRow`: one row.
- `.main-trackList-trackListHeader`: the column header row.
- `.main-trackList-rowMainContentTitle` and `.main-trackList-rowMainContentSubTitle`: the track name and the artist line. These replaced `rowTitle` and `rowSubTitle`, which no longer exist.
- `.main-trackList-duration`: the duration cell. The old `rowDuration` is gone.
- `.main-trackList-rowMarker`: the index column, which holds the number, the play icon and the playing indicator.
- `.main-trackList-rowSectionStart`, `-rowSectionVariable`, `-rowSectionEnd`: the three column groups of a row.

Present but generated, so version-bound:

- Selected row: the row also carries `aria-selected`, which is the stable way to reach it. The generated class `q8suB2R_XkoUyIeZ` is the fallback if the attribute turns out not to render.
- Playing row: `TiaWL1ubrITBXdmD`, and the equaliser icon in the marker column is `POVCTaiu08g8SWXr`. Neither has a readable name in this build, and there is no ARIA or data attribute for the state.

Gone in 1.2.99, do not use even though other themes and the class map still list them: `main-trackList-active`, `main-trackList-selected`, `main-trackList-rowTitle`, `main-trackList-rowSubTitle`, `main-trackList-playingIcon`, `main-trackList-rowDuration`.

That list is worth dwelling on. The two most actively maintained themes in the official collection, one of them patched days ago for this very Spotify line, still style `main-trackList-selected` and `main-trackList-playingIcon`. Those rules resolve to nothing here. Spicetify rewrites Spotify's generated class names into readable ones only where its map still matches the build, so a stale entry does not fail loudly, it just stops applying. Reading a popular theme is a good way to find which elements are worth styling; it is not a way to find out what they are called today.

## Architecture Decisions
- **ARIA before generated classes.** `[aria-selected="true"]` survives a Spotify release; a hash does not. The hash goes in only where no attribute exists, which here is the playing row, and it is commented as version-bound with the instruction to re-read it from the bundle.
- **Scope under `.main-trackList-trackList`.** Track lists appear in playlists, albums, the queue, search and artist pages, and that class is on all of them. It also keeps the rules off the now playing bar and the side panel, and it wins the ties that Spotify's later stylesheets would otherwise take.
- **Colour before layout.** Winamp's playlist is plain: green on black, one line per track. The issue asks for the `1. Artist - Title` shape, but reordering Spotify's grid columns risks breaking the drag, the context menu and the column resizing. Colour, font and the selection bar deliver most of the look; column surgery is attempted only after that reads right, and is dropped if it fights the grid.
- **The header is a panel, not a list row.** It takes the bevelled gray of the playlist window's title strip, which separates it from the black list below.

## Files to Create
None.

## Files to Modify
| File | Changes |
|------|---------|
| `user.css` | fills the `/* === Track lists === */` block |

### user.css
- List background: `.main-trackList-trackList` gets `var(--spice-main)` and the pixel font at 12px for the rows.
- Rows: `.main-trackList-trackListRow` in `var(--spice-text)`, no rounding, a thin dark separator so the rows read as a printed list.
- Title and artist: title in `var(--spice-text)`, artist in `var(--spice-subtext)`, both uppercase and clipped, never wrapped.
- Duration and index: `var(--spice-subtext)`, pixel font, right aligned where Spotify already aligns them.
- Hover and selection: background `var(--spice-selected-row)` with `var(--wa-white)` text, matched through `[aria-selected="true"]` and on `:hover`. The selection bar covers the whole row, including the index and duration cells.
- Playing row: `var(--wa-white)` text, which is how Winamp marks the current track. Keyed on the generated class, with the comment naming the Spotify build it came from.
- Header: `var(--spice-player)` background with `var(--wa-raised)` and `var(--wa-white)` pixel text.
- Nothing that touches `pointer-events`, `position`, `display` or the grid template on a row.

## Data Requirements
None.

## Testing Strategy
- No unit test applies: this is CSS with nothing importable. `pnpm check` still has to pass, and stylelint is the automated gate.
- Visual check in five places, because they use different row variants: a playlist, an album, the queue, search results and an artist page.
- Interaction check: click a row to select it, double click to play, right click for the context menu, drag a row to reorder inside a playlist, and resize a column. Nothing may stop responding.
- Check a row that is both selected and playing, which is the case where two rules meet.
- Screenshot of a playlist saved to `docs/screenshots/playlist.png`, which the issue asks for.

## Implementation Order
1. List background, row colour and the pixel font, then look at a playlist before going further.
2. Title, artist, index and duration.
3. Hover and selection.
4. Playing row.
5. Header.
6. `pnpm check`, the five views, the interaction pass, the screenshot.

## Unknowns
- Whether `aria-selected` actually reaches the DOM. The bundle passes it into the row component, but PP-02 showed that props do not always survive to the element. Confirm on screen before relying on it, and fall back to the generated class if it does not.
- **Whether the missing names are really dead is an inference, not a measurement.** The reasoning is that a name absent from the bundle cannot match anything, but Spicetify could be injecting readable names at runtime rather than only rewriting files, in which case the maintained themes work and this plan is solving a problem that does not exist. Settle it during execution: style the selected row twice, once through `aria-selected` and once through `main-trackList-selected`, in two different colours, and see which one paints. Carry the answer over to the shuffle state left open in PP-02, which rests on the same assumption.
- The `1. Artist - Title` line is written as a stretch: if it needs the grid rearranged, it waits for its own issue rather than risking the row's behaviour here.

## Found during execution

- **The dropped names are dead, measured.** The selected row was styled twice, once through `aria-selected` in blue and once through `main-trackList-selected` in red. It came out blue. Spicetify does not inject readable names at runtime; a name missing from the bundle matches nothing. This closes the question left open in PP-02 about the shuffle state as well: the classes that no longer appear in the bundle are not reaching the DOM by some other route.
- **The row's font never reaches its text.** Title, artist, index, duration, album and the video badge each carry their own font, so the pixel font is set on those elements and on every `a` and `span` inside the row, not on the row.
- **Hover stays Spotify's.** The theme's blue hover lost to Spotify's own hover rule, and rather than escalate specificity for a state Winamp's list never had, the rule was removed. Selection and the playing row are the two states that matter and both render.
- **The search "All" tab is not a track list.** It mixes artists, playlists and songs in a different component, so this block does not reach it. The "Songs" tab uses the same list as a playlist and does. The mixed results view belongs with the cards and rows of PP-05.
- **`no-descending-specificity` is off in stylelint.** It compares selectors across the whole file, and this file is independent blocks scoped under their own containers; a rule in the track list block cannot collide with one in the now playing bar block. The reason is recorded in the `user.css` header alongside the other rule that is off.
- **The `1. Artist - Title` line was not attempted.** Colour, font and the selection bar already read as the playlist window, and rearranging the grid columns risks the drag, the context menu and column resizing. If it is still wanted it is its own issue.
- **The committed screenshot predates the last cleanup by one apply.** It was captured while the measurement rule and the theme's hover rule were still in the file. Neither shows in it: no row is selected and none is under the pointer, so the image is the resting state of the final block, pixel for pixel. A fresh capture was attempted and Spotify came back without a window twice, which is where the session ended.

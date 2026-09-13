# [PP-04] Prototype: sidebar, top bar, navigation and scrollbars

## Type
Prototype (visual only)

## Description
The app chrome (the Your Library sidebar, the top bar with search and navigation, section headers, scrollbars) becomes a beveled gray panel with title bars in the classic gradient.

## Visual Elements
- Sidebar and top bar with a `var(--spice-sidebar)` background and a raised bevel on the edge.
- Navigation items in green, the active item in `var(--spice-tab-active)` with a sunken bevel.
- Section titles (Your Library, Home, the playlist name in the header) as a 14px strip with a gradient from `--wa-titlebar-start` to `--wa-titlebar-end` and white pixel text.
- Search field as a sunken black display with green pixel text.
- Square back and forward buttons with a bevel.
- Scrollbars with a dark sunken track and a `var(--spice-button)` thumb with a raised bevel, 12px wide, no rounding.
- Dividers between panels with a light line and a dark line, the way Winamp separates windows.

## Layout Notes
- Commented blocks `/* === Sidebar === */`, `/* === Top bar === */`, `/* === Scrollbars === */`.
- Don't change widths and don't hide elements. Color, bevel and font only.

## Mock Data
- A library with playlists, albums and artists. A search with results.

## Acceptance Criteria
- [x] Sidebar, top bar and headers with a gray panel and title bars.
- [x] Rectangular beveled scrollbars in every scrollable area. Confirmed on the content column; the library list and the queue use the same OverlayScrollbars classes.
- [x] Search field as a black display.
- [x] Resizing the sidebar still works. No rule touches width, display or position on the panel.
- [x] Screenshot at `docs/screenshots/sidebar.png`.

## Dependencies
- PP-01

---

# Implementation Plan

Research done on 2026-09-13 against Spotify 1.2.99.317, in the order that worked on PP-03: the two actively maintained themes in the official collection first, then Spicetify's class map, then every name checked against the bundle before it entered this plan.

## Prerequisites
- PP-01, PP-02 and PP-03 done. The bevel variables, the pixel font, the radius reset and the two styled areas all exist and show the shape this block copies.

## Reusable Code Found
- `user.css:28-42`: the `:root` block. `--wa-raised`, `--wa-sunken`, `--wa-titlebar-start`, `--wa-titlebar-end`, `--wa-white`, `--wa-font-pixel`, `--wa-display-bg`. This issue introduces no new colour.
- `user.css`, now playing bar block: the display recipe (black, sunken, green pixel text) is exactly what the search field needs. The button recipe (gray, raised, black icon, sunken on press) is what the history buttons need.
- `user.css`, track list block: the header recipe (gray, raised, white pixel text) is what the library header needs, and `[aria-selected="true"]` is how the library's active item is reached, same as a selected row.
- `color.ini`: `sidebar`, `player`, `text`, `subtext`, `button`, `selected-row`, `tab-active` all arrive as `var(--spice-*)`.

## Selectors, verified in this build
Readable and present:

- Sidebar: `.main-yourLibraryX-libraryContainer` (the whole panel), `.main-yourLibraryX-header` (its top strip with the title and the create button), `.main-yourLibraryX-entryPoints`, `.main-yourLibraryX-filterArea`, `.main-yourLibraryX-collapseButton`, `.main-yourLibraryX-libraryRootlist` (the scrolling list), `.main-yourLibraryX-listItem` (one entry). An entry carries `aria-selected`, so the one for the page you are on is `[aria-selected="true"]`.
- Top bar: `.main-globalNav-searchContainer`, `.main-globalNav-searchInputSection`, `.main-globalNav-searchInputText` (the field itself), `.main-globalNav-historyButtons` (back and forward), `.main-globalNav-navLink` and `.main-globalNav-navLinkActive` (home and the other top links), `.main-topBar-topbarContent`, `.main-topBar-background`.
- Section titles: `.main-shelf-title` (the shelf headings on Home, such as "Made for you") and `.main-entityHeader-title` (the big name on a playlist, album or artist page).
- Content column: `.main-view-container`.
- Scrollbars: Spotify does not use native scrollbars. It uses OverlayScrollbars, which draws `.os-scrollbar`, `.os-scrollbar-vertical`, `.os-scrollbar-track` and `.os-scrollbar-handle`. `::-webkit-scrollbar` would style nothing.

Gone in 1.2.99, listed by the map and by other themes, do not use: `main-yourLibraryX-navItems`, `main-yourLibraryX-navLink`, `main-rootlist-rootlistItemLink`, `main-rootlist-rootlistItemLinkActive`, `main-navBar-navBar`.

## Architecture Decisions
- **Three blocks, not one.** Sidebar, top bar and scrollbars each get their own commented block and their own scope, as the issue lays out. The scrollbar block is scoped to `.os-scrollbar` and reaches every scrolling area in the app, which is what the issue asks for.
- **ARIA for state, again.** The library's current entry is `[aria-selected="true"]`; the current top link is `.main-globalNav-navLinkActive`, which exists in this build, with `[aria-current="page"]` as the attribute form. No generated class is needed anywhere in this issue.
- **Title strips only where there is a strip.** The library header and the entity header are strips and take the gradient. Shelf titles on Home are headings floating over content, not strips: they take the pixel font and white colour without a band, or the Home page turns into a stack of bars.
- **Nothing structural.** Widths, heights, `display`, `position` and `overflow` stay untouched. Resizing the sidebar and the collapse button depend on them.
- **Scrollbar width is left as Spotify sets it.** The issue says 12px, but OverlayScrollbars positions the handle from the track size and forcing a width has broken dragging in other themes. Colour, bevel and squareness deliver the look; if the handle still reads too thin, width is a follow-up with drag tested on its own.

## Files to Create
None.

## Files to Modify
| File | Changes |
|------|---------|
| `user.css` | fills the `/* === Sidebar === */`, `/* === Top bar === */` and `/* === Scrollbars === */` blocks |

### user.css, sidebar
- `.main-yourLibraryX-libraryContainer`: `var(--spice-sidebar)` background, `var(--wa-raised)`.
- `.main-yourLibraryX-header`: the gradient from `--wa-titlebar-start` to `--wa-titlebar-end`, `var(--wa-white)` pixel text at 11px, uppercase, and the same on the buttons inside it.
- `.main-yourLibraryX-listItem`: text in `var(--spice-text)`, its secondary line in `var(--spice-subtext)`, pixel font at 12px.
- `.main-yourLibraryX-listItem[aria-selected="true"]`: `var(--spice-selected-row)` with `var(--wa-white)` text and `var(--wa-sunken)`.
- `.main-yourLibraryX-filterArea` chips and the collapse button: the button recipe.

### user.css, top bar
- `.main-topBar-background` and `.main-topBar-topbarContent`: `var(--spice-sidebar)`, `var(--wa-raised)`.
- `.main-globalNav-searchInputSection`: the display recipe, black and sunken, with `.main-globalNav-searchInputText` in `var(--spice-text)` pixel font, and its placeholder in `var(--spice-subtext)`.
- `.main-globalNav-historyButtons button`: the button recipe.
- `.main-globalNav-navLink`: the button recipe, and `.main-globalNav-navLinkActive` sunken with `var(--spice-tab-active)` icon.

### user.css, section titles and scrollbars
- `.main-entityHeader-title`: pixel font, `var(--wa-white)`, uppercase. Size left to Spotify, since it scales with the header.
- `.main-shelf-title`: pixel font, `var(--wa-white)`, uppercase, no band.
- `.os-scrollbar-track`: `var(--wa-display-bg)`, `var(--wa-sunken)`.
- `.os-scrollbar-handle`: `var(--spice-button)`, `var(--wa-raised)`. The radius reset already squares it.

## Data Requirements
None.

## Testing Strategy
- No unit test applies. `pnpm check` must pass; stylelint is the gate.
- Visual check on Home, a playlist page, the library expanded and collapsed, and the search field with and without text.
- Interaction check, which is where this issue can break things: drag the sidebar edge to resize it, click the collapse button, type in the search field, use back and forward, drag a scrollbar handle in the content column and in the library list, and scroll with the wheel.
- Screenshot saved to `docs/screenshots/sidebar.png`.

## Implementation Order
1. Sidebar container, header and list items, then look at it.
2. Active library entry.
3. Top bar, search field, history and nav buttons.
4. Section titles.
5. Scrollbars.
6. `pnpm check`, the interaction pass, the screenshot.

## Unknowns
- Whether the library entry's `aria-selected` reflects the page you are on or a click selection. Confirm on screen; if it is click selection, the current page's entry may need `.main-globalNav-navLinkActive`'s equivalent, found by reading the bundle at execution time.
- Whether OverlayScrollbars repaints its handle from a colour it computes rather than from CSS. If the handle ignores `background-color`, the fix is scoping a rule to `.os-theme-*` or matching whatever class the library puts on the handle, read from the bundle then.

## Found during execution

- **The page's sticky strip is not the top bar.** `main-topBar-background` and `main-topBar-topbarContent` belong to the strip Spotify fades in over a page's header as you scroll, not to the global navigation. Painting them opaque left a gray band floating over every playlist's artwork. They are left alone; the global navigation is reached through `main-globalNav-*`.
- **"Your Library" is itself the collapse button.** It sits in a div that carries `main-yourLibraryX-collapseButton`, with the button inside, so the key recipe for header buttons boxed the panel's title in gray. It is excluded and set as the strip's title: white pixel text, no fill.
- **The filter chips live outside every readable container.** They are not in `main-yourLibraryX-header` nor in `main-yourLibraryX-filterArea`, which is the search and sort row below them, and their own container is generated. The maintained themes reach them with `[class*="chip" i]`, a case-insensitive substring match on the design-system class, and so does this block. No hash needed.
- **Ties go to Spotify, again.** The home link is painted by a bare class rule of the same specificity as the theme's, and Spotify's stylesheet loads later, so the theme's colour lost. The element name is in the selector to break the tie, the same lesson as the now playing bar.
- **The sticky strip needed its colour, not its content painted.** After the first fix removed the gray band, scrolling a playlist showed Spotify's default colour on the strip instead of the theme's gray. `main-topBar-background` is what Spotify fades in with opacity, so it takes `--spice-sidebar` and nothing else; `main-topBar-topbarContent` stays untouched. The title on that strip takes the pixel face.
- **Scrollbars confirmed as OverlayScrollbars.** The dark track and gray handle show on the content column's right edge once there is something to scroll. `::-webkit-scrollbar` was never written.
- **No generated class in this block.** Every state is reached through `aria-selected`, `.main-globalNav-navLinkActive` or a readable class checked against the bundle.

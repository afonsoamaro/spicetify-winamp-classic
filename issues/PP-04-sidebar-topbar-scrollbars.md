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
- [ ] Sidebar, top bar and headers with a gray panel and title bars.
- [ ] Rectangular beveled scrollbars in every scrollable area.
- [ ] Search field as a black display.
- [ ] Resizing the sidebar still works.
- [ ] Screenshot at `docs/screenshots/sidebar.png`.

## Dependencies
- PP-01

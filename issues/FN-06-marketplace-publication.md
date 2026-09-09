# [FN-06] Marketplace publication

## Type
Functional

## Description
Make the theme installable from the Spicetify Marketplace, and documented for someone arriving cold.

## User Flow
1. The user opens the Marketplace in Spotify, searches for "Winamp Classic" and installs it.
2. The theme applies colors, CSS and the extension from `include` with no manual step.

## Requirements
- `preview.png` captured from Spotify with the full theme, 16:9, showing the now playing bar with the spectrum analyzer plus a playlist.
- Final `README.md`: what it is, screenshot, Marketplace install, manual install (clone, symlink, `spicetify config`, `spicetify apply`), how to develop (`pnpm check`, `pnpm build`, `spicetify watch -s`), license, and a note that no asset from the original Winamp is used.
- `manifest.json` reviewed: `include` pointing to `https://cdn.jsdelivr.net/gh/afonsoamaro/spicetify-winamp-classic@main/theme.js`, `tags`, `authors`.
- `spicetify-themes` topic on the GitHub repo.
- End to end test: remove the local theme, `spicetify config current_theme marketplace`, install from the Marketplace and confirm that CSS, colors and the extension all load.
- jsdelivr cache: after changing `theme.js` on `main`, the CDN may serve the old version for up to 24h. Document in the README how to purge it (`https://purge.jsdelivr.net/gh/...`).

## Scenarios
### Happy Path
- The theme shows up in the Marketplace within a few hours of the topic being added, and installs complete.

### Edge Cases
- Marketplace installs the theme but the extension doesn't load: check the `include` URL and the jsdelivr cache.

### Error Handling
- Theme doesn't show up in Marketplace search: check the topic, `manifest.json` at the root, and the default branch `main`.

## Data Requirements
- None.

## External Dependencies
- GitHub, jsdelivr, Spicetify Marketplace.

## Acceptance Criteria
- [ ] Final `preview.png` and `README.md` on `main`.
- [ ] Theme installed from the Marketplace on a clean config loads CSS, colors and the extension.
- [ ] `pnpm check` green and CI green on `main`.

## Dependencies
- FN-00b, PP-01 through PP-05, FN-02, FN-03, FN-05

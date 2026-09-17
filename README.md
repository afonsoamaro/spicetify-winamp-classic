# Winamp Classic for Spicetify

A [Spicetify](https://spicetify.app/) theme that brings the Winamp 2.x look to Spotify: bevelled gray panels, green LED displays on black, a pixel font, and a small extension that adds a spectrum analyzer, a scrolling title and the classic title bar.

## Status

Under construction. The color scheme and the tooling are in place; the CSS and the extension are being built issue by issue. Progress is tracked in [`issues/_index.md`](issues/_index.md).

## Install

From the Spicetify Marketplace: open the Marketplace in Spotify, search for "Winamp Classic" and install it. Or manually:

```bash
git clone https://github.com/afonsoamaro/spicetify-winamp-classic.git
ln -s "$PWD/spicetify-winamp-classic" ~/.config/spicetify/Themes/WinampClassic
spicetify config current_theme WinampClassic color_scheme Classic
spicetify apply
```

On Windows the themes folder is `%appdata%\spicetify\Themes`.

The Marketplace loads `theme.js` from jsdelivr (`https://cdn.jsdelivr.net/gh/afonsoamaro/spicetify-winamp-classic@main/theme.js`, see `manifest.json`). After changing `src/` on `main`, the CDN can serve the old file for up to 24h; purge it at `https://purge.jsdelivr.net/gh/afonsoamaro/spicetify-winamp-classic@main/theme.js`.

## After Spotify updates

Spotify overwrites its own files when it updates, which removes every theme. When the app comes back with the stock look, run:

```bash
python3 scripts/reapply.py
```

The script checks the symlink and config, restores the stock files, takes a fresh backup, applies the theme and verifies it landed. The manual equivalent is `spicetify update` (only if Spicetify itself reports a new version) followed by `spicetify restore` and `spicetify backup apply`: a stale backup makes a plain `backup apply` refuse, and a plain `spicetify apply` is not enough after an update, because the backup it would restore is from the previous Spotify.

`backup apply` takes a fresh backup of the new Spotify and applies the theme on top of it. A plain `spicetify apply` is not enough after an update, because the backup it would restore is from the previous Spotify.

Spotify also renames CSS classes between releases. If a part of the theme falls back to the stock look after an update, that is a selector that no longer matches; please open an issue with the Spotify version.

## Development

```bash
nvm use
pnpm install
pnpm check          # lint + typecheck + test + build
spicetify watch -s  # re-applies color.ini, user.css and theme.js on save
```

`theme.js` is generated from the modules in `src/` by `scripts/build.js` and is committed, because Spicetify loads a single file. Run `pnpm build` after changing anything in `src/`.

The `@font-face` block in `user.css` is generated the same way, by `scripts/embed-font.js` from the woff2 files in `assets/`. Run `pnpm embed:font` after changing them, and do not hand-edit between the markers.

## Quality gate

`pnpm check` runs lint, type-check, tests and the build. CI runs the same command on every pull request and on every push to `main`.

## Contributing

Work is split into small issues in [`issues/`](issues/). One branch per issue, `pnpm check` green before opening a pull request.

## Credits and license

MIT, see [LICENSE](LICENSE).

No asset from the original Winamp skin is used. The look is recreated with CSS and canvas.

The pixel font is [Silkscreen](https://fonts.google.com/specimen/Silkscreen) by Jason Kottke, embedded as a data URI and licensed under the SIL Open Font License 1.1. Its license text ships with the theme in [`assets/Silkscreen-OFL.txt`](assets/Silkscreen-OFL.txt).

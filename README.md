# Winamp Classic for Spicetify

A [Spicetify](https://spicetify.app/) theme that brings the Winamp 2.x look to Spotify: bevelled gray panels, green LED displays on black, a pixel font, and a small extension that adds a spectrum analyzer, a scrolling title and the classic title bar.

## Status

Under construction. The color scheme and the tooling are in place; the CSS and the extension are being built issue by issue. Progress is tracked in [`issues/_index.md`](issues/_index.md).

## Install

Marketplace install will be available once the theme is published. Until then, install it manually:

```bash
git clone https://github.com/afonsoamaro/spicetify-winamp-classic.git
ln -s "$PWD/spicetify-winamp-classic" ~/.config/spicetify/Themes/WinampClassic
spicetify config current_theme WinampClassic color_scheme Classic
spicetify apply
```

On Windows the themes folder is `%appdata%\spicetify\Themes`.

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

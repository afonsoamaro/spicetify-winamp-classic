# Winamp Classic for Spicetify

Spotify wearing the Winamp 2.x face: bevelled gray panels, a green LED display that scrolls the track title, a spectrum analyzer bouncing next to it, and a pixel typeface all the way down. It really whips the llama's ass.

No bitmap from the original skin ships here. Every bevel, knob and LED is CSS, and the analyzer is a canvas.

![Home](https://raw.githubusercontent.com/afonsoamaro/spicetify-winamp-classic/main/docs/screenshots/home.png)

## Contents

- [What you get](#what-you-get)
- [Install](#install)
- [More screenshots](#more-screenshots)
- [Ideas, bugs and questions](#ideas-bugs-and-questions)
- [After Spotify updates](#after-spotify-updates)
- [Development](#development)
- [Credits and license](#credits-and-license)

## What you get

- The now playing bar rebuilt as the Winamp main window: LED display, scrolling title, spectrum analyzer, transport keys, seek and volume sliders.
- A `WINAMP` title strip across the top of the player, gradient and all.
- Track lists as the old playlist window, plus bevelled cards, buttons, menus, modals and scrollbars.
- The Silkscreen pixel font embedded in the theme, so there is nothing to install and nothing to load at runtime.
- One colour scheme, `Classic`, straight off the Winamp base skin.

It is still being built, screen by screen. What is done and what is next lives in [the issue index](https://github.com/afonsoamaro/spicetify-winamp-classic/blob/main/issues/_index.md).

## Install

From the Spicetify Marketplace, which is the easy path: open the Marketplace in Spotify, search for "Winamp Classic", click Install, reload when prompted.

The Marketplace only installs themes while `current_theme` in `config-xpui.ini` is set to `marketplace`. That is a Spicetify requirement for every theme, not just this one. If Spotify tells you to set it, run:

```bash
spicetify config current_theme marketplace
spicetify apply
```

Installing manually skips the Marketplace app and that requirement entirely:

```bash
git clone https://github.com/afonsoamaro/spicetify-winamp-classic.git
ln -s "$PWD/spicetify-winamp-classic" ~/.config/spicetify/Themes/WinampClassic
spicetify config current_theme WinampClassic color_scheme Classic
spicetify apply
```

On Windows the themes folder is `%appdata%\spicetify\Themes`.

## More screenshots

The now playing bar, which is where most of the theme lives:

![Now playing bar](https://raw.githubusercontent.com/afonsoamaro/spicetify-winamp-classic/main/docs/screenshots/player.png)

A playlist and an artist page:

![Playlist](https://raw.githubusercontent.com/afonsoamaro/spicetify-winamp-classic/main/docs/screenshots/playlist.png)

![Artist](https://raw.githubusercontent.com/afonsoamaro/spicetify-winamp-classic/main/docs/screenshots/artist.png)

## Ideas, bugs and questions

Reports are welcome and small ones are the most useful. A screen that still looks stock, a knob that lost its bevel, a Winamp detail I forgot: all of it helps.

- [Report a bug](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new?template=bug_report.yml): what you saw, your Spotify version, a screenshot if you have one.
- [Suggest an idea](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new?template=idea.yml): a screen that needs work, a detail from the original skin, anything you miss.
- [Ask something else](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new): a blank issue, no template, no ceremony.

You do not need to know CSS to be useful here. A screenshot of the screen that looks wrong is usually enough to find the selector Spotify renamed.

Want to send a pull request? [CONTRIBUTING.md](https://github.com/afonsoamaro/spicetify-winamp-classic/blob/main/CONTRIBUTING.md) is the short version: one branch per change, `pnpm check` green, screenshot in the description.

## After Spotify updates

Spotify overwrites its own files when it updates, which removes every theme. When the app comes back with the stock look, run:

```bash
python3 scripts/reapply.py
```

The script checks the symlink and config, restores the stock files, takes a fresh backup, applies the theme and verifies it landed. The manual equivalent is `spicetify update` (only if Spicetify itself reports a new version) followed by `spicetify restore` and `spicetify backup apply`: a stale backup makes a plain `backup apply` refuse, and a plain `spicetify apply` is not enough after an update, because the backup it would restore is from the previous Spotify.

Spotify also renames CSS classes between releases. If a part of the theme falls back to the stock look after an update, that is a selector that no longer matches. Please open an issue with the Spotify version.

## Development

```bash
nvm use
pnpm install
pnpm check          # lint + typecheck + test + build
spicetify watch -s  # re-applies color.ini, user.css and theme.js on save
```

`pnpm check` is the whole gate, and CI runs the same command on every pull request and on every push to `main`.

Three files in the repo are generated, so do not hand-edit between their markers:

- `theme.js`, built from the modules in `src/` by `scripts/build.js`. It is committed because Spicetify loads a single file. Run `pnpm build` after touching `src/`.
- The `@font-face` block in `user.css`, from the woff2 files in `assets/` by `scripts/embed-font.js`. Run `pnpm embed:font`.
- The colour block in `user.css`, from `color.ini` by `scripts/embed-scheme.js`. Run `pnpm embed:scheme`. Spicetify injects those variables itself; the copy keeps the theme whole when a Marketplace install over another theme drops the scheme.

The Marketplace loads `theme.js` from jsDelivr (`https://cdn.jsdelivr.net/gh/afonsoamaro/spicetify-winamp-classic@main/theme.js`, see `manifest.json`). After a change lands on `main`, the CDN can serve the old file for up to 24h; purge it at `https://purge.jsdelivr.net/gh/afonsoamaro/spicetify-winamp-classic@main/theme.js`.

Work is planned as small issues in [`issues/`](https://github.com/afonsoamaro/spicetify-winamp-classic/tree/main/issues), each one carrying its own diagnosis and verification notes. They are worth a read before changing a selector: most of them explain why a rule looks the way it does.

## Credits and license

MIT, see [LICENSE](https://github.com/afonsoamaro/spicetify-winamp-classic/blob/main/LICENSE).

No asset from the original Winamp skin is used. The look is recreated with CSS and canvas.

The pixel font is [Silkscreen](https://fonts.google.com/specimen/Silkscreen) by Jason Kottke, embedded as a data URI and licensed under the SIL Open Font License 1.1. Its license text ships with the theme in [`assets/Silkscreen-OFL.txt`](https://github.com/afonsoamaro/spicetify-winamp-classic/blob/main/assets/Silkscreen-OFL.txt).

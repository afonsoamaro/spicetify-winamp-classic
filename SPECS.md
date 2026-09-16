# Winamp Classic: a Spicetify theme

Date: 2026-09-07
Status: issues generated from this spec, 11/16 done as of 2026-09-16; `issues/_index.md` is the source of truth for progress

## Goal

Spicetify theme that recreates the Winamp 2.x look with the base skin: blue-gray panels with 3D bevels, black displays with LED green text in a pixel font, green-on-black playlist with the selected track in blue, animated green-yellow-red spectrum analyzer.
The theme is publishable on the Spicetify Marketplace and usable locally during development.
No bitmap from the original skin is copied. The whole look is rebuilt with CSS, canvas and a freely licensed pixel font.

## Out of scope

Third-party .wsz skins, shade mode, equalizer, replacing the player with a component of our own, color schemes other than Classic.

## Target environment

Spicetify 2.45.0, Spotify 1.3.0.277 on macOS, Marketplace installed.
The Spicetify config already has `inject_css 1`, `inject_theme_js 1` and `replace_colors 1`.

## Repository structure

GitHub: `afonsoamaro/spicetify-winamp-classic`, public, topic `spicetify-themes`.

```
spicetify-winamp-classic/
├── manifest.json
├── color.ini
├── user.css
├── theme.js
├── preview.png
├── README.md
├── LICENSE
├── SPECS.md
├── issues/
├── src/
│   ├── spectrum.js      # bar generator and peak decay
│   ├── marquee.js       # display text and scroll step
│   └── time.js          # mm:ss formatting
├── test/
│   ├── spectrum.test.js
│   ├── marquee.test.js
│   └── time.test.js
├── scripts/build.js     # concatenates src/ + DOM entry into theme.js
├── types/globals.d.ts   # Spicetify types, copied from ~/.spicetify
├── .github/workflows/ci.yml
├── .github/dependabot.yml
├── .nvmrc
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── .stylelintrc.json
```

### manifest.json

Required Marketplace fields: `name` "Winamp Classic", `description`, `preview` "preview.png", `usercss` "user.css", `schemes` "color.ini", `readme` "README.md".
`include` with the jsdelivr URL for `theme.js` on the `main` branch, because the Marketplace loads neither a relative path nor GitHub raw in that field.
`authors` with the repo owner. `tags` "retro", "winamp".

### Local loading

Symlink from the clone to `~/.config/spicetify/Themes/WinampClassic`.
`spicetify config current_theme WinampClassic color_scheme Classic` and `spicetify apply`.
Spicetify loads the `theme.js` at the theme root by itself, thanks to `inject_theme_js`. No need to register it as an extension.
During development, `spicetify watch -s` reapplies CSS and JS on save.

### Marketplace loading

The Marketplace downloads `user.css` and `color.ini` from GitHub raw, and `theme.js` from the URL in `include`.
`user.css` cannot rely on a relative `url()`, because the Marketplace rewrites those paths to the CDN and local loading does not. The font goes in as a data URI.

## Palette (color.ini)

A single scheme, `[Classic]`, with the 18 fields of Spicetify's default `color.ini`. Initial values come from the Winamp 2.x base skin and the default `pledit.txt`. Fine tuning is visual, inside Spotify.

| Field | Value | Use |
|---|---|---|
| text | #00ff00 | LED green for the displays and the playlist |
| subtext | #00b800 | dim green for secondary text |
| main | #000000 | content area, the playlist window equivalent |
| main-elevated | #1a1a22 | backgrounds for objects above the content |
| highlight | #0000c6 | hover on content objects |
| highlight-elevated | #0000c6 | hover on elevated objects |
| sidebar | #2b2b38 | blue-gray panel |
| player | #2b2b38 | now playing bar |
| card | #1a1a22 | cards |
| shadow | #000000 | shadows |
| selected-row | #0000c6 | background of the selected track, white text |
| button | #3c3c4c | beveled buttons |
| button-active | #00ff00 | active button |
| button-disabled | #55555f | disabled button |
| tab-active | #00ff00 | active tab |
| notification | #0000c6 | notifications |
| notification-error | #c60000 | error |
| misc | #ff9900 | orange for the sliders and the spectrum analyzer |

Helper CSS variables on `:root` in `user.css`, kept out of `color.ini` because they are not Spicetify colors: `--wa-bevel-light` #5a5a6e, `--wa-bevel-dark` #14141c, `--wa-titlebar-start` #1c1c2a, `--wa-titlebar-end` #3a3a52, `--wa-white` #ffffff.

## CSS by area (user.css)

Principles: no `border-radius`, bevel always through inset `box-shadow` (light on top and left, dark on bottom and right), pixel font only where Winamp used a display or a playlist.
Each area sits in its own commented, independent block. If a Spotify selector changes, only that block degrades.

### Font

Silkscreen (SIL Open Font License), embedded as `@font-face` with `src: url(data:font/woff2;base64,...)`.
Applied through the `--wa-font-pixel` utility class on the displays, the track list and the title bar. The rest of the app keeps Spotify's default font.

### Now playing bar

Gray panel background with an outer bevel.
The track info block becomes a black display with title and artist in pixel green. The extension adds the marquee and the spectrum analyzer inside that display.
Elapsed time and duration in pixel green, elapsed time at a larger size, echoing Winamp's counter.
Square transport buttons, gray with a bevel, black icons. The pressed state inverts the bevel.
Progress bar with a recessed dark track and a rectangular gray knob with a bevel.
Volume with a green, yellow and red gradient track running left to right, and the same knob.

### Track list

Black background. Rows in pixel green. The playing track in white. Hover and selection use a #0000c6 background and white text.
Track number, name and artist on the same line, in the format `1. Artist - Title`, done in CSS where the DOM allows. Duration aligned right.
Table header in beveled gray, like the bar of the playlist window.

### Sidebar, top bar and navigation

Same beveled gray panel. Active items in green. Section titles in a strip with the title bar gradient and white text.

### Scrollbars

Recessed dark track, gray thumb with a bevel, no rounding.

### Cards, buttons, inputs, modals and menus

3D bevel and square corners on all of them. Card background from `card`, hover brightens the bevel. Context menus use the panel background with green items.

### Cover art

Kept as is, but with a 2px recessed border so it looks set into the panel.

## Extension (theme.js)

A single file loaded by Spicetify. It waits for `Spicetify.Player` and `Spicetify.Platform` to exist before touching the DOM.
Three independent injections. Each one runs inside a try/catch and logs to the console with the `[winamp-classic]` prefix. One failing does not stop the others.
A `MutationObserver` on the now playing bar watches for reinjection, because Spotify remounts that piece in some flows.

### Spectrum analyzer

A `<canvas>` inserted into the now playing bar display, to the right of the text.
Nineteen bars. On every `requestAnimationFrame` frame, while `Spicetify.Player.isPlaying()` is true, each bar gets a smoothed pseudorandom target and falls at a constant decay rate when the target is lower.
Each bar carries a gray peak that rises with the bar and falls slowly, like in Winamp.
Color by height, bottom to top: green, yellow, orange, red, in discrete steps of 1 pixel of bar height.
With playback paused the bars decay to zero and the loop stops, so it does not burn CPU.
If `Spicetify.getAudioData()` answers with segments, target intensity follows the loudness of the current segment. If it rejects or comes back empty, synthetic mode carries on with no visible error.

### Marquee

The display text is `Artist - Title` in uppercase, with `(mm:ss)` at the end, same as Winamp.
When the text fits the display, it stays put. When it does not, it scrolls left one character every 200 ms with a `  ***  ` separator between laps.
It restarts on the `songchange` event.

### Title bar

A 14 px strip above the now playing bar with the title gradient, the text "WINAMP" centered in pixel white, and three decorative squares on the right (minimize, shade, close). Visual only, no action.

### Pure modules in src/

`spectrum.js` exports `nextFrame(state, rng, playing)` and `colorForRow(row, total)`. No DOM.
`marquee.js` exports `displayText(track)` and `scrollStep(text, offset, width)`. No DOM.
`time.js` exports `formatTime(ms)`.
Since Spicetify loads a single file, the `src/` modules and the DOM entry point are concatenated into `theme.js` by `scripts/build.js`, a Node script with no bundler. The committed `theme.js` is the generated artifact.

## Development flow

1. Symlink the repo at `~/.config/spicetify/Themes/WinampClassic`.
2. `spicetify config current_theme WinampClassic color_scheme Classic` and `spicetify apply`.
3. `spicetify watch -s` while editing.
4. Visual check with a Spotify screenshot on: Home, a playlist, album, search, Your Library, queue, context menu, modal.

## Quality

- Lint: eslint over `theme.js`, `src/`, `scripts/` and `test/`. stylelint over `user.css` with a rule that forbids any `border-radius` other than 0.
- Type check: `tsc --noEmit` with `checkJs`, `allowJs`, and Spicetify's `globals.d.ts` copied from `~/.spicetify/globals.d.ts` into `types/`.
- Tests: vitest over the `src/` modules, covering bar decay, peak fall, color per row, display text with and without overflow, marquee step with wrap, and time formatting including hours.
- Build: `pnpm build` generates `theme.js` from `src/`. It belongs in the gate because green lint and typecheck do not prove the artifact builds.
- `pnpm check` runs the four checks: lint, typecheck, test and build. It has to pass before any commit.

## Release

Only after visual approval. Steps: preview.png taken from Spotify, a README covering manual and Marketplace installation, the `spicetify-themes` topic on the repo, and a check that the theme shows up in the Marketplace.
No commit, push or remote repo creation without explicit confirmation.

## Risks

- Spotify selectors change with every release. Mitigation: independent CSS blocks and guards in the extension.
- `getAudioData` may not answer. Mitigation: synthetic mode is the default.
- A small pixel font can end up illegible on high-density screens. Mitigation: 11px minimum size, and use restricted to displays and lists.

## Conventions

The standing rules I apply across my projects were written for web and mobile apps. This is a CSS and JS theme with no server, so some of them do not apply. Here is what holds and what stays out, with the reason.

### Applies

- Order FN-00 (the four checks green on an empty repo) → FN-00b (git, GitHub, issues) → FN-01+. The issues are derived from this SPECS.md and live in `issues/` with `_index.md`.
- Dedicated branch before any commit, `--no-ff` merge carrying only the subject.
- pnpm with a pinned `packageManager`, `.nvmrc` on the current LTS, and `pnpm check` running `lint`, `typecheck`, `test` and `build`. Versions looked up at scaffold time, never from memory.
- CI runs that same `pnpm check`, plus `dependabot.yml` with the npm and github-actions ecosystems.
- Public repo from day one, because the Marketplace requires it. That pulls in the three obligations for opening a repo: gitleaks over the whole history, an MIT license, and a README for someone arriving cold. Since this project has no secret and no `.env`, the security pass comes down to gitleaks.
- Theme tokens: every color lives in `color.ini` or in the `--wa-*` variables on `:root`. A literal color in a CSS rule is a bug.
- Planning lives in the repo.

### Does not apply

- Ports, Postgres, Redis and compose: there is no service.
- Auth, `ownerId`, the IDOR and exposure checklist: there is no backend and no user data.
- i18n in three languages: the only interface string is "WINAMP" in the title bar, which is visual branding, not translatable text.
- OpenTelemetry: there is no runtime of our own to instrument. The extension logs to the Spotify console with the `[winamp-classic]` prefix.
- A screen prototype before implementation: the target look already exists (Winamp 2.x). Checking happens straight in Spotify.
- The standard web stack: Spicetify loads static files. Build tooling stops at the Node concatenation script.

# [FN-14] Document the Marketplace install prerequisite

## Type
Functional (maintenance, docs)

## Description
Installing any theme through the Spicetify Marketplace UI requires `current_theme` in `config-xpui.ini` to be the literal string `marketplace`. The Marketplace app checks this against the config baked into the page at the last `spicetify apply`, not against the live INI file, and reports `Please set current_theme in config-xpui.ini to 'marketplace' to install themes using the Marketplace` (the `wrongLocalTheme` notification key) when it does not match. Clicking Install with any other value silently does nothing: no folder is written, the button stays "Install". The owner hit this on 2026-09-18 trying to install Winamp Classic on their own dev machine, whose `current_theme` was `WinampClassic` from local development. The README's Marketplace section does not mention the prerequisite.

## Diagnosis (live, 2026-09-18, Spotify 1.3.0.277, CDP + IndexedDB reset)
- `~/.config/spicetify/CustomApps/marketplace/index.js`: `isInstalled(){return null!==E.getItem(this.localStorageKey)}` and the notification string `wrongLocalTheme` are keyed to comparing the theme's expected slug against `Spicetify.Config["current_theme"]`, which is a literal assignment baked into the Spotify page HTML by `spicetify apply`, not read live from the INI file. Editing the INI with `spicetify config` alone does not change what the running page checks; only a follow-up `apply` (and a Spotify restart) does.
- Reproduced end to end: with the theme folder absent and `current_theme` blank (a fresh Spicetify default), clicking Install produced no folder and the button stayed "Install". With `current_theme marketplace` baked in (via `spicetify config current_theme marketplace && spicetify apply`, then a restart), the same click flips the button to "Remove", the page prompts "A page reload is required to complete this operation", and after reload the theme is live: now playing bar bevels, marquee, spectrum canvas, WINAMP title bar at 14px, `theme.js?time=...` loaded from jsDelivr, and the injected stylesheet carries all 113 rules of the current `user.css` (the FN-06 file-freshness caveat is resolved; the Marketplace backend has since re-snapshotted).
- Marketplace's own "installed" bookkeeping lives in an IndexedDB database (`spicetify-marketplace`, a Dexie store), independent of the theme folder on disk; deleting it is how a clean re-test was forced during diagnosis, not something a real user needs to touch.

## Requirements
- README's Marketplace install step gains the prerequisite and the exact recovery: run `spicetify config current_theme marketplace` then `spicetify apply` before opening the Marketplace to install (any theme, not just this one), reload when prompted.
- Keep the manual install path unaffected; it does not go through the Marketplace app and never hits this check.

## Acceptance Criteria
- [x] README's Install section states the `current_theme marketplace` prerequisite and the exact commands, next to the existing Marketplace instructions.
- [x] `pnpm check` green (docs-only change).

## Dependencies
- FN-06

## Verification (2026-09-18, branch `fix/fn-14-marketplace-install-prereq`)

- `pnpm check` green (docs-only change; no code touched).
- Live re-confirmation of the whole flow on this diagnosis's own machine: theme folder removed, `current_theme` blank (fresh-install default) → Install click writes nothing, button stays "Install". `current_theme marketplace` set and applied, Spotify restarted → Install click flips the button to "Remove", prompts for reload; after reload the theme is fully live (bevels, marquee, spectrum, 14px title bar, 113 injected rules matching local `user.css`). Owner's dev setup (symlink, `current_theme WinampClassic`, `color_scheme Classic`) restored afterward.

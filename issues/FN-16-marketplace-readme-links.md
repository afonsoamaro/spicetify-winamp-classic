# [FN-16] Absolute links in the README for the Marketplace viewer

## Type
Functional (maintenance, docs)

## Description
The Marketplace's own README preview renders the file inside the Spotify app shell at `xpui.app.spotify.com`, and does not rewrite relative markdown links against the GitHub repo the way GitHub's own renderer does. All three relative links in `README.md` (`issues/_index.md`, `issues/`, `LICENSE`) resolved to `https://xpui.app.spotify.com/issues/_index.md` and the like inside the Marketplace, which the app can't reach (`DNS_PROBE_FINISHED_NXDOMAIN`). Reported by the owner on 2026-09-19 from the Marketplace's README panel; the same links work fine on GitHub itself.

## Requirements
- Every link in `README.md` that points inside this repo uses the absolute GitHub URL (`https://github.com/afonsoamaro/spicetify-winamp-classic/blob/main/...` or `/tree/main/...`) instead of a relative path, so it resolves the same way from GitHub and from the Marketplace's README viewer.

## Acceptance Criteria
- [x] No relative link remains in `README.md`.
- [x] Each new URL confirmed to resolve (200).
- [x] `pnpm check` green (docs-only change).

## Dependencies
- FN-06

## Verification (2026-09-19, branch `fix/fn-16-marketplace-readme-links`)
- `grep -n '](' README.md | grep -v http` empty: no relative links left.
- `curl -sI` 200 on all three new URLs.
- `pnpm check` green: lint, typecheck, 93 tests, build.

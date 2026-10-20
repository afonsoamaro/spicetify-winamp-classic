# [FN-22] Spotify compatibility monitor in CI

## Type
Functional (tooling)

## Description
Spotify updates on its own and the theme found out each time from a screenshot (1.3.0, 1.3.4, 1.3.5). The theme depends on anchors in Spotify's markup, and those can be checked against the new client before anyone opens the app. The check runs on a schedule, and when an anchor is missing it opens an issue by itself.

## Design
- **`scripts/compat-check.js`** (`pnpm compat <xpui dir or .spa>`): extracts every anchor the theme depends on from `user.css` and `src/*.js` and checks each against the Spotify bundle.
  - `data-testid="x"`: must appear in the bundle as a quoted string.
  - `data-encore-id="x"`: not checkable. The Encore library loads at runtime and is not in `xpui.spa` (a bundle Spicetify has patched has the ids only because Spicetify injects them). They are listed as "Not checked" in the report and never count as missing; they are verified on screen.
  - Mapped classes (`main-*`, `x-*`, `Root__*`, `player-controls__*`): present as is (already patched bundle), or through a hash in the Spicetify class map (`css-map.json`) that appears in the raw bundle. This is the exact condition Spicetify applies when it patches.
  - Output: a Markdown report (missing anchors by kind, then the unchecked ones) and exit code 1 when any checked anchor is missing.
- **`.github/workflows/spotify-compat.yml`**, daily and on demand:
  1. `HEAD https://download.scdn.co/SpotifyARM64.dmg`; the ETag is the change signal. Cached ETag equal: stop (no download).
  2. Changed: download (about 175 MB), `hdiutil attach` on a macOS runner, read `CFBundleShortVersionString`, unzip `xpui.spa`.
  3. Fetch `css-map.json` from the Spicetify repo, run `compat-check`.
  4. Anchors missing: open an issue titled `Spotify <version>: anchors missing` with the report, labelled `spotify-compat`, one per version (an existing open issue for that version is updated, not duplicated; a new version supersedes and closes the open issues of older ones). Everything present: close the open compat issues, naming the version in the closing comment. The state lives in the issues and in the Actions cache (keyed by the ETag). The one thing the job writes to the repo is `compat/spotify.json`, the data of the README's Spotify badge (a shields.io endpoint badge): `compat-check --badge` writes the checked version, in green, or `<version> broken` in red, and the job commits it as github-actions[bot] only when it changed. The job that installs dependencies and reads Spotify's client is read-only and keeps no credentials in its checkout; it hands the file over as an artifact to a second job that is the only one with `contents: write` and runs nothing from outside (no dependencies, no third-party actions): it refuses anything that is not the badge's shape and commits that one file.
- The Spotify client is downloaded only to read its bundle on an ephemeral runner; nothing from it is stored or published.
- Third-party actions are pinned by SHA, first-party ones on the major. Permissions: `contents: read`, `issues: write`.

## Requirements
- `compat-check` has unit tests for the extraction and the matching, against a small fixture bundle.
- The Markdown report is stable and short enough to read as an issue body.
- The workflow tolerates what the real archive does: `unzip` exits non-zero on Spotify's `xpui.spa` after extracting everything (an absolute-path entry), so the extraction is judged by what came out, and an empty one fails instead of passing as clean.
- README gets a short "Spotify updates" section: what the monitor does and how to run it locally.
- The README's Spotify badge reads `compat/spotify.json`, so the version it shows is the one the check last ran on and no document has to be edited when Spotify releases.

## Acceptance Criteria
- [x] `pnpm compat` reproduces the 1.3.5 findings locally (68 of 78 anchors missing before FN-21, all mapped classes; 11 Encore ids unchecked).
- [x] The workflow runs on `workflow_dispatch` and opens an issue for 1.3.5, with no duplicate on a second run.
- [x] A passing run closes the open compat issue.
- [ ] A rerun on an already checked build skips without downloading (the cache path; every run so far used `force`).
- [x] `pnpm check` green, including the new tests.

## Dependencies
- FN-00b

## Verification (2026-10-17 to 2026-10-19, on GitHub)
- First dispatch on Spotify 1.3.5.3058 opened #42 with the report (56 of 70 anchors missing at the time, matching the local run).
- A second dispatch with `force` updated #42 and opened nothing else.
- After FN-21 landed, a dispatch found 0 of 21 missing and closed #42 with a comment naming the version.
- Real-archive findings fixed on the way: `unzip` exits non-zero on Spotify's `xpui.spa` after extracting everything; the Encore ids are not in the bundle (reported as not checked); some test ids are built from a template literal.
- Not exercised yet: the daily cron itself and the ETag cache skip.

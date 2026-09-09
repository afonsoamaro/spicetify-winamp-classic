# [FN-00b] Git repo and GitHub

## Type
Functional (infra, do early)

## Description
Put the project under version control and publish it on GitHub as a public repository, because the Spicetify Marketplace only installs from a public repo carrying the `spicetify-themes` topic. That brings in the obligations for opening a repo in this folder: gitleaks clean, license and README.

## Requirements
- A dedicated branch per issue, `--no-ff` merge into `main` with a subject only.
- MIT `LICENSE` in the name of the repo owner.
- Initial `README.md`: what it is, "under construction" status, how to install manually, how to contribute. The final README with a preview lands in FN-06.
- `.github/workflows/ci.yml` running `pnpm check` (lint, typecheck, test, build) on `pull_request` and on `push` to `main`.
- `.github/dependabot.yml` with the `npm` and `github-actions` ecosystems, weekly.
- `gitleaks git . -v` and `gitleaks dir . -v` clean before the first push.
- Public repo `afonsoamaro/spicetify-winamp-classic` via `gh repo create`, with the `spicetify-themes` topic and a description.
- Issues from `issues/` published as GitHub Issues, one per file, with `prototype` and `functional` labels. `_index.md` becomes a tracking issue.

## Security
- There is no `.env` and no secret in this project. gitleaks is the only check and it has to run over the whole history.

## Acceptance Criteria
- [ ] `LICENSE`, `README.md`, `ci.yml` and `dependabot.yml` on `main`.
- [ ] gitleaks clean on the history and on the working tree.
- [ ] Public repo created with the `spicetify-themes` topic, push done, CI green on the first run.
- [ ] Issues published with labels and the tracking issue open.

## Dependencies
- FN-00

## Notes
- Every git and GitHub write (`commit`, `push`, `gh repo create`, creating issues) needs explicit confirmation at the time. This issue describes the work, the execution asks the user for the OK.
- No AI attribution trailer in any commit, PR or issue.

---

# Implementation Plan

Research done on 2026-09-08. Action tags looked up via `gh api releases/latest`; gitleaks 8.30.1 and gh 2.100.0 are already installed and authenticated on the `afonsoamaro` account with the `repo` and `workflow` scopes.

## Prerequisites
- FN-00 done and merged into `main` (done on 2026-09-08, commit `f869c06`).
- `gitleaks git . -v` and `gitleaks dir . -v` already run on the current `main`: 4 commits, no leaks. Repeat before the push.

## Reusable Code Found
- Standard MIT text with `Copyright (c) 2026 Afonso Amaro`, same as my other repos.
- My standard CI shape: checkout, a pnpm setup action that installs dependencies from a frozen lockfile, then `pnpm check` as the single gate. Anything app-specific in that shape stays out.
- My standard `dependabot.yml`: `npm` and `github-actions` ecosystems, weekly, 5 PR limit.
- My standard README structure. Sections that apply here: title plus one sentence, Status, Getting started, Quality gate, License. The architecture, ports and telemetry sections do not.
- My standard issue labels: `setup` fbca04 "Infra/scaffold, do first", `prototype` c5def5 "Prototype issue (PP)", `functional` 0e8a16 "Functional issue (FN)". Recreate them with the same names and colors.
- Issue title pattern: the `#` line at the top of the file, like `[FN-00] Setup base ...`. The body is the file's entire markdown.

## Architecture Decisions
- **`actions/checkout@v7`** (v7.0.1, looked up at the time), pinned by major because the action is GitHub's own.
- **`pnpm/setup` pinned by SHA.** By execution time (2026-09-08) my standard CI shape had already moved from `pnpm/action-setup` to `pnpm/setup` v2.1.0, because `action-setup` runs on Node 20, discontinued in Actions on 2026-06-02. This repo follows: no `setup-node`, no separate install step, `cache: true` and `require-lockfile: true`. The CI's Node comes from `devEngines.runtime` in `package.json`, which lands in this issue.
- **SHA resolved against the GitHub API instead of copied.** The `v2.1.0` tag is annotated and points at `703c526` (2026-08-28), which is the SHA used here. Copying a pin without resolving it is how a workflow ends up trusting a SHA no ref reaches.
- **Public repo from creation**, with `gh repo create --public --source=. --remote=origin --push`. The Marketplace only lists a public repo carrying the `spicetify-themes` topic.
- **Tracking for `_index.md`**: a pinned `[INDEX] Issues index` issue with the `_index.md` table in the body and links to the issues created. A pinned issue is the cheapest thing to keep up to date.
- **No versioned script to publish the issues.** It is a `gh issue create` loop at execution time. It only becomes a script if a second batch of issues shows up.
- **Branches kept on the remote**: push `main` and the three working branches, following the `--no-ff` merge rule that preserves the remote branch.
- **README in English**, like the rest of this repo's public artifacts.

## Files to Create
| File | Purpose |
|------|---------|
| `LICENSE` | MIT |
| `README.md` | initial, in English, for someone arriving cold |
| `.github/workflows/ci.yml` | standard CI shape with current action versions |
| `.github/dependabot.yml` | npm and github-actions, weekly |

## Files to Modify (added during execution)
| File | Changes |
|------|---------|
| `package.json` | `devEngines.runtime` block with node `^24` and `onFail: error`, read by `pnpm/setup` in CI |

### README.md
- Title `# Winamp Classic for Spicetify` plus one sentence: recreates the Winamp 2.x look in Spotify, with CSS, a pixel font and a small extension for the spectrum analyzer, marquee and title bar.
- `## Status`: under construction. Palette and tooling done, CSS and extension in progress. Link to `issues/_index.md`.
- `## Install`: manual only for now: clone, symlink at `~/.config/spicetify/Themes/WinampClassic`, `spicetify config current_theme WinampClassic color_scheme Classic`, `spicetify apply`. One line saying that Marketplace install arrives once the theme is published.
- `## Development`: `nvm use`, `pnpm install`, `pnpm check`, `pnpm build`, `spicetify watch -s`. Explain that `theme.js` is generated from `src/` by `scripts/build.js` and is versioned.
- `## Quality gate`: `pnpm check` runs lint, typecheck, test and build, and CI runs the same command.
- `## Contributing`: issues live in `issues/`, one branch per issue, `pnpm check` green before the PR.
- `## Credits and license`: MIT. No original Winamp asset is used; the look is recreated with CSS. Silkscreen font under SIL OFL (lands in PP-01, mention it already).
- One line per paragraph. No em dashes.

### .github/workflows/ci.yml
- `name: CI`, `on: pull_request` and `push` on `main`.
- Steps: `actions/checkout@v7`, `pnpm/setup@<sha> # v2.1.0` with `cache: true` and `require-lockfile: true`, `pnpm check`.

## Files to Modify
| File | Changes |
|------|---------|
| `issues/_index.md` | FN-00b status to `done` only after verify-it; nothing else |

## Data Requirements
- None.

## Testing Strategy
- `pnpm check` locally before the commit (the README and the YAML are not linted, but the gate has to stay green).
- `gitleaks git . -v` and `gitleaks dir . -v` clean right before the push.
- CI: `gh run watch` on the first run of `main`, green.
- Issues: `gh issue list --json number,title,labels` showing 13 issues plus the index one, each with the right label.

## Implementation Order
1. `git switch -c chore/fn-00b-repo-github main`.
2. Create `LICENSE`, `README.md`, `.github/workflows/ci.yml`, `.github/dependabot.yml`. Run `pnpm check`.
3. Confirmation: commit `chore: add license, README, CI and dependabot`.
4. Confirmation: `--no-ff` merge into `main`.
5. `gitleaks git . -v` and `gitleaks dir . -v`.
6. Confirmation: `gh repo create afonsoamaro/spicetify-winamp-classic --public --source=. --remote=origin --description "The classic Winamp 2.x look for Spotify, as a Spicetify theme" --push`, then `git push -u origin chore/fn-00-spec feat/fn-00-setup-base chore/fn-00b-repo-github`.
7. `gh repo edit --add-topic spicetify-themes --add-topic spicetify --add-topic winamp`.
8. Confirmation: labels `setup`, `prototype`, `functional`; one issue per file in `issues/` (except `_index.md` and `metrics/`), title from the first line, body from the file, label by prefix (`FN-00*` setup, `PP-` prototype, `FN-` functional); a `[INDEX] Issues index` issue with the table, pinned with `gh issue pin`.
9. Close the FN-00 issue with a comment pointing at merge `f869c06` and the verify-it score.
10. `gh run watch` until the CI on `main` goes green.

## Security Considerations
- No secret in the repo. gitleaks is the only check and it runs over the whole history before the push.
- The `gh` token carries the `workflow` scope, needed to push `.github/workflows/ci.yml`. Without it the push is rejected.
- Public from the start: everything that lands on `main` from here on is visible. Issues and specs include session costs under `issues/metrics/`, which is the owner's own information and stays.

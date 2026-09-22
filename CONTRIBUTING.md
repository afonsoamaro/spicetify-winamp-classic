# Contributing

Bug reports, ideas and pull requests are all welcome, and none of them need to be big.

## Reporting something

Open an issue: [bug](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new?template=bug_report.yml), [idea](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new?template=idea.yml), or a [blank one](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new) if neither fits.

Two things make a theme bug easy to fix: a screenshot of the screen that looks wrong, and your Spotify version (Spotify, then About Spotify). Spotify renames its CSS classes between releases, so most regressions are a selector that stopped matching, and the version narrows it down fast.

## Sending a pull request

```bash
pnpm install
pnpm check          # lint + typecheck + test + build, the whole gate
spicetify watch -s  # re-applies color.ini, user.css and theme.js on save
```

- One branch per change, named `fix/...`, `feat/...` or `docs/...`.
- `pnpm check` green before you open the pull request. CI runs the same command.
- A screenshot in the description for anything visual. It is the fastest review there is.
- Colours come from `color.ini` as `--spice-*` variables, and the values that are not Spicetify colours live in the `--wa-*` block at the top of `user.css`. A literal colour in a rule is a bug, not a style.
- Prefer a hook Spotify is unlikely to rename: `data-encore-id`, `data-testid`, `aria-label`, or a `main-*` class. Generated class names change every release.

`user.css` is hand-written except between the generated markers, and `theme.js` is built from `src/` by `pnpm build`. Do not edit either generated block directly.

## How the work is organised

Each change gets a small issue file in [`issues/`](https://github.com/afonsoamaro/spicetify-winamp-classic/tree/main/issues), carrying its diagnosis and how it was verified. They are the closest thing this repo has to design docs, and reading the one next to the code you are touching usually explains why a rule looks the way it does.

You do not need to write one to contribute. A pull request with a clear description is fine, and I will file the issue if the change deserves a record.

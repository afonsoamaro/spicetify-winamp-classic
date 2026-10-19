# Contributing

Bug reports, ideas and pull requests are all welcome, and none of them need to be big.

## Reporting something

Open an issue: [bug](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new?template=bug_report.yml) or [idea](https://github.com/afonsoamaro/spicetify-winamp-classic/issues/new?template=idea.yml). For a question, or anything that is not quite either, [Discussions](https://github.com/afonsoamaro/spicetify-winamp-classic/discussions) is the easier door.

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
- Anchor a selector on what Spotify keeps: `data-testid`, `data-encore-id`, ARIA attributes, roles, native elements or structure (`:has`, child combinators). Never on a `main-*` class: those names come from the Spicetify class map, which only covers the Spotify versions Spicetify has been updated for, and they vanished on 1.3.5. Hashed class names change every release. A test (`test/anchor-contract.test.js`) fails on both; a readable class that belongs to Spotify itself or to one of its libraries goes in the list at the top of that file, with the reason.
- `pnpm compat <path to xpui or xpui.spa>` checks the anchors the theme needs against a Spotify bundle, and a daily workflow runs it against the newest release and opens an issue when one is missing.

`user.css` is hand-written except between the generated markers, and `theme.js` is built from `src/` by `pnpm build`. Do not edit either generated block directly.

## How the work is organised

Each change gets a small issue file in [`issues/`](https://github.com/afonsoamaro/spicetify-winamp-classic/tree/main/issues), carrying its diagnosis and how it was verified. They are the closest thing this repo has to design docs, and reading the one next to the code you are touching usually explains why a rule looks the way it does.

You do not need to write one to contribute. A pull request with a clear description is fine, and I will file the issue if the change deserves a record.

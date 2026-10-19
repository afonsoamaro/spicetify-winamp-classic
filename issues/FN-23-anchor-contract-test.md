# [FN-23] Test that keeps the theme on stable anchors

## Type
Functional (tooling)

## Description
FN-21 moved the theme off the Spicetify class map after Spotify 1.3.5 broke 68 of 70 mapped classes, and FN-22 watches each Spotify release. Neither stops the debt from coming back: nothing refused a new selector on a `main-*` or hashed class, and the contributing guide even recommended `main-*` classes. This turns the rule into a test.

## Requirements
- `test/anchor-contract.test.js` reads `user.css` and `src/*.js` and fails when a selector hangs on a class that is not the theme's own (`wa-*`), Encore's (`e-<build>-*`, `encore-*`) or in an allow list, which also catches every mapped and hashed class.
- The allow list names the reason for each entry, accepts only readable classes that belong to Spotify itself, to its libraries or to the Marketplace, and fails when an entry is no longer used, so it cannot go stale.
- `compat-check` exports `extractClasses`, with the stricter reading of a script's strings (a class only after a space or a combinator) so file names and property paths are not taken for classes.
- `CONTRIBUTING.md` stops recommending `main-*` classes and states the rule and where the checks live.

## Acceptance Criteria
- [x] The test passes on the current tree and fails when a mapped class (`.main-trackList-trackList`) and a hashed one (`.TiaWL1ubrITBXdmD`) are added to `user.css`, checked by hand and restored.
- [x] The allow list has one line of reason per entry and a test for stale entries.
- [x] `CONTRIBUTING.md` points at the test, `pnpm compat` and the daily workflow.
- [x] `pnpm check` green.

## Dependencies
- FN-21, FN-22

## Verification (2026-10-19)
- `pnpm check` green, 119 tests, including the new contract test and the `extractClasses` cases.
- Mutation check: appending `.main-trackList-trackList` and `.TiaWL1ubrITBXdmD` to `user.css` fails the contract test naming both; restoring the file passes it again.

# [FN-09] Marquee drawn on a canvas

## Type
Functional (performance)

## Description
The FN-02 marquee scrolls by rewriting a DOM text node five times a second. On Spotify 1.3.0 every layout pass costs 30 to 60 ms because of the size of the page, so a long title scrolling burns about a third of a core, paused or not. Text drawn on a canvas costs about 1% for the same movement (measured during FN-03 with probes in the display: DOM text 34%, transform on its own layer 14%, canvas `fillText` 1.4%). The marquee moves to a canvas, like the analyser.

## Requirements
- `src/marquee-dom.js` draws the display text with `fillText` on a canvas sized to the marquee's box and `devicePixelRatio`, in the display font read from the computed style, with the theme's text colour.
- The pure modules (`src/marquee.js`, `src/time.js`) do not change. `scrollStep` keeps deciding the visible window; the DOM side only paints it.
- Fits-or-scrolls, the 200 ms tick, `songchange`, the data poll, the resize guard and `cleanup` keep their behaviour and their tests; the tests assert the painted text through a fake 2D context instead of `textContent`.
- The canvas exposes the current text for accessibility: `aria-label` on the canvas set on every song change, never on every tick.
- The `.wa-marquee` rule in `user.css` sizes the canvas (height from the font size) instead of styling text.

## Acceptance Criteria
- [ ] Long title scrolling while paused: `Performance.getMetrics` through the debug port shows `LayoutCount` 0 over 4 s and the CPU profile within 3 points of the static-title baseline.
- [ ] Short and long titles look the same as the DOM version on screen (pixel font, colour, separator).
- [ ] Tests updated; `pnpm check` green.

## Dependencies
- FN-03

## Verification (automated, 2026-09-16, branch `feat/fn-09-canvas-marquee`)

- `pnpm check` green: eslint + stylelint 0 errors, `tsc --noEmit` 0 errors, **88/88 tests** (was 85; new `paintMarquee` unit suite, dpr backing-store test, no-2d-context test), `node scripts/build.js` regenerating `theme.js`.
- Pure modules untouched: `src/marquee.js` and `src/time.js` unchanged, `scrollStep` still owns the visible window.
- `user.css` `.wa-marquee` now sizes the canvas (height 11px from the font size) instead of styling text; flex-basis changed `auto` → `0` so the canvas attribute width stays out of the flex base size.
- Canvas exposes the text via `aria-label`, set on song change only; per-tick paints never touch attributes or the DOM tree.

Pending owner validation (needs Spotify with the theme applied):

- Long title scrolling while paused: `Performance.getMetrics` through the debug port shows `LayoutCount` 0 over 4 s and the CPU profile within 3 points of the static-title baseline.
- Short and long titles look the same as the DOM version on screen (pixel font, colour, separator).

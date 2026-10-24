# [FN-20] Visualizer with selectable styles

## Type
Functional (feature)

## Status
Implemented on 2026-10-24 on all three surfaces and the central window. Design agreed with the owner on 2026-10-23.

## Description
A visualizer in the spirit of Winamp's, modernised, with several styles to pick from. It shows up on three existing Spotify surfaces and has one central place to configure it. The small spectrum analyser in the display (FN-03) stays as it is.

The signal is synthetic. It is not the playing audio, and that is a decision, not a gap: on Spotify 1.3.6 every audio-analysis path fails with `Resolver not found!` (`Spicetify.getAudioData`, the `audio-attributes` HTTP endpoint and its `wg://` twin), and nothing inside the page can hear the player (no media element, and capturing the system output would need a native helper per OS). The theme already ships a synthetic spectrum and nobody misses real data there.

## Goals
- Several styles (see Styles), one choice that applies everywhere.
- Three surfaces:
  1. **Fullscreen.** When Spotify's fullscreen view is open, a toggle switches it to the visualizer and back.
  2. **Miniplayer.** In the miniplayer's own settings (today "Background color" and "Queue"), an option uses the visualizer instead of the default background.
  3. **Right sidebar, window mode.** A visualizer window above the cover art or video of the playing item, with show and hide. It draws only while visible.
- **One central settings place: an item in the profile menu**, registered through `Spicetify.Menu`, opening a small Winamp-styled window. Changing the style there changes all three surfaces. It also holds the master switch and the per-surface switches.
- Someone who does not want the visualizer pays nothing for it.

## Non-goals
- Real audio. No system capture, no native helper, no bridge process.
- A different style per surface.
- A new Spotify page (custom app). Everything lives on surfaces that already exist, so the theme stays installable through the Marketplace as a theme.
- Bundling a large preset pack in the theme (see MilkDrop below).

## Anti-goals
- Any CPU or GPU work while the visualizer is off, hidden, or nothing is playing.
- Anything that makes the theme heavier to load for people who leave it off.
- Colours, fonts or radii hard-coded in the new UI. It reads the theme's tokens like everything else.

## Constraints
- Light: one shared animation loop, started only when at least one surface is visible and a track is playing, stopped otherwise. Rendering of a hidden or off-screen surface is skipped. `prefers-reduced-motion` gives a static or very low frame rate rendering.
- Cross-platform (macOS, Windows, Linux), no per-OS code.
- The signal model stays pure and testable, with drawing in separate DOM modules, as `spectrum.js` and `spectrum-dom.js` already do.
- Settings persist across restarts (`Spicetify.LocalStorage`) and every wrapper around storage and DOM tolerates a missing API, as the existing injections do.
- The central window's labels exist in English, Brazilian Portuguese and Spanish (the owner's rule for any interface string; the theme had none until now).

## Styles
First cut, three: spectrum bars, oscilloscope, and one modern particle or glow style. They share the signal model and differ only in drawing.

MilkDrop-like rendering (the most famous Winamp visualizer) is a possible later style through a WebGL port of it, but its presets are about 12 MB, so it is out of the first cut and would load on demand only for people who pick it. Decide after the pipeline exists (builder's call to split it into its own issue).

## Signal
A synthetic energy model that reads the playing state and progress and is seeded by the track id, so the same track looks the same each time. It reuses the shape of the existing spectrum state (0..1 fractions per band). Beats are inferred from a steady tempo, not from sound. Exact model is the builder's call.

## What was verified on 2026-10-23 (Spotify 1.3.6.1921, Spicetify 2.46.2)
- `Spicetify.Menu.Item` and `Spicetify.Menu.SubMenu` exist (profile menu entry is possible).
- `window.documentPictureInPicture` exists and the player bar has "Open Miniplayer" and "Enter Full screen" buttons.
- WebGL2 and `AudioContext` exist. There are no `audio` or `video` elements in the page.
- Audio analysis fails on all three paths (above). Recorded in the project's knowledge registry as `audio-data`.

## To verify (spike first, one per surface)
- **Miniplayer.** It looks like a Document Picture-in-Picture window. Does the theme's CSS reach that document, does `theme.js` run code that can mount a canvas into it, and is its settings panel (the one with the toggles) reachable to add an option? If not, this surface may not be possible from a theme, and it moves to its own issue (see Delivery order).
- **Fullscreen.** What the fullscreen view is made of and where a toggle and a canvas can attach without fighting Spotify's own re-renders.
- **Right sidebar.** The stable anchor above the cover art or video, and what that panel looks like when the item is a video or when the sidebar is closed.
- **Shared state.** Whether the miniplayer window shares the JS context with the main window (so one loop and one settings object serve both) or needs its own.
- Anchors found here join the compat check (FN-22/FN-23) so a Spotify update that moves them is caught.

## Delivery order (owner's decision, 2026-10-23)
Fullscreen, the right-sidebar window and the central settings window are the deliverable. The miniplayer is a conditional follow-up: it ships only if its spike shows the theme can reach the miniplayer window, and otherwise gets its own issue. Its failure does not block the rest.

## Decisions made by the design author
These were open in review and settled without the owner. Change any of them freely.
- **Dormant, not a separate file.** The theme ships as one concatenated `theme.js`, so the visualizer code is in it but does nothing while the master switch is off: no loop, no DOM, no listeners, no network. Only the optional MilkDrop-like style, if it ever exists, is a separately fetched chunk, and it would need its own answer for the CDN cache problem.
- **Settings window.** A non-blocking dialog in the main window only, Winamp-style, so the owner can watch a surface while changing the style. Escape and a close key dismiss it.
- **Miniplayer option.** If Spotify's own miniplayer settings panel cannot be reached, the per-surface switch in the central window is the fallback and nothing else is built.
- **Tempo.** No tempo source exists, so the BPM comes from a hash of the track id, within a plausible range (about 80 to 150). Progress-based variation is not required. The signal does not have to match the display spectrum frame for frame.
- **Several surfaces at once.** Each visible surface renders its own canvas from the one shared signal and loop.

## Requirements
- Signal model and settings store have unit tests; DOM mounting is tested through the same fakes the other injections use.
- A surface that cannot be mounted (anchor missing, API absent) logs a prefixed warning and disables only itself.
- The central window works with the keyboard and is announced to assistive tech (it is a dialog).
- README documents the visualizer, how to turn it on, and the fact that the signal is synthetic.

## Acceptance Criteria
- [x] Profile menu has a visualizer entry that opens the settings window; changing the style updates every visible surface without reloading.
- [x] Fullscreen toggle switches between Spotify's view and the visualizer.
- [x] Miniplayer (conditional follow-up): the visualizer replaces the miniplayer's background, switched from the central window (the native settings panel was not touched, see Verification).
- [x] Sidebar window can be shown and hidden; hidden means no rendering work (verified by the loop stopping).
- [x] With the master switch off, no animation loop runs, no canvas or listener is created and nothing is fetched. The code ships inside `theme.js` and stays dormant (see Decisions made by the design author).
- [x] Reduced motion honoured.
- [x] Labels present in the three languages.
- [x] `pnpm check` green, including the new tests. The visualizer adds no `data-testid` anchor, so there is nothing new for the compat check to extract; its structural hooks are covered by fixtures and by the manual pass (see Verification).

## Dependencies
- FN-03 (synthetic spectrum), FN-09 (canvas rendering), FN-22 and FN-23 (compat check for the new anchors)

## Spike results
Measured on 2026-10-24 on Spotify 1.3.6.1921 with Spicetify 2.46.2, through the debug channel, with the theme applied in dev mode.

**Fullscreen**
- The player bar button (`[data-testid="fullscreen-mode-button"]`, label "Enter Full screen") opens an expanded Now Playing view inside the app window. It is not the browser Fullscreen API (`document.fullscreenElement` stays `null`) and the "Enter Full screen" button inside that view did not change that either.
- The view has no `data-testid`, no role and no readable class anywhere in its chain. What it does have is a header row with the buttons "More options for ...", "Enter Full screen" and "Minimize Now Playing view" (`data-encore-id="buttonTertiary"`), and a large cover with `role="img"` and a label ending in "artwork".
- `FULLSCREEN_ROOT`: the nearest ancestor of the minimise button that contains a `[role="img"]`. It measured 1664x809, the whole content area between the top bar and the player bar. `FULLSCREEN_TOGGLE_HOST`: the parent of the minimise button (the header's button group).
- A canvas appended to that root survived a track change (`Spicetify.Player.next()`, 3.5 s later still connected, same root node).
- Risk: the button labels are translated by Spotify, so a selector on the English text works only in English. Locale-independent hook found: the artwork's `role="img"` (no test id exists). Task 9 detects the view as a `[role="img"]` at least 400 px wide that is outside the player bar and outside the sidebar, and finds the button group through `data-encore-id="buttonTertiary"` in the same row as the cover's header. This is a heuristic and the task must test it against the fixture.

**Right sidebar**
- `SIDEBAR_COVER_ANCHOR`: the sidebar is `aside[aria-label="Now playing view"]` (label translated, so locale-dependent). There are only two `aside` elements in the page, the player bar (has `data-testid="now-playing-bar"`) and the sidebar, so `aside:not([data-testid])` is the locale-independent form.
- Structure inside: a scroller (the first descendant `div` whose computed `overflow-y` is `auto` or `scroll`, 386x809) with one child, the content (386x2260, two children). The cover, or the video when the item has one, is the first block of the content, starting 64 px below the aside's top, because the header (title and its buttons, bottom at about 112 px) is an overlay.
- A 120 px probe prepended to the content landed at the top, under the header overlay, and survived a track change. The panel therefore needs a top margin equal to the header's bottom minus the content's top, measured at mount.
- The video case (the item playing then was a music video) uses the same content block; the panel prepends above it the same way.
- Closed state: the `aside` stays in the DOM and slides off-screen (after hiding, x=1628 in a 1680 px viewport, 52 px visible). It is not removed. `isVisible()` must check the layout (visible width over 100 px), not presence.

**Locale**
- `Spicetify.Locale.getLocale()` returns `"en"` (Spotify's language setting). `document.documentElement.lang` was also `en`, `navigator.language` was `en-BR`. `LOCALE_SOURCE` is `Spicetify.Locale.getLocale()`, falling back to `document.documentElement.lang`.

**Found on the way**
- The player bar's widget test id is `now-playing-widget-v2` in 1.3.6. The display selector in `src/dom.js` still uses `now-playing-widget`; the screenshots show the display text styled, so it is matching somehow, but the compat check should be looked at in a separate issue.

## Verification (2026-10-24, Spotify 1.3.6.1921, theme in dev mode)
- Profile menu: the "Visualizer" entry is there and opens the settings window, styled with the theme tokens.
- Sidebar panel: bars drawn in the scheme's colours above the cover, 5 consecutive samples all different (animated); oscilloscope and glow also draw. The hide key and the sunken/raised states follow the store (hide covered by the unit test, not clicked on the real client).
- Fullscreen: the toggle sits in the header button group and the canvas covers the view below the header (1664x761, painting every frame). Two things the spike did not predict and the tests now pin: the content has Encore buttons of its own ("Show all", "Credits"), so the header is the group above the cover reached while climbing from it, not the first Encore button; and the overlay lives in the non-scrolling view.
- Dormancy: with the master switch off the page holds 0 `wa-viz` panel, toggle or overlay elements (1 on, 0 off, 1 on again); `test/visualizer-start.test.js` asserts that nothing is scheduled, no Player or document listener is added and no `wa-viz` element exists while the switch is off (it does not assert on the network or on MutationObservers; the code creates none).
- Labels were looked at in English only; the three languages are covered by the unit test.
- `pnpm check`: lint, typecheck, tests and build green (count in the final run of the branch). The compat check reports 0 of 21 anchors missing; the visualizer adds no `data-testid` anchor, its hooks are structural (`aside:not([data-testid])`, a large `role="img"`, Encore buttons), which the compat check cannot see, so they are covered by the fixtures and by this manual pass.
- Fullscreen bars were too thick on the first pass (32 stretched bars); the signal now has 256 bands and the style draws about one bar per 6 px, so the count scales with the canvas. Bringing that out also showed a step in the band profile where the beat boost ended, which is now a smooth fade and has a test.
- Miniplayer (spike and result): it is a Document Picture-in-Picture window, reachable from the main window as `documentPictureInPicture.window`, in the same JS context, so the loop and the settings are shared. The theme's CSS does not reach it (3 Spotify stylesheets, no `user.css`), so the canvas is styled inline and takes its colours from the main document. A canvas first in the window's root with `z-index: -1` and `isolation: isolate` on the root paints over the root's background and under the player; verified on the real client, painting every frame behind the cover card. Spotify fills the window a few seconds after it opens, so the surface attaches from a mutation observer, not at the `enter` event.
- Miniplayer pacing: with Spotify in the background the main window gets no animation frames, so the loop uses the miniplayer window's own `requestAnimationFrame` when the main document is hidden. That path is wired and unit-tested only at the interface level; it was not exercised with the main window actually hidden.
- Miniplayer settings panel: Spotify's own panel ("Background color", "Queue", translated) was not extended. The option lives in the central window instead, as the fallback this issue allows.

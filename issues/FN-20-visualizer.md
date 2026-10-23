# [FN-20] Visualizer with selectable styles

## Type
Functional (feature)

## Status
Design agreed with the owner on 2026-10-23. Not planned or started. Parts marked "to verify" need a spike on the real client before the plan can rely on them.

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
- [ ] Profile menu has a visualizer entry that opens the settings window; changing the style updates every visible surface without reloading.
- [ ] Fullscreen toggle switches between Spotify's view and the visualizer.
- [ ] Miniplayer (conditional follow-up): the option replaces the background with the visualizer, or the spike result is recorded and the surface moves to its own issue. Not required to close this issue.
- [ ] Sidebar window can be shown and hidden; hidden means no rendering work (verified by the loop stopping).
- [ ] With the master switch off, no animation loop runs, no canvas or listener is created and nothing is fetched. The code ships inside `theme.js` and stays dormant (see Decisions made by the design author).
- [ ] Reduced motion honoured.
- [ ] Labels present in the three languages.
- [ ] `pnpm check` green, including the new tests, and the new anchors covered by the compat check.

## Dependencies
- FN-03 (synthetic spectrum), FN-09 (canvas rendering), FN-22 and FN-23 (compat check for the new anchors)

# [FN-20] Visualizer with selectable styles

## Status
Brainstorming (opened 2026-09-30). This file records the need so it is not lost; the full write-up (flow, requirements, scenarios, acceptance criteria) comes out of the brainstorming and discovery below.

## Type
Functional (feature, needs discovery first)

## Description
Winamp's full-screen visualizer with several selectable styles, brought to Spotify. The small spectrum analyzer in the display (FN-03) stays as it is; this is a bigger visualizer on its own surface, with more than one style to choose from.

## Open questions
- **Where it lives.** Full screen only, or a new surface in Spotify as well: a custom app page, the now playing view, the right sidebar, a pop-out window. Spicetify can register a custom app with its own route, but a theme's `include` only loads an extension, so a new page may change how the theme is packaged and installed.
- **Where the audio data comes from.** This decides everything else. FN-04 found that `Spicetify.getAudioData()` fails on Spotify 1.3.0 (`Resolver not found!` on the audio-analysis endpoint), so the current spectrum is synthetic. Options to weigh: a synthetic signal driven by playback state and track metadata, whatever the Marketplace visualizer apps use today, or capturing the real system audio.
- **Native audio capture per OS.** The owner's first idea was each OS's native audio library (CoreAudio / ScreenCaptureKit on macOS, WASAPI loopback on Windows, PulseAudio / PipeWire monitor on Linux). To size: a native helper per platform means builds, signing, a local bridge into the Spotify page and an install step the Marketplace cannot do, which may not fit a theme at all.
- **Styles.** Which Winamp-era styles to offer (spectrum bars, oscilloscope, MilkDrop-like shaders), how the user switches between them, and what the first cut ships with.

## Constraints
- Light enough not to hurt playback or the UI thread: the display spectrum already moved to a canvas for this reason (FN-09).
- Runs on macOS, Windows and Linux.
- Installable through the Marketplace, or a clear written reason why part of it cannot be.

## Next steps
1. Discovery: survey the visualizer apps in the Spicetify Marketplace (what they render, where they get audio data, how heavy they are, whether they still work on Spotify 1.3.0).
2. Estimate the cost of native capture on each OS against the options that stay inside the Spotify page.
3. Brainstorm the surface and the styles with the owner, then fill in this issue in the usual format.

## Dependencies
- FN-03 (synthetic spectrum), FN-04 (audio analysis not available), FN-09 (canvas rendering)

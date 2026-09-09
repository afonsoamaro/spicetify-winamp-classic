# [FN-04] Spectrum analyzer synced with getAudioData, if available

## Type
Functional (optional, starts with a spike)

## Description
If `Spicetify.getAudioData()` still answers on the desktop client, the bar intensity follows the loudness of the track's current segment. If it doesn't answer, nothing changes: the synthetic mode from FN-03 stays.

## User Flow
1. On track change, the extension calls `Spicetify.getAudioData()`.
2. If `segments` come back, each frame scales the bar targets by the loudness of the segment matching `Spicetify.Player.getProgress()`.
3. If it rejects or comes back empty, the extension stays in synthetic mode with no error log visible to the user.

## Requirements
- Step 1 is a spike: call `Spicetify.getAudioData()` from the Spotify console with three different tracks and record in this issue whether it answers and in what format. If it answers for none of them, close the issue as "not applicable" with the evidence, no code.
- If it answers: `src/spectrum.js` gains `loudnessAt(segments, progressMs)`, which returns a factor between 0 and 1 normalized by the segments' `loudness_max`.
- `nextFrame` takes an optional `intensity` that multiplies the targets.
- `getAudioData` is called once per track, on `songchange`, and the result is cached. A failure is `console.debug`, not `warn`.

## Scenarios
### Happy Path
- Track with analysis: the bars follow the dynamics of the music.

### Edge Cases
- Track without analysis (local file, podcast): synthetic mode.
- Progress past the last segment: uses the last one.

### Error Handling
- Rejected promise or 5s timeout: synthetic mode.

## Data Requirements
- Nothing persisted.

## External Dependencies
- Internal endpoint `wg://audio-attributes/v1/audio-analysis/` via `Spicetify.getAudioData`.

## Acceptance Criteria
- [ ] Spike result recorded in this issue, with the three tracks tested.
- [ ] If implemented: tests for `loudnessAt` with progress before, inside and after the segments, and for `nextFrame` with `intensity`.
- [ ] If implemented: a track without analysis keeps the synthetic spectrum analyzer, with no console error.
- [ ] `pnpm build` run and `theme.js` updated. `pnpm check` green.

## Dependencies
- FN-03

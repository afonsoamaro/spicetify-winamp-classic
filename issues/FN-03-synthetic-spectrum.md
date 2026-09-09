# [FN-03] Synthetic spectrum analyzer in the display

## Type
Functional

## Description
A canvas next to the display text shows 20 bars that rise and fall while the music plays, colored green, yellow, orange and red from bottom to top, with gray peaks that drop slowly, like the Winamp analyzer. The movement is synthetic because Spotify doesn't expose the audio.

## User Flow
1. Track playing: the bars move at 60fps.
2. Paused: the bars decay to zero and the animation loop stops.
3. Play again: the loop comes back.

## Requirements
- `src/spectrum.js` exports `createState(bars)`, `nextFrame(state, rng, playing)` and `colorForRow(row, totalRows)`.
- `nextFrame`: with `playing` true, each bar gets a target `rng()` smoothed against the previous target (weight 0.7 on the previous one). The bar jumps straight to the target when the target is higher, and falls 0.06 per frame when it's lower. With `playing` false, the target is 0.
- Peak per bar: it rises with the bar, and once the bar sits below the peak, the peak waits 15 frames and then falls 0.02 per frame.
- `colorForRow`: the bottom 25% green, the next 25% yellow, the next 25% orange (`--spice-misc`) and the top red.
- The `spectrum` injection in `src/dom.js` creates a `<canvas>` of 76x16 CSS pixels accounting for `devicePixelRatio`, draws 3px bars with 1px gaps and the peak as a 1px gray line, and uses `requestAnimationFrame` only while `Spicetify.Player.isPlaying()` is true or some bar is still above zero.
- It listens to `onplaypause` to restart the loop. `cleanup` cancels the frame and removes the canvas.
- `rng` is injectable so the tests stay deterministic.

## Scenarios
### Happy Path
- Music playing: lively bars, peaks dropping with a delay.

### Edge Cases
- Spotify in the background with the window hidden: `requestAnimationFrame` pauses on its own, no extra handling.
- Display too narrow for the canvas: the CSS hides the canvas below 200px of display width.

### Error Handling
- `getContext('2d')` returns null: the injection logs and gives up.

## Data Requirements
- None.

## External Dependencies
- None.

## Acceptance Criteria
- [ ] Tests for `nextFrame`: the bar rises to the target, falls 0.06 per frame, goes to zero when paused, the peak holds for 15 frames and then falls.
- [ ] Tests for `colorForRow` across the four bands and at the boundaries.
- [ ] In Spotify, the bars move while playing and stop after a pause. Spotify's CPU usage while paused matches running without the extension (check in Activity Monitor).
- [ ] `pnpm build` run and `theme.js` updated. `pnpm check` green.

## Dependencies
- FN-01

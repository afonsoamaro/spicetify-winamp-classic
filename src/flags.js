// @ts-check
// Switches for features that are built and tested but not shipped. A switch is
// turned on by changing its value here and rebuilding (`pnpm build`); nothing
// the feature does exists in the page while it is off.
export const FLAGS = Object.freeze({
  // Off by owner's decision on 2026-10-27: the visualizer is too loud for the
  // theme as it stands and waits for a design round. The code stays in src/.
  visualizer: false,
});

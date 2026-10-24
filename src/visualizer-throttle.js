// @ts-check
// A leading-and-trailing throttle for the observers that watch the whole page.
// Spotify mutates its DOM constantly, and running a search on every batch is
// layout work the user feels as jank, so a burst becomes one run now and one
// at the end.

/**
 * @param {() => void} run
 * @param {number} waitMs 0 or less runs on every call
 * @returns {{ call(): void, cancel(): void }}
 */
export function createThrottled(run, waitMs) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  let lastRun = -Infinity;

  const fire = () => {
    timer = null;
    lastRun = Date.now();
    run();
  };

  return {
    call() {
      if (waitMs <= 0) {
        run();
        return;
      }
      if (timer !== null) return;
      const remaining = waitMs - (Date.now() - lastRun);
      if (remaining <= 0) fire();
      else timer = setTimeout(fire, remaining);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}

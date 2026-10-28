// @ts-check
// Entry point of the theme extension. After `pnpm build` this becomes the
// tail of theme.js, which Spicetify injects when inject_theme_js is on.
// Later issues push their injection into INJECTIONS here; the order is the
// order they mount in.
import { LOG_PREFIX, mount, waitForSpicetify } from './dom.js';
import { createMarqueeInjection } from './marquee-dom.js';
import { createSpectrumInjection } from './spectrum-dom.js';
import { createTitlebarInjection } from './titlebar-dom.js';
import { startVisualizerIfEnabled } from './visualizer-start.js';

/** @type {import('./dom.js').Injection[]} */
const INJECTIONS = [createMarqueeInjection(), createSpectrumInjection(), createTitlebarInjection()];

async function main() {
  try {
    await waitForSpicetify();
  } catch (err) {
    console.error(`${LOG_PREFIX} ${err instanceof Error ? err.message : err}`);
    return;
  }
  mount(INJECTIONS);
  try {
    startVisualizerIfEnabled();
  } catch (err) {
    console.warn(`${LOG_PREFIX} visualizer did not start:`, err);
  }
  console.log(`${LOG_PREFIX} mounted`);
}

main();

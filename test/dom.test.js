/** @vitest-environment jsdom */
// @ts-check
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOG_PREFIX, cleanupInjections, findDisplay, mount, runInjections, waitForSpicetify } from '../src/dom.js';

/** Builds the bar with a display inside and returns the display. */
function makeBar() {
  document.body.innerHTML =
    '<aside data-testid="now-playing-bar"><div class="main-nowPlayingBar-nowPlayingBar">' +
    '<div data-testid="now-playing-widget"></div></div></aside>';
  return /** @type {HTMLElement} */ (document.querySelector('[data-testid="now-playing-widget"]'));
}

/** Lets MutationObserver callbacks (microtasks) run. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** @type {string[]} */
const log = [];

/**
 * @param {string} name
 * @param {{ runThrows?: boolean, cleanupThrows?: boolean }} [options]
 * @returns {import('../src/dom.js').Injection}
 */
function injection(name, { runThrows = false, cleanupThrows = false } = {}) {
  return {
    name,
    run() {
      log.push(`run:${name}`);
      if (runThrows) throw new Error(`${name} boom`);
    },
    cleanup() {
      log.push(`cleanup:${name}`);
      if (cleanupThrows) throw new Error(`${name} cleanup boom`);
    },
  };
}

/** @type {{ disconnect: () => void }[]} */
const handles = [];

afterEach(() => {
  handles.splice(0).forEach((handle) => handle.disconnect());
  document.body.innerHTML = '';
  log.length = 0;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('waitForSpicetify', () => {
  it('resolves once the probe reports ready', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const isReady = () => ++calls >= 3;

    const promise = waitForSpicetify({ isReady, intervalMs: 100, timeoutMs: 30000 });
    await vi.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toBeUndefined();
    expect(calls).toBe(3);
  });

  it('rejects after the timeout when the probe never reports ready', async () => {
    vi.useFakeTimers();
    const promise = waitForSpicetify({ isReady: () => false, intervalMs: 100, timeoutMs: 30000 });
    const outcome = expect(promise).rejects.toThrow('30s');

    await vi.advanceTimersByTimeAsync(30100);

    await outcome;
  });
});

describe('findDisplay', () => {
  it('returns null until the widget is in the bar', () => {
    expect(findDisplay(document)).toBeNull();
    const display = makeBar();
    expect(findDisplay(document)).toBe(display);
  });
});

describe('runInjections and cleanupInjections', () => {
  it('a run that throws is logged and does not stop the next injection', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const display = makeBar();

    const ran = runInjections([injection('a', { runThrows: true }), injection('b')], display);

    expect(log).toEqual(['run:a', 'run:b']);
    expect(ran.map((i) => i.name)).toEqual(['b']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe(`${LOG_PREFIX} a:`);
  });

  it('a cleanup that throws is logged and does not stop the next cleanup', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const display = makeBar();

    cleanupInjections([injection('a', { cleanupThrows: true }), injection('b')], display);

    expect(log).toEqual(['cleanup:a', 'cleanup:b']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe(`${LOG_PREFIX} a cleanup:`);
  });
});

describe('mount', () => {
  it('runs the injections on the display right away', () => {
    makeBar();
    handles.push(mount([injection('a'), injection('b')]));

    expect(log).toEqual(['run:a', 'run:b']);
  });

  it('cleans up before re-running when the display is replaced', async () => {
    const display = makeBar();
    handles.push(mount([injection('a')]));

    const fresh = document.createElement('div');
    fresh.dataset.testid = 'now-playing-widget';
    display.replaceWith(fresh);
    await tick();

    expect(log).toEqual(['run:a', 'cleanup:a', 'run:a']);
  });

  it('does not re-run when the mutation leaves the display in place', async () => {
    const display = makeBar();
    handles.push(mount([injection('a')]));

    display.appendChild(document.createElement('span'));
    await tick();

    expect(log).toEqual(['run:a']);
  });

  it('warns once when there is no display and runs when it shows up', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML =
      '<aside data-testid="now-playing-bar"><div class="main-nowPlayingBar-nowPlayingBar"></div></aside>';
    handles.push(mount([injection('a')]));

    expect(log).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('display not found');

    const widget = document.createElement('div');
    widget.dataset.testid = 'now-playing-widget';
    document.querySelector('.main-nowPlayingBar-nowPlayingBar')?.appendChild(widget);
    await tick();

    expect(log).toEqual(['run:a']);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('cleans up when the display goes away and a failing cleanup does not block the next round', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const display = makeBar();
    const bar = /** @type {HTMLElement} */ (document.querySelector('.main-nowPlayingBar-nowPlayingBar'));
    handles.push(mount([injection('a', { cleanupThrows: true }), injection('b')]));

    display.remove();
    await tick();
    expect(log).toEqual(['run:a', 'run:b', 'cleanup:a', 'cleanup:b']);

    const widget = document.createElement('div');
    widget.dataset.testid = 'now-playing-widget';
    bar.appendChild(widget);
    await tick();
    expect(log.slice(4)).toEqual(['run:a', 'run:b']);
  });

  it('falls back to observing the body when the bar is not there yet', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    handles.push(mount([injection('a')]));

    makeBar();
    await tick();

    expect(log).toEqual(['run:a']);
  });

  it('remount forces a round without a mutation', () => {
    makeBar();
    const handle = mount([injection('a')]);
    handles.push(handle);

    handle.remount();
    expect(log).toEqual(['run:a']);
  });
});

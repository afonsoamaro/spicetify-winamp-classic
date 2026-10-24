// @ts-check
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createThrottled } from '../src/visualizer-throttle.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createThrottled', () => {
  it('runs at once when the wait is 0', () => {
    const run = vi.fn();
    const throttled = createThrottled(run, 0);
    throttled.call();
    throttled.call();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('runs the first call at once and collapses a burst into one trailing run', () => {
    const run = vi.fn();
    const throttled = createThrottled(run, 100);
    for (let i = 0; i < 10; i += 1) throttled.call();
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(run).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('cancel drops the trailing run', () => {
    const run = vi.fn();
    const throttled = createThrottled(run, 100);
    throttled.call();
    throttled.call();
    throttled.cancel();
    vi.advanceTimersByTime(500);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

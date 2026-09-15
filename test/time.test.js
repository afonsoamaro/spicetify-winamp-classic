// @ts-check
import { describe, expect, it } from 'vitest';
import { formatTime } from '../src/time.js';

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [59000, '0:59'],
    [60000, '1:00'],
    [61500, '1:01'],
    [3599000, '59:59'],
    [3600000, '1:00:00'],
    [3661000, '1:01:01'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatTime(ms)).toBe(expected);
  });

  it.each([
    { value: -5, label: 'negative' },
    { value: Number.NaN, label: 'NaN' },
    { value: Number.POSITIVE_INFINITY, label: 'Infinity' },
    { value: '12', label: 'a string' },
    { value: undefined, label: 'undefined' },
  ])('falls back to 0:00 for $label', ({ value }) => {
    expect(formatTime(value)).toBe('0:00');
  });
});

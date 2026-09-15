// @ts-check
import { describe, expect, it } from 'vitest';
import { SEPARATOR, describeItem, displayText, scrollStep } from '../src/marquee.js';

describe('describeItem', () => {
  it('joins the artists and reads title and duration', () => {
    const item = /** @type {Spicetify.PlayerTrack} */ ({
      name: 'Under Pressure',
      artists: [{ name: 'Queen' }, { name: 'David Bowie' }],
      duration: { milliseconds: 246000 },
    });
    expect(describeItem(item)).toEqual({ artist: 'Queen, David Bowie', title: 'Under Pressure', durationMs: 246000 });
  });

  it('falls back to the metadata artist when the artists list is missing', () => {
    const item = /** @type {Partial<Spicetify.PlayerTrack>} */ ({
      name: 'Episode 12',
      metadata: /** @type {Spicetify.TrackMetadata} */ ({ artist_name: 'Some Podcast' }),
    });
    expect(describeItem(item)).toEqual({ artist: 'Some Podcast', title: 'Episode 12', durationMs: 0 });
  });

  it('yields empty strings for a missing item', () => {
    expect(describeItem(undefined)).toEqual({ artist: '', title: '', durationMs: 0 });
    expect(describeItem(null)).toEqual({ artist: '', title: '', durationMs: 0 });
  });
});

describe('displayText', () => {
  it('formats artist, title and duration in uppercase', () => {
    expect(displayText({ artist: 'Queen', title: 'Spread Your Wings', durationMs: 274000 })).toBe(
      'QUEEN - SPREAD YOUR WINGS (4:34)',
    );
  });

  it('shows the title alone when there is no artist', () => {
    expect(displayText({ artist: '', title: 'Episode 12', durationMs: 60000 })).toBe('EPISODE 12 (1:00)');
  });

  it('shows the artist alone when there is no title', () => {
    expect(displayText({ artist: 'Queen', title: ' ', durationMs: 0 })).toBe('QUEEN');
  });

  it('shows WINAMP when there is nothing to show', () => {
    expect(displayText({ artist: '', title: '', durationMs: 0 })).toBe('WINAMP');
  });

  it('omits the duration when it is zero', () => {
    expect(displayText({ artist: 'A', title: 'B', durationMs: 0 })).toBe('A - B');
  });

  it('keeps non-ASCII characters', () => {
    expect(displayText({ artist: 'Motörhead', title: 'Ça plane', durationMs: 0 })).toBe('MOTÖRHEAD - ÇA PLANE');
  });
});

describe('scrollStep', () => {
  it('returns the whole text with a fixed offset when it is shorter than the width', () => {
    expect(scrollStep('ABC', 5, 10)).toEqual({ view: 'ABC', offset: 0 });
  });

  it('returns the whole text when it is exactly the width', () => {
    expect(scrollStep('ABCDE', 2, 5)).toEqual({ view: 'ABCDE', offset: 0 });
  });

  it('slides one character per step and shows the separator', () => {
    const text = 'ABCDEFGH';
    const first = scrollStep(text, 0, 5);
    const second = scrollStep(text, first.offset, 5);
    expect(first).toEqual({ view: 'ABCDE', offset: 1 });
    expect(second).toEqual({ view: 'BCDEF', offset: 2 });
    expect(scrollStep(text, 6, 5).view).toBe(`GH${SEPARATOR.slice(0, 3)}`);
  });

  it('wraps back to the start after the text plus the separator', () => {
    const text = 'ABCDEFGH';
    const lap = text.length + SEPARATOR.length;
    let offset = 0;
    for (let i = 0; i < lap; i += 1) offset = scrollStep(text, offset, 5).offset;
    expect(offset).toBe(0);
    expect(scrollStep(text, lap - 1, 5).view).toBe(`${SEPARATOR.slice(-1)}ABCD`);
  });

  it('shows nothing for a zero width', () => {
    expect(scrollStep('ABC', 1, 0)).toEqual({ view: '', offset: 0 });
  });
});

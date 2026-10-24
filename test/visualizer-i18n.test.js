// @ts-check
import { describe, expect, it } from 'vitest';
import { LABEL_KEYS, labelsFor } from '../src/visualizer-i18n.js';

describe('labelsFor', () => {
  it.each(['en', 'pt-BR', 'es'])('defines every key for %s', (locale) => {
    const labels = labelsFor(locale);
    for (const key of LABEL_KEYS) {
      expect(typeof labels[key]).toBe('string');
      expect(labels[key].length).toBeGreaterThan(0);
    }
  });

  it('picks Portuguese for pt and pt-BR', () => {
    expect(labelsFor('pt').windowTitle).toBe(labelsFor('pt-BR').windowTitle);
    expect(labelsFor('pt').windowTitle).not.toBe(labelsFor('en').windowTitle);
  });

  it('picks Spanish for any es locale', () => {
    expect(labelsFor('es-MX').windowTitle).toBe(labelsFor('es').windowTitle);
    expect(labelsFor('es').windowTitle).not.toBe(labelsFor('en').windowTitle);
  });

  it.each(['de', '', undefined])('falls back to English for %s', (locale) => {
    expect(labelsFor(locale)).toEqual(labelsFor('en'));
  });

  it('keeps the three languages apart', () => {
    const titles = new Set(['en', 'pt-BR', 'es'].map((l) => labelsFor(l).windowTitle));
    expect(titles.size).toBe(3);
  });
});

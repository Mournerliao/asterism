import { describe, expect, it } from 'vitest';
import { normalizeClassificationName } from './name';

describe('normalizeClassificationName', () => {
  it('trims, folds whitespace, and lowercases', () => {
    expect(normalizeClassificationName('  To   Read  ')).toBe('to read');
  });

  it('applies NFKC so compatibility characters collide', () => {
    expect(normalizeClassificationName('ﬁle')).toBe(normalizeClassificationName('file'));
  });
});

import { describe, expect, it } from 'vitest';
import { getVisibleFacetOptions } from './facet-options';

describe('getVisibleFacetOptions', () => {
  const options = Array.from({ length: 60 }, (_, index) => `topic-${index + 1}`);

  it('only exposes the first twenty options before searching', () => {
    expect(getVisibleFacetOptions(options, '', null)).toEqual({
      items: options.slice(0, 20),
      total: 60,
      truncated: true,
    });
  });

  it('keeps a selected option visible when it is outside the initial window', () => {
    const result = getVisibleFacetOptions(options, '', 'topic-48');
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toBe('topic-48');
    expect(result.truncated).toBe(true);
  });

  it('searches the complete option set case-insensitively', () => {
    expect(getVisibleFacetOptions(['React', 'Vue', 'react-native'], 'REACT', null)).toEqual({
      items: ['React', 'react-native'],
      total: 2,
      truncated: false,
    });
  });

  it('returns an empty result for unmatched queries', () => {
    expect(getVisibleFacetOptions(options, 'missing', null)).toEqual({
      items: [],
      total: 0,
      truncated: false,
    });
  });
});

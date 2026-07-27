import { describe, expect, it } from 'vitest';
import { migrateBrowseViewState } from './browse-view';

describe('migrateBrowseViewState', () => {
  it.each(['grid', 'list'] as const)('preserves the supported %s view', (view) => {
    expect(migrateBrowseViewState({ view })).toEqual({ view });
  });

  it.each([
    { view: 'star-map' },
    { view: 'unknown' },
    {},
    null,
  ])('falls back to grid for a removed or malformed view', (persistedState) => {
    expect(migrateBrowseViewState(persistedState)).toEqual({ view: 'grid' });
  });
});

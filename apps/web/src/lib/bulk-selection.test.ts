import { describe, expect, it } from 'vitest';
import { clearSelection, selectAllSnapshot, toggleSelection } from './bulk-selection';

describe('bulk repository selection snapshot', () => {
  it('supports manual selection and clearing without mutating previous state', () => {
    const initial = new Set(['repo-1']);
    const selected = toggleSelection(initial, 'repo-2');

    expect([...initial]).toEqual(['repo-1']);
    expect([...selected]).toEqual(['repo-1', 'repo-2']);
    expect([...clearSelection()]).toEqual([]);
  });

  it('freezes select-all to the repository IDs matching at that moment', () => {
    const snapshot = selectAllSnapshot(['repo-1', 'repo-2']);
    const laterFilteredResults = ['repo-2', 'repo-3'];

    expect([...snapshot]).toEqual(['repo-1', 'repo-2']);
    expect([...snapshot]).not.toEqual(laterFilteredResults);
  });
});

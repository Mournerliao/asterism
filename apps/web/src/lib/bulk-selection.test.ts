import { describe, expect, it } from 'vitest';
import {
  addSelection,
  clearSelection,
  removeSelection,
  selectAllSnapshot,
  toggleSelection,
} from './bulk-selection';

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

  it('adds and removes a filtered scope without dropping hidden selections', () => {
    const initial = new Set(['hidden-repo', 'visible-repo-1']);
    const added = addSelection(initial, ['visible-repo-1', 'visible-repo-2']);
    const removed = removeSelection(added, ['visible-repo-1', 'visible-repo-2']);

    expect([...initial]).toEqual(['hidden-repo', 'visible-repo-1']);
    expect([...added]).toEqual(['hidden-repo', 'visible-repo-1', 'visible-repo-2']);
    expect([...removed]).toEqual(['hidden-repo']);
  });
});

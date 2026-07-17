import { afterEach, describe, expect, it } from 'vitest';
import { useBrowseFilters } from '../stores/browse-filters';
import { getBrowseView, useBrowseViewStore } from '../stores/browse-view';
import { type BrowseSourceSnapshot, createReadmeDestination } from './readme-navigation';
import {
  armReadmeReturn,
  clearReadmeReturnState,
  consumePendingReadmeReturn,
  finalizeReadmeDeparture,
  rememberReadmeEntry,
  resolveReturnVisibility,
} from './readme-return-coordinator';

const browseSnapshot: BrowseSourceSnapshot = {
  query: 'codex',
  language: 'TypeScript',
  topic: null,
  tagIds: ['tag-1'],
  minStars: 50,
  pushedWithinDays: null,
  status: 'all',
  sort: 'name',
  view: 'list',
  scrollTop: 320,
};

afterEach(() => {
  clearReadmeReturnState();
  useBrowseFilters.getState().reset();
  useBrowseViewStore.setState({ view: 'grid' });
});

describe('README return coordinator', () => {
  it('arms Browse restore and lets the source page consume reopen state once', () => {
    const plan = armReadmeReturn({
      to: '/',
      source: 'browse',
      restoreBrowse: browseSnapshot,
      reopenRepoId: 'repo-1',
      scrollTop: 320,
    });

    expect(plan.sourceKey).toBe('browse');
    expect(useBrowseFilters.getState()).toMatchObject({
      query: 'codex',
      language: 'TypeScript',
      tagIds: ['tag-1'],
      sort: 'name',
    });
    expect(getBrowseView()).toBe('list');

    expect(consumePendingReadmeReturn('browse')).toEqual(plan);
    expect(consumePendingReadmeReturn('browse')).toBeNull();
  });

  it('finalizes browser-back departure only when the next path matches the source', () => {
    const entry = createReadmeDestination('openai', 'codex', 'repo-1', '/', {
      browseSnapshot,
    }).state.readme;
    rememberReadmeEntry(entry);

    expect(
      finalizeReadmeDeparture({
        nextPathname: '/settings',
        owner: 'openai',
        name: 'codex',
      }),
    ).toBeNull();
    expect(consumePendingReadmeReturn('browse')).toBeNull();

    rememberReadmeEntry(entry);
    const pending = finalizeReadmeDeparture({
      nextPathname: '/',
      owner: 'openai',
      name: 'codex',
    });
    expect(pending).toMatchObject({
      sourceKey: 'browse',
      reopenRepoId: 'repo-1',
      scrollTop: 320,
    });
    expect(consumePendingReadmeReturn('browse')?.reopenRepoId).toBe('repo-1');
  });

  it('clears reopen and scroll when the restored source no longer contains the repository', () => {
    const pending = armReadmeReturn({
      to: '/collections/collection-7',
      source: 'collection',
      collectionName: 'AI tools',
      restoreBrowse: null,
      reopenRepoId: 'repo-1',
      scrollTop: 90,
    });

    expect(resolveReturnVisibility(pending, false)).toEqual({
      reopenRepoId: null,
      scrollTop: null,
    });
    expect(resolveReturnVisibility(pending, true)).toEqual({
      reopenRepoId: 'repo-1',
      scrollTop: 90,
    });
  });
});

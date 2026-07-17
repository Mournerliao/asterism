import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import {
  type BrowseSourceSnapshot,
  createReadmeDestination,
  planReadmeReturn,
  type ReadmeRouteState,
  resolveReadmeReturn,
} from './readme-navigation';

const browseSnapshot: BrowseSourceSnapshot = {
  query: 'codex',
  language: 'TypeScript',
  topic: 'ai',
  tagIds: ['tag-1'],
  minStars: 100,
  pushedWithinDays: 30,
  status: 'active',
  sort: 'stars',
  view: 'list',
  scrollTop: 480,
};

describe('README workspace routes', () => {
  it('carries Browse entry back to Browse', () => {
    const destination = createReadmeDestination('openai', 'codex', 'repo-1', '/', {
      browseSnapshot,
    });

    expect(destination.to).toBe('/repos/openai/codex/readme');
    expect(resolveReadmeReturn(destination.state, 'openai', 'codex')).toEqual({
      to: '/',
      source: 'browse',
    });
    expect(destination.state.readme?.source).toEqual({
      kind: 'browse',
      snapshot: browseSnapshot,
    });
  });

  it('carries Collection entry back to its collection route', () => {
    const destination = createReadmeDestination(
      'openai',
      'codex',
      'repo-1',
      '/collections/collection-7',
      { collectionName: 'AI tools', scrollTop: 120 },
    );

    expect(resolveReadmeReturn(destination.state, 'openai', 'codex')).toEqual({
      to: '/collections/collection-7',
      source: 'collection',
      collectionName: 'AI tools',
    });
    expect(destination.state.readme?.source).toEqual({
      kind: 'collection',
      id: 'collection-7',
      name: 'AI tools',
      scrollTop: 120,
    });
  });

  it('falls back to Browse for direct links, invalid sources, or a different repository', () => {
    const invalid = { source: { kind: 'collection', id: '../settings' } } as ReadmeRouteState;
    const otherRepo = createReadmeDestination('openai', 'codex', 'repo-1', '/', {
      browseSnapshot,
    }).state;

    expect(resolveReadmeReturn(undefined, 'openai', 'codex').to).toBe('/');
    expect(resolveReadmeReturn(invalid, 'openai', 'codex').to).toBe('/');
    expect(resolveReadmeReturn(otherRepo, 'openai', 'other-repo').to).toBe('/');
  });

  it.each([
    ['en', 'Read README', 'Back to Browse'],
    ['zh-CN', '阅读 README', '返回浏览'],
  ])('provides the navigation path in %s', async (locale, readLabel, returnLabel) => {
    await i18n.changeLanguage(locale);

    expect(i18n.t('drawer.readReadme')).toBe(readLabel);
    expect(i18n.t('readme.backToBrowse')).toBe(returnLabel);
  });
});

describe('README return planner', () => {
  it('restores Browse snapshot and reopens when the trigger remains visible', () => {
    const state = createReadmeDestination('openai', 'codex', 'repo-1', '/', {
      browseSnapshot,
    }).state;

    expect(
      planReadmeReturn({
        state,
        owner: 'openai',
        name: 'codex',
        repoVisible: true,
        collectionExists: true,
      }),
    ).toEqual({
      to: '/',
      source: 'browse',
      restoreBrowse: browseSnapshot,
      reopenRepoId: 'repo-1',
      scrollTop: 480,
    });
  });

  it('restores Browse filters without forced scroll or reopen when the trigger is gone', () => {
    const state = createReadmeDestination('openai', 'codex', 'repo-1', '/', {
      browseSnapshot,
    }).state;

    expect(
      planReadmeReturn({
        state,
        owner: 'openai',
        name: 'codex',
        repoVisible: false,
        collectionExists: true,
      }),
    ).toEqual({
      to: '/',
      source: 'browse',
      restoreBrowse: browseSnapshot,
      reopenRepoId: null,
      scrollTop: null,
    });
  });

  it('reopens Collection Quick Look when the collection and repository remain valid', () => {
    const state = createReadmeDestination(
      'openai',
      'codex',
      'repo-1',
      '/collections/collection-7',
      { collectionName: 'AI tools', scrollTop: 120 },
    ).state;

    expect(
      planReadmeReturn({
        state,
        owner: 'openai',
        name: 'codex',
        repoVisible: true,
        collectionExists: true,
      }),
    ).toEqual({
      to: '/collections/collection-7',
      source: 'collection',
      collectionName: 'AI tools',
      restoreBrowse: null,
      reopenRepoId: 'repo-1',
      scrollTop: 120,
    });
  });

  it('falls back to Browse when the originating collection is missing', () => {
    const state = createReadmeDestination(
      'openai',
      'codex',
      'repo-1',
      '/collections/collection-7',
      { collectionName: 'AI tools', scrollTop: 120 },
    ).state;

    expect(
      planReadmeReturn({
        state,
        owner: 'openai',
        name: 'codex',
        repoVisible: true,
        collectionExists: false,
      }),
    ).toEqual({
      to: '/',
      source: 'browse',
      restoreBrowse: null,
      reopenRepoId: null,
      scrollTop: null,
    });
  });

  it('keeps the Collection route but skips reopen when the repository left the collection', () => {
    const state = createReadmeDestination(
      'openai',
      'codex',
      'repo-1',
      '/collections/collection-7',
      { collectionName: 'AI tools', scrollTop: 120 },
    ).state;

    expect(
      planReadmeReturn({
        state,
        owner: 'openai',
        name: 'codex',
        repoVisible: false,
        collectionExists: true,
      }),
    ).toEqual({
      to: '/collections/collection-7',
      source: 'collection',
      collectionName: 'AI tools',
      restoreBrowse: null,
      reopenRepoId: null,
      scrollTop: null,
    });
  });

  it('uses the Browse fallback plan for direct links and mismatched repositories', () => {
    expect(
      planReadmeReturn({
        state: undefined,
        owner: 'openai',
        name: 'codex',
        repoVisible: true,
        collectionExists: true,
      }),
    ).toEqual({
      to: '/',
      source: 'browse',
      restoreBrowse: null,
      reopenRepoId: null,
      scrollTop: null,
    });
  });
});

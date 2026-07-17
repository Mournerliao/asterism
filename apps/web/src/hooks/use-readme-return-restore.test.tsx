// @vitest-environment happy-dom

import type { StarredRepoRecord } from '@asterism/db';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoInspectorProvider, useRepoInspector } from '../contexts/repo-inspector-context';
import { createBrowseSourceSnapshot, createReadmeDestination } from '../lib/readme-navigation';
import { clearReadmeReturnState, prepareReadmeReturn } from '../lib/readme-return-coordinator';
import { useBrowseFilters } from '../stores/browse-filters';
import { getBrowseView, useBrowseViewStore } from '../stores/browse-view';
import { useRepoInspectorStore } from '../stores/repo-inspector';
import { useReadmeReturnRestore } from './use-readme-return-restore';

vi.mock('../data/use-note', () => ({
  useNote: () => ({ data: '', isLoading: false }),
  useSaveNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../data/use-tags', () => ({
  useTags: () => ({ data: [] }),
  useCreateTag: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../data/use-repo-tags', () => ({
  useRepoTags: () => ({ data: [] }),
  useToggleRepoTag: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}));

vi.mock('../data/use-collections', () => ({
  useCollections: () => ({ data: [] }),
}));

vi.mock('../data/use-collection-repos', () => ({
  useCollectionRepos: () => ({ data: [] }),
  useToggleCollectionRepo: () => ({ mutate: vi.fn() }),
}));

vi.mock('../hooks/use-media-query', () => ({
  useMediaQuery: () => true,
}));

const record = {
  repoId: 'repo-1',
  repo: { owner: 'openai', name: 'codex', fullName: 'openai/codex' },
  starredAt: '2026-01-01T00:00:00Z',
} as StarredRepoRecord;

function BrowseHarness({ records }: { records: StarredRepoRecord[] }) {
  const { requestOpen } = useRepoInspector();
  const selected = useRepoInspectorStore((state) => state.record?.repoId);
  const query = useBrowseFilters((state) => state.query);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const inspectorContext = { sourceKey: 'browse' as const, records };

  useReadmeReturnRestore({
    sourceKey: 'browse',
    records,
    scrollElement,
    inspectorContext,
    requestOpen,
    ready: true,
  });

  return (
    <div>
      <span data-testid="selected">{selected ?? ''}</span>
      <span data-testid="query">{query}</span>
      <span data-testid="view">{getBrowseView()}</span>
      <div
        data-scroll
        ref={(node) => {
          if (node) {
            Object.defineProperty(node, 'scrollTop', {
              configurable: true,
              get: () => (node as HTMLDivElement & { _scrollTop?: number })._scrollTop ?? 0,
              set: (value: number) => {
                (node as HTMLDivElement & { _scrollTop?: number })._scrollTop = value;
              },
            });
          }
          setScrollElement(node);
        }}
      />
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  clearReadmeReturnState();
  useBrowseFilters.getState().reset();
  useBrowseViewStore.setState({ view: 'grid' });
  useRepoInspectorStore.setState({ record: null, context: null });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  clearReadmeReturnState();
  useBrowseFilters.getState().reset();
  useBrowseViewStore.setState({ view: 'grid' });
  useRepoInspectorStore.setState({ record: null, context: null });
  container.remove();
});

describe('README return restore on Browse', () => {
  it('restores filters/view and reopens Quick Look when the repository is still visible', async () => {
    const snapshot = createBrowseSourceSnapshot(
      {
        query: 'codex',
        language: 'TypeScript',
        topic: null,
        tagIds: [],
        minStars: 0,
        pushedWithinDays: null,
        status: 'all',
        sort: 'name',
      },
      'list',
      240,
    );
    const state = createReadmeDestination('openai', 'codex', 'repo-1', '/', {
      browseSnapshot: snapshot,
    }).state;

    prepareReadmeReturn({ state, owner: 'openai', name: 'codex' });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <RepoInspectorProvider>
              <BrowseHarness records={[record]} />
            </RepoInspectorProvider>
          ),
        },
      ],
      { initialEntries: ['/'] },
    );

    await act(async () => root.render(<RouterProvider router={router} />));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(container.querySelector('[data-testid="query"]')?.textContent).toBe('codex');
    expect(container.querySelector('[data-testid="view"]')?.textContent).toBe('list');
    expect(container.querySelector('[data-testid="selected"]')?.textContent).toBe('repo-1');
    expect(document.querySelector<HTMLElement>('[data-scroll]')?.scrollTop).toBe(240);
  });

  it('skips reopen and forced scroll when the repository is no longer visible', async () => {
    const snapshot = createBrowseSourceSnapshot(
      {
        query: 'missing',
        language: null,
        topic: null,
        tagIds: [],
        minStars: 0,
        pushedWithinDays: null,
        status: 'all',
        sort: 'starred',
      },
      'grid',
      240,
    );
    const state = createReadmeDestination('openai', 'codex', 'repo-1', '/', {
      browseSnapshot: snapshot,
    }).state;

    prepareReadmeReturn({ state, owner: 'openai', name: 'codex' });

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <RepoInspectorProvider>
              <BrowseHarness records={[]} />
            </RepoInspectorProvider>
          ),
        },
      ],
      { initialEntries: ['/'] },
    );

    await act(async () => root.render(<RouterProvider router={router} />));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(container.querySelector('[data-testid="query"]')?.textContent).toBe('missing');
    expect(container.querySelector('[data-testid="selected"]')?.textContent).toBe('');
    expect(document.querySelector<HTMLElement>('[data-scroll]')?.scrollTop ?? 0).toBe(0);
  });
});

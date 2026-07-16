// @vitest-environment happy-dom

import type { StarredRepoRecord } from '@asterism/db';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoInspector } from '../components/repo-inspector';
import i18n from '../i18n';
import { useRepoInspectorStore } from '../stores/repo-inspector';
import { RepoInspectorProvider, useRepoInspector } from './repo-inspector-context';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('../data/use-note', () => ({
  useNote: () => ({ data: 'saved note', isLoading: false }),
  useSaveNote: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
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
  repo: { owner: 'openai', name: 'codex' },
  starredAt: null,
} as StarredRepoRecord;

function Harness() {
  const controller = useRepoInspector();
  const location = useLocation();

  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="error">{String(controller.confirmError)}</span>
      <button
        type="button"
        data-testid="prepare"
        onClick={() => {
          controller.requestOpen(record, { sourceKey: 'browse', records: [record] });
          controller.syncNote(record.repoId, 'saved note');
          controller.setNoteBody('draft note');
        }}
      />
      <RepoInspector />
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

function text(testId: string) {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent;
}

async function clickTestButton(testId: string) {
  await act(async () => {
    container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click();
  });
}

async function clickVisibleButton(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(label),
  );
  expect(button, `button labeled "${label}"`).toBeDefined();
  await act(async () => button?.click());
}

async function prepareDirtyNavigation(readLabel: string) {
  await clickTestButton('prepare');
  await clickVisibleButton(readLabel);
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(text('path')).toBe('/');
}

const localeCases = [
  ['en', 'Read README', 'Save changes', 'Discard changes', 'Keep editing'],
  ['zh-CN', '阅读 README', '保存更改', '放弃更改', '继续编辑'],
] as const;

async function setLocale(locale: (typeof localeCases)[number][0]) {
  await act(async () => i18n.changeLanguage(locale));
}

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.mutateAsync.mockReset().mockResolvedValue(undefined);
  useRepoInspectorStore.setState({ record: null, context: null });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <RepoInspectorProvider>
            <Harness />
          </RepoInspectorProvider>
        ),
      },
    ],
    { initialEntries: ['/'] },
  );
  await act(async () => root.render(<RouterProvider router={router} />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  useRepoInspectorStore.setState({ record: null, context: null });
  container.remove();
});

describe('README navigation with an unsaved note', () => {
  it.each(
    localeCases,
  )('starts navigation only after save succeeds in %s', async (locale, read, save) => {
    await setLocale(locale);
    await prepareDirtyNavigation(read);
    await clickVisibleButton(save);

    expect(mocks.mutateAsync).toHaveBeenCalledWith({ repoId: 'repo-1', body: 'draft note' });
    expect(text('path')).toBe('/repos/openai/codex/readme');
  });

  it.each(localeCases)('discards the draft before navigating in %s', async (locale, ...labels) => {
    await setLocale(locale);
    await prepareDirtyNavigation(labels[0]);
    await clickVisibleButton(labels[2]);

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(text('path')).toBe('/repos/openai/codex/readme');
  });

  it.each(localeCases)('continues editing without navigating in %s', async (locale, ...labels) => {
    await setLocale(locale);
    await prepareDirtyNavigation(labels[0]);
    await clickVisibleButton(labels[3]);

    expect(document.body.textContent).not.toContain(labels[1]);
    expect(text('path')).toBe('/');
  });

  it.each(
    localeCases,
  )('keeps the draft and route in place when save fails in %s', async (locale, ...labels) => {
    await setLocale(locale);
    mocks.mutateAsync.mockRejectedValueOnce(new Error('save failed'));
    await prepareDirtyNavigation(labels[0]);
    await clickVisibleButton(labels[1]);

    expect(text('error')).toBe('true');
    expect(text('path')).toBe('/');
  });
});

// @vitest-environment happy-dom

import type { StarredRepoRecord } from '@asterism/db';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { RepoInspectorProvider, useRepoInspector } from './repo-inspector-context';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('../data/use-note', () => ({
  useSaveNote: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

const record = {
  repoId: 'repo-1',
  repo: { owner: 'openai', name: 'codex' },
  starredAt: null,
} as StarredRepoRecord;

function Harness() {
  const { t } = useTranslation();
  const controller = useRepoInspector();
  const location = useLocation();
  const destination = {
    readme: {
      repoId: 'repo-1',
      owner: 'openai',
      name: 'codex',
      source: { kind: 'browse' as const },
    },
  };

  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      <span data-testid="confirm">{String(controller.confirmOpen)}</span>
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
      <button
        type="button"
        data-testid="read"
        onClick={() => controller.requestRoute('/repos/openai/codex/readme', destination)}
      />
      <button type="button" data-testid="save" onClick={controller.saveAndContinue}>
        {t('drawer.saveAndContinue')}
      </button>
      <button type="button" data-testid="discard" onClick={controller.discardAndContinue}>
        {t('drawer.discardAndContinue')}
      </button>
      <button type="button" data-testid="keep" onClick={controller.continueEditing}>
        {t('drawer.continueEditing')}
      </button>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

function text(testId: string) {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent;
}

async function click(testId: string) {
  await act(async () => {
    container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click();
  });
}

async function prepareDirtyNavigation() {
  await click('prepare');
  await click('read');
  expect(text('confirm')).toBe('true');
  expect(text('path')).toBe('/');
}

const localeCases = [
  ['en', 'Save changes', 'Discard changes', 'Keep editing'],
  ['zh-CN', '保存更改', '放弃更改', '继续编辑'],
] as const;

async function setLocale(
  locale: (typeof localeCases)[number][0],
  labels: readonly [string, string, string],
) {
  await act(async () => i18n.changeLanguage(locale));
  expect(text('save')).toBe(labels[0]);
  expect(text('discard')).toBe(labels[1]);
  expect(text('keep')).toBe(labels[2]);
}

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.mutateAsync.mockReset().mockResolvedValue(undefined);
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
  container.remove();
});

describe('README navigation with an unsaved note', () => {
  it.each(
    localeCases,
  )('starts navigation only after save succeeds in %s', async (locale, save, discard, keep) => {
    await setLocale(locale, [save, discard, keep]);
    await prepareDirtyNavigation();
    await click('save');

    expect(mocks.mutateAsync).toHaveBeenCalledWith({ repoId: 'repo-1', body: 'draft note' });
    expect(text('path')).toBe('/repos/openai/codex/readme');
  });

  it.each(localeCases)('discards the draft before navigating in %s', async (locale, ...labels) => {
    await setLocale(locale, labels);
    await prepareDirtyNavigation();
    await click('discard');

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(text('path')).toBe('/repos/openai/codex/readme');
  });

  it.each(localeCases)('continues editing without navigating in %s', async (locale, ...labels) => {
    await setLocale(locale, labels);
    await prepareDirtyNavigation();
    await click('keep');

    expect(text('confirm')).toBe('false');
    expect(text('path')).toBe('/');
  });

  it.each(
    localeCases,
  )('keeps the draft and route in place when save fails in %s', async (locale, ...labels) => {
    await setLocale(locale, labels);
    mocks.mutateAsync.mockRejectedValueOnce(new Error('save failed'));
    await prepareDirtyNavigation();
    await click('save');

    expect(text('error')).toBe('true');
    expect(text('path')).toBe('/');
  });
});

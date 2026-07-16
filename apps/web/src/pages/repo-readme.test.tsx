// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import type { ReadmeRouteState } from '../lib/readme-navigation';
import { RepoBaseRedirect } from './repo-base-redirect';
import { RepoReadmePage } from './repo-readme';

const mocks = vi.hoisted(() => ({
  result: {} as {
    data?: { status: string; html?: string; etag?: string | null };
    isPending: boolean;
    isError: boolean;
    refetch: ReturnType<typeof vi.fn>;
  },
}));

vi.mock('../data/use-repo-readme', () => ({
  useRepoReadme: () => mocks.result,
}));

let container: HTMLDivElement;
let root: Root;

async function renderPage(locale = 'en', state?: ReadmeRouteState) {
  await import('../components/readme-document');
  await i18n.changeLanguage(locale);
  const router = createMemoryRouter(
    [
      { path: '/', element: <span>Browse destination</span> },
      { path: '/collections/:id', element: <span>Collection destination</span> },
      { path: '/repos/:owner/:name/readme', element: <RepoReadmePage /> },
    ],
    { initialEntries: [{ pathname: '/repos/openai/codex/readme', state }] },
  );
  await act(async () => root.render(<RouterProvider router={router} />));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  return router;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.result = { isPending: false, isError: false, refetch: vi.fn() };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('README workspace route', () => {
  it('redirects the readable repository base route to README', async () => {
    const router = createMemoryRouter(
      [
        { path: '/repos/:owner/:name', element: <RepoBaseRedirect /> },
        { path: '/repos/:owner/:name/readme', element: <span>README destination</span> },
      ],
      { initialEntries: ['/repos/openai/codex'] },
    );
    await act(async () => root.render(<RouterProvider router={router} />));

    expect(router.state.location.pathname).toBe('/repos/openai/codex/readme');
    expect(container.textContent).toContain('README destination');
  });

  it.each([
    ['en', 'Back to Browse'],
    ['zh-CN', '返回浏览'],
  ])('renders sanitized authorized README HTML inside the workspace in %s', async (locale, back) => {
    mocks.result.data = {
      status: 'success',
      html: '<h1>Codex</h1><script>alert(1)</script><p>Safe README</p>',
      etag: null,
    };

    await renderPage(locale);
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain('Safe README'));
    });

    expect(container.textContent).toContain('openai / codex');
    expect(container.textContent).toContain(back);
    expect(container.textContent).toContain('Safe README');
    expect(container.querySelector('script')).toBeNull();
  });

  it.each([
    ['en', 'Repository not in your library'],
    ['zh-CN', '仓库不在你的资料库中'],
  ])('renders the membership rejection state in %s', async (locale, title) => {
    mocks.result.data = { status: 'not_in_library' };

    await renderPage(locale);

    expect(container.textContent).toContain(title);
    expect(container.querySelector('.markdown-body')).toBeNull();
  });

  it.each([
    ['en', undefined, 'Back to Browse', '/'],
    ['zh-CN', undefined, '返回浏览', '/'],
    [
      'en',
      {
        readme: {
          repoId: 'repo-1',
          owner: 'openai',
          name: 'codex',
          source: { kind: 'collection' as const, id: 'collection-7', name: 'AI tools' },
        },
      },
      'Back to AI tools',
      '/collections/collection-7',
    ],
    [
      'zh-CN',
      {
        readme: {
          repoId: 'repo-1',
          owner: 'openai',
          name: 'codex',
          source: { kind: 'collection' as const, id: 'collection-7', name: 'AI 工具' },
        },
      },
      '返回 AI 工具',
      '/collections/collection-7',
    ],
  ] satisfies ReadonlyArray<
    [string, ReadmeRouteState | undefined, string, string]
  >)('uses the visible return action for %s entry', async (locale, state, label, destination) => {
    mocks.result.data = { status: 'retryable_error' };
    const router = await renderPage(locale, state);
    const returnLink = container.querySelector<HTMLAnchorElement>('header a');

    expect(returnLink?.textContent).toContain(label);
    await act(async () => returnLink?.click());
    expect(router.state.location.pathname).toBe(destination);
  });
});

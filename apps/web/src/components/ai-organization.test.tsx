// @vitest-environment happy-dom

import type { AiConnection, AiOrganizationDraft } from '@asterism/db';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { AiOrganizationDraftBanner, AiOrganizationPreflight } from './ai-organization';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

const connection: AiConnection = {
  id: 'connection-1',
  adapter: 'openai',
  name: 'Personal OpenAI',
  baseUrl: null,
  status: 'valid',
  credentialHint: '••••test',
  generationCapability: { ok: true, model: 'gpt-4o-mini' },
  createdAt: 'now',
  updatedAt: 'now',
};

const emptyDraft: AiOrganizationDraft = {
  id: 'draft-1',
  sourceRepoIds: ['repo-1'],
  suggestions: { version: 1, relationChanges: [], newClassifications: [] },
  generationConnectionId: connection.id,
  generationAdapter: 'openai',
  generationModel: 'gpt-4o-mini',
  reviewState: 'review',
  revision: 1,
  createdAt: 'now',
  updatedAt: 'now',
};

let container: HTMLDivElement;
let root: Root;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(async () => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await i18n.changeLanguage('en');
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function button(label: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(label),
  );
}

describe('Browse AI organization flow', () => {
  it('shows accurate preflight disclosure and independently blocks an over-limit selection', async () => {
    const onGenerate = vi.fn();
    await act(async () => {
      root.render(
        <AiOrganizationPreflight
          selectedRepoIds={Array.from({ length: 51 }, (_, index) => `repo-${index}`)}
          connection={connection}
          model="gpt-4o-mini"
          includeNotes
          existingDraft={emptyDraft}
          pending={false}
          onGenerate={onGenerate}
        />,
      );
    });
    await act(async () => button('Organize with AI')?.click());
    expect(document.body.textContent).toContain('51 repositories are selected');
    expect(document.body.textContent).toContain('Personal OpenAI');
    expect(document.body.textContent).toContain('2,000 Unicode code points');
    expect(document.body.textContent).toContain('README content and credentials are never sent');
    expect(document.body.textContent).toContain('will be replaced only after');
    expect(button('Generate draft')?.disabled).toBe(true);
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('keeps the fixed selection visible when generation fails', async () => {
    const selected = ['repo-1', 'repo-2'];
    const onGenerate = vi.fn().mockRejectedValue(new Error('provider_timeout'));
    await act(async () => {
      root.render(
        <AiOrganizationPreflight
          selectedRepoIds={selected}
          connection={connection}
          model="gpt-4o-mini"
          includeNotes={false}
          existingDraft={null}
          pending={false}
          onGenerate={onGenerate}
        />,
      );
    });
    await act(async () => button('Organize with AI')?.click());
    await act(async () => button('Generate draft')?.click());
    expect(onGenerate).toHaveBeenCalledWith(selected);
    expect(document.body.textContent).toContain('2 selected repositories');
    expect(document.body.textContent).toContain('selection and previous draft are unchanged');
  });

  it('resumes a valid empty draft and exposes an explicit discard action', async () => {
    const onDiscard = vi.fn().mockResolvedValue(true);
    await act(async () => {
      root.render(
        <AiOrganizationDraftBanner
          draft={emptyDraft}
          repoNames={new Map([['repo-1', 'owner/repo']])}
          targetNames={new Map()}
          discarding={false}
          onDiscard={onDiscard}
        />,
      );
    });
    expect(document.body.textContent).toContain('AI organization draft ready');
    await act(async () => button('Resume draft')?.click());
    expect(document.body.textContent).toContain('No changes recommended');
    await act(async () => button('Discard draft')?.click());
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});

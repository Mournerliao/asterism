// @vitest-environment happy-dom

import type { AiConnection, AiSettings } from '@asterism/db';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { AiConnectionsManager } from './ai-connections-manager';

const hooks = vi.hoisted(() => ({
  useAiConnections: vi.fn(),
  useAiSettings: vi.fn(),
  useCreateAiConnection: vi.fn(),
  useUpdateAiConnection: vi.fn(),
  useTestAiConnection: vi.fn(),
  useDeleteAiConnection: vi.fn(),
  useDiscoverAiConnectionModels: vi.fn(),
  useUpdateAiSettings: vi.fn(),
}));

vi.mock('../data/use-ai-connections', () => hooks);

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

function idleMutation() {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
  };
}

const connection: AiConnection = {
  id: 'conn-1',
  adapter: 'openai',
  name: 'Personal OpenAI',
  baseUrl: null,
  status: 'valid',
  credentialHint: 'sk-…abcd',
  generationCapability: { ok: true, model: 'gpt-4o-mini' },
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

const settings: AiSettings = {
  generationConnectionId: 'conn-1',
  generationModel: 'gpt-4o-mini',
  includeNotesInAi: false,
  locale: null,
  theme: null,
};

let container: HTMLDivElement;
let root: Root;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  hooks.useCreateAiConnection.mockReturnValue(idleMutation());
  hooks.useUpdateAiConnection.mockReturnValue(idleMutation());
  hooks.useTestAiConnection.mockReturnValue(idleMutation());
  hooks.useDeleteAiConnection.mockReturnValue(idleMutation());
  hooks.useDiscoverAiConnectionModels.mockReturnValue(idleMutation());
  hooks.useUpdateAiSettings.mockReturnValue(idleMutation());
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function render() {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    await i18n.changeLanguage('en');
    root.render(<AiConnectionsManager />);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('AiConnectionsManager', () => {
  it('teaches with an empty state and hides preferences when there are no connections', async () => {
    hooks.useAiConnections.mockReturnValue({ data: [], isLoading: false });
    hooks.useAiSettings.mockReturnValue({ data: undefined });

    await render();

    expect(container.textContent).toContain('No connections yet');
    expect(container.textContent).not.toContain('Active connection');
  });

  it('lists connections with their status and surfaces the active preferences', async () => {
    hooks.useAiConnections.mockReturnValue({ data: [connection], isLoading: false });
    hooks.useAiSettings.mockReturnValue({ data: settings });

    await render();

    expect(container.textContent).toContain('Personal OpenAI');
    expect(container.textContent).toContain('Valid');
    expect(container.textContent).toContain('Active connection');

    expect(container.textContent).toContain('gpt-4o-mini');
    expect(container.textContent).toContain('Last test:');
    expect(container.textContent).toContain('owner and name');
    expect(container.textContent).toContain('OpenAI');
  });

  it('exposes enable or disable as a real connection lifecycle action', async () => {
    const update = idleMutation();
    hooks.useUpdateAiConnection.mockReturnValue(update);
    hooks.useAiConnections.mockReturnValue({ data: [connection], isLoading: false });
    hooks.useAiSettings.mockReturnValue({ data: settings });
    await render();

    const actions = container.querySelector<HTMLButtonElement>('button[aria-label="Actions"]');
    await act(async () => {
      actions?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }),
      );
      actions?.click();
    });
    const disable = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (item) => item.textContent?.includes('Disable'),
    );
    expect(disable).toBeDefined();
    await act(async () => {
      disable?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }),
      );
      disable?.click();
    });

    expect(update.mutate).toHaveBeenCalledWith(
      { connectionId: 'conn-1', enabled: false },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('does not offer private-note inclusion without an active connection', async () => {
    hooks.useAiConnections.mockReturnValue({ data: [connection], isLoading: false });
    hooks.useAiSettings.mockReturnValue({
      data: { ...settings, generationConnectionId: null, generationModel: null },
    });

    await render();

    expect(container.textContent).toContain('Choose a valid active connection');
    const onOption = [
      ...container.querySelectorAll<HTMLButtonElement>(
        'button[data-slot="segmented-control-item"]',
      ),
    ].find((button) => button.textContent === 'On');
    expect(onOption?.disabled).toBe(true);
  });
});

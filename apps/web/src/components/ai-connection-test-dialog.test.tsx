// @vitest-environment happy-dom

import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { AiConnectionTestDialog } from './ai-connection-test-dialog';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

let container: HTMLDivElement;
let root: Root;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderDialog(props: Partial<ComponentProps<typeof AiConnectionTestDialog>> = {}) {
  const onDiscover = vi.fn();
  const onTest = vi.fn();
  await act(async () => {
    await i18n.changeLanguage('en');
    root.render(
      <AiConnectionTestDialog
        open
        onOpenChange={vi.fn()}
        connectionName="Personal OpenAI"
        onDiscover={onDiscover}
        onTest={onTest}
        {...props}
      />,
    );
  });
  return { onDiscover, onTest };
}

describe('AiConnectionTestDialog', () => {
  it('discovers models while retaining a manual model path', async () => {
    const { onDiscover, onTest } = await renderDialog({
      discoveredModels: ['gpt-4o-mini', 'gpt-4.1-mini'],
    });

    const discoverButton = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Discover models'),
    );
    await act(async () => discoverButton?.click());
    expect(onDiscover).toHaveBeenCalledOnce();

    const modelSelect = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Discovered models"]',
    );
    await act(async () => {
      modelSelect?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }),
      );
      modelSelect?.click();
    });
    const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (item) => item.textContent?.includes('gpt-4o-mini'),
    );
    await act(async () => {
      option?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }),
      );
      option?.click();
    });
    const runButton = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Run test'),
    );
    await act(async () => runButton?.click());

    expect(onTest).toHaveBeenCalledWith('gpt-4o-mini');
    expect(
      document.body.querySelector<HTMLInputElement>('input[placeholder*="gpt"]')?.disabled,
    ).toBe(false);
    expect(document.body.textContent).toContain('enter a model ID manually');
  });

  it('explains discovery failure without blocking manual input', async () => {
    await renderDialog({ discoveryAttempted: true, discoveredModels: [] });

    expect(document.body.textContent).toContain("Model discovery isn't available");
    expect(document.body.querySelector<HTMLInputElement>('input')?.disabled).toBe(false);
  });
});

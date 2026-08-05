// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginEmbeddingPreparation,
  dismissEmbeddingPrompt,
  embeddingOptInStorageKey,
  embeddingPromptDismissalStorageKey,
  finishEmbeddingPreparation,
  readEmbeddingPromptDismissal,
  resetEmbeddingConsentState,
  useEmbeddingAvailability,
} from './embedding-consent';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function Harness({ userId }: { userId: string }) {
  return <span>{useEmbeddingAvailability(userId)}</span>;
}

beforeEach(() => {
  localStorage.clear();
  resetEmbeddingConsentState();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('embedding consent state', () => {
  it('stores prompt dismissal separately from feature consent', () => {
    dismissEmbeddingPrompt('user-a');

    expect(readEmbeddingPromptDismissal('user-a')).toBe(true);
    expect(localStorage.getItem(embeddingPromptDismissalStorageKey('user-a'))).toBe('dismissed');
    expect(localStorage.getItem(embeddingOptInStorageKey('user-a'))).toBeNull();
  });

  it('caches the storage lookup across renders', async () => {
    localStorage.setItem(embeddingOptInStorageKey('user-a'), 'enabled');
    const getItem = vi.spyOn(Storage.prototype, 'getItem');

    await act(async () => root.render(<Harness userId="user-a" />));
    await act(async () => root.render(<Harness userId="user-a" />));

    expect(container.textContent).toBe('preparing');
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('publishes preparation lifecycle changes to consumers', async () => {
    await act(async () => root.render(<Harness userId="user-a" />));
    expect(container.textContent).toBe('disabled');

    let token = Symbol();
    await act(async () => {
      token = beginEmbeddingPreparation('user-a', true);
    });
    expect(container.textContent).toBe('preparing');

    await act(async () => finishEmbeddingPreparation('user-a', token, true));
    expect(container.textContent).toBe('available');
  });

  it('does not let an older pass unlock a newer preparation pass', async () => {
    const older = beginEmbeddingPreparation('user-a', true);
    const newer = beginEmbeddingPreparation('user-a', false);
    await act(async () => root.render(<Harness userId="user-a" />));

    await act(async () => finishEmbeddingPreparation('user-a', older, true));
    expect(container.textContent).toBe('preparing');

    await act(async () => finishEmbeddingPreparation('user-a', newer, false));
    expect(container.textContent).toBe('degraded');
  });
});

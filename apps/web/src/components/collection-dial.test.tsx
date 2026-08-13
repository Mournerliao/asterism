// @vitest-environment happy-dom

import { CollectionDial } from '@asterism/ui';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const targets = Array.from({ length: 7 }, (_, index) => ({
  id: `collection-${index + 1}`,
  name: `Collection ${index + 1}`,
}));

let observedWidth = 390;

class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ target, contentRect: { width: observedWidth } as DOMRectReadOnly } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  disconnect() {}
}

const copy = {
  label: 'Collection Dial',
  placement: (repo: string, collection: string) => `${repo} to ${collection}`,
  position: (current: number, total: number) => `${current} of ${total}`,
  selectCollection: (collection: string) => `Select ${collection}`,
  confirm: (collection: string) => `Add to ${collection}`,
  cancel: 'Cancel',
  retry: 'Retry',
  readyStatus: 'Choose a collection',
  submittingStatus: 'Adding repository',
  successStatus: 'Repository added',
  keyboardHint: 'Q/E to choose, Enter to add',
};

let container: HTMLDivElement;
let root: Root;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

function renderDial(
  overrides: Partial<React.ComponentProps<typeof CollectionDial>> = {},
  width = 390,
) {
  observedWidth = width;
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const props: React.ComponentProps<typeof CollectionDial> = {
    repoLabel: 'owner/repo',
    targets,
    activeIndex: 3,
    status: 'ready',
    copy,
    onSelect: vi.fn(),
    onStep: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  act(() => root.render(<CollectionDial {...props} />));
  return props;
}

describe('controlled Collection Dial', () => {
  it('keeps a centered three-target window and removes hidden targets from interaction', () => {
    renderDial();

    const buttons = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-collection-dial-target]'),
    ];
    expect(buttons.filter((button) => button.getAttribute('aria-hidden') !== 'true')).toHaveLength(
      3,
    );
    expect(buttons[3]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[3]?.tabIndex).toBe(0);
    expect(buttons[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(buttons[0]?.tabIndex).toBe(-1);
  });

  it('separates target selection from explicit confirmation', () => {
    const props = renderDial();
    const visible = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-collection-dial-target]'),
    ].filter((button) => button.getAttribute('aria-hidden') !== 'true');

    visible[0]?.click();
    expect(props.onSelect).toHaveBeenCalledWith('collection-3');
    expect(props.onConfirm).not.toHaveBeenCalled();

    const dial = container.querySelector<HTMLElement>('[data-collection-dial]');
    dial?.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    dial?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    dial?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(props.onStep).toHaveBeenCalledWith(1);
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('focuses the dial for pointer pickup keyboard control', () => {
    const props = renderDial({ focusOnOpen: false });
    const dial = container.querySelector<HTMLElement>('[data-collection-dial]');

    expect(document.activeElement).toBe(dial);
    dial?.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));

    expect(props.onStep).toHaveBeenCalledWith(-1);
  });

  it('preserves native Enter semantics on the cancel action', () => {
    const props = renderDial();
    const cancel = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === 'Cancel',
    );
    cancel?.focus();
    cancel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(props.onConfirm).not.toHaveBeenCalled();
    cancel?.click();
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps Q/E and Escape active while an action button owns focus', () => {
    const props = renderDial();
    const cancel = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === 'Cancel',
    );
    cancel?.focus();
    cancel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    cancel?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(props.onStep).toHaveBeenCalledWith(1);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('announces retained retryable failures in the shared status region', () => {
    renderDial({ status: 'retryable_failure', message: 'Network unavailable' });

    const status = container.querySelector('[role="status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toContain('Network unavailable');
    expect(
      [...container.querySelectorAll('button')].some((button) => button.textContent === 'Retry'),
    ).toBe(true);
  });

  it('reflows to five targets at a 200% effective desktop width', () => {
    renderDial({}, 768);

    const visible = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-collection-dial-target]'),
    ].filter((button) => button.getAttribute('aria-hidden') !== 'true');

    expect(visible).toHaveLength(5);
    expect(visible[2]?.getAttribute('aria-pressed')).toBe('true');
  });
});

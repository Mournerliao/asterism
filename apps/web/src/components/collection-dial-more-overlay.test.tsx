// @vitest-environment happy-dom

import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { CollectionDialMoreOverlay } from './collection-dial-more-overlay';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const catalog = [
  {
    id: 'systems',
    name: 'Systems',
    description: 'Low-level tools',
    updatedAt: '2026-08-14',
    repoCount: 0,
    missingRepoIds: ['repo-1'],
    alreadyMemberCount: 0,
    missingCount: 1,
    fallbackRank: 0,
  },
  {
    id: 'frontend',
    name: 'Frontend',
    description: 'Web interfaces',
    updatedAt: '2026-08-13',
    repoCount: 0,
    missingRepoIds: ['repo-1'],
    alreadyMemberCount: 0,
    missingCount: 1,
    fallbackRank: 1,
  },
] as const;

let root: Root | undefined;

function Harness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <CollectionDialMoreOverlay
      open={open}
      catalog={catalog}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        setOpen(nextOpen);
      }}
      onSelect={vi.fn()}
    />
  );
}

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('Collection Dial More overlay', () => {
  it('focuses search, filters the frozen order, and returns focus to the dial trigger on Escape', async () => {
    const trigger = document.createElement('button');
    trigger.dataset.collectionDialMore = '';
    document.body.append(trigger);
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const onOpenChange = vi.fn();

    await act(async () => {
      root?.render(<Harness onOpenChange={onOpenChange} />);
    });

    const search = document.querySelector<HTMLInputElement>(
      '[aria-label="Search frozen collections"]',
    );
    expect(document.activeElement).toBe(search);
    await act(async () => {
      if (!search) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        search,
        'web',
      );
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
    expect(document.querySelector('[role="option"]')?.textContent).toContain('Frontend');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.activeElement).toBe(trigger);
  });
});

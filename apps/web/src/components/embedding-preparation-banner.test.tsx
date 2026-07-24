// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { EmbeddingPreparationBanner } from './embedding-preparation-banner';

let container: HTMLDivElement;
let root: Root;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderBanner(props: Partial<Parameters<typeof EmbeddingPreparationBanner>[0]> = {}) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <EmbeddingPreparationBanner
        phase="idle"
        modelProgress={0}
        completed={0}
        total={12}
        backend={null}
        error={null}
        optedIn={false}
        onStart={vi.fn()}
        onRetry={vi.fn()}
        {...props}
      />,
    ),
  );
}

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('EmbeddingPreparationBanner', () => {
  it('asks before the one-time same-origin model download and names its size', async () => {
    await renderBanner();

    expect(container.textContent).toContain('Prepare smarter search');
    expect(container.textContent).toContain('100–150 MB');
    expect(container.querySelector('button')?.textContent).toContain('Prepare search');
  });

  it('exposes model download and backfill progress accessibly', async () => {
    await renderBanner({ phase: 'loading-model', modelProgress: 42 });

    const progress = container.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('42');
    expect(container.textContent).toContain('42%');
  });

  it('keeps keyword-search fallback explicit after a runtime failure', async () => {
    await renderBanner({ phase: 'degraded', optedIn: true, error: 'WASM unavailable' });

    expect(container.textContent).toContain('Keyword search is still available');
    expect(container.textContent).toContain('Retry');
    expect(container.textContent).not.toContain('WASM unavailable');
  });
});

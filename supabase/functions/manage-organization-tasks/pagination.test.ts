import { describe, expect, it, vi } from 'vitest';
import { loadAllPages } from './pagination';

describe('Organization Task complete PostgREST scans', () => {
  it('reads every page beyond the project row limit in stable ranges', async () => {
    const source = Array.from({ length: 2_501 }, (_, index) => `repo-${index + 1}`);
    const loadPage = vi.fn().mockImplementation(async (from: number, to: number) => ({
      data: source.slice(from, Math.min(to + 1, from + 400)),
      error: null,
    }));

    await expect(loadAllPages(loadPage)).resolves.toEqual(source);
    expect(loadPage.mock.calls[0]).toEqual([0, 999]);
    expect(loadPage.mock.calls.at(-1)).toEqual([2_501, 3_500]);
  });

  it('does not persist a partial library after an interrupted page', async () => {
    await expect(
      loadAllPages(async (from) => ({
        data: from === 0 ? Array.from({ length: 1_000 }, (_, index) => `repo-${index + 1}`) : null,
        error: from === 0 ? null : new Error('network'),
      })),
    ).rejects.toThrow('organization_discovery_interrupted');
  });
});

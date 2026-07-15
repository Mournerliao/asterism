import { cn } from '@asterism/ui';
import { describe, expect, it } from 'vitest';

describe('ui class merging', () => {
  it('keeps semantic font-size and text-color classes together', () => {
    expect(cn('text-micro text-muted-foreground')).toBe('text-micro text-muted-foreground');
    expect(cn('text-caption text-link')).toBe('text-caption text-link');
  });

  it('still resolves competing semantic font sizes', () => {
    expect(cn('text-caption text-micro')).toBe('text-micro');
  });
});

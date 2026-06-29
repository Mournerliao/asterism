import { describe, expect, it } from 'vitest';
import { repoFullName } from './repo';

describe('repoFullName', () => {
  it('joins owner and name into owner/name', () => {
    expect(repoFullName({ owner: 'asterism', name: 'app' })).toBe('asterism/app');
  });
});

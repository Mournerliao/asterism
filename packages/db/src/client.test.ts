import { describe, expect, it } from 'vitest';
import { createSupabaseClient } from './client';

describe('createSupabaseClient', () => {
  it('throws when url or anon key is missing', () => {
    expect(() => createSupabaseClient('', '')).toThrow();
  });

  it('returns a client when given url and anon key', () => {
    const client = createSupabaseClient('https://example.supabase.co', 'anon-key');
    expect(client).toBeDefined();
    expect(typeof client.auth.getSession).toBe('function');
  });
});

import { vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://example.invalid');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');

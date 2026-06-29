import { createSupabaseClient } from '@asterism/db';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env at the repo root and fill in your Supabase project values.',
  );
}

export const supabase = createSupabaseClient(url, publishableKey);

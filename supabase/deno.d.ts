declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
  resolveDns(query: string, recordType: 'A' | 'AAAA'): Promise<string[]>;
};

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export { createClient } from '@supabase/supabase-js';
}

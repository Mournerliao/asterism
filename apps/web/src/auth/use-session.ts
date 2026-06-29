import { getSession, onAuthChange, type Session } from '@asterism/db';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UseSessionResult {
  session: Session | null;
  loading: boolean;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getSession(supabase).then((current) => {
      if (active) {
        setSession(current);
        setLoading(false);
      }
    });

    const unsubscribe = onAuthChange(supabase, (next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}

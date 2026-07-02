import { listNotes } from '@asterism/db';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { noteKeys } from './keys';

/** 读取当前用户全部笔记（导出用）。 */
export function useNotesList() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? noteKeys.list(userId) : noteKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listNotes(supabase, userId as string),
  });
}

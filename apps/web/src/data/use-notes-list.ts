import { listNotes } from '@asterism/db';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { noteKeys } from './keys';

/** 读取当前用户全部笔记（导出用）；可通过 enabled 延迟到需要时再拉取。 */
export function useNotesList(options?: { enabled?: boolean }) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? noteKeys.list(userId) : noteKeys.all,
    enabled: Boolean(userId) && (options?.enabled ?? true),
    queryFn: () => listNotes(supabase, userId as string),
  });
}

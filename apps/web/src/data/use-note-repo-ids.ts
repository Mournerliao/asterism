import { listNoteRepoIds } from '@asterism/db';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { noteKeys } from './keys';

/** 当前用户所有非空笔记对应的仓库 ID。 */
export function useNoteRepoIds() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? noteKeys.repoIds(userId) : noteKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listNoteRepoIds(supabase, userId as string),
  });
}

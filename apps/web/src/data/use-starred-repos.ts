import { listStarredRepos } from '@asterism/db';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { repoKeys } from './keys';

/** 当前用户 star 的仓库列表（唯一读取入口经 @asterism/db 查询）。 */
export function useStarredRepos() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? repoKeys.starred(userId) : repoKeys.all,
    enabled: Boolean(userId),
    queryFn: () => listStarredRepos(supabase, userId as string),
  });
}

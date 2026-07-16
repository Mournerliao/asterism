import { invokeRepoReadme } from '@asterism/db';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { repoKeys } from './keys';

export function useRepoReadme(owner: string | undefined, name: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey:
      userId && owner && name ? repoKeys.readme(userId, owner, name) : [...repoKeys.all, 'readme'],
    enabled: Boolean(userId && owner && name),
    staleTime: 5 * 60_000,
    queryFn: () =>
      invokeRepoReadme(supabase, {
        owner: owner as string,
        name: name as string,
        providerToken: session?.provider_token ?? undefined,
      }),
  });
}

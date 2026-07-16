import {
  invokeRepoReadme,
  type RepoReadmeOutcome,
  type RepoReadmeSuccess,
  type SupabaseClient,
} from '@asterism/db';
import { type QueryClient, type QueryKey, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/use-session';
import { supabase } from '../lib/supabase';
import { repoKeys } from './keys';

export const README_STALE_TIME = 5 * 60_000;

export async function loadRepoReadme({
  client,
  queryClient,
  queryKey,
  owner,
  name,
  providerToken,
}: {
  client: SupabaseClient;
  queryClient: QueryClient;
  queryKey: QueryKey;
  owner: string;
  name: string;
  providerToken?: string;
}): Promise<RepoReadmeOutcome> {
  const cached = queryClient.getQueryData<RepoReadmeOutcome>(queryKey);
  const cachedSuccess: RepoReadmeSuccess | undefined =
    cached?.status === 'success' ? cached : undefined;

  return invokeRepoReadme(
    client,
    {
      owner,
      name,
      providerToken,
      etag: cachedSuccess?.etag ?? undefined,
    },
    cachedSuccess,
  );
}

export function useRepoReadme(owner: string | undefined, name: string | undefined) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const queryKey =
    userId && owner && name ? repoKeys.readme(userId, owner, name) : [...repoKeys.all, 'readme'];

  return useQuery({
    queryKey,
    enabled: Boolean(userId && owner && name),
    staleTime: README_STALE_TIME,
    queryFn: () =>
      loadRepoReadme({
        client: supabase,
        queryClient,
        queryKey,
        owner: owner as string,
        name: name as string,
        providerToken: session?.provider_token ?? undefined,
      }),
  });
}

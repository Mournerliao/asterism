import type { SupabaseClient } from './client';

export type RepoReadmeOutcome =
  | { status: 'success'; html: string; etag: string | null }
  | { status: 'not_found' }
  | { status: 'not_in_library' }
  | { status: 'rate_limited' }
  | { status: 'reconnect_required' }
  | { status: 'retryable_error' };

export interface RepoReadmeRequest {
  owner: string;
  name: string;
  providerToken?: string;
}

function isRepoReadmeOutcome(value: unknown): value is RepoReadmeOutcome {
  if (!value || typeof value !== 'object' || !('status' in value)) {
    return false;
  }
  const outcome = value as Record<string, unknown>;
  if (outcome.status === 'success') {
    return (
      typeof outcome.html === 'string' &&
      (typeof outcome.etag === 'string' || outcome.etag === null)
    );
  }
  return [
    'not_found',
    'not_in_library',
    'rate_limited',
    'reconnect_required',
    'retryable_error',
  ].includes(String(outcome.status));
}

export async function invokeRepoReadme(
  client: SupabaseClient,
  request: RepoReadmeRequest,
): Promise<RepoReadmeOutcome> {
  const body = request.providerToken ? request : { owner: request.owner, name: request.name };
  const { data, error } = await client.functions.invoke<unknown>('read-repo-readme', { body });

  if (error) {
    throw error;
  }
  if (!isRepoReadmeOutcome(data)) {
    throw new Error('read-repo-readme returned an invalid response');
  }
  return data;
}

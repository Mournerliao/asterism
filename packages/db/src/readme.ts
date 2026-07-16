import type { SupabaseClient } from './client';

export type RepoReadmeOutcome =
  | { status: 'success'; html: string; etag: string | null }
  | { status: 'not_found' }
  | { status: 'not_in_library' }
  | { status: 'rate_limited' }
  | { status: 'reconnect_required' }
  | { status: 'retryable_error' };

export type RepoReadmeSuccess = Extract<RepoReadmeOutcome, { status: 'success' }>;

type RepoReadmeTransportOutcome =
  | RepoReadmeOutcome
  | { status: 'not_modified'; etag: string | null };

export interface RepoReadmeRequest {
  owner: string;
  name: string;
  providerToken?: string;
  etag?: string;
}

function isRepoReadmeTransportOutcome(value: unknown): value is RepoReadmeTransportOutcome {
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
  if (outcome.status === 'not_modified') {
    return typeof outcome.etag === 'string' || outcome.etag === null;
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
  cached?: RepoReadmeSuccess,
): Promise<RepoReadmeOutcome> {
  const body = {
    owner: request.owner,
    name: request.name,
    ...(request.providerToken ? { providerToken: request.providerToken } : {}),
    ...(request.etag ? { etag: request.etag } : {}),
  };
  const { data, error } = await client.functions.invoke<unknown>('read-repo-readme', { body });

  if (error) {
    throw error;
  }
  if (!isRepoReadmeTransportOutcome(data)) {
    throw new Error('read-repo-readme returned an invalid response');
  }
  if (data.status === 'not_modified') {
    if (!cached || cached.etag !== data.etag) {
      throw new Error('read-repo-readme returned not modified without matching cached README');
    }
    return cached;
  }
  return data;
}

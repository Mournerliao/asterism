import type { RepoSort, RepoStatus } from '@asterism/core';
import type { RepoViewMode } from '../stores/browse-view';

export type BrowseSourceSnapshot = {
  query: string;
  language: string | null;
  topic: string | null;
  tagIds: string[];
  minStars: number;
  pushedWithinDays: number | null;
  status: RepoStatus;
  sort: RepoSort;
  view: RepoViewMode;
  scrollTop: number;
};

export type ReadmeSource =
  | { kind: 'browse'; snapshot: BrowseSourceSnapshot }
  | { kind: 'collection'; id: string; name?: string; scrollTop: number };

export type ReadmeRouteState = {
  readme?: {
    repoId: string;
    owner: string;
    name: string;
    source: ReadmeSource;
  };
};

export type ReadmeReturn =
  | { to: '/'; source: 'browse' }
  | { to: string; source: 'collection'; collectionName?: string };

export type ReadmeReturnPlan = ReadmeReturn & {
  restoreBrowse: BrowseSourceSnapshot | null;
  reopenRepoId: string | null;
  scrollTop: number | null;
};

export type CreateReadmeDestinationOptions = {
  collectionName?: string;
  browseSnapshot?: BrowseSourceSnapshot;
  scrollTop?: number;
};

export type PlanReadmeReturnInput = {
  state: ReadmeRouteState | null | undefined;
  owner: string;
  name: string;
  repoVisible: boolean;
  collectionExists: boolean;
};

const collectionPath = /^\/collections\/([A-Za-z0-9_-]+)\/?$/;

const browseFallbackPlan: ReadmeReturnPlan = {
  to: '/',
  source: 'browse',
  restoreBrowse: null,
  reopenRepoId: null,
  scrollTop: null,
};

export function createBrowseSourceSnapshot(
  filter: {
    query: string;
    language: string | null;
    topic: string | null;
    tagIds: readonly string[];
    minStars: number;
    pushedWithinDays: number | null;
    status: RepoStatus;
    sort: RepoSort;
  },
  view: RepoViewMode,
  scrollTop: number,
): BrowseSourceSnapshot {
  return {
    query: filter.query,
    language: filter.language,
    topic: filter.topic,
    tagIds: [...filter.tagIds],
    minStars: filter.minStars,
    pushedWithinDays: filter.pushedWithinDays,
    status: filter.status,
    sort: filter.sort,
    view,
    scrollTop,
  };
}

export function createReadmeDestination(
  owner: string,
  name: string,
  repoId: string,
  pathname: string,
  collectionNameOrOptions?: string | CreateReadmeDestinationOptions,
) {
  const options =
    typeof collectionNameOrOptions === 'string'
      ? { collectionName: collectionNameOrOptions }
      : (collectionNameOrOptions ?? {});
  const collection = pathname.match(collectionPath);
  const source: ReadmeSource = collection
    ? {
        kind: 'collection',
        id: collection[1] as string,
        name: options.collectionName,
        scrollTop: options.scrollTop ?? 0,
      }
    : {
        kind: 'browse',
        snapshot:
          options.browseSnapshot ??
          createBrowseSourceSnapshot(
            {
              query: '',
              language: null,
              topic: null,
              tagIds: [],
              minStars: 0,
              pushedWithinDays: null,
              status: 'all',
              sort: 'starred',
            },
            'grid',
            options.scrollTop ?? 0,
          ),
      };

  return {
    to: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`,
    state: { readme: { repoId, owner, name, source } } satisfies ReadmeRouteState,
  };
}

function sameRepository(
  context: NonNullable<ReadmeRouteState['readme']>,
  owner: string,
  name: string,
) {
  return (
    context.owner.toLowerCase() === owner.toLowerCase() &&
    context.name.toLowerCase() === name.toLowerCase()
  );
}

export function resolveReadmeReturn(
  state: ReadmeRouteState | null | undefined,
  owner: string,
  name: string,
): ReadmeReturn {
  const plan = planReadmeReturn({
    state,
    owner,
    name,
    repoVisible: true,
    collectionExists: true,
  });
  if (plan.source === 'collection') {
    return {
      to: plan.to,
      source: 'collection',
      collectionName: plan.collectionName,
    };
  }
  return { to: '/', source: 'browse' };
}

export function planReadmeReturn({
  state,
  owner,
  name,
  repoVisible,
  collectionExists,
}: PlanReadmeReturnInput): ReadmeReturnPlan {
  const context = state?.readme;
  if (!context || !sameRepository(context, owner, name)) {
    return browseFallbackPlan;
  }

  if (context.source.kind === 'collection') {
    if (!/^[A-Za-z0-9_-]+$/.test(context.source.id) || !collectionExists) {
      return browseFallbackPlan;
    }
    return {
      to: `/collections/${context.source.id}`,
      source: 'collection',
      collectionName: context.source.name,
      restoreBrowse: null,
      reopenRepoId: repoVisible ? context.repoId : null,
      scrollTop: repoVisible ? context.source.scrollTop : null,
    };
  }

  return {
    to: '/',
    source: 'browse',
    restoreBrowse: context.source.snapshot,
    reopenRepoId: repoVisible ? context.repoId : null,
    scrollTop: repoVisible ? context.source.snapshot.scrollTop : null,
  };
}

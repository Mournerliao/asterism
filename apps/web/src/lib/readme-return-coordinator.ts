import { useBrowseFilters } from '../stores/browse-filters';
import { setBrowseViewPersisted } from '../stores/browse-view';
import type { BrowseSourceSnapshot, ReadmeReturnPlan, ReadmeRouteState } from './readme-navigation';
import { planReadmeReturn } from './readme-navigation';

export type PendingReadmeReturn = ReadmeReturnPlan & {
  sourceKey: string;
};

let remembered: NonNullable<ReadmeRouteState['readme']> | null = null;
let pending: PendingReadmeReturn | null = null;

export function rememberReadmeEntry(entry: ReadmeRouteState['readme'] | null | undefined): void {
  remembered = entry ?? null;
}

export function peekRememberedReadmeEntry() {
  return remembered;
}

export function clearReadmeReturnState(): void {
  remembered = null;
  pending = null;
}

export function applyBrowseSnapshot(snapshot: BrowseSourceSnapshot): void {
  useBrowseFilters.setState({
    query: snapshot.query,
    language: snapshot.language,
    topic: snapshot.topic,
    tagIds: [...snapshot.tagIds],
    minStars: snapshot.minStars,
    pushedWithinDays: snapshot.pushedWithinDays,
    status: snapshot.status,
    sort: snapshot.sort,
  });
  setBrowseViewPersisted(snapshot.view);
}

function toPending(plan: ReadmeReturnPlan): PendingReadmeReturn {
  const sourceKey =
    plan.source === 'collection' && plan.to.startsWith('/collections/')
      ? `collection:${plan.to.slice('/collections/'.length)}`
      : 'browse';
  return { ...plan, sourceKey };
}

/** Arm a pending restore/reopen for the matching source page to consume. */
export function armReadmeReturn(plan: ReadmeReturnPlan): PendingReadmeReturn {
  if (plan.restoreBrowse) {
    applyBrowseSnapshot(plan.restoreBrowse);
  }
  pending = toPending(plan);
  return pending;
}

/**
 * Plan and arm return from a remembered or provided README entry.
 * Visibility is decided optimistically here; source pages re-check before reopen/scroll.
 */
export function prepareReadmeReturn(input: {
  state?: ReadmeRouteState | null;
  owner: string;
  name: string;
  collectionExists?: boolean;
}): PendingReadmeReturn {
  const state = input.state ?? (remembered ? { readme: remembered } : undefined);
  const plan = planReadmeReturn({
    state,
    owner: input.owner,
    name: input.name,
    repoVisible: true,
    collectionExists: input.collectionExists ?? true,
  });
  remembered = null;
  return armReadmeReturn(plan);
}

/**
 * Called when leaving the README workspace. Arms restore/reopen only when the
 * next path matches the planned source; otherwise clears remembered context.
 */
export function finalizeReadmeDeparture(input: {
  nextPathname: string;
  owner: string;
  name: string;
  collectionExists?: boolean;
}): PendingReadmeReturn | null {
  if (!remembered) {
    return null;
  }
  const plan = planReadmeReturn({
    state: { readme: remembered },
    owner: input.owner,
    name: input.name,
    repoVisible: true,
    collectionExists: input.collectionExists ?? true,
  });
  remembered = null;
  const matchesDestination =
    plan.to === input.nextPathname || (plan.to === '/' && input.nextPathname === '/');
  if (!matchesDestination) {
    pending = null;
    return null;
  }
  return armReadmeReturn(plan);
}

/** Source pages consume a pending plan once for their source key. */
export function consumePendingReadmeReturn(sourceKey: string): PendingReadmeReturn | null {
  if (!pending || pending.sourceKey !== sourceKey) {
    return null;
  }
  const current = pending;
  pending = null;
  return current;
}

/** Drop reopen/scroll when the restored source no longer contains the repository. */
export function resolveReturnVisibility(
  pendingReturn: PendingReadmeReturn,
  repoVisible: boolean,
): Pick<PendingReadmeReturn, 'reopenRepoId' | 'scrollTop'> {
  if (repoVisible) {
    return {
      reopenRepoId: pendingReturn.reopenRepoId,
      scrollTop: pendingReturn.scrollTop,
    };
  }
  return { reopenRepoId: null, scrollTop: null };
}

export function peekPendingReadmeReturn(): PendingReadmeReturn | null {
  return pending;
}

import { create } from 'zustand';
import { useBrowseFilters } from '../stores/browse-filters';
import { setBrowseViewPersisted } from '../stores/browse-view';
import type { BrowseSourceSnapshot, ReadmeReturnPlan, ReadmeRouteState } from './readme-navigation';
import { planReadmeReturn } from './readme-navigation';

export type PendingReadmeReturn = ReadmeReturnPlan & {
  sourceKey: string;
};

type ReadmeReturnState = {
  remembered: NonNullable<ReadmeRouteState['readme']> | null;
  pending: PendingReadmeReturn | null;
  remember: (entry: ReadmeRouteState['readme'] | null | undefined) => void;
  clear: () => void;
  arm: (plan: ReadmeReturnPlan) => PendingReadmeReturn;
  consume: (sourceKey: string) => PendingReadmeReturn | null;
};

function toPending(plan: ReadmeReturnPlan): PendingReadmeReturn {
  const sourceKey =
    plan.source === 'collection' && plan.to.startsWith('/collections/')
      ? `collection:${plan.to.slice('/collections/'.length)}`
      : 'browse';
  return { ...plan, sourceKey };
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

/** Reactive pending return so late browser-Back arming still wakes source pages. */
export const useReadmeReturnStore = create<ReadmeReturnState>((set, get) => ({
  remembered: null,
  pending: null,
  remember: (entry) => set({ remembered: entry ?? null }),
  clear: () => set({ remembered: null, pending: null }),
  arm: (plan) => {
    if (plan.restoreBrowse) {
      applyBrowseSnapshot(plan.restoreBrowse);
    }
    const pending = toPending(plan);
    set({ pending });
    return pending;
  },
  consume: (sourceKey) => {
    const pending = get().pending;
    if (!pending || pending.sourceKey !== sourceKey) {
      return null;
    }
    set({ pending: null });
    return pending;
  },
}));

export function rememberReadmeEntry(entry: ReadmeRouteState['readme'] | null | undefined): void {
  useReadmeReturnStore.getState().remember(entry);
}

export function peekRememberedReadmeEntry() {
  return useReadmeReturnStore.getState().remembered;
}

export function clearReadmeReturnState(): void {
  useReadmeReturnStore.getState().clear();
}

/** Arm a pending restore/reopen for the matching source page to consume. */
export function armReadmeReturn(plan: ReadmeReturnPlan): PendingReadmeReturn {
  return useReadmeReturnStore.getState().arm(plan);
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
  const remembered = useReadmeReturnStore.getState().remembered;
  const state = input.state ?? (remembered ? { readme: remembered } : undefined);
  const plan = planReadmeReturn({
    state,
    owner: input.owner,
    name: input.name,
    repoVisible: true,
    collectionExists: input.collectionExists ?? true,
  });
  useReadmeReturnStore.setState({ remembered: null });
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
  const remembered = useReadmeReturnStore.getState().remembered;
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
  useReadmeReturnStore.setState({ remembered: null });
  const matchesDestination =
    plan.to === input.nextPathname || (plan.to === '/' && input.nextPathname === '/');
  if (!matchesDestination) {
    useReadmeReturnStore.setState({ pending: null });
    return null;
  }
  return armReadmeReturn(plan);
}

/** Source pages consume a pending plan once for their source key. */
export function consumePendingReadmeReturn(sourceKey: string): PendingReadmeReturn | null {
  return useReadmeReturnStore.getState().consume(sourceKey);
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
  return useReadmeReturnStore.getState().pending;
}

export interface CollectionDialTarget {
  id: string;
  name: string;
  updatedAt: string;
}

export interface CollectionDialPickup {
  readonly repoIds: readonly string[];
  readonly repoLabel: string;
  readonly targets: readonly CollectionDialTarget[];
}

export type CollectionDialState =
  | { phase: 'idle' }
  | {
      phase: 'active';
      pickup: CollectionDialPickup;
      activeIndex: number;
      status: 'ready' | 'submitting' | 'retryable_failure' | 'terminal_failure' | 'success';
      operationId?: string;
      message?: string;
    };

export type CollectionDialEvent =
  | { type: 'pickup'; pickup: CollectionDialPickup }
  | { type: 'select'; targetId: string }
  | { type: 'step'; direction: -1 | 1 }
  | { type: 'submit' | 'retry' }
  | { type: 'success'; operationId: string }
  | { type: 'failure'; retryable: boolean; operationId?: string; message?: string }
  | { type: 'cancel' };

interface RankCollectionDialTargetsInput {
  collections: readonly CollectionDialTarget[];
  collectionRepos: readonly { collectionId: string; repoId: string }[];
  repoIds: readonly string[];
  sessionMru: readonly string[];
}

function normalizedName(name: string): string {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function rankCollectionDialTargets({
  collections,
  collectionRepos,
  repoIds,
  sessionMru,
}: RankCollectionDialTargetsInput): CollectionDialTarget[] {
  const repoScope = new Set(repoIds);
  const membersByCollection = new Map<string, Set<string>>();
  for (const link of collectionRepos) {
    if (!repoScope.has(link.repoId)) continue;
    const members = membersByCollection.get(link.collectionId) ?? new Set<string>();
    members.add(link.repoId);
    membersByCollection.set(link.collectionId, members);
  }
  const mruRank = new Map(sessionMru.map((id, index) => [id, index]));

  return collections
    .filter((collection) => membersByCollection.get(collection.id)?.size !== repoScope.size)
    .toSorted((left, right) => {
      const leftMru = mruRank.get(left.id);
      const rightMru = mruRank.get(right.id);
      if (leftMru !== undefined || rightMru !== undefined) {
        if (leftMru === undefined) return 1;
        if (rightMru === undefined) return -1;
        if (leftMru !== rightMru) return leftMru - rightMru;
      }
      const updatedDifference = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      if (Number.isFinite(updatedDifference) && updatedDifference !== 0) return updatedDifference;
      const nameDifference = compareText(normalizedName(left.name), normalizedName(right.name));
      return nameDifference || compareText(left.id, right.id);
    })
    .slice(0, 7)
    .map((collection) => ({ ...collection }));
}

export function createCollectionDialPickup(input: {
  repoIds: readonly string[];
  repoLabel: string;
  targets: readonly CollectionDialTarget[];
}): CollectionDialPickup {
  return {
    repoIds: [...input.repoIds],
    repoLabel: input.repoLabel,
    targets: input.targets.map((target) => ({ ...target })),
  };
}

export function collectionDialReducer(
  state: CollectionDialState,
  event: CollectionDialEvent,
): CollectionDialState {
  if (event.type === 'pickup') {
    if (event.pickup.targets.length === 0) return { phase: 'idle' };
    return { phase: 'active', pickup: event.pickup, activeIndex: 0, status: 'ready' };
  }
  if (event.type === 'cancel') return { phase: 'idle' };
  if (state.phase === 'idle') return state;

  if (event.type === 'select' && state.status !== 'submitting' && state.status !== 'success') {
    const activeIndex = state.pickup.targets.findIndex((target) => target.id === event.targetId);
    return activeIndex < 0
      ? state
      : { ...state, activeIndex, status: 'ready', operationId: undefined, message: undefined };
  }
  if (event.type === 'step' && state.status !== 'submitting' && state.status !== 'success') {
    const activeIndex = Math.max(
      0,
      Math.min(state.pickup.targets.length - 1, state.activeIndex + event.direction),
    );
    return { ...state, activeIndex, status: 'ready', operationId: undefined, message: undefined };
  }
  if (
    (event.type === 'submit' || event.type === 'retry') &&
    state.status !== 'submitting' &&
    state.status !== 'success'
  ) {
    return { ...state, status: 'submitting', message: undefined };
  }
  if (event.type === 'success') {
    return { ...state, status: 'success', operationId: event.operationId, message: undefined };
  }
  if (event.type === 'failure') {
    return {
      ...state,
      status: event.retryable ? 'retryable_failure' : 'terminal_failure',
      operationId: event.operationId,
      message: event.message,
    };
  }
  return state;
}

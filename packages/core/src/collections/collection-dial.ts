export interface CollectionDialTarget {
  id: string;
  name: string;
  updatedAt: string;
  readonly missingRepoIds?: readonly string[];
  readonly alreadyMemberCount?: number;
  readonly missingCount?: number;
}

export interface CollectionDialCatalogEntry extends CollectionDialTarget {
  description: string | null;
  repoCount: number;
}

export interface CollectionDialSnapshotEntry extends CollectionDialCatalogEntry {
  missingRepoIds: readonly string[];
  alreadyMemberCount: number;
  missingCount: number;
  fallbackRank: number;
  semanticScore?: number;
  semanticVotes?: number;
}

export interface CollectionDialRepositoryEmbedding {
  repoId: string;
  vector: readonly number[];
}

export interface CollectionDialSnapshot {
  readonly scopeId: string;
  readonly createdAt: string;
  readonly repoIds: readonly string[];
  readonly entries: readonly CollectionDialSnapshotEntry[];
  readonly quickTargetIds: readonly string[];
  readonly defaultActiveId: string | null;
  readonly semanticOrderingApplied: boolean;
}

export interface CollectionDialPickup {
  readonly scopeId: string;
  readonly createdAt: string;
  readonly repoIds: readonly string[];
  readonly repoLabel: string;
  readonly targets: readonly CollectionDialTarget[];
  readonly catalog: readonly CollectionDialSnapshotEntry[];
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
  | { type: 'promote'; target: CollectionDialTarget }
  | { type: 'step'; direction: -1 | 1 }
  | { type: 'submit' | 'retry' }
  | { type: 'success'; scopeId?: string; operationId: string; message?: string }
  | {
      type: 'failure';
      scopeId?: string;
      retryable: boolean;
      operationId?: string;
      message?: string;
    }
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

export function searchCollectionDialCatalog(
  entries: readonly CollectionDialSnapshotEntry[],
  query: string,
): CollectionDialSnapshotEntry[] {
  const normalizedQuery = normalizedName(query);
  if (!normalizedQuery) return [...entries];
  return entries.filter((entry) =>
    normalizedName(`${entry.name} ${entry.description ?? ''}`).includes(normalizedQuery),
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareFallback(
  left: CollectionDialCatalogEntry,
  right: CollectionDialCatalogEntry,
  mruRank: ReadonlyMap<string, number>,
): number {
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
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number | null {
  if (left.length === 0 || left.length !== right.length) return null;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    if (
      leftValue === undefined ||
      rightValue === undefined ||
      !Number.isFinite(leftValue) ||
      !Number.isFinite(rightValue)
    ) {
      return null;
    }
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return null;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

function meanVector(vectors: readonly (readonly number[])[]): number[] | null {
  const dimensions = vectors[0]?.length ?? 0;
  if (vectors.length < 2 || dimensions === 0) return null;
  const mean = Array.from({ length: dimensions }, () => 0);
  for (const vector of vectors) {
    if (vector.length !== dimensions) return null;
    for (let index = 0; index < dimensions; index += 1) {
      const value = vector[index];
      if (value === undefined || !Number.isFinite(value)) return null;
      mean[index] = (mean[index] ?? 0) + value;
    }
  }
  return mean.map((value) => value / vectors.length);
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
      return compareFallback(
        { ...left, description: null, repoCount: 0 },
        { ...right, description: null, repoCount: 0 },
        mruRank,
      );
    })
    .slice(0, 7)
    .map((collection) => ({ ...collection }));
}

export function createCollectionDialSnapshot(input: {
  scopeId: string;
  createdAt: string;
  repoIds: readonly string[];
  collections: readonly CollectionDialCatalogEntry[];
  collectionRepos: readonly { collectionId: string; repoId: string }[];
  sessionMru: readonly string[];
  repositoryEmbeddings?: readonly CollectionDialRepositoryEmbedding[];
}): CollectionDialSnapshot {
  const repoIds = [...new Set(input.repoIds)];
  const scope = new Set(repoIds);
  const scopeMembersByCollection = new Map<string, Set<string>>();
  const allMembersByCollection = new Map<string, Set<string>>();
  for (const link of input.collectionRepos) {
    const allMembers = allMembersByCollection.get(link.collectionId) ?? new Set<string>();
    allMembers.add(link.repoId);
    allMembersByCollection.set(link.collectionId, allMembers);
    if (!scope.has(link.repoId)) continue;
    const scopeMembers = scopeMembersByCollection.get(link.collectionId) ?? new Set<string>();
    scopeMembers.add(link.repoId);
    scopeMembersByCollection.set(link.collectionId, scopeMembers);
  }
  const mruRank = new Map(input.sessionMru.map((id, index) => [id, index]));
  const fallback = input.collections
    .filter(
      (collection) => (scopeMembersByCollection.get(collection.id)?.size ?? 0) < repoIds.length,
    )
    .toSorted((left, right) => compareFallback(left, right, mruRank));
  const fallbackEntries = fallback.map<CollectionDialSnapshotEntry>((collection, fallbackRank) => {
    const alreadyMemberCount = scopeMembersByCollection.get(collection.id)?.size ?? 0;
    const existingMembers = scopeMembersByCollection.get(collection.id) ?? new Set<string>();
    return {
      ...collection,
      missingRepoIds: Object.freeze(repoIds.filter((repoId) => !existingMembers.has(repoId))),
      alreadyMemberCount,
      missingCount: repoIds.length - alreadyMemberCount,
      fallbackRank,
    };
  });

  let semanticOrderingApplied = false;
  let semanticEntries: CollectionDialSnapshotEntry[] = [];
  if (repoIds.length <= 50 && input.repositoryEmbeddings && fallbackEntries.length > 0) {
    const vectorByRepo = new Map(input.repositoryEmbeddings.map((row) => [row.repoId, row.vector]));
    const centroidByCollection = new Map<string, readonly number[]>();
    for (const entry of fallbackEntries) {
      const memberVectors = [...(allMembersByCollection.get(entry.id) ?? [])]
        .map((repoId) => vectorByRepo.get(repoId))
        .filter((vector): vector is readonly number[] => Boolean(vector));
      const centroid = meanVector(memberVectors);
      if (centroid) centroidByCollection.set(entry.id, centroid);
    }

    if (repoIds.length === 1) {
      const source = vectorByRepo.get(repoIds[0] ?? '');
      if (source) {
        semanticEntries = fallbackEntries
          .flatMap((entry) => {
            const centroid = centroidByCollection.get(entry.id);
            const semanticScore = centroid ? cosineSimilarity(source, centroid) : null;
            return semanticScore === null ? [] : [{ ...entry, semanticScore }];
          })
          .toSorted(
            (left, right) =>
              (right.semanticScore ?? Number.NEGATIVE_INFINITY) -
                (left.semanticScore ?? Number.NEGATIVE_INFINITY) ||
              left.fallbackRank - right.fallbackRank,
          );
        semanticOrderingApplied = semanticEntries.length > 0;
      }
    } else if (repoIds.length >= 2) {
      const votes = new Map<string, number>();
      let validVoteCount = 0;
      for (const repoId of repoIds) {
        const source = vectorByRepo.get(repoId);
        if (!source) continue;
        let top: { id: string; score: number; fallbackRank: number } | null = null;
        for (const entry of fallbackEntries) {
          const centroid = centroidByCollection.get(entry.id);
          const score = centroid ? cosineSimilarity(source, centroid) : null;
          if (score === null) continue;
          if (
            !top ||
            score > top.score ||
            (score === top.score && entry.fallbackRank < top.fallbackRank)
          ) {
            top = { id: entry.id, score, fallbackRank: entry.fallbackRank };
          }
        }
        if (top) {
          validVoteCount += 1;
          votes.set(top.id, (votes.get(top.id) ?? 0) + 1);
        }
      }
      const consensus = fallbackEntries.find((entry) => {
        const count = votes.get(entry.id) ?? 0;
        return count >= 2 && count > validVoteCount / 2;
      });
      if (consensus) {
        semanticEntries = [{ ...consensus, semanticVotes: votes.get(consensus.id) }];
        semanticOrderingApplied = true;
      }
    }
  }

  const semanticIds = new Set(semanticEntries.map((entry) => entry.id));
  const entries = [
    ...semanticEntries,
    ...fallbackEntries.filter((entry) => !semanticIds.has(entry.id)),
  ].map((entry) => Object.freeze({ ...entry }));
  const quickTargetIds = entries.slice(0, 7).map((entry) => entry.id);
  return Object.freeze({
    scopeId: input.scopeId,
    createdAt: input.createdAt,
    repoIds: Object.freeze(repoIds),
    entries: Object.freeze(entries),
    quickTargetIds: Object.freeze(quickTargetIds),
    defaultActiveId: quickTargetIds[0] ?? null,
    semanticOrderingApplied,
  });
}

export function createCollectionDialPickup(input: {
  scopeId?: string;
  createdAt?: string;
  repoIds: readonly string[];
  repoLabel: string;
  targets: readonly CollectionDialTarget[];
  catalog?: readonly CollectionDialSnapshotEntry[];
}): CollectionDialPickup {
  return {
    scopeId: input.scopeId ?? `scope:${input.repoIds.join(',')}`,
    createdAt: input.createdAt ?? '',
    repoIds: [...input.repoIds],
    repoLabel: input.repoLabel,
    targets: input.targets.map((target) => ({
      ...target,
      ...(target.missingRepoIds ? { missingRepoIds: [...target.missingRepoIds] } : {}),
    })),
    catalog: (input.catalog ?? []).map((entry) => ({
      ...entry,
      missingRepoIds: [...entry.missingRepoIds],
    })),
  };
}

export function collectionDialReducer(
  state: CollectionDialState,
  event: CollectionDialEvent,
): CollectionDialState {
  if (event.type === 'pickup') {
    if (
      state.phase === 'active' &&
      state.pickup.repoIds.length > 1 &&
      state.status !== 'success' &&
      event.pickup.repoIds.length > 1
    ) {
      return state;
    }
    return { phase: 'active', pickup: event.pickup, activeIndex: 0, status: 'ready' };
  }
  if (event.type === 'cancel') {
    return state.phase === 'active' && state.status === 'submitting' ? state : { phase: 'idle' };
  }
  if (state.phase === 'idle') return state;

  if (
    (event.type === 'success' || event.type === 'failure') &&
    event.scopeId !== undefined &&
    event.scopeId !== state.pickup.scopeId
  ) {
    return state;
  }

  if (event.type === 'select' && state.status !== 'submitting' && state.status !== 'success') {
    const activeIndex = state.pickup.targets.findIndex((target) => target.id === event.targetId);
    return activeIndex < 0
      ? state
      : { ...state, activeIndex, status: 'ready', operationId: undefined, message: undefined };
  }
  if (event.type === 'promote' && state.status !== 'submitting' && state.status !== 'success') {
    const targets = [
      event.target,
      ...state.pickup.targets.filter((target) => target.id !== event.target.id),
    ].slice(0, 7);
    return {
      ...state,
      pickup: { ...state.pickup, targets },
      activeIndex: 0,
      status: 'ready',
      operationId: undefined,
      message: undefined,
    };
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
    return { ...state, status: 'success', operationId: event.operationId, message: event.message };
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

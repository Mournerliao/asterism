/**
 * Organization Plan page interpretation and deterministic merging (#25). Pure
 * and runtime-agnostic: it interprets already-parsed page output leniently
 * (entry-level problems become uncertain no-ops instead of page failures) and
 * merges accepted page results into an immutable Plan document whose action
 * identities are independent of page order, retry counts, and worker restarts.
 * Keep this file self-contained (no cross-file imports) so Deno can import it
 * directly by path.
 */

export type OrganizationPlanRelationType = 'tag' | 'collection';
export type OrganizationPlanActionKind = 'add' | 'remove';

export interface OrganizationPageValidationInput {
  repositoryIds: readonly string[];
  tagIds: readonly string[];
  collectionIds: readonly string[];
}

export type OrganizationPageUncertainty =
  | { kind: 'unknown_repository'; repoId: string }
  | { kind: 'unknown_target'; relationType: OrganizationPlanRelationType; targetId: string }
  | {
      kind: 'conflicting_actions';
      repoId: string;
      relationType: OrganizationPlanRelationType;
      targetId: string;
    }
  | { kind: 'invalid_classification_name'; name: string };

export interface OrganizationPageRelationChange {
  repoId: string;
  relationType: OrganizationPlanRelationType;
  action: OrganizationPlanActionKind;
  targetId: string;
}

export interface OrganizationPageNewClassification {
  relationType: OrganizationPlanRelationType;
  name: string;
  repoIds: string[];
}

export interface OrganizationPageResult {
  version: 1;
  relationChanges: OrganizationPageRelationChange[];
  newClassifications: OrganizationPageNewClassification[];
  uncertainties: OrganizationPageUncertainty[];
}

export type OrganizationPageOutcome =
  | { ok: true; result: OrganizationPageResult }
  | { ok: false; reason: 'schema_mismatch' };

export type OrganizationPlanTarget =
  | { kind: 'existing'; id: string; name: string | null }
  | { kind: 'new'; name: string };

export interface OrganizationPlanAction {
  id: string;
  repoId: string;
  relationType: OrganizationPlanRelationType;
  action: OrganizationPlanActionKind;
  target: OrganizationPlanTarget;
  risk: 'low' | 'medium' | 'high';
  evidencePages: number[];
}

export interface OrganizationPlanGroup {
  key: string;
  relationType: OrganizationPlanRelationType;
  target: OrganizationPlanTarget;
  actions: OrganizationPlanAction[];
}

export interface OrganizationPlanConflict {
  kind: 'near_duplicate_names';
  relationType: OrganizationPlanRelationType;
  names: string[];
  repoIds: string[];
  evidencePages: number[];
}

export interface OrganizationPlanUncertainty {
  detail: OrganizationPageUncertainty;
  pageIndexes: number[];
}

export interface OrganizationPlanDocument {
  version: 1;
  taskId: string;
  revision: number;
  groups: OrganizationPlanGroup[];
  conflicts: OrganizationPlanConflict[];
  uncertainties: OrganizationPlanUncertainty[];
  counts: {
    actions: number;
    newClassifications: number;
    conflicts: number;
    uncertainties: number;
  };
  preconditionFingerprint: string;
  fingerprint: string;
}

export interface OrganizationPlanMergeInput {
  taskId: string;
  planRevision: number;
  pages: ReadonlyArray<{ pageIndex: number; result: OrganizationPageResult }>;
  existingTags: ReadonlyArray<{ id: string; name: string }>;
  existingCollections: ReadonlyArray<{ id: string; name: string }>;
  preconditions: {
    snapshotFingerprint: string;
    manifestFingerprint: string;
    candidateFingerprints: ReadonlyArray<{ repositoryId: string; contentFingerprint: string }>;
  };
}

const SEP = '\u0000';

/** FNV-1a over stable JSON; same scheme as the task-domain fingerprints. */
export function stableOrganizationHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function normalizeClassificationName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

/** Locale-independent codepoint ordering so merged documents hash identically everywhere. */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uncertaintyKey(detail: OrganizationPageUncertainty): string {
  switch (detail.kind) {
    case 'unknown_repository':
      return `${detail.kind}${SEP}${detail.repoId}`;
    case 'unknown_target':
      return `${detail.kind}${SEP}${detail.relationType}${SEP}${detail.targetId}`;
    case 'conflicting_actions':
      return `${detail.kind}${SEP}${detail.relationType}${SEP}${detail.targetId}${SEP}${detail.repoId}`;
    case 'invalid_classification_name':
      return `${detail.kind}${SEP}${detail.name}`;
  }
}

/**
 * Lenient interpretation of one page's parsed output. Structural violations of
 * the agreed schema fail the whole page (retryable); semantically unknown ids
 * and contradictory instructions degrade to uncertain no-ops so one bad entry
 * never poisons an otherwise usable page.
 */
export function interpretOrganizationPageOutput(
  value: unknown,
  input: OrganizationPageValidationInput,
): OrganizationPageOutcome {
  const root = asRecord(value);
  if (!root || !hasExactKeys(root, ['newClassifications', 'relationChanges'])) {
    return { ok: false, reason: 'schema_mismatch' };
  }
  const changes = asArray(root.relationChanges);
  const created = asArray(root.newClassifications);
  if (!changes || !created) return { ok: false, reason: 'schema_mismatch' };

  const repoIds = new Set(input.repositoryIds);
  const targets = {
    tag: new Set(input.tagIds),
    collection: new Set(input.collectionIds),
  };
  const uncertainties: OrganizationPageUncertainty[] = [];

  const votes = new Map<
    string,
    {
      repoId: string;
      relationType: OrganizationPlanRelationType;
      targetId: string;
      actions: Set<OrganizationPlanActionKind>;
    }
  >();
  for (const entry of changes) {
    const item = asRecord(entry);
    if (!item || !hasExactKeys(item, ['action', 'relationType', 'repoId', 'targetId'])) {
      return { ok: false, reason: 'schema_mismatch' };
    }
    const repoId = asString(item.repoId);
    const targetId = asString(item.targetId);
    const relationType = item.relationType;
    const action = item.action;
    if (
      repoId === null ||
      targetId === null ||
      (relationType !== 'tag' && relationType !== 'collection') ||
      (action !== 'add' && action !== 'remove')
    ) {
      return { ok: false, reason: 'schema_mismatch' };
    }
    if (!repoIds.has(repoId)) {
      uncertainties.push({ kind: 'unknown_repository', repoId });
      continue;
    }
    if (!targets[relationType].has(targetId)) {
      uncertainties.push({ kind: 'unknown_target', relationType, targetId });
      continue;
    }
    const key = `${repoId}${SEP}${relationType}${SEP}${targetId}`;
    const vote = votes.get(key) ?? { repoId, relationType, targetId, actions: new Set() };
    vote.actions.add(action);
    votes.set(key, vote);
  }

  const relationChanges: OrganizationPageRelationChange[] = [];
  for (const vote of votes.values()) {
    if (vote.actions.size > 1) {
      uncertainties.push({
        kind: 'conflicting_actions',
        repoId: vote.repoId,
        relationType: vote.relationType,
        targetId: vote.targetId,
      });
      continue;
    }
    const [action] = vote.actions;
    relationChanges.push({
      repoId: vote.repoId,
      relationType: vote.relationType,
      action: action as OrganizationPlanActionKind,
      targetId: vote.targetId,
    });
  }

  const groups = new Map<string, Set<string>>();
  for (const entry of created) {
    const item = asRecord(entry);
    if (!item || !hasExactKeys(item, ['name', 'relationType', 'repoIds'])) {
      return { ok: false, reason: 'schema_mismatch' };
    }
    const relationType = item.relationType;
    const nameValue = asString(item.name);
    const itemRepoIds = asArray(item.repoIds);
    if (
      (relationType !== 'tag' && relationType !== 'collection') ||
      nameValue === null ||
      !itemRepoIds ||
      !itemRepoIds.every((repoId): repoId is string => typeof repoId === 'string')
    ) {
      return { ok: false, reason: 'schema_mismatch' };
    }
    const name = normalizeClassificationName(nameValue);
    if (name.length === 0 || name.length > 100) {
      uncertainties.push({ kind: 'invalid_classification_name', name });
      continue;
    }
    const valid: string[] = [];
    for (const repoId of new Set(itemRepoIds)) {
      if (repoIds.has(repoId)) valid.push(repoId);
      else uncertainties.push({ kind: 'unknown_repository', repoId });
    }
    if (valid.length === 0) continue;
    const key = `${relationType}${SEP}${name}`;
    const members = groups.get(key) ?? new Set();
    for (const repoId of valid) members.add(repoId);
    groups.set(key, members);
  }

  const newClassifications: OrganizationPageNewClassification[] = [...groups.entries()].map(
    ([key, members]) => {
      const separator = key.indexOf(SEP);
      return {
        relationType: key.slice(0, separator) as OrganizationPlanRelationType,
        name: key.slice(separator + 1),
        repoIds: [...members].sort(compareStrings),
      };
    },
  );

  relationChanges.sort(
    (left, right) =>
      compareStrings(left.repoId, right.repoId) ||
      compareStrings(left.relationType, right.relationType) ||
      compareStrings(left.targetId, right.targetId),
  );
  newClassifications.sort(
    (left, right) =>
      compareStrings(left.relationType, right.relationType) ||
      compareStrings(left.name, right.name),
  );
  const dedupedUncertainties = [
    ...new Map(uncertainties.map((detail) => [uncertaintyKey(detail), detail])).values(),
  ].sort((left, right) => compareStrings(uncertaintyKey(left), uncertaintyKey(right)));

  return {
    ok: true,
    result: {
      version: 1,
      relationChanges,
      newClassifications,
      uncertainties: dedupedUncertainties,
    },
  };
}

interface RelationVote {
  relationType: OrganizationPlanRelationType;
  targetId: string;
  repoId: string;
  add: Set<number>;
  remove: Set<number>;
}

function sortedPages(pages: Iterable<number>): number[] {
  return [...new Set(pages)].sort((left, right) => left - right);
}

function actionIdentity(action: {
  action: OrganizationPlanActionKind;
  relationType: OrganizationPlanRelationType;
  repoId: string;
  target: OrganizationPlanTarget;
}): string {
  return stableOrganizationHash({
    action: action.action,
    relationType: action.relationType,
    repoId: action.repoId,
    target:
      action.target.kind === 'existing'
        ? { kind: 'existing', id: action.target.id }
        : { kind: 'new', name: action.target.name },
  });
}

/**
 * Deterministically merge accepted page results into a Plan document. Exactly
 * one result exists per page key, so sorting by page index makes the outcome
 * independent of completion order and retries. Duplicate relation actions
 * collapse; cross-page add/remove contradictions become uncertain no-ops; new
 * classifications merge on exact normalized names, resolve to existing stable
 * ids on exact matches, and degrade to review conflicts on near-duplicates.
 */
export function mergeOrganizationPlan(input: OrganizationPlanMergeInput): OrganizationPlanDocument {
  const pages = [...input.pages].sort((left, right) => left.pageIndex - right.pageIndex);
  const existing = { tag: input.existingTags, collection: input.existingCollections };
  const existingNames = {
    tag: new Map(input.existingTags.map((entry) => [entry.id, entry.name])),
    collection: new Map(input.existingCollections.map((entry) => [entry.id, entry.name])),
  };

  const relationVotes = new Map<string, RelationVote>();
  const voteFor = (
    relationType: OrganizationPlanRelationType,
    targetId: string,
    repoId: string,
    action: OrganizationPlanActionKind,
    pageIndexes: Iterable<number>,
  ) => {
    const key = `${relationType}${SEP}${targetId}${SEP}${repoId}`;
    const vote = relationVotes.get(key) ?? {
      relationType,
      targetId,
      repoId,
      add: new Set<number>(),
      remove: new Set<number>(),
    };
    for (const pageIndex of pageIndexes) vote[action].add(pageIndex);
    relationVotes.set(key, vote);
  };

  const newGroups = new Map<string, Map<string, Set<number>>>();
  const uncertaintyMap = new Map<
    string,
    { detail: OrganizationPageUncertainty; pages: Set<number> }
  >();
  const noteUncertainty = (detail: OrganizationPageUncertainty, pageIndexes: Iterable<number>) => {
    const key = uncertaintyKey(detail);
    const entry = uncertaintyMap.get(key) ?? { detail, pages: new Set<number>() };
    for (const pageIndex of pageIndexes) entry.pages.add(pageIndex);
    uncertaintyMap.set(key, entry);
  };

  for (const page of pages) {
    for (const change of page.result.relationChanges) {
      voteFor(change.relationType, change.targetId, change.repoId, change.action, [page.pageIndex]);
    }
    for (const group of page.result.newClassifications) {
      const key = `${group.relationType}${SEP}${normalizeClassificationName(group.name)}`;
      const members = newGroups.get(key) ?? new Map<string, Set<number>>();
      for (const repoId of group.repoIds) {
        const memberPages = members.get(repoId) ?? new Set<number>();
        memberPages.add(page.pageIndex);
        members.set(repoId, memberPages);
      }
      newGroups.set(key, members);
    }
    for (const detail of page.result.uncertainties) noteUncertainty(detail, [page.pageIndex]);
  }

  const conflicts: OrganizationPlanConflict[] = [];
  const remainingNew: Array<{
    relationType: OrganizationPlanRelationType;
    name: string;
    members: Map<string, Set<number>>;
  }> = [];
  for (const [key, members] of newGroups) {
    const separator = key.indexOf(SEP);
    const relationType = key.slice(0, separator) as OrganizationPlanRelationType;
    const name = key.slice(separator + 1);
    // Locale-independent case fold: merge identity must not depend on the
    // worker's host locale (e.g. Turkish i/İ), per the determinism contract.
    const fold = name.toLowerCase();
    const folded = existing[relationType].filter(
      (entry) => normalizeClassificationName(entry.name).toLowerCase() === fold,
    );
    const exact = folded
      .filter((entry) => normalizeClassificationName(entry.name) === name)
      .sort((left, right) => compareStrings(left.id, right.id));
    if (exact.length > 0) {
      const target = exact[0];
      if (target) {
        for (const [repoId, memberPages] of members) {
          voteFor(relationType, target.id, repoId, 'add', memberPages);
        }
      }
      continue;
    }
    if (folded.length > 0) {
      conflicts.push({
        kind: 'near_duplicate_names',
        relationType,
        names: [
          ...new Set([name, ...folded.map((entry) => normalizeClassificationName(entry.name))]),
        ].sort(compareStrings),
        repoIds: [...members.keys()].sort(compareStrings),
        evidencePages: sortedPages([...members.values()].flatMap((set) => [...set])),
      });
      continue;
    }
    remainingNew.push({ relationType, name, members });
  }

  const byFold = new Map<string, typeof remainingNew>();
  for (const group of remainingNew) {
    const key = `${group.relationType}${SEP}${group.name.toLowerCase()}`;
    byFold.set(key, [...(byFold.get(key) ?? []), group]);
  }
  const finalNewGroups: typeof remainingNew = [];
  for (const bucket of byFold.values()) {
    if (bucket.length === 1) {
      const only = bucket[0];
      if (only) finalNewGroups.push(only);
      continue;
    }
    const first = bucket[0];
    if (!first) continue;
    conflicts.push({
      kind: 'near_duplicate_names',
      relationType: first.relationType,
      names: bucket.map((group) => group.name).sort(compareStrings),
      repoIds: [...new Set(bucket.flatMap((group) => [...group.members.keys()]))].sort(
        compareStrings,
      ),
      evidencePages: sortedPages(
        bucket.flatMap((group) => [...group.members.values()].flatMap((set) => [...set])),
      ),
    });
  }

  const groupMap = new Map<
    string,
    {
      relationType: OrganizationPlanRelationType;
      target: OrganizationPlanTarget;
      actions: OrganizationPlanAction[];
    }
  >();
  const addAction = (
    relationType: OrganizationPlanRelationType,
    target: OrganizationPlanTarget,
    action: Omit<OrganizationPlanAction, 'id' | 'target'>,
  ) => {
    const groupKey =
      target.kind === 'existing'
        ? `existing${SEP}${relationType}${SEP}${target.id}`
        : `new${SEP}${relationType}${SEP}${target.name}`;
    const group = groupMap.get(groupKey) ?? { relationType, target, actions: [] };
    group.actions.push({ ...action, target, id: actionIdentity({ ...action, target }) });
    groupMap.set(groupKey, group);
  };

  for (const vote of relationVotes.values()) {
    if (vote.add.size > 0 && vote.remove.size > 0) {
      noteUncertainty(
        {
          kind: 'conflicting_actions',
          repoId: vote.repoId,
          relationType: vote.relationType,
          targetId: vote.targetId,
        },
        [...vote.add, ...vote.remove],
      );
      continue;
    }
    const action: OrganizationPlanActionKind = vote.add.size > 0 ? 'add' : 'remove';
    addAction(
      vote.relationType,
      {
        kind: 'existing',
        id: vote.targetId,
        name: existingNames[vote.relationType].get(vote.targetId) ?? null,
      },
      {
        repoId: vote.repoId,
        relationType: vote.relationType,
        action,
        risk: action === 'remove' ? 'high' : 'low',
        evidencePages: sortedPages(action === 'add' ? vote.add : vote.remove),
      },
    );
  }

  for (const group of finalNewGroups) {
    for (const [repoId, memberPages] of group.members) {
      addAction(
        group.relationType,
        { kind: 'new', name: group.name },
        {
          repoId,
          relationType: group.relationType,
          action: 'add',
          risk: 'medium',
          evidencePages: sortedPages(memberPages),
        },
      );
    }
  }

  const groups: OrganizationPlanGroup[] = [...groupMap.values()]
    .map((group) => ({
      key: stableOrganizationHash({
        relationType: group.relationType,
        target:
          group.target.kind === 'existing'
            ? { kind: 'existing', id: group.target.id }
            : { kind: 'new', name: group.target.name },
      }),
      relationType: group.relationType,
      target: group.target,
      actions: [...group.actions].sort(
        (left, right) =>
          compareStrings(left.repoId, right.repoId) || compareStrings(left.action, right.action),
      ),
    }))
    .sort((left, right) => {
      const leftName =
        left.target.kind === 'existing' ? (left.target.name ?? left.target.id) : left.target.name;
      const rightName =
        right.target.kind === 'existing'
          ? (right.target.name ?? right.target.id)
          : right.target.name;
      return (
        compareStrings(left.relationType, right.relationType) ||
        compareStrings(leftName, rightName) ||
        compareStrings(left.key, right.key)
      );
    });

  const sortedConflicts = [...conflicts].sort(
    (left, right) =>
      compareStrings(left.relationType, right.relationType) ||
      compareStrings(left.names.join(SEP), right.names.join(SEP)),
  );
  const uncertainties: OrganizationPlanUncertainty[] = [...uncertaintyMap.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([, entry]) => ({ detail: entry.detail, pageIndexes: sortedPages(entry.pages) }));

  const preconditionFingerprint = stableOrganizationHash({
    snapshotFingerprint: input.preconditions.snapshotFingerprint,
    manifestFingerprint: input.preconditions.manifestFingerprint,
    candidates: [...input.preconditions.candidateFingerprints]
      .sort((left, right) => compareStrings(left.repositoryId, right.repositoryId))
      .map((entry) => ({
        repositoryId: entry.repositoryId,
        contentFingerprint: entry.contentFingerprint,
      })),
  });

  const actionCount = groups.reduce((total, group) => total + group.actions.length, 0);
  const immutable = {
    version: 1 as const,
    taskId: input.taskId,
    revision: input.planRevision,
    groups,
    conflicts: sortedConflicts,
    uncertainties,
    counts: {
      actions: actionCount,
      newClassifications: groups.filter((group) => group.target.kind === 'new').length,
      conflicts: sortedConflicts.length,
      uncertainties: uncertainties.length,
    },
    preconditionFingerprint,
  };
  return { ...immutable, fingerprint: stableOrganizationHash(immutable) };
}

import {
  type OrganizationPlanAction,
  type OrganizationPlanDocument,
  type OrganizationPlanRelationType,
  type OrganizationPlanTarget,
  stableOrganizationHash,
} from './organization-plan';

export type OrganizationPlanRisk = 'existing_addition' | 'new_classification' | 'removal';

export type OrganizationPlanReviewValidity =
  | 'valid'
  | 'repository_unauthorized'
  | 'target_changed'
  | 'precondition_changed'
  | 'near_match';

export interface OrganizationPlanReviewRepository {
  id: string;
  fullName: string;
  authorized: boolean;
  tagIds: readonly string[];
  collectionIds: readonly string[];
}

export interface OrganizationPlanReviewDecision {
  planRevision: number;
  groupKey: string;
  risk: OrganizationPlanRisk;
  groupFingerprint: string;
  approved: boolean;
}

export interface OrganizationPlanReviewAction extends OrganizationPlanAction {
  repositoryName: string | null;
  excluded: boolean;
  eligible: boolean;
}

export interface OrganizationPlanReviewGroup {
  key: string;
  sourceGroupKey: string;
  risk: OrganizationPlanRisk;
  relationType: OrganizationPlanRelationType;
  target: OrganizationPlanTarget;
  normalizedName: string;
  representativeRepositoryIds: string[];
  equivalentTarget: { id: string; name: string } | null;
  nearMatches: Array<{ id: string; name: string }>;
  fingerprint: string;
  approved: boolean;
  validity: OrganizationPlanReviewValidity;
  actions: OrganizationPlanReviewAction[];
}

export interface OrganizationPlanReview {
  version: 1;
  taskId: string;
  planRevision: number;
  planFingerprint: string;
  groups: OrganizationPlanReviewGroup[];
  conflicts: OrganizationPlanDocument['conflicts'];
  uncertainties: OrganizationPlanDocument['uncertainties'];
  counts: {
    newClassifications: number;
    additions: number;
    removals: number;
    noOps: number;
  };
  confirmable: boolean;
  approvedGroupFingerprints: string[];
}

export interface OrganizationPlanReviewInput {
  plan: OrganizationPlanDocument;
  goal: string;
  repositories: readonly OrganizationPlanReviewRepository[];
  tags: ReadonlyArray<{ id: string; name: string }>;
  collections: ReadonlyArray<{ id: string; name: string }>;
  exclusions: readonly string[];
  decisions: readonly OrganizationPlanReviewDecision[];
}

function normalizeName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

function equivalentKey(value: string): string {
  return normalizeName(value).toLowerCase();
}

function nearKey(value: string): string {
  return equivalentKey(value).replace(/[^\p{L}\p{N}]+/gu, '');
}

function riskFor(action: OrganizationPlanAction): OrganizationPlanRisk {
  if (action.action === 'remove') return 'removal';
  return action.target.kind === 'new' ? 'new_classification' : 'existing_addition';
}

const RISK_ORDER: Record<OrganizationPlanRisk, number> = {
  existing_addition: 0,
  new_classification: 1,
  removal: 2,
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function reviewFingerprint(value: unknown): string {
  const input = JSON.stringify(value);
  const hash = (offset: bigint, reverse: boolean): string => {
    let current = offset;
    for (let step = 0; step < input.length; step += 1) {
      const index = reverse ? input.length - step - 1 : step;
      current ^= BigInt(input.charCodeAt(index));
      current = (current * 0x100000001b3n) & 0xffffffffffffffffn;
    }
    return current.toString(16).padStart(16, '0');
  };
  return `org-review-v1-${hash(0xcbf29ce484222325n, false)}${hash(0x6c62272e07bb0142n, true)}`;
}

function relationIds(
  repository: OrganizationPlanReviewRepository,
  relationType: OrganizationPlanRelationType,
): readonly string[] {
  return relationType === 'tag' ? repository.tagIds : repository.collectionIds;
}

function groupValidity(input: {
  actions: readonly OrganizationPlanReviewAction[];
  target: OrganizationPlanTarget;
  relationType: OrganizationPlanRelationType;
  catalog: ReadonlyArray<{ id: string; name: string }>;
  repositories: ReadonlyMap<string, OrganizationPlanReviewRepository>;
  equivalentTarget: { id: string; name: string } | null;
  nearMatches: ReadonlyArray<{ id: string; name: string }>;
}): OrganizationPlanReviewValidity {
  if (input.target.kind === 'existing') {
    const target = input.target;
    const current = input.catalog.find((entry) => entry.id === target.id);
    if (!current || normalizeName(current.name) !== normalizeName(target.name ?? '')) {
      return 'target_changed';
    }
  } else if (input.nearMatches.length > 0 && !input.equivalentTarget) {
    return 'near_match';
  }

  const targetId =
    input.target.kind === 'existing' ? input.target.id : (input.equivalentTarget?.id ?? null);
  for (const action of input.actions) {
    const repository = input.repositories.get(action.repoId);
    if (!repository?.authorized) return 'repository_unauthorized';
    if (targetId) {
      const exists = relationIds(repository, input.relationType).includes(targetId);
      const expected = action.action === 'remove';
      if (exists !== expected) return 'precondition_changed';
    }
  }
  return 'valid';
}

export function buildOrganizationPlanReview(
  input: OrganizationPlanReviewInput,
): OrganizationPlanReview {
  const repositories = new Map(input.repositories.map((repository) => [repository.id, repository]));
  const excluded = new Set(input.exclusions);
  const split = new Map<
    string,
    {
      sourceGroupKey: string;
      risk: OrganizationPlanRisk;
      relationType: OrganizationPlanRelationType;
      target: OrganizationPlanTarget;
      actions: OrganizationPlanAction[];
    }
  >();
  for (const source of input.plan.groups) {
    for (const action of source.actions) {
      const risk = riskFor(action);
      const key = stableOrganizationHash({ sourceGroupKey: source.key, risk });
      const entry = split.get(key) ?? {
        sourceGroupKey: source.key,
        risk,
        relationType: source.relationType,
        target: source.target,
        actions: [],
      };
      entry.actions.push(action);
      split.set(key, entry);
    }
  }

  const groups = [...split.entries()].map(([key, source]): OrganizationPlanReviewGroup => {
    const catalog = source.relationType === 'tag' ? input.tags : input.collections;
    const normalizedName = normalizeName(
      source.target.kind === 'existing' ? (source.target.name ?? '') : source.target.name,
    );
    const equivalentTarget =
      source.target.kind === 'new'
        ? (catalog.find((entry) => equivalentKey(entry.name) === equivalentKey(normalizedName)) ??
          null)
        : null;
    const proposedNearKey = nearKey(normalizedName);
    const nearMatches =
      source.target.kind === 'new'
        ? catalog.filter(
            (entry) =>
              nearKey(entry.name) === proposedNearKey &&
              equivalentKey(entry.name) !== equivalentKey(normalizedName),
          )
        : [];
    const actions = source.actions
      .toSorted((left, right) => compareStrings(left.repoId, right.repoId))
      .map(
        (action): OrganizationPlanReviewAction => ({
          ...action,
          repositoryName: repositories.get(action.repoId)?.fullName ?? null,
          excluded: excluded.has(action.id),
          eligible: false,
        }),
      );
    const includedActionIds = actions
      .filter((action) => !action.excluded)
      .map((action) => action.id);
    const effectiveTargetId =
      source.target.kind === 'existing' ? source.target.id : (equivalentTarget?.id ?? null);
    const fingerprint = reviewFingerprint({
      goal: input.goal,
      sourceGroupKey: source.sourceGroupKey,
      risk: source.risk,
      relationType: source.relationType,
      target:
        source.target.kind === 'existing'
          ? { kind: 'existing', id: source.target.id, name: normalizedName }
          : { kind: 'new', name: normalizedName },
      equivalentTarget,
      nearMatches: nearMatches.toSorted((left, right) => compareStrings(left.id, right.id)),
      actions: actions
        .filter((action) => !action.excluded)
        .map((action) => {
          const repository = repositories.get(action.repoId);
          return {
            id: action.id,
            repoId: action.repoId,
            action: action.action,
            risk: action.risk,
            expectedRelationExists: action.action === 'remove',
            currentRelationExists: effectiveTargetId
              ? repository
                ? relationIds(repository, source.relationType).includes(effectiveTargetId)
                : false
              : null,
            repositoryAuthorized: repository?.authorized ?? false,
            evidencePages: action.evidencePages,
          };
        }),
    });
    const validity = groupValidity({
      actions: actions.filter((action) => !action.excluded),
      target: source.target,
      relationType: source.relationType,
      catalog,
      repositories,
      equivalentTarget,
      nearMatches,
    });
    const latestDecision = input.decisions
      .filter(
        (entry) =>
          entry.planRevision <= input.plan.revision &&
          entry.groupKey === key &&
          entry.risk === source.risk,
      )
      .toSorted((left, right) => right.planRevision - left.planRevision)[0];
    const decision = latestDecision?.groupFingerprint === fingerprint ? latestDecision : undefined;
    const approvedByDefault = source.risk === 'existing_addition';
    const approved =
      includedActionIds.length > 0 && validity === 'valid'
        ? (decision?.approved ?? approvedByDefault)
        : false;
    return {
      key,
      sourceGroupKey: source.sourceGroupKey,
      risk: source.risk,
      relationType: source.relationType,
      target: source.target,
      normalizedName,
      representativeRepositoryIds: actions.slice(0, 3).map((action) => action.repoId),
      equivalentTarget,
      nearMatches,
      fingerprint,
      approved,
      validity,
      actions: actions.map((action) => ({
        ...action,
        eligible: approved && !action.excluded && validity === 'valid',
      })),
    };
  });

  groups.sort(
    (left, right) =>
      RISK_ORDER[left.risk] - RISK_ORDER[right.risk] || compareStrings(left.key, right.key),
  );
  const eligibleActions = groups.flatMap((group) =>
    group.actions.filter((action) => action.eligible),
  );
  const newClassifications = groups.filter(
    (group) =>
      group.risk === 'new_classification' &&
      group.approved &&
      !group.equivalentTarget &&
      group.actions.some((action) => action.eligible),
  ).length;
  const representedConflictNoOps = input.plan.conflicts.reduce(
    (total, conflict) => total + conflict.repoIds.length,
    0,
  );
  const noOps =
    input.plan.counts.actions -
    eligibleActions.length +
    representedConflictNoOps +
    input.plan.uncertainties.length;

  return {
    version: 1,
    taskId: input.plan.taskId,
    planRevision: input.plan.revision,
    planFingerprint: input.plan.fingerprint,
    groups,
    conflicts: input.plan.conflicts,
    uncertainties: input.plan.uncertainties,
    counts: {
      newClassifications,
      additions: eligibleActions.filter((action) => action.action === 'add').length,
      removals: eligibleActions.filter((action) => action.action === 'remove').length,
      noOps,
    },
    confirmable: groups.every((group) => group.validity !== 'near_match'),
    approvedGroupFingerprints: groups
      .filter((group) => group.approved)
      .map((group) => group.fingerprint)
      .toSorted(),
  };
}

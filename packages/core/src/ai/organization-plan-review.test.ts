import { describe, expect, it } from 'vitest';
import type { OrganizationPlanDocument } from './organization-plan';
import { buildOrganizationPlanReview } from './organization-plan-review';

const plan: OrganizationPlanDocument = {
  version: 1,
  taskId: 'task-1',
  revision: 3,
  groups: [
    {
      key: 'existing-tag',
      relationType: 'tag',
      target: { kind: 'existing', id: 'tag-1', name: 'Agent tools' },
      actions: [
        {
          id: 'add-1',
          repoId: 'repo-1',
          relationType: 'tag',
          action: 'add',
          target: { kind: 'existing', id: 'tag-1', name: 'Agent tools' },
          risk: 'low',
          evidencePages: [1],
        },
        {
          id: 'remove-1',
          repoId: 'repo-2',
          relationType: 'tag',
          action: 'remove',
          target: { kind: 'existing', id: 'tag-1', name: 'Agent tools' },
          risk: 'high',
          evidencePages: [2],
        },
      ],
    },
    {
      key: 'new-collection',
      relationType: 'collection',
      target: { kind: 'new', name: '  Read   later  ' },
      actions: [
        {
          id: 'new-1',
          repoId: 'repo-3',
          relationType: 'collection',
          action: 'add',
          target: { kind: 'new', name: '  Read   later  ' },
          risk: 'medium',
          evidencePages: [1],
        },
      ],
    },
  ],
  conflicts: [],
  uncertainties: [],
  counts: { actions: 3, newClassifications: 1, conflicts: 0, uncertainties: 0 },
  preconditionFingerprint: 'precondition-1',
  fingerprint: 'plan-1',
};

const repositories = [
  {
    id: 'repo-1',
    fullName: 'acme/agent-one',
    authorized: true,
    tagIds: [],
    collectionIds: [],
  },
  {
    id: 'repo-2',
    fullName: 'acme/agent-two',
    authorized: true,
    tagIds: ['tag-1'],
    collectionIds: [],
  },
  {
    id: 'repo-3',
    fullName: 'acme/reading',
    authorized: true,
    tagIds: [],
    collectionIds: [],
  },
];

function build(overrides: Partial<Parameters<typeof buildOrganizationPlanReview>[0]> = {}) {
  return buildOrganizationPlanReview({
    plan,
    goal: 'Organize agent tools',
    repositories,
    tags: [{ id: 'tag-1', name: 'Agent tools' }],
    collections: [],
    exclusions: [],
    decisions: [],
    ...overrides,
  });
}

describe('buildOrganizationPlanReview', () => {
  it('retains only the latest prior decision when an unchanged group fingerprint crosses Plan revisions', () => {
    const initial = build();
    const group = initial.groups[0];
    expect(group).toBeDefined();
    const nextPlan = { ...plan, revision: plan.revision + 1 };
    const retained = build({
      plan: nextPlan,
      decisions: [
        {
          planRevision: plan.revision,
          groupKey: group?.key ?? '',
          risk: group?.risk ?? 'existing_addition',
          groupFingerprint: group?.fingerprint ?? '',
          approved: false,
        },
      ],
    });
    expect(retained.groups[0]?.approved).toBe(false);

    const changedLatest = build({
      plan: nextPlan,
      decisions: [
        {
          planRevision: nextPlan.revision,
          groupKey: group?.key ?? '',
          risk: group?.risk ?? 'existing_addition',
          groupFingerprint: 'changed-fingerprint',
          approved: false,
        },
        {
          planRevision: plan.revision,
          groupKey: group?.key ?? '',
          risk: group?.risk ?? 'existing_addition',
          groupFingerprint: group?.fingerprint ?? '',
          approved: false,
        },
      ],
    });
    expect(changedLatest.groups[0]?.approved).toBe(true);
  });

  it('separates risks and applies conservative defaults with exact counts', () => {
    const review = build();
    expect(review.groups.map((group) => [group.risk, group.approved])).toEqual([
      ['existing_addition', true],
      ['new_classification', false],
      ['removal', false],
    ]);
    expect(review.groups[1]?.normalizedName).toBe('Read later');
    expect(review.groups[1]?.representativeRepositoryIds).toEqual(['repo-3']);
    expect(review.counts).toEqual({
      newClassifications: 0,
      additions: 1,
      removals: 0,
      noOps: 2,
    });
  });

  it('requires a matching fingerprint decision and invalidates it after exclusion', () => {
    const initial = build();
    const proposed = initial.groups.find((group) => group.risk === 'new_classification');
    expect(proposed).toBeDefined();
    const approved = build({
      decisions: [
        {
          planRevision: 3,
          groupKey: proposed?.key ?? '',
          risk: 'new_classification',
          groupFingerprint: proposed?.fingerprint ?? '',
          approved: true,
        },
      ],
    });
    expect(approved.counts).toEqual({
      newClassifications: 1,
      additions: 2,
      removals: 0,
      noOps: 1,
    });

    const changed = build({
      exclusions: ['new-1'],
      decisions: [
        {
          planRevision: 3,
          groupKey: proposed?.key ?? '',
          risk: 'new_classification',
          groupFingerprint: proposed?.fingerprint ?? '',
          approved: true,
        },
      ],
    });
    expect(changed.groups.find((group) => group.key === proposed?.key)?.approved).toBe(false);
    expect(changed.counts.noOps).toBe(2);
  });

  it('invalidates only affected groups when canonical preconditions drift', () => {
    const initial = build();
    const removal = initial.groups.find((group) => group.risk === 'removal');
    const drifted = build({
      repositories: repositories.map((repository) =>
        repository.id === 'repo-2' ? { ...repository, tagIds: [] } : repository,
      ),
      decisions: [
        {
          planRevision: 3,
          groupKey: removal?.key ?? '',
          risk: 'removal',
          groupFingerprint: removal?.fingerprint ?? '',
          approved: true,
        },
      ],
    });
    expect(drifted.groups.find((group) => group.risk === 'removal')).toMatchObject({
      approved: false,
      validity: 'precondition_changed',
    });
    expect(drifted.groups.find((group) => group.risk === 'removal')?.fingerprint).not.toBe(
      removal?.fingerprint,
    );
    expect(drifted.groups.find((group) => group.risk === 'existing_addition')).toMatchObject({
      approved: true,
      validity: 'valid',
    });
  });

  it('reuses normalized equivalents but blocks approximate names', () => {
    const initial = build();
    const equivalent = build({
      collections: [{ id: 'collection-existing', name: 'Read later' }],
    });
    expect(
      equivalent.groups.find((group) => group.risk === 'new_classification')?.equivalentTarget,
    ).toEqual({ id: 'collection-existing', name: 'Read later' });
    expect(
      equivalent.groups.find((group) => group.risk === 'new_classification')?.fingerprint,
    ).not.toBe(initial.groups.find((group) => group.risk === 'new_classification')?.fingerprint);

    const approximate = build({
      collections: [{ id: 'collection-near', name: 'Read-later' }],
    });
    expect(approximate.groups.find((group) => group.risk === 'new_classification')).toMatchObject({
      validity: 'near_match',
      nearMatches: [{ id: 'collection-near' }],
    });
    expect(approximate.confirmable).toBe(false);
  });
});

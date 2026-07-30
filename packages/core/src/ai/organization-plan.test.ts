import { describe, expect, it } from 'vitest';
import {
  interpretOrganizationPageOutput,
  mergeOrganizationPlan,
  type OrganizationPageResult,
  type OrganizationPlanMergeInput,
  stableOrganizationHash,
} from './organization-plan';

const PAGE_INPUT = {
  repositoryIds: ['repo-1', 'repo-2', 'repo-3'],
  tagIds: ['tag-1', 'tag-2'],
  collectionIds: ['col-1'],
};

function emptyResult(): OrganizationPageResult {
  return { version: 1, relationChanges: [], newClassifications: [], uncertainties: [] };
}

function mergeInput(
  overrides: Partial<OrganizationPlanMergeInput> = {},
): OrganizationPlanMergeInput {
  return {
    taskId: 'task-1',
    planRevision: 1,
    pages: [],
    existingTags: [{ id: 'tag-1', name: 'CLI Tools' }],
    existingCollections: [{ id: 'col-1', name: 'Reading List' }],
    preconditions: {
      snapshotFingerprint: 'fnv1a-snap',
      manifestFingerprint: 'fnv1a-manifest',
      candidateFingerprints: [
        { repositoryId: 'repo-1', contentFingerprint: 'fnv1a-a' },
        { repositoryId: 'repo-2', contentFingerprint: 'fnv1a-b' },
      ],
    },
    ...overrides,
  };
}

describe('interpretOrganizationPageOutput', () => {
  it('accepts a valid page and sorts output deterministically', () => {
    const outcome = interpretOrganizationPageOutput(
      {
        relationChanges: [
          { repoId: 'repo-2', relationType: 'tag', action: 'add', targetId: 'tag-1' },
          { repoId: 'repo-1', relationType: 'collection', action: 'remove', targetId: 'col-1' },
        ],
        newClassifications: [
          { relationType: 'tag', name: '  Rust   Web ', repoIds: ['repo-3', 'repo-1'] },
        ],
      },
      PAGE_INPUT,
    );
    expect(outcome).toEqual({
      ok: true,
      result: {
        version: 1,
        relationChanges: [
          { repoId: 'repo-1', relationType: 'collection', action: 'remove', targetId: 'col-1' },
          { repoId: 'repo-2', relationType: 'tag', action: 'add', targetId: 'tag-1' },
        ],
        newClassifications: [
          { relationType: 'tag', name: 'Rust Web', repoIds: ['repo-1', 'repo-3'] },
        ],
        uncertainties: [],
      },
    });
  });

  it('fails the page on structural schema violations', () => {
    const bad = [
      null,
      [],
      { relationChanges: [] },
      { relationChanges: [], newClassifications: [], extra: true },
      { relationChanges: 'nope', newClassifications: [] },
      { relationChanges: [{ repoId: 'repo-1' }], newClassifications: [] },
      {
        relationChanges: [
          { repoId: 'repo-1', relationType: 'tag', action: 'attach', targetId: 'tag-1' },
        ],
        newClassifications: [],
      },
      { relationChanges: [], newClassifications: [{ relationType: 'tag', name: 'x' }] },
      {
        relationChanges: [],
        newClassifications: [{ relationType: 'tag', name: 'x', repoIds: [1] }],
      },
    ];
    for (const value of bad) {
      expect(interpretOrganizationPageOutput(value, PAGE_INPUT)).toEqual({
        ok: false,
        reason: 'schema_mismatch',
      });
    }
  });

  it('turns unknown ids into uncertain no-ops instead of failing the page', () => {
    const outcome = interpretOrganizationPageOutput(
      {
        relationChanges: [
          { repoId: 'ghost', relationType: 'tag', action: 'add', targetId: 'tag-1' },
          { repoId: 'repo-1', relationType: 'tag', action: 'add', targetId: 'ghost-tag' },
          { repoId: 'repo-1', relationType: 'tag', action: 'add', targetId: 'tag-1' },
        ],
        newClassifications: [{ relationType: 'tag', name: 'Web', repoIds: ['repo-1', 'ghost-2'] }],
      },
      PAGE_INPUT,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.relationChanges).toEqual([
      { repoId: 'repo-1', relationType: 'tag', action: 'add', targetId: 'tag-1' },
    ]);
    expect(outcome.result.newClassifications).toEqual([
      { relationType: 'tag', name: 'Web', repoIds: ['repo-1'] },
    ]);
    expect(outcome.result.uncertainties).toEqual([
      { kind: 'unknown_repository', repoId: 'ghost' },
      { kind: 'unknown_repository', repoId: 'ghost-2' },
      { kind: 'unknown_target', relationType: 'tag', targetId: 'ghost-tag' },
    ]);
  });

  it('collapses duplicates and degrades add/remove contradictions to uncertainty', () => {
    const outcome = interpretOrganizationPageOutput(
      {
        relationChanges: [
          { repoId: 'repo-1', relationType: 'tag', action: 'add', targetId: 'tag-1' },
          { repoId: 'repo-1', relationType: 'tag', action: 'add', targetId: 'tag-1' },
          { repoId: 'repo-2', relationType: 'tag', action: 'add', targetId: 'tag-2' },
          { repoId: 'repo-2', relationType: 'tag', action: 'remove', targetId: 'tag-2' },
        ],
        newClassifications: [],
      },
      PAGE_INPUT,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.relationChanges).toEqual([
      { repoId: 'repo-1', relationType: 'tag', action: 'add', targetId: 'tag-1' },
    ]);
    expect(outcome.result.uncertainties).toEqual([
      { kind: 'conflicting_actions', repoId: 'repo-2', relationType: 'tag', targetId: 'tag-2' },
    ]);
  });

  it('flags invalid classification names and merges same normalized names in-page', () => {
    const outcome = interpretOrganizationPageOutput(
      {
        relationChanges: [],
        newClassifications: [
          { relationType: 'tag', name: '   ', repoIds: ['repo-1'] },
          { relationType: 'tag', name: 'x'.repeat(101), repoIds: ['repo-1'] },
          { relationType: 'tag', name: 'Data Viz', repoIds: ['repo-1', 'repo-1'] },
          { relationType: 'tag', name: ' Data  Viz ', repoIds: ['repo-2'] },
        ],
      },
      PAGE_INPUT,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.newClassifications).toEqual([
      { relationType: 'tag', name: 'Data Viz', repoIds: ['repo-1', 'repo-2'] },
    ]);
    expect(outcome.result.uncertainties).toEqual([
      { kind: 'invalid_classification_name', name: '' },
      { kind: 'invalid_classification_name', name: 'x'.repeat(101) },
    ]);
  });
});

describe('mergeOrganizationPlan', () => {
  it('merges pages deterministically regardless of input order', () => {
    const pageA = {
      pageIndex: 1,
      result: {
        ...emptyResult(),
        relationChanges: [
          {
            repoId: 'repo-1',
            relationType: 'tag' as const,
            action: 'add' as const,
            targetId: 'tag-1',
          },
        ],
        newClassifications: [{ relationType: 'tag' as const, name: 'ML', repoIds: ['repo-1'] }],
      },
    };
    const pageB = {
      pageIndex: 2,
      result: {
        ...emptyResult(),
        relationChanges: [
          {
            repoId: 'repo-2',
            relationType: 'tag' as const,
            action: 'add' as const,
            targetId: 'tag-1',
          },
        ],
        newClassifications: [{ relationType: 'tag' as const, name: 'ML', repoIds: ['repo-2'] }],
      },
    };
    const forward = mergeOrganizationPlan(mergeInput({ pages: [pageA, pageB] }));
    const reversed = mergeOrganizationPlan(mergeInput({ pages: [pageB, pageA] }));
    expect(forward).toEqual(reversed);
    expect(forward.counts.actions).toBe(4);
    const mlGroup = forward.groups.find((group) => group.target.kind === 'new');
    expect(mlGroup?.target).toEqual({ kind: 'new', name: 'ML' });
    expect(mlGroup?.actions.map((action) => action.repoId)).toEqual(['repo-1', 'repo-2']);
  });

  it('keeps action identity independent of evidence pages', () => {
    const build = (pageIndex: number) =>
      mergeOrganizationPlan(
        mergeInput({
          pages: [
            {
              pageIndex,
              result: {
                ...emptyResult(),
                relationChanges: [
                  {
                    repoId: 'repo-1',
                    relationType: 'tag' as const,
                    action: 'add' as const,
                    targetId: 'tag-1',
                  },
                ],
              },
            },
          ],
        }),
      );
    const first = build(1);
    const second = build(7);
    expect(first.groups[0]?.actions[0]?.id).toBe(second.groups[0]?.actions[0]?.id);
    expect(first.groups[0]?.actions[0]?.evidencePages).toEqual([1]);
    expect(second.groups[0]?.actions[0]?.evidencePages).toEqual([7]);
  });

  it('degrades cross-page add/remove contradictions to uncertain no-ops', () => {
    const plan = mergeOrganizationPlan(
      mergeInput({
        pages: [
          {
            pageIndex: 1,
            result: {
              ...emptyResult(),
              relationChanges: [
                {
                  repoId: 'repo-1',
                  relationType: 'tag' as const,
                  action: 'add' as const,
                  targetId: 'tag-1',
                },
              ],
            },
          },
          {
            pageIndex: 2,
            result: {
              ...emptyResult(),
              relationChanges: [
                {
                  repoId: 'repo-1',
                  relationType: 'tag' as const,
                  action: 'remove' as const,
                  targetId: 'tag-1',
                },
              ],
            },
          },
        ],
      }),
    );
    expect(plan.counts.actions).toBe(0);
    expect(plan.uncertainties).toEqual([
      {
        detail: {
          kind: 'conflicting_actions',
          repoId: 'repo-1',
          relationType: 'tag',
          targetId: 'tag-1',
        },
        pageIndexes: [1, 2],
      },
    ]);
  });

  it('resolves new names that exactly match existing classifications to stable ids', () => {
    const plan = mergeOrganizationPlan(
      mergeInput({
        pages: [
          {
            pageIndex: 1,
            result: {
              ...emptyResult(),
              newClassifications: [
                { relationType: 'tag' as const, name: 'CLI Tools', repoIds: ['repo-1'] },
              ],
            },
          },
        ],
      }),
    );
    expect(plan.conflicts).toEqual([]);
    expect(plan.groups).toHaveLength(1);
    const group = plan.groups[0];
    expect(group?.target).toEqual({ kind: 'existing', id: 'tag-1', name: 'CLI Tools' });
    expect(group?.actions[0]?.risk).toBe('low');
  });

  it('turns near-duplicate names into pending-review conflicts, not actions', () => {
    const plan = mergeOrganizationPlan(
      mergeInput({
        pages: [
          {
            pageIndex: 1,
            result: {
              ...emptyResult(),
              newClassifications: [
                { relationType: 'tag' as const, name: 'cli tools', repoIds: ['repo-1'] },
                { relationType: 'tag' as const, name: 'Data Viz', repoIds: ['repo-1'] },
              ],
            },
          },
          {
            pageIndex: 2,
            result: {
              ...emptyResult(),
              newClassifications: [
                { relationType: 'tag' as const, name: 'data viz', repoIds: ['repo-2'] },
              ],
            },
          },
        ],
      }),
    );
    expect(plan.groups).toEqual([]);
    expect(plan.conflicts).toEqual([
      {
        kind: 'near_duplicate_names',
        relationType: 'tag',
        names: ['CLI Tools', 'cli tools'],
        repoIds: ['repo-1'],
        evidencePages: [1],
      },
      {
        kind: 'near_duplicate_names',
        relationType: 'tag',
        names: ['Data Viz', 'data viz'],
        repoIds: ['repo-1', 'repo-2'],
        evidencePages: [1, 2],
      },
    ]);
    expect(plan.counts).toEqual({
      actions: 0,
      newClassifications: 0,
      conflicts: 2,
      uncertainties: 0,
    });
  });

  it('assigns risk tiers by action shape', () => {
    const plan = mergeOrganizationPlan(
      mergeInput({
        pages: [
          {
            pageIndex: 1,
            result: {
              ...emptyResult(),
              relationChanges: [
                {
                  repoId: 'repo-1',
                  relationType: 'tag' as const,
                  action: 'add' as const,
                  targetId: 'tag-1',
                },
                {
                  repoId: 'repo-2',
                  relationType: 'collection' as const,
                  action: 'remove' as const,
                  targetId: 'col-1',
                },
              ],
              newClassifications: [
                { relationType: 'tag' as const, name: 'Brand New', repoIds: ['repo-3'] },
              ],
            },
          },
        ],
      }),
    );
    const risks = new Map(
      plan.groups.flatMap((group) => group.actions.map((action) => [action.repoId, action.risk])),
    );
    expect(risks.get('repo-1')).toBe('low');
    expect(risks.get('repo-2')).toBe('high');
    expect(risks.get('repo-3')).toBe('medium');
  });

  it('builds a stable precondition fingerprint from sorted candidate fingerprints', () => {
    const forward = mergeOrganizationPlan(mergeInput());
    const reordered = mergeOrganizationPlan(
      mergeInput({
        preconditions: {
          snapshotFingerprint: 'fnv1a-snap',
          manifestFingerprint: 'fnv1a-manifest',
          candidateFingerprints: [
            { repositoryId: 'repo-2', contentFingerprint: 'fnv1a-b' },
            { repositoryId: 'repo-1', contentFingerprint: 'fnv1a-a' },
          ],
        },
      }),
    );
    expect(forward.preconditionFingerprint).toBe(reordered.preconditionFingerprint);
    const changed = mergeOrganizationPlan(
      mergeInput({
        preconditions: {
          snapshotFingerprint: 'fnv1a-snap',
          manifestFingerprint: 'fnv1a-manifest',
          candidateFingerprints: [
            { repositoryId: 'repo-1', contentFingerprint: 'fnv1a-drifted' },
            { repositoryId: 'repo-2', contentFingerprint: 'fnv1a-b' },
          ],
        },
      }),
    );
    expect(changed.preconditionFingerprint).not.toBe(forward.preconditionFingerprint);
  });

  it('carries page uncertainties through with merged page evidence', () => {
    const detail = { kind: 'unknown_repository' as const, repoId: 'ghost' };
    const plan = mergeOrganizationPlan(
      mergeInput({
        pages: [
          { pageIndex: 1, result: { ...emptyResult(), uncertainties: [detail] } },
          { pageIndex: 3, result: { ...emptyResult(), uncertainties: [detail] } },
        ],
      }),
    );
    expect(plan.uncertainties).toEqual([{ detail, pageIndexes: [1, 3] }]);
  });
});

describe('stableOrganizationHash', () => {
  it('matches the task-domain FNV-1a format', () => {
    expect(stableOrganizationHash({ a: 1 })).toMatch(/^fnv1a-[0-9a-f]{8}$/);
    expect(stableOrganizationHash({ a: 1 })).toBe(stableOrganizationHash({ a: 1 }));
  });
});

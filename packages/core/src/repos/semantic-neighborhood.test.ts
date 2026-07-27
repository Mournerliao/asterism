import { describe, expect, it } from 'vitest';
import { findMutualSemanticNeighbors, type RepoSemanticVector } from './semantic-neighborhood';

function vector(repoId: string, embedding: number[]): RepoSemanticVector {
  return { repoId, embedding };
}

describe('findMutualSemanticNeighbors', () => {
  it('returns only reciprocal nearest neighbors in similarity order', () => {
    const vectors = [
      vector('anchor', [1, 0]),
      vector('close', [0.99, 0.1]),
      vector('also-close', [0.96, 0.2]),
    ];

    expect(findMutualSemanticNeighbors(vectors, 'anchor').map((item) => item.repoId)).toEqual([
      'close',
      'also-close',
    ]);
  });

  it('rejects a one-way neighbor instead of filling the result list', () => {
    const decoys = Array.from({ length: 12 }, (_, index) => {
      const angle = ((40 + index * 2) * Math.PI) / 180;
      return vector(`decoy-${index}`, [Math.cos(angle), Math.sin(angle)]);
    });
    const vectors = [vector('anchor', [1, 0]), vector('one-way', [0.8, 0.6]), ...decoys];

    expect(findMutualSemanticNeighbors(vectors, 'anchor')).toEqual([]);
  });

  it('is deterministic when similarities tie', () => {
    const vectors = [vector('anchor', [1, 0]), vector('z-repo', [1, 0]), vector('a-repo', [1, 0])];

    expect(findMutualSemanticNeighbors(vectors, 'anchor').map((item) => item.repoId)).toEqual([
      'a-repo',
      'z-repo',
    ]);
  });

  it('returns an empty neighborhood for missing or unusable vectors', () => {
    expect(findMutualSemanticNeighbors([vector('other', [1, 0])], 'missing')).toEqual([]);
    expect(
      findMutualSemanticNeighbors([vector('anchor', [0, 0]), vector('other', [1, 0])], 'anchor'),
    ).toEqual([]);
  });

  it('deduplicates repositories and respects the result limit', () => {
    const vectors = [
      vector('anchor', [1, 0]),
      vector('b', [0.99, 0.1]),
      vector('b', [0, 1]),
      vector('c', [0.98, 0.15]),
      vector('d', [0.97, 0.2]),
      vector('e', [0.96, 0.25]),
      vector('f', [0.95, 0.3]),
      vector('g', [0.94, 0.35]),
    ];

    expect(findMutualSemanticNeighbors(vectors, 'anchor')).toHaveLength(5);
  });
});

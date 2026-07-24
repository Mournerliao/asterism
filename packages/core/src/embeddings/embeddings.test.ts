import { describe, expect, it } from 'vitest';
import {
  computeContentHash,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  embeddableRepoText,
  repoContentHash,
  selectReposToEmbed,
} from './embeddings';

describe('default embedding model', () => {
  it('pins the versionable model id and its dimension', () => {
    expect(DEFAULT_EMBEDDING_MODEL).toBe('multilingual-e5-small');
    expect(DEFAULT_EMBEDDING_DIMENSIONS).toBe(384);
  });
});

describe('embeddableRepoText', () => {
  it('joins full name, description and topics in a stable order', () => {
    const text = embeddableRepoText({
      fullName: 'owner/name',
      description: 'A tiny library',
      topics: ['cli', 'rust'],
    });
    expect(text).toBe('owner/name\nA tiny library\ncli rust');
  });

  it('omits missing description and empty topics without leaving blank segments', () => {
    expect(embeddableRepoText({ fullName: 'owner/name', description: null, topics: [] })).toBe(
      'owner/name',
    );
    expect(embeddableRepoText({ fullName: 'owner/name', description: '   ', topics: ['  '] })).toBe(
      'owner/name',
    );
  });

  it('trims surrounding whitespace so cosmetic changes do not alter the text', () => {
    expect(
      embeddableRepoText({
        fullName: '  owner/name  ',
        description: '  hi  ',
        topics: [' a ', 'b'],
      }),
    ).toBe('owner/name\nhi\na b');
  });
});

describe('computeContentHash', () => {
  it('is deterministic for the same input', () => {
    expect(computeContentHash('owner/name\nhi')).toBe(computeContentHash('owner/name\nhi'));
  });

  it('changes when the embedded text changes', () => {
    expect(computeContentHash('owner/name\nhi')).not.toBe(computeContentHash('owner/name\nhey'));
  });

  it('produces a fixed-length hex digest, including for multilingual text', () => {
    expect(computeContentHash('语义搜索 · semantic search')).toMatch(/^[0-9a-f]{16}$/);
    expect(computeContentHash('')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('repoContentHash', () => {
  it('equals hashing the assembled embeddable text', () => {
    const repo = { fullName: 'owner/name', description: 'desc', topics: ['x'] };
    expect(repoContentHash(repo)).toBe(computeContentHash(embeddableRepoText(repo)));
  });
});

describe('selectReposToEmbed', () => {
  const model = DEFAULT_EMBEDDING_MODEL;

  it('marks repos with no stored row as missing', () => {
    const result = selectReposToEmbed({
      model,
      desired: [{ repoId: 'r1', contentHash: 'h1' }],
      stored: [],
    });
    expect(result).toEqual([{ repoId: 'r1', reason: 'missing' }]);
  });

  it('marks repos whose stored model differs from the current model', () => {
    const result = selectReposToEmbed({
      model,
      desired: [{ repoId: 'r1', contentHash: 'h1' }],
      stored: [{ repoId: 'r1', embeddingModel: 'legacy-model', contentHash: 'h1' }],
    });
    expect(result).toEqual([{ repoId: 'r1', reason: 'model_mismatch' }]);
  });

  it('marks repos whose stored content hash is stale', () => {
    const result = selectReposToEmbed({
      model,
      desired: [{ repoId: 'r1', contentHash: 'h2' }],
      stored: [{ repoId: 'r1', embeddingModel: model, contentHash: 'h1' }],
    });
    expect(result).toEqual([{ repoId: 'r1', reason: 'content_mismatch' }]);
  });

  it('skips repos whose model and content hash both match (fresh)', () => {
    const result = selectReposToEmbed({
      model,
      desired: [{ repoId: 'r1', contentHash: 'h1' }],
      stored: [{ repoId: 'r1', embeddingModel: model, contentHash: 'h1' }],
    });
    expect(result).toEqual([]);
  });

  it('prefers model mismatch over content mismatch when both differ', () => {
    const result = selectReposToEmbed({
      model,
      desired: [{ repoId: 'r1', contentHash: 'h2' }],
      stored: [{ repoId: 'r1', embeddingModel: 'legacy-model', contentHash: 'h1' }],
    });
    expect(result).toEqual([{ repoId: 'r1', reason: 'model_mismatch' }]);
  });

  it('is incremental and resumable across a mixed desired set', () => {
    const result = selectReposToEmbed({
      model,
      desired: [
        { repoId: 'fresh', contentHash: 'h1' },
        { repoId: 'new', contentHash: 'h1' },
        { repoId: 'stale-model', contentHash: 'h1' },
        { repoId: 'stale-content', contentHash: 'h2' },
      ],
      stored: [
        { repoId: 'fresh', embeddingModel: model, contentHash: 'h1' },
        { repoId: 'stale-model', embeddingModel: 'legacy-model', contentHash: 'h1' },
        { repoId: 'stale-content', embeddingModel: model, contentHash: 'h1' },
        { repoId: 'orphan', embeddingModel: model, contentHash: 'h9' },
      ],
    });
    expect(result).toEqual([
      { repoId: 'new', reason: 'missing' },
      { repoId: 'stale-model', reason: 'model_mismatch' },
      { repoId: 'stale-content', reason: 'content_mismatch' },
    ]);
  });
});

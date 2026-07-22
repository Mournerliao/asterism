import { describe, expect, it } from 'vitest';
import {
  type GenerationSelectionState,
  readGenerationCapability,
  readTestedModel,
  resolveActiveGenerationModel,
} from './generation-selection';

function state(overrides: Partial<GenerationSelectionState> = {}): GenerationSelectionState {
  return { status: 'valid', capability: { ok: true, model: 'gpt-4o' }, ...overrides };
}

describe('readTestedModel', () => {
  it('returns the trimmed model from a capability record', () => {
    expect(readTestedModel({ ok: true, model: '  gpt-4o  ' })).toBe('gpt-4o');
  });

  it('returns null when the model is missing, blank, or the wrong type', () => {
    expect(readTestedModel(null)).toBeNull();
    expect(readTestedModel({})).toBeNull();
    expect(readTestedModel({ ok: true, model: '' })).toBeNull();
    expect(readTestedModel({ ok: true, model: '   ' })).toBeNull();
    expect(readTestedModel({ ok: true, model: 123 })).toBeNull();
    expect(readTestedModel({ ok: false, model: 'gpt-4o' })).toBeNull();
    expect(readTestedModel('gpt-4o')).toBeNull();
  });
});

describe('readGenerationCapability', () => {
  it('returns only the stable, non-sensitive test result fields', () => {
    expect(
      readGenerationCapability({
        ok: false,
        model: 'claude-3-5-sonnet',
        testedAt: '2026-07-22T00:00:00.000Z',
        reason: 'unauthorized',
        ignored: { upstreamBody: 'secret' },
      }),
    ).toEqual({
      ok: false,
      model: 'claude-3-5-sonnet',
      testedAt: '2026-07-22T00:00:00.000Z',
      reason: 'unauthorized',
    });
  });

  it('rejects records without a boolean outcome', () => {
    expect(readGenerationCapability(null)).toBeNull();
    expect(readGenerationCapability({ model: 'gpt-4o' })).toBeNull();
  });
});

describe('resolveActiveGenerationModel', () => {
  it('snaps to the tested model when no model is requested', () => {
    expect(resolveActiveGenerationModel(state(), null)).toEqual({ ok: true, model: 'gpt-4o' });
  });

  it('accepts a requested model that matches the tested one, trimming whitespace', () => {
    expect(resolveActiveGenerationModel(state(), '  gpt-4o  ')).toEqual({
      ok: true,
      model: 'gpt-4o',
    });
  });

  it('rejects a requested model the connection never tested', () => {
    expect(resolveActiveGenerationModel(state(), 'gpt-3.5-turbo')).toEqual({
      ok: false,
      code: 'model_not_verified',
    });
  });

  it.each([
    'untested',
    'invalid',
    'disabled',
  ] as const)('rejects a %s connection as not valid', (status) => {
    expect(resolveActiveGenerationModel(state({ status }), null)).toEqual({
      ok: false,
      code: 'connection_not_valid',
    });
  });

  it('rejects a valid connection that has no tested model on record', () => {
    expect(resolveActiveGenerationModel(state({ capability: null }), null)).toEqual({
      ok: false,
      code: 'connection_not_valid',
    });
  });
});

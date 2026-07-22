/**
 * Active-generation selection invariant (issue #13, US26). A connection may only
 * be made active with a model it actually proved during capability testing. Pure
 * and self-contained (no cross-file imports) so it runs unchanged in the web
 * bundle and inside the trusted Edge Function imported by path under Deno. It
 * never performs I/O.
 */

export type GenerationConnectionStatus = 'untested' | 'valid' | 'invalid' | 'disabled';

export interface GenerationSelectionState {
  status: GenerationConnectionStatus;
  /** The connection's stored `generation_capability` JSON; its shape is owned by the tester. */
  capability: unknown;
}

export interface GenerationCapabilityView {
  ok: boolean;
  model: string | null;
  testedAt: string | null;
  reason: string | null;
}

export type GenerationSelectionResult =
  | { ok: true; model: string }
  | { ok: false; code: 'connection_not_valid' | 'model_not_verified' };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readGenerationCapability(capability: unknown): GenerationCapabilityView | null {
  const record = asRecord(capability);
  if (!record || typeof record.ok !== 'boolean') return null;
  const model = typeof record.model === 'string' ? record.model.trim() : '';
  const testedAt = typeof record.testedAt === 'string' ? record.testedAt : null;
  const reason = typeof record.reason === 'string' ? record.reason : null;
  return {
    ok: record.ok,
    model: model.length > 0 ? model : null,
    testedAt,
    reason,
  };
}

/** The single model a connection proved during capability testing, or null if none. */
export function readTestedModel(capability: unknown): string | null {
  const parsed = readGenerationCapability(capability);
  return parsed?.ok ? parsed.model : null;
}

/**
 * Resolve the model that may be persisted as active for a connection. A valid
 * connection has exactly one tested model, so an omitted request snaps to it and a
 * disagreeing request is rejected rather than silently trusted. Anything other than
 * a valid, tested connection cannot be made active.
 */
export function resolveActiveGenerationModel(
  connection: GenerationSelectionState,
  requestedModel: string | null,
): GenerationSelectionResult {
  if (connection.status !== 'valid') {
    return { ok: false, code: 'connection_not_valid' };
  }
  const testedModel = readTestedModel(connection.capability);
  if (testedModel === null) {
    return { ok: false, code: 'connection_not_valid' };
  }
  const requested = requestedModel?.trim() ?? '';
  if (requested.length > 0 && requested !== testedModel) {
    return { ok: false, code: 'model_not_verified' };
  }
  return { ok: true, model: testedModel };
}

/**
 * Out-of-band trigger for credential rotation (issue #13, US22). A separate,
 * operator-only entry point: it is guarded by a dedicated admin secret (never a
 * user session) and deployed as its own function so it is unreachable from the
 * user-facing manage-ai-connections handler. Pure and dependency-injected — the
 * service-role client, key ring, and store are wired in index.ts — so the guard
 * and the response contract can be unit-tested without Deno or a database.
 */
import type { RotationSummary } from './rotate.ts';

export interface RotateAiConnectionsDependencies {
  expectedSecret: string;
  rotate(): Promise<RotationSummary>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Length-independent comparison so a wrong secret leaks no timing or length signal. */
function secretsMatch(provided: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return diff === 0;
}

export function createRotateAiConnectionsHandler(dependencies: RotateAiConnectionsDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }
    const provided = request.headers.get('x-rotation-secret') ?? '';
    if (!provided || !secretsMatch(provided, dependencies.expectedSecret)) {
      return json({ error: 'unauthorized' }, 401);
    }
    try {
      const summary = await dependencies.rotate();
      return json({ summary });
    } catch {
      return json({ error: 'rotation_failed' }, 500);
    }
  };
}

import { describe, expect, it, vi } from 'vitest';
import { createRotateAiConnectionsHandler } from './handler';
import type { RotationSummary } from './rotate';

const summary: RotationSummary = { scanned: 3, rotated: 2, skipped: 1, failed: 0 };

function request(secret: string | null, method = 'POST') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret !== null) {
    headers['x-rotation-secret'] = secret;
  }
  return new Request('https://example.test/rotate-ai-connections', { method, headers });
}

async function outcome(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('rotate-ai-connections out-of-band trigger', () => {
  it('rotates when the admin secret matches', async () => {
    const rotate = vi.fn().mockResolvedValue(summary);
    const response = await createRotateAiConnectionsHandler({
      expectedSecret: 'rotate-secret',
      rotate,
    })(request('rotate-secret'));

    expect(response.status).toBe(200);
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(await outcome(response)).toEqual({ summary });
  });

  it('rejects a missing secret before running rotation', async () => {
    const rotate = vi.fn().mockResolvedValue(summary);
    const response = await createRotateAiConnectionsHandler({
      expectedSecret: 'rotate-secret',
      rotate,
    })(request(null));

    expect(response.status).toBe(401);
    expect(rotate).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret, including a length mismatch, before running rotation', async () => {
    const rotate = vi.fn().mockResolvedValue(summary);
    const handler = createRotateAiConnectionsHandler({ expectedSecret: 'rotate-secret', rotate });

    expect((await handler(request('wrong-secret'))).status).toBe(401);
    expect((await handler(request('rotate-secret-with-extra'))).status).toBe(401);
    expect(rotate).not.toHaveBeenCalled();
  });

  it('rejects non-POST methods', async () => {
    const rotate = vi.fn().mockResolvedValue(summary);
    const response = await createRotateAiConnectionsHandler({
      expectedSecret: 'rotate-secret',
      rotate,
    })(request('rotate-secret', 'GET'));

    expect(response.status).toBe(405);
    expect(rotate).not.toHaveBeenCalled();
  });

  it('maps a rotation failure to a 500 without leaking detail', async () => {
    const rotate = vi.fn().mockRejectedValue(new Error('database_unreachable'));
    const response = await createRotateAiConnectionsHandler({
      expectedSecret: 'rotate-secret',
      rotate,
    })(request('rotate-secret'));

    expect(response.status).toBe(500);
    expect(await outcome(response)).toEqual({ error: 'rotation_failed' });
  });
});

import { describe, expect, it } from 'vitest';
import { EmbeddingWorkerClient, type EmbeddingWorkerLike } from './embedding-runtime';

class FakeEmbeddingWorker implements EmbeddingWorkerLike {
  messages: unknown[] = [];
  private messageListeners = new Set<(event: MessageEvent) => void>();
  private errorListeners = new Set<(event: ErrorEvent) => void>();

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  addEventListener(
    type: 'message' | 'error',
    listener: (event: MessageEvent | ErrorEvent) => void,
  ) {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: MessageEvent) => void);
    } else {
      this.errorListeners.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: (event: MessageEvent | ErrorEvent) => void,
  ) {
    if (type === 'message') {
      this.messageListeners.delete(listener as (event: MessageEvent) => void);
    } else {
      this.errorListeners.delete(listener as (event: ErrorEvent) => void);
    }
  }

  terminate() {}

  emitMessage(data: unknown) {
    for (const listener of this.messageListeners) {
      listener({ data } as MessageEvent);
    }
  }
}

describe('EmbeddingWorkerClient', () => {
  it('reports model progress and resolves the selected backend', async () => {
    const worker = new FakeEmbeddingWorker();
    const client = new EmbeddingWorkerClient(worker);
    const progress: number[] = [];

    const preparing = client.prepare((value) => progress.push(value));
    const request = worker.messages[0] as { requestId: number };
    worker.emitMessage({ type: 'model-progress', requestId: request.requestId, progress: 42 });
    worker.emitMessage({ type: 'prepared', requestId: request.requestId, backend: 'webgpu' });

    await expect(preparing).resolves.toEqual({ backend: 'webgpu' });
    expect(progress).toEqual([42]);
  });

  it('returns one embedding per requested input', async () => {
    const worker = new FakeEmbeddingWorker();
    const client = new EmbeddingWorkerClient(worker);

    const embedding = client.embed(['passage: one', 'passage: two']);
    const request = worker.messages[0] as { requestId: number };
    worker.emitMessage({
      type: 'embedded',
      requestId: request.requestId,
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });

    await expect(embedding).resolves.toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it('rejects only the matching request when the worker reports a recoverable failure', async () => {
    const worker = new FakeEmbeddingWorker();
    const client = new EmbeddingWorkerClient(worker);

    const embedding = client.embed(['passage: one']);
    const request = worker.messages[0] as { requestId: number };
    worker.emitMessage({
      type: 'failed',
      requestId: request.requestId,
      message: 'WASM unavailable',
    });

    await expect(embedding).rejects.toThrow('WASM unavailable');
  });
});

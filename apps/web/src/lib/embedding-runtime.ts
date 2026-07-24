export type EmbeddingRuntimeBackend = 'webgpu' | 'wasm';

export type EmbeddingWorkerRequest =
  | { type: 'prepare'; requestId: number }
  | { type: 'embed'; requestId: number; inputs: string[] };
type EmbeddingWorkerRequestPayload = { type: 'prepare' } | { type: 'embed'; inputs: string[] };

export type EmbeddingWorkerResponse =
  | { type: 'model-progress'; requestId: number; progress: number }
  | { type: 'prepared'; requestId: number; backend: EmbeddingRuntimeBackend }
  | { type: 'embedded'; requestId: number; embeddings: number[][] }
  | { type: 'failed'; requestId: number; message: string };

export interface EmbeddingWorkerLike {
  postMessage(message: EmbeddingWorkerRequest): void;
  addEventListener(
    type: 'message' | 'error',
    listener: (event: MessageEvent<EmbeddingWorkerResponse> | ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: 'message' | 'error',
    listener: (event: MessageEvent<EmbeddingWorkerResponse> | ErrorEvent) => void,
  ): void;
  terminate(): void;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export class EmbeddingWorkerClient {
  private nextRequestId = 1;
  private readonly pending = new Map<number, PendingRequest>();

  constructor(private readonly worker: EmbeddingWorkerLike) {
    worker.addEventListener('message', this.handleMessage);
    worker.addEventListener('error', this.handleError);
  }

  prepare(onProgress?: (progress: number) => void) {
    return this.request<{ backend: EmbeddingRuntimeBackend }>({ type: 'prepare' }, onProgress);
  }

  embed(inputs: readonly string[]) {
    return this.request<number[][]>({ type: 'embed', inputs: [...inputs] });
  }

  dispose() {
    this.worker.removeEventListener('message', this.handleMessage);
    this.worker.removeEventListener('error', this.handleError);
    this.worker.terminate();
    for (const request of this.pending.values()) {
      request.reject(new Error('Embedding worker was disposed'));
    }
    this.pending.clear();
  }

  private request<T>(
    message: EmbeddingWorkerRequestPayload,
    onProgress?: (progress: number) => void,
  ) {
    const requestId = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onProgress,
      });
      this.worker.postMessage({ ...message, requestId } as EmbeddingWorkerRequest);
    });
  }

  private readonly handleMessage = (event: MessageEvent<EmbeddingWorkerResponse> | ErrorEvent) => {
    if (!('data' in event)) {
      return;
    }
    const response = event.data;
    const pending = this.pending.get(response.requestId);
    if (!pending) {
      return;
    }

    if (response.type === 'model-progress') {
      pending.onProgress?.(response.progress);
      return;
    }

    this.pending.delete(response.requestId);
    if (response.type === 'failed') {
      pending.reject(new Error(response.message));
    } else if (response.type === 'prepared') {
      pending.resolve({ backend: response.backend });
    } else {
      pending.resolve(response.embeddings);
    }
  };

  private readonly handleError = (event: MessageEvent<EmbeddingWorkerResponse> | ErrorEvent) => {
    const message = 'message' in event ? event.message : 'Embedding worker failed';
    for (const request of this.pending.values()) {
      request.reject(new Error(message));
    }
    this.pending.clear();
  };
}

let runtime: EmbeddingWorkerClient | undefined;

export function getEmbeddingRuntime() {
  if (!runtime) {
    runtime = new EmbeddingWorkerClient(
      new Worker(new URL('../workers/embedding.worker.ts', import.meta.url), {
        type: 'module',
        name: 'asterism-embeddings',
      }),
    );
  }
  return runtime;
}

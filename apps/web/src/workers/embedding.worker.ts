import { DEFAULT_EMBEDDING_MODEL } from '@asterism/core';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';
import type {
  EmbeddingRuntimeBackend,
  EmbeddingWorkerRequest,
  EmbeddingWorkerResponse,
} from '../lib/embedding-runtime';

const MODEL_FILE = 'onnx/model_quantized.onnx';
const scope = globalThis as unknown as {
  postMessage: (response: EmbeddingWorkerResponse) => void;
  addEventListener: (
    type: 'message',
    listener: (event: MessageEvent<EmbeddingWorkerRequest>) => void,
  ) => void;
};

let extractor: FeatureExtractionPipeline | undefined;
let selectedBackend: EmbeddingRuntimeBackend | undefined;
let preparing: Promise<EmbeddingRuntimeBackend> | undefined;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function modelProgress(event: unknown) {
  if (
    typeof event === 'object' &&
    event !== null &&
    'file' in event &&
    typeof event.file === 'string' &&
    event.file.endsWith(MODEL_FILE) &&
    'progress' in event &&
    typeof event.progress === 'number'
  ) {
    return Math.max(0, Math.min(100, event.progress));
  }
  return undefined;
}

async function loadExtractor(
  requestId: number,
  backend: EmbeddingRuntimeBackend,
): Promise<FeatureExtractionPipeline> {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = '/models/';
  env.useBrowserCache = true;
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = {
      mjs: '/embedding-runtime/ort-wasm-simd-threaded.mjs',
      wasm: '/embedding-runtime/ort-wasm-simd-threaded.wasm',
    };
    env.backends.onnx.wasm.proxy = false;
  }

  let reportedProgress = 0;
  return pipeline('feature-extraction', DEFAULT_EMBEDDING_MODEL, {
    device: backend,
    dtype: 'q8',
    progress_callback: (event) => {
      const progress = modelProgress(event);
      if (progress !== undefined && progress >= reportedProgress) {
        reportedProgress = progress;
        scope.postMessage({ type: 'model-progress', requestId, progress });
      }
    },
  });
}

async function prepare(requestId: number) {
  if (extractor && selectedBackend) {
    return selectedBackend;
  }
  if (preparing) {
    return preparing;
  }

  preparing = (async () => {
    const backends: EmbeddingRuntimeBackend[] = 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm'];
    let webgpuError: unknown;

    for (const backend of backends) {
      try {
        extractor = await loadExtractor(requestId, backend);
        selectedBackend = backend;
        return backend;
      } catch (error) {
        if (backend === 'webgpu') {
          webgpuError = error;
          continue;
        }
        const prefix = webgpuError
          ? `WebGPU failed (${errorMessage(webgpuError)}); WASM failed`
          : 'WASM failed';
        throw new Error(`${prefix}: ${errorMessage(error)}`);
      }
    }

    throw new Error('No browser embedding backend is available');
  })();

  try {
    return await preparing;
  } finally {
    preparing = undefined;
  }
}

scope.addEventListener('message', (event) => {
  const request = event.data;
  void (async () => {
    try {
      if (request.type === 'prepare') {
        const backend = await prepare(request.requestId);
        scope.postMessage({ type: 'prepared', requestId: request.requestId, backend });
        return;
      }

      await prepare(request.requestId);
      if (!extractor) {
        throw new Error('Embedding runtime was not prepared');
      }
      const output = await extractor(request.inputs, { pooling: 'mean', normalize: true });
      scope.postMessage({
        type: 'embedded',
        requestId: request.requestId,
        embeddings: output.tolist() as number[][],
      });
    } catch (error) {
      scope.postMessage({
        type: 'failed',
        requestId: request.requestId,
        message: errorMessage(error),
      });
    }
  })();
});

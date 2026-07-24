import { pipeline } from '@huggingface/transformers';

const stateElement = document.querySelector<HTMLPreElement>('#state') as HTMLPreElement;
const webgpuButton = document.querySelector<HTMLButtonElement>('#run-webgpu') as HTMLButtonElement;
const wasmButton = document.querySelector<HTMLButtonElement>('#run-wasm') as HTMLButtonElement;

type RuntimeState = {
  phase: 'idle' | 'loading' | 'embedding' | 'ready' | 'failed';
  requestedBackend: 'webgpu-first' | 'wasm';
  selectedBackend: 'webgpu' | 'wasm' | null;
  progress: number;
  initMs: number | null;
  inferenceMs: number | null;
  dimensions: number | null;
  webgpuFailure: string | null;
  error: string | null;
};

let state: RuntimeState = {
  phase: 'idle',
  requestedBackend: 'webgpu-first',
  selectedBackend: null,
  progress: 0,
  initMs: null,
  inferenceMs: null,
  dimensions: null,
  webgpuFailure: null,
  error: null,
};

function render() {
  stateElement.textContent = JSON.stringify(state, null, 2);
}

async function createExtractor(device: 'webgpu' | 'wasm') {
  const startedAt = performance.now();
  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
    device,
    dtype: 'q8',
    progress_callback: (event) => {
      if ('progress' in event && typeof event.progress === 'number') {
        state = { ...state, progress: event.progress };
        render();
      }
    },
  });
  return { extractor, initMs: performance.now() - startedAt };
}

async function run(requestedBackend: RuntimeState['requestedBackend']) {
  webgpuButton.disabled = true;
  wasmButton.disabled = true;
  state = {
    phase: 'loading',
    requestedBackend,
    selectedBackend: null,
    progress: 0,
    initMs: null,
    inferenceMs: null,
    dimensions: null,
    webgpuFailure: null,
    error: null,
  };
  render();

  try {
    let selectedBackend: 'webgpu' | 'wasm' = requestedBackend === 'wasm' ? 'wasm' : 'webgpu';
    let loaded: Awaited<ReturnType<typeof createExtractor>>;
    try {
      loaded = await createExtractor(selectedBackend);
    } catch (error) {
      if (selectedBackend !== 'webgpu') {
        throw error;
      }
      state = {
        ...state,
        webgpuFailure: error instanceof Error ? error.message : String(error),
        progress: 0,
      };
      render();
      selectedBackend = 'wasm';
      loaded = await createExtractor(selectedBackend);
    }

    state = {
      ...state,
      phase: 'embedding',
      selectedBackend,
      initMs: Math.round(loaded.initMs),
    };
    render();

    const inferenceStartedAt = performance.now();
    const inputs = Array.from(
      { length: 16 },
      (_, index) => `passage: multilingual repository search benchmark ${index}`,
    );
    const output = await loaded.extractor(inputs, {
      pooling: 'mean',
      normalize: true,
    });
    const values = output.tolist() as number[][];
    state = {
      ...state,
      phase: 'ready',
      inferenceMs: Math.round(performance.now() - inferenceStartedAt),
      dimensions: values[0]?.length ?? null,
      progress: 100,
    };
    render();
    await loaded.extractor.dispose();
  } catch (error) {
    state = {
      ...state,
      phase: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
    render();
  } finally {
    webgpuButton.disabled = false;
    wasmButton.disabled = false;
  }
}

webgpuButton.addEventListener('click', () => void run('webgpu-first'));
wasmButton.addEventListener('click', () => void run('wasm'));
render();

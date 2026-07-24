import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
const MODEL_BASE = `https://huggingface.co/Xenova/multilingual-e5-small/resolve/${MODEL_REVISION}`;
const MODEL_SHA256 = 'f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptDirectory, '../../..');
const assetRoot = join(repositoryRoot, '.cache/embedding-assets/v1/public');
const modelRoot = join(assetRoot, 'models/multilingual-e5-small');

const modelFiles = [
  'config.json',
  'quant_config.json',
  'sentencepiece.bpe.model',
  'special_tokens_map.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/model_quantized.onnx',
];

async function sha256(path) {
  const content = await readFile(path);
  return createHash('sha256').update(content).digest('hex');
}

async function fileExists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function download(relativePath) {
  const destination = join(modelRoot, relativePath);
  if (await fileExists(destination)) {
    if (
      relativePath !== 'onnx/model_quantized.onnx' ||
      (await sha256(destination)) === MODEL_SHA256
    ) {
      return;
    }
  }

  const response = await fetch(`${MODEL_BASE}/${relativePath}`);
  if (!response.ok) {
    throw new Error(`Failed to download ${relativePath}: ${response.status}`);
  }
  const temporary = `${destination}.part`;
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(temporary, new Uint8Array(await response.arrayBuffer()));
  if (relativePath === 'onnx/model_quantized.onnx' && (await sha256(temporary)) !== MODEL_SHA256) {
    throw new Error('Downloaded embedding model failed its SHA-256 integrity check');
  }
  await rename(temporary, destination);
}

await Promise.all(modelFiles.map(download));

const require = createRequire(import.meta.url);
const transformersEntry = require.resolve('@huggingface/transformers');
const onnxEntry = createRequire(transformersEntry).resolve('onnxruntime-web');
const onnxDist = dirname(onnxEntry);
const wasmRoot = join(assetRoot, 'embedding-runtime');
await mkdir(wasmRoot, { recursive: true });
for (const file of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await copyFile(join(onnxDist, file), join(wasmRoot, file));
}

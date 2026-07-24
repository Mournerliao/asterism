import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { Agent as HttpsAgent, get as httpsGet } from 'node:https';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { connect as tlsConnect } from 'node:tls';
import { fileURLToPath } from 'node:url';

const MODEL_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
// Allow a mirror (e.g. https://hf-mirror.com) where huggingface.co is blocked or throttled.
const MODEL_HOST = (process.env.HF_ENDPOINT ?? 'https://huggingface.co').replace(/\/+$/, '');
const MODEL_BASE = `${MODEL_HOST}/Xenova/multilingual-e5-small/resolve/${MODEL_REVISION}`;
const DOWNLOAD_ATTEMPTS = 3;
const ALLOW_MISSING = ['1', 'true', 'yes'].includes(
  (process.env.ASTERISM_ALLOW_MISSING_EMBEDDING_ASSETS ?? '').toLowerCase(),
);
// Node's built-in fetch ignores system/OS proxies, so honor the conventional
// proxy variables ourselves and tunnel downloads through them via HTTP CONNECT.
const PROXY_URL =
  process.env.HTTPS_PROXY ??
  process.env.https_proxy ??
  process.env.ALL_PROXY ??
  process.env.all_proxy ??
  process.env.HTTP_PROXY ??
  process.env.http_proxy ??
  '';
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

class ProxyTunnelAgent extends HttpsAgent {
  constructor(proxyUrl, options) {
    super({ keepAlive: false, ...options });
    this.proxy = new URL(proxyUrl);
  }

  createConnection(options, callback) {
    const targetHost = options.host;
    const targetPort = options.port || 443;
    const headers = { Host: `${targetHost}:${targetPort}` };
    if (this.proxy.username) {
      const credentials = `${decodeURIComponent(this.proxy.username)}:${decodeURIComponent(this.proxy.password)}`;
      headers['Proxy-Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
    }
    const connectRequest = httpRequest({
      host: this.proxy.hostname,
      port: this.proxy.port || 80,
      method: 'CONNECT',
      path: `${targetHost}:${targetPort}`,
      headers,
      agent: false,
    });
    connectRequest.once('connect', (response, socket) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        callback(
          new Error(`Proxy refused CONNECT to ${targetHost} (status ${response.statusCode})`),
        );
        return;
      }
      callback(null, tlsConnect({ socket, servername: options.servername || targetHost }));
    });
    connectRequest.once('error', callback);
    connectRequest.end();
  }
}

let proxyAgent;
function proxyDownload(targetUrl, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (!proxyAgent) {
      proxyAgent = new ProxyTunnelAgent(PROXY_URL);
    }
    const url = new URL(targetUrl);
    const request = httpsGet(
      {
        host: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        servername: url.hostname,
        agent: proxyAgent,
        headers: { 'User-Agent': 'asterism-prepare-embedding-assets', Accept: '*/*' },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects while downloading via proxy'));
            return;
          }
          resolve(
            proxyDownload(
              new URL(response.headers.location, targetUrl).toString(),
              redirectsLeft - 1,
            ),
          );
          return;
        }
        if (status !== 200) {
          response.resume();
          reject(new Error(`Failed to download ${url.pathname}: ${status}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
        response.on('error', reject);
      },
    );
    request.once('error', reject);
    request.setTimeout(30_000, () => {
      request.destroy(new Error('Proxy request timed out'));
    });
  });
}

async function fetchOnce(targetUrl) {
  if (PROXY_URL) {
    return proxyDownload(targetUrl);
  }
  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${targetUrl}: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchModelFile(relativePath) {
  let lastError;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await fetchOnce(`${MODEL_BASE}/${relativePath}`);
    } catch (error) {
      lastError = error;
      if (attempt < DOWNLOAD_ATTEMPTS) {
        const reason = error?.cause?.code ?? error?.message ?? 'error';
        console.warn(
          `  \u00b7 ${relativePath}: attempt ${attempt} failed (${reason}), retrying\u2026`,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError;
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

  const bytes = await fetchModelFile(relativePath);
  const temporary = `${destination}.part`;
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(temporary, bytes);
  if (relativePath === 'onnx/model_quantized.onnx' && (await sha256(temporary)) !== MODEL_SHA256) {
    throw new Error('Downloaded embedding model failed its SHA-256 integrity check');
  }
  await rename(temporary, destination);
}

if (PROXY_URL) {
  console.log(`[prepare-embedding-assets] Routing model downloads via proxy ${PROXY_URL}`);
}
try {
  await Promise.all(modelFiles.map(download));
} catch (error) {
  const isIntegrityFailure = error instanceof Error && error.message.includes('integrity check');
  if (ALLOW_MISSING && !isIntegrityFailure) {
    console.warn('\n[prepare-embedding-assets] Embedding model assets are unavailable:');
    console.warn(`  ${error?.cause?.code ?? error?.message ?? error}`);
    console.warn(
      '  ASTERISM_ALLOW_MISSING_EMBEDDING_ASSETS is set \u2192 continuing without them.',
    );
    console.warn('  Semantic search stays disabled at runtime; keyword search is unaffected.\n');
    process.exit(0);
  }
  console.error('\n[prepare-embedding-assets] Failed to prepare embedding model assets.');
  if (isIntegrityFailure) {
    console.error(`  ${error.message}`);
  } else {
    console.error(`  Reason: ${error?.cause?.code ?? error?.message ?? error}`);
    console.error(`  Source: ${MODEL_BASE}`);
    if (PROXY_URL) {
      console.error(`  Proxy in use: ${PROXY_URL} (tunneled via HTTP CONNECT).`);
      console.error('  Check the proxy is running and permits CONNECT to the model host.');
    } else {
      console.error('  Node ignores system/OS proxies. To route downloads through your proxy:');
      console.error("    PowerShell:  $env:HTTPS_PROXY='http://127.0.0.1:7890'; pnpm build");
      console.error('    bash/zsh:    HTTPS_PROXY=http://127.0.0.1:7890 pnpm build');
    }
    console.error('  If Hugging Face is blocked or slow, use a mirror instead, e.g.:');
    console.error("    PowerShell:  $env:HF_ENDPOINT='https://hf-mirror.com'; pnpm build");
    console.error('    bash/zsh:    HF_ENDPOINT=https://hf-mirror.com pnpm build');
    console.error('  Or build without semantic-search assets (keyword search still works):');
    console.error("    PowerShell:  $env:ASTERISM_ALLOW_MISSING_EMBEDDING_ASSETS='1'; pnpm build");
  }
  process.exit(1);
}

const require = createRequire(import.meta.url);
const transformersEntry = require.resolve('@huggingface/transformers');
const onnxEntry = createRequire(transformersEntry).resolve('onnxruntime-web');
const onnxDist = dirname(onnxEntry);
const wasmRoot = join(assetRoot, 'embedding-runtime');
await mkdir(wasmRoot, { recursive: true });
for (const file of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await copyFile(join(onnxDist, file), join(wasmRoot, file));
}

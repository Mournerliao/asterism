# Browser embedding assets

Asterism serves the browser embedding runtime from its own origin. `pnpm build` and `pnpm dev`
invoke `scripts/prepare-embedding-assets.mjs`, which materializes a pinned asset tree under the
ignored repository cache `.cache/embedding-assets/v1/public`; Vite then copies that tree into the
deployment.

- Model: `Xenova/multilingual-e5-small`
- Upstream revision: `761b726dd34fb83930e26aab4e9ac3899aa1fa78`
- Profile: q8 (`onnx/model_quantized.onnx`, 118,308,185 bytes)
- Model SHA-256: `f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193`
- License: MIT (inherited from `intfloat/multilingual-e5-small`)

The browser runtime sets `allowRemoteModels = false`, points `localModelPath` and ONNX WASM paths
at these same-origin files, and lets Transformers.js use the Cache API. Runtime use therefore does
not depend on Hugging Face or jsDelivr; the external source is contacted only while preparing a
clean deployment artifact.

## Network fallbacks for preparation

Only the preparation step (never runtime) contacts the upstream. Node's build-time `fetch` reaches
`huggingface.co` directly and does **not** read the system/OS/browser proxy, so it can time out
(`UND_ERR_CONNECT_TIMEOUT`) even where a browser opens Hugging Face fine. Three knobs keep `pnpm build`
resilient without touching the pinned revision or SHA:

- **Proxy** — set `HTTPS_PROXY` (or the other conventional proxy variables) and the preparation script
  tunnels each download through it via an HTTP `CONNECT` agent, because Node's `fetch` will not do so
  itself. Use this when Hugging Face is only reachable through your local proxy/VPN. When a proxy is
  detected the script logs `Routing model downloads via proxy …` at startup, so you can confirm the
  variable actually reached the build (set it in the *same* shell right before `pnpm build`):
  - PowerShell: `$env:HTTPS_PROXY='http://127.0.0.1:7890'; pnpm build`
  - bash/zsh: `HTTPS_PROXY=http://127.0.0.1:7890 pnpm build`
- **Mirror** — set `HF_ENDPOINT` to a Hugging Face mirror to download the
  *real* assets where the canonical host is blocked or throttled:
  - PowerShell: `$env:HF_ENDPOINT='https://hf-mirror.com'; pnpm build`
  - bash/zsh: `HF_ENDPOINT=https://hf-mirror.com pnpm build`
- **Skip** — set `ASTERISM_ALLOW_MISSING_EMBEDDING_ASSETS=1` to build without the model when it is
  genuinely unreachable. The bundle still ships; semantic search stays disabled at runtime and Browse
  falls back to keyword search. A downloaded-but-corrupt model (SHA-256 mismatch) still fails hard —
  that is data integrity, not availability.

The download retries three times before giving up. `HF_ENDPOINT` and
`ASTERISM_ALLOW_MISSING_EMBEDDING_ASSETS` change *what* gets produced, so they are declared under
`build.env` in `turbo.json` (part of the cache key); the proxy variables only change the *route*, not
the bytes, so they are declared under `build.passThroughEnv`. Both lists let Turborepo's strict env
mode pass the variables through to the script.

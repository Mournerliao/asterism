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

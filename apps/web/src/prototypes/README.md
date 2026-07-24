# PROTOTYPE — #19 embedding runtime

Question: for `Xenova/multilingual-e5-small`, which published quantization satisfies the explicit
roughly 100 MB bootstrap, and can the runtime attempt WebGPU first while recovering to WASM?

Run:

```sh
pnpm --filter @asterism/web prototype:embedding
```

The model repository currently publishes q8 at 118 MB, q4 at 399 MB, and q4f16 at 205 MB. The
harness therefore measures q8 only; q4 fails the download-budget question before inference. It
prints the complete runtime state after every transition, including WebGPU failure, selected
backend, initialization time, inference time, and output dimensions.

Observed on the implementation machine (Chromium, warm browser cache, 16 short passage inputs):

- WebGPU: 1,002 ms initialization, 454 ms inference, 384 dimensions.
- WASM: 608 ms initialization, 236 ms inference, 384 dimensions.
- Cold WebGPU: 39,250 ms initialization including first download/compile; 1,359 ms for one input.

Verdict: select q8 because it is the only published profile near the agreed bootstrap budget.
Attempt WebGPU first to honor capable devices, but make WASM a first-class fallback because q8
performance is device-dependent and was faster on this machine. Use 16-item resumable chunks and
never block the existing keyword search on model readiness.

This is throwaway code. It uses the upstream model host so the two runtime paths can be tested
without first solving production asset delivery. Production absorbs only the q8 and fallback
decision, then serves every model and WASM asset from the application origin.

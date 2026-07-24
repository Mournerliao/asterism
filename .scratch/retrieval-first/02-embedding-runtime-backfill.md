> 先读：ADR 0026 §3 Embedding=平台能力（纯浏览器内）/ §4 客户端直写；`knowledge/contracts/architecture.md` 的 Provider 边界；`packages/ui` 组合模式与 impeccable、Graphite Glass 规范。

## What to build

用户可在设备上一次性「准备搜索」：应用**同源自托管**的 `multilingual-e5-small` 懒下载并缓存后，把本人整库仓库嵌成向量、经普通 RLS **直写自己的行**；回填增量、分块可续跑，弱设备优雅降级。这让上一票的空表被真实向量填充，是检索 / 星图的运行时前提。

**prototype 先行**：量化档位（q8 / q4）与 WebGPU / WASM 回退取舍建议先用 `/prototype` 实测，把选定档位结论带回本票再实现。

## Acceptance criteria

- [ ] 首次触发搜索能力时懒下载模型并缓存（Cache API / IndexedDB），二次打开不重复下载；包一层「一次性准备搜索（约 100MB）」的显式 UX 与进度反馈。
- [ ] 模型文件由应用**同源自托管**（不依赖外部 CDN），锁网 / 离线可用。
- [ ] 回填遍历上一票的「待嵌集合」，分块可续跑；sync 后新增仓库自动进入待嵌集合；全部就绪后再开近乎 no-op。
- [ ] 向量经普通 RLS 由客户端直写本人行，**无受信写入路径、无跨用户投毒面**。
- [ ] 运行位置 WebGPU 优先、WASM 回退；弱设备 / 模型未就绪时优雅降级为既有关键词搜索，不阻断浏览。
- [ ] 被嵌文本与查询分别加 e5 的 `passage:` / `query:` 前缀。
- [ ] en / zh-CN 文案齐全，遵循 Graphite Glass 与 impeccable；`pnpm lint / typecheck / test / build` 全绿；更新 `knowledge/state/*` 与 `logs/`。

## Blocked by

- #18 — Embeddings 表与 owner-only 写入地基。

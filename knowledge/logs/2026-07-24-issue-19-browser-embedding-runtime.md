# 2026-07-24 · GitHub #19 浏览器 embedding 运行时与全库回填

## 目标

在 #18 的 `user_repo_embeddings` owner-only 数据地基上交付纯浏览器 embedding：同源自托管、首次显式准备、WebGPU / WASM 后端、可续跑全库回填，以及失败时不阻断关键词搜索。

## 原型结论

先在隔离 worktree 的真实 Chromium 中验证 `@huggingface/transformers` 4.2.0 与固定 revision `Xenova/multilingual-e5-small@761b726dd34fb83930e26aab4e9ac3899aa1fa78`：

- q8 ONNX 为 118,308,185 bytes，q4 为 399 MB，q4f16 为 205 MB；选择 q8。
- q8 SHA-256 为 `f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193`。
- 暖缓存、batch 16：WebGPU 初始化 1.002s、推理 454ms；WASM 初始化 608ms、推理 236ms；两者均输出 384 维。
- 冷 WebGPU 首次下载 / 编译 39.25s，单条推理 1.359s。
- 原型分支 `codex/prototype-19-embedding-runtime`，提交 `6cdc17d`；结论已回写 GitHub #19。

本机 WASM 更快不代表其它 GPU / 设备。最终仍按产品契约采用 WebGPU 优先、异常回退 WASM。

## 实现

- `packages/core` 固化 e5 `passage:` / `query:` 输入边界，并提供 batch 16 的回填 runner：校验返回数量与 384 维，逐行持久化和上报真实进度。
- Web Worker 懒加载 Transformers.js；运行期 `allowRemoteModels = false`，模型只读 `/models/`，WASM 只读 `/embedding-runtime/`，Cache API 负责浏览器缓存。
- 构建前脚本从固定 revision 获取模型资产、校验 q8 哈希，并从锁定依赖复制 ONNX Runtime WASM；缓存源目录被 gitignore，生产构建产物包含完整同源资产。来源、许可与复现命令记录在 `apps/web/EMBEDDING_ASSETS.md`。
- 回填先经 `packages/db` 求 owner 的缺失 / 模型失配 / 内容失配集合。Star 与向量元数据读取都按稳定顺序分页，越过 PostgREST 默认 1,000 行上限。全量新鲜时不创建 Worker；非空才准备运行时。每条向量经普通用户会话、带 `userId` 的 owner-only RLS upsert 写入，成功一条即形成续跑检查点。
- 用户首次在 Browse 显式选择「准备搜索」，双语披露约 100–150 MB；选择按用户与模型版本记在本地。完成后，sync 新增仓库或内容哈希变化会自动增量回填。
- 任一运行时 / 下载 / 写入失败进入 degraded 状态，只提供原位重试；既有关键词搜索始终可用。
- Graphite Glass 状态条覆盖 checking、模型下载、回填、ready 与 degraded；进度使用语义 `progressbar`、`aria-live`，reduced-motion 下移除旋转 / 宽度动效。

## 双轴代码审查收敛

以 `a0c7452...cb4c4d2` 为固定审查点并行执行 Standards / Spec 两轴，6 项发现全部修复：

- consent、running task 与 UI 回调按 user + generation 隔离，A → B 切换不会继承 A 的授权或异步状态；
- Star / embedding metadata 分页直到耗尽，覆盖上千 Stars；
- 回填运行中 records signature 改变会在当前任务结束后显式排队下一轮；
- 只把 118 MB 主 ONNX 文件的单调进度展示为下载百分比，配置 / tokenizer 阶段不制造假进度；
- 不向用户展示 Transformers / ONNX 原始英文错误，只保留已本地化的关键词降级说明；
- fatal Worker 错误会终止并失效 singleton，Retry 可重建；请求另有 5 分钟超时避免永久悬挂。

两轴对修复 diff 再次复核，均为 PASS，无剩余 P1 / P2。

## TDD 与验证

先红后绿覆盖：

- core：18 条切成 `[16, 2]`、逐行检查点、空集无调用、失败后保留已完成项、维度拒绝、e5 前缀；
- web orchestration：全新路径完全不准备运行时、passage 输入与 model / hash 写入；
- worker client：准备进度、后端选择、嵌入结果与错误传播；
- UI：明确下载披露 / CTA、回填进度 a11y、关键词降级与重试；
- en / zh-CN locale 完整性与中文混排规则。

最终门禁：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全绿。测试计数为 core 155、db 62、Supabase Functions 94、web 167；生产构建仅保留既有主 chunk warning。

真实应用浏览器视觉复核未能执行：启动本地服务器所需的系统授权因本轮 Codex 用量限制被拒绝。真实 Chromium 的模型 / 后端原型验证、DOM / a11y 组件回归与生产构建均已完成；没有绕过系统限制。

## 后续

#20 可直接消费同一 Worker client，用 `toQueryInput` 生成查询向量并实现隐形混合排序；#21 可并行原型化确定性 2D 投影与分层渲染。

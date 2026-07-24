# Issue #18 · 检索优先 Embeddings 表与 owner-only 写入地基

日期：2026-07-24

## 范围

ADR 0026 检索优先范式的第一个 tracer-bullet 纵向切片：建立按用户存储的语义向量地基。
本票**不引入模型运行时、不产生任何用户可见 UI**——只落地数据结构（表 + RLS）、`packages/core`
的纯逻辑（模型常量、content-hash、待嵌集合）与 `packages/db` 的 owner 读写边界，通过 RLS
同构与单测验证。浏览器内 embedding 运行时与全库回填是后续 #19。

## 实现

- 新增幂等迁移 `20260724120000_user_repo_embeddings.sql` 建 `user_repo_embeddings`：
  `extensions.vector(384)` + `embedding_model` + `content_hash`，`(user_id, repo_id)` 唯一、
  对 `auth.users` / `repos` 级联删除、`user_id` 与 `repo_id` 双索引、`set_updated_at` 触发器，
  与 `notes` 表逐字同构。owner-only RLS `user_repo_embeddings_owner_all`（`for all to
  authenticated`，`using` 与 `with check` 均 `(select auth.uid()) = user_id`）。规模尚小，
  **先不建 ANN（HNSW / IVFFlat）索引**，留待向量量级变大再评估。
- `packages/core` 新增 `embeddings` 模块：钉死可版本化默认模型常量 `multilingual-e5-small`
  与维度 `384`；`embeddableRepoText` 以确定性顺序组装 `full_name` + `description` + `topics`
  （trim、跳过空段、不加 e5 的 `query:` / `passage:` 前缀）；`computeContentHash` 为 FNV-1a
  64-bit 定长十六进制（同步、无依赖、浏览器 / Node 一致，仅探测文本变化非安全用途）；
  `selectReposToEmbed` 纯函数求「待嵌集合 = 无行 / 模型失配 / 内容失配」，天然增量可续跑。
- `packages/db` 新增 `queries/embeddings.ts`：`upsertRepoEmbedding`（onConflict
  `user_id,repo_id`）、`listRepoEmbeddings`（含向量）、`listRepoEmbeddingMeta`（不拉向量，
  轻量探测过期）、`listReposToEmbed`（读元数据后套用 core 纯函数）。vector 经 PostgREST 以
  文本字面量 `'[..]'` 往返，dedicated 助手做 `number[]` ↔ 字面量转换。补齐手写
  `database.types` 的 `user_repo_embeddings` 表类型；数据访问只经 `packages/db` 边界。
- 导出经 `packages/core/src/index.ts` 与 `packages/db/src/index.ts` 对外暴露。

## 验证边界与 RLS 回归决策

验收标准 #2 要求「跨用户读写被拒，并有回归测试证明」。本仓 CI 无 Postgres、无 pgTAP
（引入会违反 runtime baseline，需 ADR），而真实 RLS 一贯由真实环境 smoke test 验收
（见 PROGRESS 的 Phase 1 测试边界）。据此分层，不静默偏离：

- **迁移层**：RLS policy 与已在真实环境验证过的 `notes` 逐字同构，继承其隔离保证。
- **CI-green 回归面**：新增 `packages/db` 单测（可链式桩 client）证明每条读写都显式按
  `user_id` 收窄、upsert 用 `(user_id, repo_id)` onConflict、vector 正确序列化与解析，
  防止未来改动误发跨用户或未收窄语句。
- **真实环境冒烟**：`supabase/README.md` 增补跨用户步骤——用户 A 写入、用户 B 对该行
  `select` / `update` / `delete` 应命中 0 行——待迁移应用到真实项目时执行。

## 门禁

- `pnpm lint`（biome check，293 files，无问题）
- `pnpm typecheck`（9 tasks 通过）
- `pnpm test`（core 146 / db 60 / web 155 通过；functions 未改动）
- `pnpm build`（6 tasks 通过；仅既有 Vite 主 chunk warning）

本次实现 ADR 0026 的地基切片，无新增 ADR；`data-model.md` 已在 ADR 0026 Accept 时预先
写入 `user_repo_embeddings` 表与 RLS，本次迁移与之对齐。

> 先读：ADR 0026（检索优先范式）§4 向量按用户存储 / §6 数据模型；`knowledge/contracts/data-model.md` 的 `user_repo_embeddings`。落地前对齐契约，如有出入回写 knowledge。

## What to build

建立检索优先范式 derived 平面的地基：一张**按用户存储**的仓库语义向量表，以及本人可直接读写自己向量行的数据访问路径与「待嵌集合」推导逻辑。这是后续检索 / 星图 / 聚类所有切片的唯一前置。

本票**不引入模型运行时**、**不产生用户可见 UI**；通过 RLS 与单元测试验证。向量是 derived 数据（可随模型升级重算、永不写入 canonical）。

## Acceptance criteria

- [ ] 新增幂等迁移创建 `user_repo_embeddings`：384 维向量 + `embedding_model` + `content_hash`，`(user_id, repo_id)` 唯一，级联删除，`set_updated_at` 触发器，与 `notes` 表同构；**先不建 ANN 索引**（HNSW / IVFFlat 留待规模变大）。
- [ ] RLS 与 `notes` 同构：本人可 select / insert / update / delete（`user_id = auth.uid()`）；跨用户读写被拒，并有回归测试证明。
- [ ] `packages/core` 新增 embeddings 模块：全局钉死、可版本化的默认模型 ID 常量（`multilingual-e5-small`）；被嵌文本（`full_name` + `description` + `topics`）的 content-hash；「待嵌集合 = 无行 / `embedding_model` 失配 / `content_hash` 失配」的纯函数，均有单测。
- [ ] `packages/db` 提供 owner 向量 upsert、读取、以及「求缺失 / 过期集合」查询，并补齐手写 `database.types`；数据访问只经 `packages/db` 边界。
- [ ] `pnpm lint / typecheck / test / build` 全绿；完成后更新 `knowledge/state/*` 并追加 `knowledge/logs/`。

## Blocked by

- None — can start immediately.

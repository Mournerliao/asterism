# PROGRESS · 项目进度与里程碑

> 持久状态层（Durable State）。本文件记录 Asterism 的**长期进度与里程碑**，是跨会话恢复"项目走到哪一步"的单一参考。
> 它不同于编排/会话记忆（那类属于 agent 临时 context），这里只沉淀对项目有长期意义的状态变化。
> 维护约定：每完成一个里程碑或阶段，更新本文件 + 在 `knowledge/logs/` 追加对应运行日志；细碎便签写 `NOTES.md`，待办写 `BACKLOG.md`。

## 当前状态

**阶段：Phase 0 脚手架（Scaffold）— 本地骨架已完成，等待 Supabase / GitHub OAuth 凭据。**

初始化（Initialization）已于 2026-06-29 完成（知识库 + 开源基础 + Monorepo 根配置 + 提交钩子 + 首次提交）。

Phase 0 本地骨架已完成事项（见 `logs/2026-06-29-phase0-scaffold.md`、`decisions/0004-phase0-scaffold-choices.md`）：

- Monorepo 实包就位：`packages/{config,core,ui,db}` 与 `apps/{web,extension,desktop}` 均为最小可构建骨架。
- 共享包骨架：`core`（领域类型占位 + 用例）、`db`（`createSupabaseClient` + Dexie 缓存占位，唯一数据访问入口）、`ui`（Tailwind v4 + shadcn neutral 主题 + `Button`）、`config`（tsconfig 预设）。
- `apps/web`：Vite + React Router + 最小 react-i18next（en/zh-CN），已 `import @asterism/{ui,core,db}` 打通依赖图。
- `apps/extension`：WXT（MV3）最小 popup；`apps/desktop`：占位包（Tauri 2 推迟 Phase 4）。
- 工程门全绿：`pnpm lint`（Biome）/ `pnpm typecheck` / `pnpm test`（Vitest）/ `pnpm build`（Turborepo）均通过。
- CI：`.github/workflows/ci.yml`（pnpm + Node 22，lint/typecheck/test/build）。
- `.env.example` 就位（`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 占位，无真实值）。

**下一步（需凭据）**：拿到 Supabase `Project URL` / `anon key` 与 GitHub OAuth 后，完成 Phase 0 剩余里程碑——`supabase/migrations` 初始 schema + RLS（对齐 `contracts/data-model.md`）、启用 pgvector、打通 GitHub OAuth 登录回流。

> 说明：本地骨架为**占位实现**，尚未接入真实数据/同步逻辑；进入 Phase 1 开发需另行批准。

## 里程碑清单

### Phase 0 · 脚手架（Scaffolding）

- [x] 在 `apps/{web,extension,desktop}`、`packages/{core,ui,db,config}` 建实包骨架
- [x] `packages/core`/`ui`/`db` 共享包最小可构建（含 TS 配置、入口、占位导出）
- [x] CI（GitHub Actions）跑通 lint / typecheck / test / build 基线
- [ ] 创建 Supabase 项目，落地初始 schema 与 RLS（对齐 `contracts/data-model.md`）— **待凭据**
- [ ] 打通 GitHub OAuth（Supabase Auth GitHub provider），本地可登录 — **待凭据**

### Phase 1 · Web MVP

- [ ] 同步 GitHub stars（首次全量 + 增量）
- [ ] 仓库卡片/列表视图 + 虚拟滚动（TanStack Virtual）
- [ ] 多维筛选与搜索（语言/topic/时间等）
- [ ] 标签（tags）与集合（collections）管理
- [ ] 笔记（notes）
- [ ] 统计仪表盘（shadcn Charts）
- [ ] 导入/导出

### Phase 2 · 浏览器扩展

- [ ] WXT（MV3）popup 快速搜索
- [ ] content-script 页内打标签/写笔记
- [ ] 与 Web 共享 Supabase 会话

### Phase 3 · AI（BYOK）

- [ ] `pgvector` 向量化（`repo_embeddings`）
- [ ] 语义搜索
- [ ] AI 自动分类/打标
- [ ] Edge Functions（`sync-stars` / `ai-embed`）
- [ ] BYOK 密钥加密存储（`user_settings`）

### Phase 4 · 桌面端

- [ ] Tauri 2 套壳复用 Web 前端
- [ ] 桌面端打包与发布流程

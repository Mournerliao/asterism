# PROGRESS · 项目进度与里程碑

> 持久状态层（Durable State）。本文件记录 Asterism 的**长期进度与里程碑**，是跨会话恢复"项目走到哪一步"的单一参考。
> 它不同于编排/会话记忆（那类属于 agent 临时 context），这里只沉淀对项目有长期意义的状态变化。
> 维护约定：每完成一个里程碑或阶段，更新本文件 + 在 `knowledge/logs/` 追加对应运行日志；细碎便签写 `NOTES.md`，待办写 `BACKLOG.md`。

## 当前状态

**阶段：初始化（Initialization）— 已完成。**

已完成事项：

- 已建立面向 Loop Engineering 的 `knowledge/` 知识库（contracts / decisions / loops / state / runbooks / logs，纯 markdown、工具无关）
- 已搭好开源基础：`README.md`、`LICENSE`（MIT）、`CONTRIBUTING.md`
- 已写 `AGENTS.md`（声明 `knowledge/` 为单一事实源，含 loop 工作纪律与边界）
- 已写仓库与 Monorepo 根配置（`.gitignore`、`.editorconfig`、`.nvmrc`、`package.json`、`pnpm-workspace.yaml`、`turbo.json`、`biome.json`、`tsconfig.base.json`、`.changeset/config.json`）
- 已接入提交规范与 git 钩子：commitlint（`@commitlint/config-conventional`）+ lefthook（`commit-msg` 跑 commitlint、`pre-commit` 跑 Biome），首次提交即生效
- 已完成首次 git 提交（Conventional Commits：英文 subject + 中文 body，经钩子校验通过）

**下一步：Phase 0 脚手架**（见 `knowledge/roadmap.md`）——Monorepo 实包、共享包骨架、Supabase 项目 + schema + RLS、GitHub OAuth 打通。

> 说明：当前仅完成初始化与知识沉淀，**未编写任何业务代码**；进入各阶段开发需另行批准。

## 里程碑清单

### Phase 0 · 脚手架（Scaffolding）

- [ ] 在 `apps/{web,extension,desktop}`、`packages/{core,ui,db,config}` 建实包骨架
- [ ] `packages/core`/`ui`/`db` 共享包最小可构建（含 TS 配置、入口、占位导出）
- [ ] 创建 Supabase 项目，落地初始 schema 与 RLS（对齐 `contracts/data-model.md`）
- [ ] 打通 GitHub OAuth（Supabase Auth GitHub provider），本地可登录
- [ ] CI（GitHub Actions）跑通 lint / typecheck / test 基线

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

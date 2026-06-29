# Asterism · 路线图（Roadmap）

> 本文是分阶段路线图（契约/规划层）。每个阶段标注目标与里程碑，作为后续 loop 验收与进度跟踪（`state/PROGRESS.md`）的依据。各阶段开发需另行批准。

## 当前状态（Current Status）

- **Phase 0 尚未开始**：当前仅完成项目初始化（knowledge/ 知识库 + 开源基础文件 + 仓库基础配置 + Monorepo 根配置 + 首次提交）。
- 业务代码（`apps/*`、`packages/*` 内实现、`supabase/` 迁移与函数）均未开始。

| 阶段 | 名称 | 状态 |
| --- | --- | --- |
| Phase 0 | 脚手架 Scaffold | 未开始（Not started） |
| Phase 1 | Web MVP | 未开始 |
| Phase 2 | 浏览器扩展 Extension | 未开始 |
| Phase 3 | AI（BYOK） | 未开始 |
| Phase 4 | 桌面 Desktop | 未开始 |

---

## Phase 0 · 脚手架（Scaffold）

目标：把蓝图变成可运行的最小工程骨架，打通"登录 + 读取 star"的端到端链路基础。

里程碑：

- Monorepo 实包就位：`apps/{web,extension,desktop}` 与 `packages/{core,ui,db,config}` 的最小可构建骨架。
- 共享包骨架：`core`（GitHub API/同步/模型）、`ui`（shadcn + Tailwind 基底）、`db`（Supabase 客户端 + 查询 + Dexie 缓存）的导出边界与占位实现。
- Supabase 项目就绪：建项目、初版 schema、启用 RLS、`pgvector` 扩展预备（表结构按 `contracts/data-model.md`）。
- GitHub OAuth 打通：Supabase Auth GitHub provider 配置完成，可完成登录回流。

完成判据：能本地启动 Web 应用、完成 GitHub 登录、并从 Supabase 读到当前用户的基础数据。

## Phase 1 · Web MVP

目标：交付可日常使用的 Web 端 GitHub Star 管理器。

里程碑：

- 同步 stars：拉取用户 star 列表并入库（增量/全量）。
- 列表展示：卡片/列表视图 + **虚拟滚动**（TanStack Virtual），支撑上万条无卡顿。
- 多维筛选与搜索：按语言、topics、时间等过滤 + 关键词搜索。
- 标签（tags）、集合（collections）、笔记（notes）：用户侧组织能力。
- 统计仪表盘：语言/时间/标签等维度的可视化（shadcn Charts）。
- 导入 / 导出：数据可迁移（如 JSON/CSV）。

完成判据：用户可登录、同步、组织（标签/集合/笔记）、搜索筛选并查看统计，数据按 RLS 隔离。

## Phase 2 · 浏览器扩展（Extension）

目标：把核心能力带到浏览网页的即时场景。

里程碑：

- WXT（MV3）popup：快速搜索已 star 的仓库。
- content-script：在 GitHub 仓库页内直接打标签 / 记笔记。
- 共享会话：复用 Supabase 会话或 `chrome.identity.launchWebAuthFlow`，与 Web 端数据互通。

完成判据：扩展可登录并与 Web 端共享同一份用户数据，可在页内即时打标签/笔记。

## Phase 3 · AI（BYOK）

目标：在不托管模型成本的前提下，引入语义检索与智能分类（用户自带 key）。

里程碑：

- 向量化：用 `pgvector` 存储仓库 embedding（`repo_embeddings`）。
- 语义搜索：基于向量相似度的检索能力。
- AI 自动分类：辅助生成标签/集合建议。
- Edge Functions：`ai-embed` 等服务端逻辑，安全持有/转发用户 key。
- BYOK：用户自带 OpenAI/兼容 key，密钥**加密存储**（`user_settings`）。

完成判据：用户配置自有 key 后可做语义搜索与 AI 分类，密钥不落明文、不入客户端/仓库。

## Phase 4 · 桌面（Desktop）

目标：提供原生桌面体验。

里程碑：

- Tauri 2 套壳复用 Web 前端。
- 桌面端打包与分发流程。

完成判据：桌面应用可安装运行，复用既有 Web 能力与共享包。

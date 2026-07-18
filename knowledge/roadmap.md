# Asterism · 路线图（Roadmap）

> 本文是分阶段路线图（契约/规划层）。每个阶段标注目标与里程碑，作为后续 loop 验收与进度跟踪（`state/PROGRESS.md`）的依据。各阶段开发需另行批准。

## 当前状态（Current Status）

- **Phase 0 已验收（2026-06-29）**：Monorepo 实包、共享包骨架、CI、初始 schema + RLS 迁移、GitHub OAuth 登录均完成并端到端验证；设计 token（GitHub Primer）已定稿并落 `packages/ui`。详见 `state/PROGRESS.md`。
- **Phase 1 已完成**：Web MVP 用户可见主流程、真实 Supabase 核心链路、七项最终收尾与四道工程门禁已于 2026-07-18 全部验收。

| 阶段 | 名称 | 状态 |
| --- | --- | --- |
| Phase 0 | 脚手架 Scaffold | 已验收（Done, 2026-06-29） |
| Phase 1 | Web MVP | Done（2026-07-18） |
| Phase 2 | AI（BYOK）+ 批量整理 | 未开始 |
| Phase 3 | 浏览器扩展 Extension | 未开始 |
| Phase 4 | 桌面 Desktop | 未开始 |

---

## Phase 0 · 脚手架（Scaffold）

目标：把蓝图变成可运行的最小工程骨架，打通"登录 + 读取 star"的端到端链路基础。

里程碑：

- Monorepo 实包就位：`apps/{web,extension,desktop}` 与 `packages/{core,ui,db,config}` 的最小可构建骨架。
- 共享包骨架：`core`（GitHub API/同步/模型）、`ui`（shadcn + Tailwind 基底）、`db`（Supabase 客户端 + 查询）的导出边界与占位实现。
- Supabase 项目就绪：建项目、初版 schema、启用 RLS（表结构按 `contracts/data-model.md`）。
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

完成判据：用户可登录、同步、组织（标签/集合/笔记）、搜索筛选并查看统计，数据按 RLS 隔离且经 `packages/db` 从 Postgres 读取；提供可执行的 Supabase Cloud + 静态托管自部署文档。当前不承诺离线浏览、主动跨会话推送或完整 Supabase Docker 自托管。

## Phase 2 · AI（BYOK）+ 批量整理

目标：先深化 Web 的 AI 辅助分类与重度用户整理工作流，再扩展到新端。

里程碑：

- AI 自动分类：只处理用户手动选择或“全选当前筛选结果”的仓库，调用前显示数量，不扫描或自动整理整个库；可建议添加或移除标签 / 集合关系，并生成可逐项审阅、取消的整理建议草稿。未确认草稿按用户持久化，刷新或离开后可继续；确认、丢弃或重新生成后清理旧草稿。优先复用用户现有标签 / 集合，新分类经规范化与近似名称检查后作为独立建议，只有用户单独确认才创建。添加与移除经用户明确确认后通过批量整理写入，不提供无人值守自动修改。
- AI 数据范围：分类固定使用 owner/name、描述、语言、GitHub topics 与用户现有标签 / 集合；当前用户笔记只有在明确启用后才发送。首次分类前展示发送字段与目标 Provider；README 和其他用户私有数据不发送。
- Edge Functions：服务端安全持有/转发用户 Generation credential，并执行分类调用。
- Generation Provider Registry：首批内置 OpenAI、Google Gemini、Anthropic 与 OpenRouter Adapter，只有通过 Generation capability 测试的 Connection / model 才能用于分类。
- 自定义兼容 Connection：用户可填写具名 HTTPS endpoint、credential 与模型 ID，接入 DeepSeek 等 OpenAI-compatible 服务；`/models` 发现失败时允许手填模型 ID。
- BYOK：每个 Connection 保存一个类型化 credential，由 Edge Function 持久化加密，支持测试、启用/停用、替换、删除与 master key 轮换（`ai_provider_connections`）；不建立多 key 池或 fallback 顺序。
- 批量整理：对当前手动选择或当前筛选结果添加/移除标签、加入/移出集合、导出选中仓库，并提供部分失败结果与重试；不持久化命名筛选，也不保存关键词或语义查询历史。
- 权限边界：批量整理只写 Asterism 私有数据，不执行 GitHub star/unstar，不申请 `public_repo` scope。
- 范围边界：Phase 2 不包含 Embedding、pgvector 语义搜索、相似仓库推荐或自动聚类；Browse 继续使用现有关键词搜索。

完成判据：用户配置通过测试的 Generation Connection 与自有 credential 后，可生成、审阅并取消部分 AI 整理建议，在明确确认后通过批量整理写入标签 / 集合；模型不得直接改写用户组织数据。内置与自定义兼容 Connection 遵循同一 Generation capability 测试和密钥安全合同；credential 不明文落库、不返回客户端、不进入仓库或日志，并可测试、启用/停用、替换、删除及完成 master key 轮换。系统不自动回退到 Asterism 付费额度，也不在本阶段建设多 key、跨 Provider fallback、预算或限流 Gateway；重度用户可完成可访问、可恢复的批量本地整理，全程不扩大 GitHub OAuth 写权限。Browse 搜索继续使用 Phase 1 的关键词能力。

## Phase 3 · 浏览器扩展（Extension）

目标：把已经成熟的 Web 核心能力带到浏览网页的即时场景。

里程碑：

- WXT（MV3）popup：快速搜索已 star 的仓库。
- content-script：在 GitHub 仓库页内直接打标签 / 记笔记。
- 共享会话：复用 Supabase 会话或 `chrome.identity.launchWebAuthFlow`，与 Web 端数据互通。
- 扩展专属 i18n：MV3 `_locales` 提供 en / zh-CN。

完成判据：扩展可登录并与 Web 端共享同一份用户数据，可快速搜索，并在 GitHub 页内即时打标签/笔记。

## Phase 4 · 桌面（Desktop）

目标：提供原生桌面体验。

里程碑：

- Tauri 2 套壳复用 Web 前端。
- 桌面端打包与分发流程。

完成判据：桌面应用可安装运行，复用既有 Web 能力与共享包。

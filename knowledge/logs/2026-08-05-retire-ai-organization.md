# 2026-08-05 · 退役 AI Organization

## 背景

用户在持续真实使用后确认 AI 整理“做不好、做不顺，自己用也不舒服”，决定完整移除截图中的 AI Organization 模块。边界是保留手动批量整理、标签、集合、笔记、导入导出，以及浏览器内 embedding、隐形混合搜索和 Related Stars。

## 执行

- 删除 Web 的 AI 导航、路由、页面、草稿组件、自然任务原型、Settings Connection 管理及相关 hooks / tests / i18n。
- 旧 `/organization/*` 地址只保留到 Browse 的兼容重定向，避免已打开标签页或书签落入 React Router 开发者 404；不保留任何 AI 页面、数据读取或执行逻辑。
- 删除 `packages/core/src/ai`、DB AI / Organization Task 数据访问与四个 Edge Function。
- 同步流程停止创建 Organization Opportunity；bulk create 收紧为 `manual`。
- 新增 `20260805120000_remove_ai_organization.sql`，删除 AI / Organization 表、RPC、Provider credential 与 AI 来源账本，但保留 canonical 标签、集合和关系结果。
- 更新产品、架构、数据模型、UI、路线图、README、Supabase runbook 与 durable state；ADR 0032 supersede 原 AI 方向。

## 验收

- `pnpm lint` 通过（Biome 检查 278 个文件）；`pnpm typecheck` 通过（9 个 Turborepo tasks）；`pnpm test` 通过（53 个 test files、284 个 tests）；`pnpm build` 通过，仅保留既有的 Web chunk size warning。
- 运行时代码残留扫描通过：`apps/`、`packages/`、`supabase/functions/`、根脚本与 `.env.example` 中无 AI Organization、Provider Connection、Organization Task 或已删除 Edge Function 引用；历史 migration、ADR 与日志按知识库规则保留。
- Chrome 真实登录态完成桌面 1440×900 与移动 390×844 验收：侧栏和移动抽屉均无 AI Organization；Settings 只剩 Appearance / Account；旧 Organization 地址回到 Browse；手动批量选择可进入只含 Tags / Collections 的整理对话框。验收中补回通用 `bulk.moreActions` 的 en / zh-CN 键。
- 反向 migration 已逐项比对历史函数签名和表依赖，补删仅供 AI 近似匹配的 `classification_name_near_key`，并显式处理 `organization_tasks` / `organization_opportunities` 双向外键；不使用 `cascade`，不删除 canonical 标签、集合、笔记或关系。保留 `normalize_classification_name` 及其唯一索引作为手动整理的数据完整性约束。
- 本机未安装 Supabase CLI 与 Docker，未执行本地数据库 migration smoke；部署前仍需在受控环境应用 migration，并按 ADR 0032 后续清理远端四个函数与已废弃 secrets。

> 2026-08-06 更正与后续：仓库本地其实已安装 `supabase@2.109.1`，可通过 `pnpm exec supabase` 使用；当时缺少的是全局命令。随后已直接在维护者远端项目完成 migration、Function 与 secret 清理，无需以本地 Supabase 作为远端收尾前提。详见 `2026-08-06-supabase-cli-availability.md` 与 `2026-08-06-retire-ai-organization-remote.md`。

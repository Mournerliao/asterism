# 2026-07-18 · 修复未提交变更的代码评审 findings

## 结果

- 修正 App Topbar Search 的路由作用域：Browse 是根索引 `/`，不存在 `/browse` 路由。
- 新增 `app-topbar.test.tsx`，覆盖 Browse 显示搜索框、其他页面隐藏搜索框。
- 在 README 路由测试 harness 中显式预加载 `readme-document` 与 `readme-outline` 两个 lazy 模块，避免新增测试后的完整并行套件因冷启动 transform 速度误报失败。
- README 不再承诺已由 ADR 0022 移出路线图的语义搜索，统一描述为可审阅的 AI 整理建议与批量工作流。
- 同步修正 BACKLOG、PROGRESS 与 Phase 1 收尾实施日志中的路由记录。

## 验证

- 单文件 Vitest 先复现 Browse 搜索框缺失，再由路由修复转绿。
- `pnpm lint`：通过（205 files）。
- `pnpm typecheck`：通过（9 tasks）。
- `pnpm test`：通过（121 tests；Web 76 tests）。
- `pnpm build`：通过；仅保留契约允许的 chunk-size warning。

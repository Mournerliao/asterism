# 2026-07-18 · Phase 1 最终收尾实施

## 结果

Phase 1 Web MVP 标记 Done，开始进入 Phase 2 AI（BYOK）+ 批量整理。

## 已完成

- 新增 `.gitattributes` 并将项目文本规范化为 LF。
- Biome 2.5.1 启用 Tailwind v4 CSS parser，CSS 纳入统一门禁；reduced-motion 的 4 处 `!important` 使用精确规则抑制。
- 删除未使用的 Dexie cache、导出、依赖与 lockfile 记录。
- App Topbar Search 仅在 Browse 的实际根索引路由 `/` 显示。
- 标签/集合创建、修改、删除以及关联写失败时保留表单、目标或服务器状态，并提供双语重试/取消；笔记继续保留草稿与 Inspector 上下文。
- 重写 Supabase Cloud + 静态托管 self-deployment runbook。
- 登录页搜索能力文案改为名称/描述关键词搜索，并补双语断言。

## 验证

- `pnpm lint`：通过（204 files）。
- `pnpm typecheck`：通过（9 tasks）。
- `pnpm test`：通过（代码评审回归测试补齐后 25 files，121 tests）。
- `pnpm build`：通过；Vite 主 chunk warning 仍按既有裁决作为非 Phase 1 阻断观察项。
- `git diff --check`：通过。

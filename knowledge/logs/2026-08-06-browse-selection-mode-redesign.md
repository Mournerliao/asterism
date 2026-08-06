# 2026-08-06 · Browse 批量选择模式重设计

## 问题

第一次布局优化只移动了选择入口，进入选择模式后仍把数量、全选、整理、更多操作和完成塞进页面标题同行。该结构让临时任务工具栏抢占页面标题层级，也使用户在长列表下方完成选择后必须返回顶部操作。

## 设计结论

- 页面头部保持稳定：标题、仓库数量、卡片 / 列表切换、筛选与排序不因选择模式重排。
- 选择模式是覆盖当前内容工作的临时任务层，操作应始终贴近用户当前浏览位置。
- 全部选择动作进入固定在内容视口底部的 `BulkSelectionBar`，不再占据标题区。
- 底部栏持续显示准确已选数量和被筛选隐藏数量，并保留全选 / 加入全部 / 取消全选的现有范围语义。
- 有选择时才出现主操作“批量整理”；导出与清空保留在更多菜单；完成始终可见并清空会话选择。
- 列表在选择模式下增加底部空间，避免最后一张卡片被固定栏遮挡。

## 实现

- 新增 `apps/web/src/components/bulk-selection-bar.tsx`，集中承载选择模式的视觉与交互结构。
- `apps/web/src/pages/browse.tsx` 删除标题行内旧选择工具栏，始终保留 `RepoViewToggle`，并在页面根部挂载固定底部栏。
- 桌面端底部栏对齐主内容区并避开 240px sidebar；移动端占据视口左右 24px，动作自然换行。
- 底部栏复用既有 `asterism-glass-overlay` 材质 token；当前筛选结果为空时禁用范围操作，保留原有边界语义。

## 验证

- `pnpm lint`
- `pnpm --filter @asterism/web typecheck`
- `pnpm --filter @asterism/web test -- src/lib/bulk-selection.test.ts src/components/repo-card.test.tsx src/components/repo-table.test.tsx`：3 files / 7 tests 通过；受限网络导致 happy-dom 请求示例 GitHub URL 时输出警告，不影响结果。
- 真实 520 条仓库浏览器会话验证：滚动 490px 后底部栏坐标保持不变；选择 1 个仓库后准确显示 `1 selected` 并出现 Organize。
- 390 × 844 验证底部栏宽 342px、高 128px，控件分行且无横向溢出；列表底部预留 176px，最后一项可完整滚出操作栏遮挡区域。

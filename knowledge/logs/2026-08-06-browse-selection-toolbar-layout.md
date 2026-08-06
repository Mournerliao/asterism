# 2026-08-06 · Browse 选择入口与排序布局优化

## 背景

Browse 顶部原先把批量选择入口与卡片 / 列表视图切换并列，而排序控件独占筛选行右侧。两者的信息架构不一致：排序属于筛选与浏览控制，批量选择则是进入独立任务模式的入口。

## 调整

- 将 Recently starred 排序控件移动到 Language、Topic、More filters 所在的左侧控制组。
- `RepoFilterBar` 使用 `children` 提供右侧组合位置，不引入批量选择业务耦合或布尔定制 prop。
- 将 Select repositories 移到筛选行右端，并与筛选控件统一为 32px 高。
- Browse 标题行正常态只保留卡片 / 列表视图切换。
- 选择模式标题增加 `ListChecks` 图标，Done 增加 `Check` 图标，强化模式进入与退出反馈。

## 验证

- `pnpm exec biome check apps/web/src/pages/browse.tsx apps/web/src/components/repo-filter-bar.tsx`
- `pnpm --filter @asterism/web typecheck`
- `pnpm --filter @asterism/web test -- src/lib/bulk-selection.test.ts src/components/repo-card.test.tsx src/components/repo-table.test.tsx`：3 files / 7 tests 通过；happy-dom 对示例 GitHub URL 的网络请求出现受限网络警告，不影响结果。
- 本地浏览器实测 520 条仓库数据：桌面端筛选、排序与选择入口均为 32px 高；排序位于左侧筛选组，选择入口独立靠右；进入选择模式后数量、全选、更多操作与完成路径保持可见。
- 390 × 844 窄屏验证控件自然换行且无横向溢出；en / zh-CN 均验证通过。

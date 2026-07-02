# 2026-07-02 · Phase 1 Slice 7：统计仪表盘

## 目标

对齐 Ardot `8:413`（Dashboard · Insights），交付语言/topic/趋势/归档可视化。

## 变更

- **packages/ui**：安装 `recharts`，新增 shadcn `ChartContainer` / `ChartTooltip` / `ChartLegend` 组件并导出。
- **packages/core**：`repos/analytics.ts` — `deriveDashboardInsights`（StatCards + 语言 Top8 + 年份趋势 + topic Top10 + 归档饼图 + 标签 Top5）；Vitest。
- **apps/web**：替换 `dashboard.tsx` 骨架 — 四 StatCard、四 ChartCard、loading/error/empty 四态；图表区 `React.lazy`；i18n `dashboard.*` en/zh-CN。

## 验证

- `pnpm test` / `lint` / `typecheck` / `build` 全绿
- Vite build：Dashboard 独立 chunk ~160KB

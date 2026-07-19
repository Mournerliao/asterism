# Settings page width alignment

- 日期：2026-07-20
- 目标：让 Settings 与 Dashboard、Tags、Collections、Import / Export 等常规页面共享一致的内容宽度。
- 诊断：Settings 实页及其路由加载骨架单独使用 `max-w-3xl`，其余常规页面使用 `max-w-6xl`；因此桌面宽屏下左右边界明显内缩。
- 修改：将 `apps/web/src/pages/settings.tsx` 与 `apps/web/src/components/page-loading-states.tsx` 的 Settings 容器统一为 `max-w-6xl`。未改变设置项结构、间距、交互、文案或设计 token。
- UI 对齐：沿用 App Shell 的 24px 内边距、页面自有滚动区、4px spacing grid 与既有响应式折行；未引入新组件或样式。
- 验证：Impeccable layout 机械扫描无布局规则命中、无任意 Tailwind spacing / z-index；`pnpm lint`、`pnpm typecheck`、`pnpm test`（Web 125 tests）与 `pnpm build` 全部通过。构建保留既有的主 chunk 大小提示，本次未调整阈值或拆包。

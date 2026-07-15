# 全站加载态与骨架屏统一

日期：2026-07-15

## 背景

Browse 首次进入会先显示路由 `Suspense` 的通用大矩形，再切换为 Repo Card / List 骨架；Collections、Tags、Collection Detail 与 Dashboard 也存在空 Card 整块 pulse，Import / Export 则可能在查询完成前错误显示空态。写操作普遍只有 disabled，没有明确 pending 反馈。

## 实现

- 默认 Browse 随应用 shell 直接加载，移除首次入口的 route fallback；其他懒加载路由使用与目标页面一致的专属结构骨架。
- Repo 宫格骨架保持 208px 卡片分区，列表骨架补齐内容表面、表头、64px 桌面行与移动端重排。
- Collections、Tags、Collection Detail、Dashboard、Import / Export 与 Settings 增加各自结构骨架；首屏相关查询并行完成后一次性切换到真实内容，后台刷新保留旧数据。
- Import / Export 汇总仓库、标签、集合、关联与笔记查询的 loading 状态，消除假空态闪烁。
- 基础 Skeleton 改用 muted surface，补 `aria-hidden` 与 reduced-motion；加载区域使用单一 `role=status` / `aria-busy` 文案。
- 同步状态移除伪精确计数与进度条，后端没有真实 processed/total 时使用 indeterminate 状态。
- 新增按钮内 pending 内容模式，覆盖标签 / 集合保存与删除、笔记保存和备份恢复；pending 期间阻止重复提交、误关对话框与重复选择文件。
- en / zh-CN loading 与 pending 文案同步补齐。

## 验证

- `pnpm lint`、`pnpm typecheck`、`pnpm test`（core 24 + db 2 + web 24）、`pnpm build` 全部通过；Impeccable detector 对 `apps/web/src` 与 `packages/ui/src` 返回 0 findings。
- 浏览器冷启动的可访问性快照直接进入 `Loading repositories…` 结构加载区，不再出现 route fallback 的通用大矩形；数据完成后切换为 509 条仓库内容。
- 浏览器实测桌面 1440px、移动端 375px 的 Browse 宫格与列表，卡片 / 表格均无横向溢出；移动端 grid skeleton 的最小列宽使用 `min(370px, 100%)` 与可用宽度安全收缩。
- 浏览器实测 light / dark 两套 Dashboard 与 Tags 页面，路由切换期间保留当前内容，目标 chunk 就绪后稳定切换；主题恢复为 system。
- CDP 模拟 `prefers-reduced-motion: reduce` 命中，Skeleton 与全部新增 spinner 均提供 `motion-reduce:animate-none`；验收后恢复媒体与 viewport 设置。

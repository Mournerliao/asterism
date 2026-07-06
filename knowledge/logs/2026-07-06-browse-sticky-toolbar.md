# 2026-07-06 · Browse sticky toolbar

## Context

Browse 页仓库列表较长，向下滚动后标题与筛选栏会滚出视口，用户无法在不回顶的情况下调整筛选或确认当前上下文。

## Root cause (first attempt)

首版用 `position: sticky` 吸顶。滚动容器带 `padding-top` 时，sticky 吸附点落在 padding 之下，卡片会从顶部缝隙漏出。后续尝试去掉 `main` 顶部 padding、给各页面补 `pt-6`，能修好漏出，但属于迁就 sticky 的权宜之计，结构复杂。

## Changes (final)

- `AppLayout` 主内容区改为 flex 列容器、不滚动（`overflow-hidden p-6`），恢复统一 `p-6`。
- 各普通页面根节点 `flex-1 min-h-0 overflow-y-auto` 整页滚动。
- Browse 有数据时上下分栏：标题 + 筛选栏 + 同步条在上方 `shrink-0`；仅下方列表区 `flex-1 overflow-y-auto` 滚动。
- `RepoCollection` 通过 `scrollElement` prop 绑定 Browse 列表滚动容器；移除 `MainScrollElementProvider`。
- `ui-ux.md` 补充页面级滚动与 Browse 分栏规则。

## Verification

- `pnpm --filter @asterism/web typecheck`
- 浏览器：Browse 滚动时标题/筛选栏固定、无顶部漏出；其余页面滚动与间距正常。

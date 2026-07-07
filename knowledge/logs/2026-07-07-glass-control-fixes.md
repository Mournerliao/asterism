# 2026-07-07 · Glass Control Pattern 复刻问题修复

## Context

对照 Lumno options 源码复查上一轮「磨砂控制条」落地，发现三处偏差：吸顶动效未接线、Settings 主题切换误用磨砂吸顶条、意外带回水彩背景图。用户确认尺寸 / 圆角 / 透明度 / 变换等数值保留 Lumno 原始字面量（不重新映射到 Tailwind 预设），颜色则新增为专属 token 而非复用已有 token，以保证视觉与 Lumno 100% 一致。

## Changes

- **Browse 吸顶动效接线**：`browse.tsx` 新增 `stuck` state，监听 `listScrollElement` 的 `scrollTop`（`> 0` 即视为吸顶），传给 `GlassControlRow`，激活背景淡入 + 噪点 + sticky line 动效。
- **Settings 误用修复**：`GlassRail` / `SegmentedControl` 新增 `variant: 'glass' | 'solid'`（默认 `'glass'`）。`solid` 变体对应 Lumno 内联小控件（不透明背景、无 blur、无 sticky）。`settings.tsx` 去掉 `GlassControlRow` 包裹，主题切换 `SegmentedControl` 改用 `variant="solid"`。
- **移除水彩背景**：删除 `app-layout.tsx` 里对 `lumno-settings-bg-{light,dark}.png` 的引用及两个装饰 `<div>`（图片资产此前已不在仓库中），保留 `asterism-glass-page` 中性 noise 背景承托。
- **颜色 token 化**：`globals.css` 新增一组 `--glass-*` token（`:root` / `.dark`，独立命名空间，紧邻 `--sidebar-*` 之后），把 `glass-rail.tsx`、`segmented-control.tsx` 里散落的 Tailwind 任意值颜色，以及 `.asterism-glass-control-row` / `.asterism-glass-page` 里的字面量颜色，全部原值收进 token：`--glass-page-bg`、`--glass-rail-bg`/`-border`、`--glass-rail-solid-bg`/`-border`、`--glass-indicator-bg`/`-border`/`-shadow`、`--glass-tab-active-text`/`-inactive-text`、`--glass-stuck-bg`、`--glass-sticky-line`、`--glass-row-before-bg`。数值零改动，只是从裸颜色变成有名字的 token。
- 尺寸类 Tailwind class（padding、字号、圆角、blur、图标尺寸、透明度、变换、逐属性 transition 时长）维持原样未改动。
- `ui-ux.md` Glass Control Pattern 小节补充 `--glass-*` token 表、`variant` 用法边界、`stuck` 判定方式说明。

## Verification

- `pnpm --filter @asterism/ui typecheck` / `build`
- `pnpm --filter @asterism/web typecheck` / `test` / `build`
- 对改动文件跑 `pnpm exec biome check`
- 手动检查：Browse 滚动列表时控制条吸顶变化是否触发、Settings 主题切换是否为纯色内联控件（不再随页面滚动悬浮）、明暗模式下磨砂控件与 Settings 控件颜色对比

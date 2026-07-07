# 2026-07-07 · Glass Segmented Controls

## Context

用户希望吸收 Lumno options 页里“磨砂玻璃控制条 + 独立 active 滑块”的质感，但明确不要水彩背景。Asterism 需要保持 GitHub Primer 工具感，避免玻璃质感扩散到主卡片墙或大面积页面背景。

## Changes

- `packages/ui` 新增 `GlassRail`：按 Lumno 源码对齐 `padding: 4px`、`border-radius: 12px`、light `rgba(255,255,255,.25)`、dark `#1f2732`、`backdrop-filter: blur(4px)` 与对应细边框。
- `packages/ui` 新增 `GlassControlRow` 并在全局样式中还原 Lumno 背景承托：light page `#f1f5f9`、全页 fixed noise overlay（opacity `.24`）、stuck row 的 `rgba(241,245,249,.92)` 背景、row `::before/::after` noise 层、1px sticky line 与对应动画。
- `packages/ui` 新增 `SegmentedControl`：按 Lumno 源码对齐独立 indicator（`top/left: 4px`、`height: calc(100% - 8px)`、active bg / dark gradient、`240ms cubic-bezier(0.2,0.9,0.2,1)`）与 tab button（`padding: 8px 14px`、`border-radius: 10px`、`font-size: 13px`、icon `14px` + inactive `scale(.92)`）。
- `SegmentedControl` 支持 icon / label / icon+label、Arrow/Home/End 键盘切换与 `prefers-reduced-motion`；按 Lumno 源码还原 `:active` 的 `translateY(1px) scale(.98)` + `brightness(.95)`。
- Browse Grid/List 视图切换改用 icon-only `SegmentedControl`。
- Settings 主题切换改用 label `SegmentedControl`，保留 system / light / dark 行为。
- Browse 控制区改为单个 stuck `GlassControlRow` 承托标题、Grid/List 与筛选 rail，避免多 sticky row 互相遮挡。
- Browse 筛选栏外层改为 `GlassRail`，内部 Select / tags 按钮调整为更轻的半透明 pill。
- `ui-ux.md` 增加 Glass Control Pattern 使用边界：允许 Lumno neutral noise/page 背景作为控制区承托，不允许水彩/插画，不玻璃化 repo cards 或列表行。

## Verification

- `pnpm --filter @asterism/ui typecheck`
- `pnpm --filter @asterism/ui build`
- `pnpm --filter @asterism/web typecheck`
- `pnpm --filter @asterism/web test`
- `pnpm --filter @asterism/web build`
- 定向 `pnpm exec biome check` 本次改动文件

# Open filter toolbar

## Context

Browse 筛选器本身已有完整边框与 Glass 表面，外层 GlassRail 再次提供同形状边框和背景，没有增加共同状态或轨道语义，形成吸顶行、Rail、控件三层视觉容器并压过仓库内容。

## Changes

- RepoFilterBar 移除 GlassRail，改为全宽开放式工具栏；facet、标签、更多筛选和清除位于左组，排序独立靠右。
- 工具栏按组响应式换行，排序控件保持整体尺寸，不挤压单个 trigger。
- FacetPicker 区分关闭态类别文案与菜单“全部”选项，默认显示简短的 Language / Topic。
- 语言、Topic、标签与更多筛选启用时，使用现有 primary token 的轻量边框和背景表达 active 状态。
- GlassRail 继续用于 Grid / List、主题切换等具有共享选择轨道的 Segmented Control。

## Verification

- Light / Dark、宽屏与窄屏视觉检查。
- 筛选、排序、清除、弹层键盘路径和嵌套浮层关闭行为保持可用。
- Impeccable detector、lint、typecheck、test 与 build 通过。

# Settings segmented control consistency

Date: 2026-07-15

## Context

Settings 的主题切换显式使用 `SegmentedControl` 的 solid 变体，而 Browse 的视图切换使用默认 glass 变体。两者属于同一种分段选择交互，却呈现不同的轨道表面、边框和选中态，破坏应用内组件一致性。

## Changes

- Settings 主题切换改用 `SegmentedControl` 默认 glass 变体，与 Browse 视图切换共享视觉与交互标准。
- 保留 Settings 的三项文本标签和既有 theme 状态逻辑，不改变功能、键盘操作或无障碍名称。
- 更新 UI/UX 契约，将 glass 确立为应用内分段切换器的统一默认样式，并收紧 solid 的适用边界。

## Verification

- Settings 与 Browse 的分段切换器共享轨道材质、边框、圆角、选中指示器与动效。
- System / Light / Dark 仍可通过点击与方向键切换。
- light / dark 主题下均保持可辨识的选中态与可见焦点。

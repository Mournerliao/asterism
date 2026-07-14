# Form control focus treatment

## Context

共享表单原语沿用 shadcn 默认的 3px 蓝色外扩 focus ring。在紧凑的搜索框、筛选弹层与设置表单中，该反馈过于强烈，并会产生明显的双层边框观感。

## Changes

- `Input`、`Textarea`、`SelectTrigger` 移除 `focus-visible:ring-[3px]` 与 `focus-visible:ring-ring/50`。
- 三类控件统一使用 `focus-visible:border-foreground/60`，在 Light / Dark 中保持主题感知的中性焦点反馈。
- 保留现有边框过渡、禁用态与 destructive 错误态；Button、Tabs、Toggle 等非表单交互不在本次范围内。
- UI/UX 合约同步记录表单控件与其他交互控件的焦点表达边界。

## Verification

- 静态检查确认三个共享表单原语不再包含 3px focus ring，且业务组件无需覆盖。
- Impeccable detector、lint、typecheck、test 与 build 通过。

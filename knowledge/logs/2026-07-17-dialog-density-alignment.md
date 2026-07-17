# 2026-07-17 · Dialog 密度与标题关闭对齐

## 目标

让 Create tag 等表单弹窗与未保存笔记确认弹窗、Quick Look 浮层在密度与标题层级上一致，并修正标题与关闭按钮的垂直错位。

## 根因

共享 `DialogContent` 仍沿用 shadcn 默认 `p-6` / `sm:max-w-lg` / `text-lg`，关闭按钮却用 `top-4`，相对内容区顶边比标题更高；标签 / 集合弹窗未收敛到未保存笔记已验证的 448px / 20px 密度。

## 实现

- `packages/ui` Dialog 默认改为 `p-5`、`gap-5`、`sm:max-w-[28rem]`；关闭按钮与 Quick Look 对齐为 `ghost` + `icon-sm`，定位 `top-5 right-5`；标题 `text-base` + `min-h-8 items-center`。
- Tag / Collection / Confirm 表单弹窗：标题行 `pr-10`，页脚动作 `size="sm"`。
- UnsavedNoteDialog 去掉重复的局部密度覆盖，改吃共享默认。
- 契约新增 Dialog Pattern。

## 验证

- `@asterism/ui` build 通过。
- 定向 Vitest：`repo-inspector-overlay` + `repo-inspector-context`。

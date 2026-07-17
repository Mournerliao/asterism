# 2026-07-17 · 未保存笔记弹窗用关闭代替「继续编辑」

## 目标

未保存笔记确认层与其他 Dialog / Quick Look 一样提供关闭按钮；关闭语义等同「继续编辑」，页脚不再重复该动作。

## 实现

- `DialogContent` 支持 `closeLabel` / `closeDisabled`。
- `UnsavedNoteDialog` 启用关闭按钮（aria-label 用 continueEditing 文案），移除页脚 Keep editing；保存中禁用关闭。
- 契约：编辑安全与 Dialog Pattern 同步为「关闭 = 继续编辑，页脚仅放弃 / 保存」。

## 验证

- `repo-inspector-context.test.tsx`：继续编辑改为点击关闭控件。

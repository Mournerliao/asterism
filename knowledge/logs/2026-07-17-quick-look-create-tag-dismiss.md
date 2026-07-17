# 2026-07-17 · Quick Look 新建标签时误关闭

## 目标

修复浮窗 Quick Look 中「添加标签 → 新建标签」后窗口消失且无对话框的问题。

## 根因

Floating Quick Look 在 document 捕获阶段监听 `pointerdown`，凡点击不在面板 DOM 内即关闭。Radix `DropdownMenu` / `TagFormDialog` 经 Portal 挂到 `document.body`，因此点击菜单项「新建标签…」被当成窗外点击：Quick Look 先卸载，`createOpen` 状态随之丢失，对话框无法出现。键盘路径已豁免 `[role="menu"]` / `[role="dialog"]`，但 pointer 路径未对齐。

## 实现

- 抽出 `isPortaledOverlayTarget`，对 portaled `menu` / `listbox` / 非自身 `dialog` 统一豁免。
- Floating Quick Look 的 `pointerdown` 与 J/K/Esc 键盘处理共用该豁免；真实窗外点击仍关闭。
- 回归测试：portaled menu / dialog 上的 pointerdown 不关闭；body 外点击仍关闭。

## 验证

- `vitest run src/components/repo-inspector-overlay.test.tsx src/contexts/repo-inspector-context.test.tsx`：11 通过。

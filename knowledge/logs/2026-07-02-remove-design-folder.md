# 2026-07-02 · 移除 design 设计沙盒目录

## 背景

早期本地 Vite 设计原型（`design/`）用于像素校对，现已以 Ardot 设计稿（`knowledge/contracts/ui-ux.md` · fileId `698428420561751`）为单一设计源；正式 UI 已落地于 `apps/web` + `packages/ui`，沙盒不再需要。

## 改动

- 删除工作区 `design/` 目录（仅剩本地 `dist/` 与 `node_modules/` 构建产物；源码此前已从 git 跟踪中移除）。
- 修正 `knowledge/logs/2026-07-02-scrollbar-styles.md` 中对 `design/src/globals.css` 的过时引用。

## 设计源

后续 UI 工作以 **Ardot MCP** + **`knowledge/contracts/ui-ux.md`** 为准，不再维护独立 design 应用。

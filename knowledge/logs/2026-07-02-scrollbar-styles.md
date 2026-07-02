# 2026-07-02 · 全局滚动条样式

## 背景

Browse 页右侧出现浏览器默认粗灰滚动条，与 Primer / shadcn 视觉不协调。已在 `packages/ui` 引入基于 `--muted-foreground` 的全局细滚动条样式。

## 改动

- `packages/ui/src/styles/globals.css`：新增 `--scrollbar-size` / `--scrollbar-thumb` / `--scrollbar-thumb-hover` token；在 `@layer base` 为 `*` 应用 WebKit 与 Firefox 滚动条样式（8px 细 pill、透明轨道、悬停加深）。
- `knowledge/contracts/ui-ux.md`：补充 Scrollbar 小节。

## 布局验收

Browse 滚动链路：`AppLayout main`（`overflow-auto` 供 Settings 等页面）→ `BrowsePage`（`h-full flex-col`）→ `RepoCollection`（`flex-1 overflow-auto`，虚拟列表 `getScrollElement`）。高度约束正确，无双滚动条，未改布局代码。

## 验证

- `pnpm lint` / `typecheck` / `build` 通过。

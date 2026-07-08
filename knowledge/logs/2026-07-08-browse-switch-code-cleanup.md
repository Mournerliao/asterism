# 2026-07-08 · Browse 视图切换代码整理

## 背景

Browse 视图切换经过多轮性能修复后，手感已达到目标，但源码中仍有历史方案留下的叙事性注释、过宽的命名和不必要的 frame 数组管理。

## 变更

- `useBrowseView` 注释改为最终设计说明，并将 pending frame 管理从数组收敛为单个 ref。
- `stores/browse-view` 的 Zustand hook 改名为 `useBrowseViewStore`，避免与应用层 `useBrowseView` hook 同名。
- Browse 页面将 `listScrollElement` / `listBody` 收敛为 `repoScrollElement` / `repoContent`，匹配当前 grid/list 共用滚动区。
- `SegmentedControl` 抽出 `INDICATOR_INSET`，移除裸写 4px。

## 验收

- 预期：行为保持不变，Browse tab 仍先响应再切内容；源码只保留当前方案需要的状态与命名。
- 验证命令：`pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`。

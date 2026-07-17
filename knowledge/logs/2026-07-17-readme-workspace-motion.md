# 2026-07-17 · Quick Look ↔ README progressive motion（Issue #9）

## 目标

用既有 Web Animations + ease-out 连接 Repo Quick Look 与 README 工作区：前进时浮窗展开到主阅读区，返回时仅在来源恢复且同一仓库 trigger / Quick Look 可见时收缩；动效为渐进增强，从不阻挡导航或内容加载。

## 实现

- 新增纯逻辑 `readme-workspace-motion`：`planForward` / `planReverse` / `canAttemptReverseContraction`、FLIP keyframes、`runWorkspaceFrameAnimation`（缺失 / 拒绝 / 中断均安全收尾）。
- `readme-workspace-motion-store` 暂存前进 / 返回意图；可见返回与浏览器 Back（`finalizeReadmeDeparture`）均可武装反向收缩。
- Quick Look「阅读 README」测量浮窗并武装前进；README 挂载后对 `[data-readme-workspace]` 执行 expand，正文单独 opacity；手机 Sheet / 不可测量来源走 crossfade。
- 返回后重开 Quick Look 时优先 contract，否则克制 crossfade；无法重开时丢弃反向意图。`prefers-reduced-motion` → `immediate`。
- `ui-ux.md` 补充前进 / 返回空间动效契约。

## TDD 与验证

- 规划器与 store 单测：expand / contract / crossfade / immediate、WAAPI 缺失与失败、模式跳过。
- 路由级：expand 标记、动画拒绝后路由仍成功、reduced-motion → immediate。
- `pnpm --filter @asterism/web typecheck` 与全仓 `pnpm test` 通过。

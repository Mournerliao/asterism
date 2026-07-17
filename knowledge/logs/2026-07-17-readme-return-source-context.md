# 2026-07-17 · README 返回恢复来源上下文并重开 Quick Look（Issue #8）

## 目标

从 README 工作区返回 Browse / Collection 时，恢复进入前记录的筛选、排序、视图与列表滚动位置，并在仓库仍可见时重开同一仓库的 Repo Quick Look；可见返回与浏览器 Back 共用同一协调器。

## 实现

- `readme-navigation` 扩展 Browse snapshot（filters / sort / view / scrollTop）与 Collection `scrollTop`；新增 `planReadmeReturn` 覆盖直链、错仓库、集合缺失、trigger 不可见等回退。
- 新增 `readme-return-coordinator`：进入时 `remember`，可见返回 `prepareReadmeReturn`，离开 README 且目标匹配时 `finalizeReadmeDeparture`；源页面 `consume` 后按可见性决定 reopen / scroll。
- Browse / Collection 写入 `list-scroll` 偏移；`useReadmeReturnRestore` 在列表与滚动节点就绪后恢复并 `requestOpen`；缺失集合回退 Browse。
- Repo Quick Look「阅读 README」捕获当前 snapshot；README header 返回改为按钮走协调器，不再只用裸 `Link`。
- 顺带预加载 outline lazy 模块，消除 README outline 单测的顺序依赖。

## TDD 与验证

- 纯逻辑：navigation planner 6 + 既有路由解析；coordinator 3；Browse restore hook 2（可见重开 / 不可见跳过）。
- 回归：可见返回双语、未保存笔记导航、README 工作区全套（含 outline）。
- 工程门：`pnpm lint`、web typecheck（既有 `closeLabel` 类型问题仍在 main）、`pnpm test` 全绿。

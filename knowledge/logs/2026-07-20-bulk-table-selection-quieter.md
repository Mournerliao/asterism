# Bulk table selection quieter pass

## 目标

降低 Browse 表格全选后的线条密度，同时保留批量范围的可辨识性、键盘焦点与 Quick Look 单行选中语义。

## Impeccable quieter 结论

- 噪声来源是每个批量选中行同时出现完整 inset ring、普通行分隔线、整行 surface 与 primary checkbox。
- primary checkbox 已能提供强确认，轻量整行 `accent` surface 可提供连续扫读反馈；逐行完整 ring 在全选场景中属于重复强调。
- Quick Look 只会有一个当前仓库，完整 inset ring 仍是合适的单行锚点，不应随批量样式一起移除。

## 实现

- `RepoTableRow` 将批量选中态收敛为 `bg-accent/30`，不再附加完整 inset ring。
- 非批量模式的 `selected` 继续使用 `bg-accent/30` + inset ring。
- 保留 checkbox、`aria-selected`、键盘焦点 ring、hover 与行分隔线。

## 验证

- 新增组件回归测试，分别锁定批量选中无 inset ring、Quick Look 单行选中保留 inset ring。
- 先红后绿的定向测试通过；Impeccable detector 零命中，`pnpm lint`、`pnpm typecheck`、`pnpm test`（Web 127 tests）与 `pnpm build` 全部通过。构建保留既有主 chunk 大小提示，本次未调整阈值或拆包。

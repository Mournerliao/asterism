# Browse 列表表面与吸顶视觉修复

日期：2026-07-14

## 背景

响应式 Repo List 落地后，真实页面复查发现四处视觉漂移：列表仍使用 page background 而非 Card surface；圆角未裁切内部表头和行；浏览器默认 `th` 居中导致表头与 cell 起点错位；吸顶控制区的全视口底部分隔线形成突兀的页面切割。

## 变更

- 列表容器和表头统一使用既有 `bg-card` / `text-card-foreground`，与 Repo Card 共享同一内容层级，不新增颜色 token。
- 容器使用 `overflow: clip` 裁切圆角、hover 和虚拟占位内容；相比 `overflow: hidden`，不会建立新的滚动容器或改变 sticky 参照。
- 表头统一 `text-left`，继续与 data cell 复用 `TABLE_GRID_CLASS` 和 12px 水平内边距。
- `GlassControlRow` 移除专用 sticky line 节点和 `--glass-sticky-line` token；stuck 背景底部使用 10px mask 渐隐，保留既有 blur、透明度与 reduced-motion 行为。
- UI/UX 合约补充 Repo List 的表面、圆角裁切与对齐要求。

## 验证

- 浏览器几何检查：五列表头与首行 cell 的 x 起点差均为 `0`；table computed background 与 `--card` 一致；圆角为 8px、overflow 为 `clip`。
- 滚动检查：控制区进入 `data-stuck=true`，背景 mask 生效且不存在 bottom border；恢复顶部后 stuck 状态正常解除。
- light / dark 下 table computed background 分别为 `#fcfcfd` / `#12161d`，与主题 Card token 一致；浏览器 console 无 error / warning。
- Impeccable detector、lint、typecheck、test、build 全部通过。

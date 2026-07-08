# 2026-07-08 · Browse tab 即时响应优化

## 背景

Browse 页宫格/列表切换已通过虚拟滚动与常驻挂载降低内容区开销，但用户仍反馈 tab 切换“不跟手”，体感像被数据加载影响。复查发现切换视图不会触发 starred repos refetch；拖慢手感的是交互热路径仍同步设置 `pendingView` 并渲染 overlay skeleton，同时 `SegmentedControl` 滑块依赖 value 变化后的测量回写。

## 变更

- `SegmentedControl`：click 与键盘切换时先按目标按钮 rect 更新 indicator，再调用 `onValueChange`，让滑块在事件路径内立即开始响应。
- `useBrowseView`：移除 `pendingView` 状态；内容视图变化只通过 `startTransition` 提交，持久化仍在 view commit 后异步写 Zustand。
- `BrowseRepoList` / `BrowsePage`：移除视图切换 overlay skeleton 与 `pendingView` prop；已访问视图继续常驻挂载，warm switch 只做 CSS 显隐。

## 验收

- 预期：点击 grid/list tab 后，tab 选中态与滑块立即响应；内容区可稍后随 transition 切换，不显示切换 skeleton。
- 验证命令：`pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`。

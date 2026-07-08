# 2026-07-07 · Browse 宫格/列表切换性能优化

## 背景

Browse 页在 500+ starred repos 下，宫格 ↔ 列表切换明显卡顿。根因是列表视图（`RepoTable`）全量渲染所有行，而宫格视图已有 TanStack Virtual 行虚拟化；从 `repo-list-row` 改为表格后未保留列表虚拟化，构成性能回归。

## 变更

- **`repo-table.tsx`**：`@tanstack/react-virtual` tbody 行虚拟化（固定行高 56px，`overscan: 10`）；新增 `scrollElement` prop；表头 sticky；无外部 scroll 容器时 fallback 查找最近可滚动祖先。
- **`repo-collection.tsx`**：拆为 `RepoGridView` / `RepoListView`，列表模式不再执行 grid virtualizer hooks。
- **`lib/scroll-margin.ts`**：抽取 `measureScrollMargin` / `findScrollParent` / `useScrollMargin` 供 grid 与 list 共用。
- **`repo-card.tsx` / `RepoTableRow`**：`React.memo` + 统一 `record` + `onSelect` 回调形态。
- **`repo-view-toggle.tsx`**：`startTransition` 包裹 `setView`，切换按钮即时响应。
- **`browse.tsx`**：view 变化时复位 `listScrollElement.scrollTop`。
- **`collection-detail.tsx`**：为列表虚拟化传入页面级 `scrollElement`。

## 验收

- `pnpm lint` / `typecheck` / `test` / `build` 全绿。
- 列表视图仅渲染视口内行 + overscan，507 条数据切换不再一次性挂载全部 DOM。

## 后续（同日）

- **Tab 切换与内容加载解耦（第一轮）**：Zustand 的 `setView` 是同步订阅，绕过了 `startTransition`；已尝试 `displayView` + `useDeferredValue`，但 BrowsePage 仍订阅 Zustand，效果有限。
- **Tab 切换与内容加载解耦（第二轮，根因修复）**：
  - **热路径移除 Zustand 订阅**：`BrowsePage` 用 React `useState` 管 `view`（初始化 `getBrowseView()`），`useEffect` 异步 `setBrowseViewPersisted`。
  - **`RepoViewToggle`**：受控 `value` + `onChange` + 乐观 `displayView`；点击只更新本地 state 并回调 `startTransition(() => setView)`，不再写 Zustand。
  - **`BrowseRepoList`**：memo 化内容区；`view !== deferredView` 时展示轻量过渡 skeleton（3 宫格 / 4 列表行），`RepoCollection` 仅在 deferred 提交后挂载/卸载。
  - 目标：tab 滑块立即响应，内容 skeleton 与重挂载发生在低优先级 transition 帧。
- **过渡 skeleton 可见性（第三轮）**：`view !== deferredView` 窗口过短导致 skeleton 不可见；改为 overlay 覆盖（旧视图保留在底层挂载/切换，skeleton 立即显示），新视图 ready 后至少展示 150ms 再撤 overlay。
- **Tab 延迟修复（第四轮）**：`setTransitionView` 同步触发整页重渲染，拖住 tab 滑块；拆为 `displayView`（点击即更新 tab）与 `transitionView`（仅在 `startTransition` 内更新，驱动内容 overlay）。
- **架构收敛（第五轮）**：状态过多（`displayView` / `transitionView` / timer）不利于维护；收敛为：
  - **`useBrowseView`**：单一 hook 管理 `view` / `deferredView` / `pendingView` / `transitionTo`；`pendingView` 在点击时即设为目标视图，transition 完成且 `deferredView` 对齐后清除。
  - **`RepoViewToggle`**：本地 `selected` 乐观更新 + `memo`；父级仅 `committedView` 对齐持久化结果。
  - **`BrowseRepoList`**：overlay skeleton，`view` 为 deferred 内容，`pendingView` 驱动过渡层。
  - **`SegmentedControl`**：indicator 的 value 驱动更新从 `useLayoutEffect` 改为 `requestAnimationFrame`，避免同步 layout 阻塞绘制。
  - **`browse.tsx`**：删除冗余 state/effect，页面只消费 hook 返回值。

- **根因修复（第六轮，2026-07-07 晚）**：前五轮全部停留在"调度优先级"层面（tab 立即响应、`startTransition` 延后渲染、skeleton 遮住等待），但从未减少切换本身的开销，用户反馈依旧"点击后要等一会才切换"。复查后定位真正根因：
  - `repo-collection.tsx` 的 `RepoCollection` 用 `if (view === 'list') ... else ...` 在两个类型完全不同的子树间切换，React 每次都会**整体卸载旧子树、全新挂载新子树**，不是重渲染。
  - 每次挂载都会串联触发多轮独立 commit 的同步布局测量：`useScrollMargin` 的 `useLayoutEffect`（两次 `getBoundingClientRect`）→ `useColumns`（仅宫格）新建 `ResizeObserver` 并首测 → `useVirtualizer` 从零初始化（宫格还多一次 `virtualizer.measure()`）。即使包在 `startTransition` 里，React 仍必须把这些工作全部做完才能提交绘制——transition 只让它"可被打断"，并不会让工作量消失，所以 skeleton 撤下前用户依旧经历了这整段挂载耗时。
  - 开发环境 `<StrictMode>`（`apps/web/src/main.tsx`）会双重调用 effect，本地调试时这个重挂载成本被放大约一倍，但生产构建下"每次切换都整体重建一遍"的根因依然存在。
  - **修复**：`BrowseRepoList` 新增 `mountedViews` 集合，记录"曾经访问过的视图"，一旦挂载过就常驻在 DOM 里，之后切换只是给外层 `div` 加/去 `hidden`（`display:none`）class，不再触发 unmount/mount；非当前视图的 `scrollElement` 传 `null`，让其 `useVirtualizer` 解除对共享滚动容器的订阅，避免隐藏视图在滚动时被双倍计算；切回来时 `ResizeObserver`/`useLayoutEffect` 会自动重新测量一次。`useBrowseView`/`RepoViewToggle`/skeleton 调度逻辑保持不变，继续兜底"首次访问某个视图"这个仍无法避免的一次性挂载成本。
  - 效果：只有会话内**第一次**切到某个视图仍有一次挂载耗时，此后来回切换（用户反馈的高频场景）变成纯 CSS 显隐，理论上应为瞬时。
  - `pnpm lint` / `typecheck` / `test` / `build` 全绿；受限于本地无 GitHub OAuth 测试账号，未能在已登录状态下用浏览器自动化直接录制点击前后的可视化耗时对比，需要用户本地手动确认切换手感。

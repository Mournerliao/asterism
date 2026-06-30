# 2026-06-30 · Phase 1 Slice 4：Browse（卡片/列表 + 虚拟滚动）

## 范围

首个数据驱动 UI 切片：Browse 页消费 `useStarredRepos` 读真实数据，卡片/列表双视图、
TanStack Virtual 行虚拟化、空/骨架/错误三态，对齐 Ardot Browse（`8:59`）/空态（`12:240`）/
骨架（`12:267`）。

## 组件

- `components/repo-card.tsx`：语言色点 + `owner / name`（link 色，跳 GitHub 新标签）+ 描述
  （line-clamp-2）+ topic 徽章（最多 4，溢出 `+N`）+ star/fork（紧凑数字）/`pushed_at` 相对时间
  + 归档徽章；`h-full` 等高便于网格对齐。
- `components/repo-list-row.tsx`：横向紧凑行（描述单行截断、topic 随断点显隐、统计右对齐）。
- `components/repo-skeletons.tsx`：卡片/行两种骨架。
- `components/repo-collection.tsx`：自带滚动容器的**行虚拟化**（`@tanstack/react-virtual`）；
  按容器宽度自适应列数（grid 最多 3 列、list 1 列，ResizeObserver），`measureElement` 动态测高，
  列数/视图变化 `measure()` 重置缓存。
- `components/repo-view-toggle.tsx`：卡片/列表切换，状态存 Zustand。
- `pages/browse.tsx`：标题 + 计数（locale 数字）+ 视图切换；loading→骨架、error→重试、
  empty→星形空态 + 「Sync GitHub Stars」、有数据→`RepoCollection`。

## 基建 / 工具

- `stores/browse-view.ts`：Zustand + persist 持久化视图偏好（首次使用 zustand）。
- `lib/format.ts`：`formatCompactNumber`（compact）/`formatRelativeTime`（Intl.RelativeTimeFormat，
  跟随 locale）。
- `lib/language-colors.ts`：常见语言 Linguist 色点，未知回退 muted。
- `layouts/app-layout.tsx`：`min-h-svh`→`h-svh` + `min-h-0`，使页面 `h-full` 子级可建立独立滚动区
  （供 Browse 自带虚拟滚动容器）。

## i18n

- `browse.*` 扩充：count / viewGrid / viewList / archived / stars / forks / updated / starred /
  emptyTitle / emptyDescription / syncAction / errorTitle / errorDescription / retry，en + zh-CN。

## 验收

- `pnpm lint` / `typecheck` / `test` / `build` 全绿。
- 浏览器实测（临时注入 60 条 mock + 旁路 auth，截图后已还原并删除 mock 文件）：
  - 卡片视图（light）3 列对齐，徽章 `+N` 溢出、归档徽章、star/fork/更新/收藏元信息正确。
  - 列表视图（dark）整行紧凑、归档图标、统计右对齐；明暗对比度良好。
  - 60 条触发虚拟化按需渲染、滚动正常。

## 后续 / 已知

- Browse 顶部尚无筛选/搜索条（Slice 5 接 `topbar` 搜索 + 多维筛选，叠加作用于本地数据）。
- 卡片点击暂为打开 GitHub；Repo Detail Drawer（打标签/集合/笔记）留到 Slice 6。
- Vite 提示首屏 chunk > 500KB（已登记 BACKLOG，后续按路由 code-split）。

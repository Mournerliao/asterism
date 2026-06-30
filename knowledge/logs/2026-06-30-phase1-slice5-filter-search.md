# 2026-06-30 · Phase 1 Slice 5：多维筛选 + 关键词搜索

## 范围

在 Browse 之上叠加客户端本地筛选/搜索/排序：语言 / topic / star 阈值 / 最近 push / 归档状态
多条件可组合（AND），顶部栏关键词即时搜索，统一「清除」。逻辑沉到 `packages/core` 并配单测。

## core（业务逻辑 + 单测）

- `repos/filter.ts`：`RepoFilter` / `RepoSort` / `RepoStatus` / `RepoFacets` 类型；
  `filterStarredRepos`（query 匹配 owner/name/fullName/description/topics；language/topic/minStars/
  pushedWithinDays/status 组合 AND；不变更入参、可注入 now）、`sortStarredRepos`（starred/pushed/
  stars/name）、`deriveRepoFacets`（语言按字母、topic 按频次降序）、`hasActiveFilter`。
- `repos/filter.test.ts`：11 个 Vitest 覆盖关键词、各维度、组合、排序（含 nulls last）、facets、
  active 判定。core 测试合计 17 通过。

## web

- `stores/browse-filters.ts`：Zustand 内存态（query/language/topic/minStars/pushedWithinDays/
  status/sort + reset）；`toRepoFilter` 映射到 core 的 `RepoFilter`。跨导航保留，不落盘。
- `components/app-topbar.tsx`：搜索框接 store query（受控 + 清除按钮）。
- `components/repo-filter-bar.tsx`：语言/topic/star/push/状态/排序 6 个 Select（facets 动态填充），
  有筛选时显示「清除筛选」。
- `pages/browse.tsx`：`deriveRepoFacets` + `filterStarredRepos`+`sortStarredRepos`（useMemo）驱动
  可见列表；新增「无匹配结果」空态（SearchX + 清除）。
- i18n：`filters.*` + `browse.noResults*` + `topbar.clearSearch`，en + zh-CN。

## 验收

- `pnpm lint` / `typecheck` / `test`（core 17）/ `build` 全绿。
- 浏览器实测（临时 mock 48 条 + 旁路 auth，验证后还原并删除）：语言筛选 TypeScript → 48 收窄到
  16、计数更新、出现「清除筛选」；筛选下拉项由数据 facets 动态生成（CSS/Go/JavaScript/Rust/
  TypeScript）。

## 后续

- Tag 维度筛选留到 Slice 6（用户标签落库后再加入筛选条）。
- 关键词搜索目前为子串匹配；如需模糊/拼音可后续增强。

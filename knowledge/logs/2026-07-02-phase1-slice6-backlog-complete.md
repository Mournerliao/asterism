# 2026-07-02 · Phase 1 Slice 6 补完：标签筛选 / 集合详情 / 重名校验

## 目标

补齐 Slice 6 遗留三项 BACKLOG，使 MVP 标签/集合验收完整。

## 变更

- **Core**：`RepoFilter.tagIds` + `filterStarredRepos(..., tagsByRepoId)` OR 语义；Vitest 补充。
- **Web Browse**：`browse-filters` 增 `tagIds`；`RepoFilterBar` 多选 Tags DropdownMenu；Browse 传入 `tagsByRepoId` Map。
- **集合详情**：`/collections/:id` 路由 + `CollectionDetailPage`（返回链接 / 标题 / RepoCollection 列表）；Collections 卡片可点击，kebab `stopPropagation`。
- **重名校验**：`TagFormDialog` / `CollectionFormDialog` 提交前 case-insensitive 去重 + inline 错误 + toast。

## 验证

- `pnpm --filter @asterism/core test` 通过
- `pnpm lint` / `typecheck` / `build` 全绿

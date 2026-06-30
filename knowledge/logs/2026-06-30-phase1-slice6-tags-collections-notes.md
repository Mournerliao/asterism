# 2026-06-30 · Phase 1 Slice 6：标签 / 集合 / 笔记

## 范围

按 user_id RLS 隔离，落地三类用户私有数据的逐表 CRUD 与关联：标签（tags）、集合
（collections）、笔记（notes），以及 Repo Detail Drawer（打标签 / 加集合 / 写笔记）与 Tags /
Collections 两个管理页。写入直接经 `@asterism/db` 客户端（RLS `for all` 允许本人增删改查，连接表
FK 均 `on delete cascade`），无需受信路径。

## core（领域模型）

- `models/tag.ts`：`Tag` + `TAG_COLORS`（8 色 GitHub 风调色板）+ `pickTagColor(seed)`（按现有
  标签数循环取色）。
- `models/collection.ts`：`Collection`；`models/note.ts`：`Note`（每用户每仓库一条）。

## db（查询）

- `queries/tags.ts`：`listTags`（embed `repo_tags(count)` 聚合计数）/ `createTag` / `updateTag` /
  `deleteTag`（`TagWithCount`）。
- `queries/repo-tags.ts`：`listRepoTags`（整体拉取按 repoId 建索引）/ `addRepoTag` / `removeRepoTag`。
- `queries/collections.ts`：`listCollections`（embed count + updatedAt）/ create/update/delete
  （`CollectionWithMeta`）。
- `queries/collection-repos.ts`：`listCollectionRepos` / `addRepoToCollection` /
  `removeRepoFromCollection`。
- `queries/notes.ts`：`getNote` / `saveNote`（正文非空 upsert onConflict user_id+repo_id，空则删）。
- `queries/repos.ts`：`StarredRepoRecord` 增加 `repoId`（repos.id uuid），供关联写入引用。

## web

- 数据 hooks（TanStack Query）：`use-tags` / `use-repo-tags` / `use-collections` /
  `use-collection-repos` / `use-note`，含查询 + 增删改 mutation（成功后按 key 失效刷新）；
  `data/keys.ts` 增 tag/repoTag/collection/collectionRepo/note 键。
- `stores/repo-drawer.ts`：Zustand 全局选中态（任意页面卡片点击都打开同一 Drawer）。
- 组件：`repo-detail-drawer.tsx`（Sheet：元信息 + 标签胶囊增删 + 集合勾选 + 笔记编辑 + Open on
  GitHub，对齐 Ardot `8:364`）；`tag-badge.tsx`（色点胶囊，边框/点呈现配色保证两套主题对比度）；
  `tag-form-dialog.tsx` / `collection-form-dialog.tsx`（受控表单，新建/编辑复用）；
  `confirm-dialog.tsx`（删除确认）。
- 卡片接线：`RepoCard` / `RepoListRow` 可点击打开 Drawer（标题链接 stopPropagation 仍跳 GitHub）
  并展示已打标签（卡片胶囊 / 列表色点）；`RepoCollection` 透传 `tagsByRepo` + `onSelect`；
  Browse 构建 repoId→Tag[] 映射并接 `useRepoDrawer`。
- 页面：`pages/tags.tsx`（网格卡片 + 搜索 + 创建/编辑/删除，对齐 `12:2`）、
  `pages/collections.tsx`（网格卡片 + 计数 badge + kebab 编辑/删除，对齐 `12:126`）。
- i18n：`common.*` / `drawer.*` / 扩充 `tags.*`、`collections.*`，en + zh-CN。

## 验收

- `pnpm lint` / `typecheck` / `test`（core 17 + db 2）/ `build` 全绿。
- 浏览器实测（临时 mock + 旁路 auth，验证后已全部还原并删除 `__dev-mocks.ts`）：Browse 卡片显示
  标签胶囊；点击卡片打开 Drawer（标签增删、集合「Web Dev Stack」勾选、笔记文本）；Tags 页 8 张
  标签卡（色点/计数/编辑删除）；Collections 页 4 张集合卡（计数 badge/描述/更新时间/kebab）。三者均
  对齐设计稿。

## 后续

- 顶部筛选条尚未加入「按标签」维度（数据已落库），留作增强。
- 集合详情页（查看/管理集合内仓库列表）未做，当前集合归属经 Drawer 勾选管理。
- 重名（tags/collections 唯一约束）当前依赖数据库报错，未做前端友好提示与去重校验。

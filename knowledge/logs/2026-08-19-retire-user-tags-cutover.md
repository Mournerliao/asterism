# 2026-08-19 · ADR 0035 Tag 退役 cutover

- Status: implemented in this session; not committed, not pushed, not deployed.
- Spec: `decisions/0035-retire-user-tags-unify-on-collections.md`、`logs/2026-08-19-retire-user-tags.md`
- 未发布 GitHub issue。未改 Collection Dial 拿起 / 确认 / Undo。未动 embedding / 混合搜索 / Related Stars / OAuth。未混入 Impeccable v4 更新。

## 数据

单一追加 migration `supabase/migrations/20260819120000_retire_user_tags.sql`：

1. 替换 7 参数 `create_bulk_operation`，新建只接受 `relationType = collection`。
2. 每个 Tag 按 `normalize_classification_name` 映射到已有 Collection，或插入同名 Collection（description 空，color 丢弃）。
3. `repo_tags` 幂等写入 `collection_repos`。
4. 缺失的 `collection_relation_heads` 补 baseline（`present=true, version=1, last_operation_item_id=null`），不归属新 operation。
5. 删除 `repo_tags` / `tags`。

历史 `bulk_operation_items.relation_type = 'tag'` 的 CHECK 仍允许 `'tag'`。Executor 遇到历史 tag item 记为 terminal fail，不再直写。

## 应用层

- `packages/core`：删除 Tag 模型；筛选 / 混合搜索改 `collectionIds`；仪表盘改集合覆盖率与 Top collections；导出 v2；导入接受 v1（tags 折叠进 Collection）与 v2。
- `packages/db`：删除 tags / repo_tags 查询；导入只写 Collection + 受信 `mutateCollectionRelation`。
- `bulk-organize`：创建路径拒绝 tag；store 不再查 / 写 `tags` / `repo_tags`。
- Web：删除 Tags 页与侧栏入口，`/tags` → `/collections`。Browse 主栏 Language / Topic / Collection / 更多筛选 / 排序；Collection 用 MultiFacetPicker（首开 20，搜索 50，多选 OR）。卡片 / 列表集合名占原 chip 槽，无调色盘，不再显示集合计数。Quick Look：Overview → Related Stars → Collections → Notes，集合编辑可搜索。批量只留 Collection。Collections 索引可搜索。Dashboard：已加入集合 + Collection Top 5。en / zh-CN 齐备。

## 门禁与本机限制

四道 Node 门禁已通过：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。Vitest 在 Node 25 下会碰到无功能的实验性 `localStorage` 全局，已在 `apps/web/src/test/setup.ts` 补内存实现，否则 happy-dom 测试会被其遮蔽。

本机无 Docker：未运行 `pnpm test:db`，未对本地 Postgres apply migration。不要把这些记成已跑过。未部署远端 Supabase，未 push。

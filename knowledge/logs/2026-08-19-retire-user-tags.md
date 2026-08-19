# 2026-08-19 · 退役用户自定义 Tag：任务审计、UX brief、影响清单与迁移规格

- Status: ADR 0035 implemented (2026-08-19). See `logs/2026-08-19-retire-user-tags-cutover.md`.
- 本轮规格写于 cutover 之前；实现以本文件为准，落地记录另见 cutover 日志。
- 工作区里与 #29 / #34 收尾相关的既有文档改动不是本决策产物，未回滚。

## 1. 产品裁决

退役用户自定义 Tag。用户组织仓库的唯一概念是 Collection。

| 平面 | 承担 |
| --- | --- |
| GitHub metadata | 客观描述与筛选：Language、Topics、Archived、star 数、时间 |
| Collection | 全部用户命名的组织关系，含主题清单与「待读 / 生产可用」等状态型短标记 |
| Note | 个人上下文 |

不为状态型短标记重新发明轻量标签。Tag color 不迁移，也不给 Collection 补调色盘。

## 2. 任务审计

当前 Tag 与 Collection 都是 `(user, name)` 唯一的用户命名分组，连接表都是仓库多对多。产品文案已经互相重叠：Tags 空态是「标注并分组」，Collections 空态是「按项目或主题分组」。

| 用户任务 | 今天谁做 | cutover 后谁做 | 是否无损 |
| --- | --- | --- | --- |
| 给仓库一个自己起的名字，并允许多归属 | Tag 或 Collection | Collection | 是 |
| 从 Browse 按该名字收窄列表 | 仅 Tag（OR 多选） | Collection 筛选，同样 OR | 需补能力，不是保留 Tag 的理由 |
| 打开一份可维护的仓库清单 | 仅 Collection 详情 | Collection 详情 | 是；「待读」因此变得更好 |
| 浏览时快速把仓库送进分组 | Collection Dial | Collection Dial | 是 |
| 单项增删关系 | Quick Look Tags 与 Collections 两套 UI | Quick Look 只留 Collection | 是 |
| 批量增删关系 | bulk dialog 并列两栏 | 只留 Collection | 是 |
| 在卡片上扫到用户整理信息 | 彩色 Tag chip；集合只显示数量 | 集合名称占据原 chip 槽，无调色盘 | 损失颜色，不损失成员关系 |
| 管理分组本身（建 / 改 / 删 / 搜索） | Tags 页有搜索；Collections 页无搜索 | 统一到 Collections 索引，并补搜索 | 需补能力 |
| 客观技术属性 | GitHub language / topics；用户 Tag 常与之重复 | GitHub metadata | 是 |
| 记下为什么 star、怎么用 | Note | Note | 是 |
| 按关键词找仓库 | 名称 / 描述混合搜索；不搜 Tag 名 | 不变 | 是 |
| 看整理覆盖率 | Dashboard「已打标签」+ Tag Top 5 | 「已加入集合」+ Collection Top 5 | 是 |
| 备份 / 恢复组织数据 | JSON 含 tags 与 collections | 新导出只写 Collection；旧 JSON 的 tags 导入时转换 | 是 |
| 排他工作流状态（待读 XOR 已读） | Tag 做不到 | Collection 也做不到 | 不构成反证 |

结论：没有必须靠独立 Tag 才能完成、且 Collection 无法自然承担的任务。颜色扫描是唯一 Tag 原生视觉能力，接受失去。

## 3. UX brief（cutover 目标，不是当前实现）

Register：product。色彩策略：Restrained，沿用 Graphite Glass。场景：开发者在书桌前从几百到上千条 Star 里找仓库或把新 Star 归入已有集合，不是在学习两套分类学。

视觉方向探针未做：这是信息架构决策，不是新视觉方向；用画面无法验证概念是否自明。

### 主操作

用户只维护 Collection。加入、筛选、进入、批量改关系，都指向同一概念。

### 各表面

- **Browse 筛选**：主栏为 Language / Topic / Collection / 更多筛选 / 排序。Collection 使用与 Language / Topic 相同的可搜索 FacetPicker（首开最多 20，搜索最多 50），禁止无搜索的全量 checkbox 菜单。多选 OR，并与其他 facet AND。README 返回快照把 `tagIds` 换成 `collectionIds`。
- **卡片 / 列表**：用户集合名称占据原 Tag chip 槽，无调色盘，与 GitHub topics 按大小写不敏感去重，溢出 `+n`。笔记存在状态仍在右侧。卡片不再单独显示集合计数，避免与名称重复。
- **Quick Look**：Overview → Related Stars（有结果时）→ Collections → Notes。去掉 Tags 段。集合编辑必须可搜索，不能在几十到上百个集合时摊开全部 checkbox。
- **批量整理**：确认层只配置 Collection 的添加 / 移除。导出仍按固定 repository ID 读取最新权威数据。
- **Collection Dial**：仍是 Browse 主要直接整理入口；More / New / Undo 边界不变。候选目录会因 Tag 迁入而变大，More 搜索必须继续只扫冻结 catalog 的 name / description。
- **Collections 索引**：承担原 Tags 页的搜索与高频创建。空态只保留一处创建主操作；有数据后创建入口在页头。无匹配结果保留创建入口。卡片仍进入详情。目标量级：常见十几个，必须可用到约 100。
- **Collection 详情**：继续作为可进入清单；整理上下文改为集合名称而非 Tag chip。
- **Dashboard**：统计改为集合覆盖率与 Collection 使用 Top 5，不再报 Tag。
- **导入 / 导出**：见 §5。
- **导航**：去掉 Tags。`/tags` 重定向到 `/collections`。
- **移动端**：筛选 picker、Quick Look Sheet、Dial Grip、Collections 索引搜索在 390px 可用；触控目标 ≥44px。
- **扩展（Phase 3）**：GitHub 仓库页内加入 Collection / 写笔记，不再打标签。不要按旧契约先实现 Tag。

### 明确不做

- 不用空态、tooltip、设置说明或 onboarding 教人「以前叫标签」。
- 不给 Collection 加颜色、图标分类或「智能标签」。
- 不把「待读」做成系统预置集合；用户若需要就自己建。
- 不为了展示本 brief 先做 throwaway 原型。

### 关键状态

空库、零集合、有集合但当前仓库未加入、筛选无匹配、Quick Look 写失败恢复、Dial 空 catalog / 已加入全部、导入含旧 tags、同名合并、历史 bulk item `relation_type=tag` 只读。

## 4. 全仓影响审计（实现时必须碰到，本轮不改代码）

### 产品 / 知识

- 契约：`product.md`、`ui-ux.md`、`data-model.md`、`architecture.md`、`roadmap.md`（本轮已按目标态更新）。
- 对齐层：`apps/web/PRODUCT.md`；根 `README.md` 的 Tags & collections 表述。
- 历史 ADR / 日志保留；0032 所说「历史 AI 写入的普通标签不回滚」被本 ADR 解释为：成员关系迁入 Collection，不删除用户整理结果。

### Web

- 路由 / 导航：`apps/web/src/router.tsx`、`sidebar-nav.tsx`、`page-loading-states.tsx`（`TagsRouteLoading` / `TagGridSkeleton`）。
- 页面：`pages/tags.tsx` 删除；`pages/collections.tsx` 补搜索与量级；`pages/collection-detail.tsx`、`pages/browse.tsx`、`pages/dashboard.tsx`、`pages/import-export.tsx`。
- 整理 UI：`repo-inspector.tsx` TagsSection、`bulk-organization.tsx` tag 栏、`repo-filter-bar.tsx` tag dropdown、`tag-badge.tsx`、`tag-form-dialog.tsx`。
- 卡片上下文：`repo-card-context.ts`、`repo-card.tsx`、`repo-collection.tsx`。
- 状态：`stores/browse-filters.ts` 的 `tagIds`；`lib/readme-navigation.ts` / `readme-return-coordinator.ts`。
- 数据 hooks：`data/use-tags.ts`、`data/use-repo-tags.ts`、`data/keys.ts`。
- i18n：`en.json` / `zh-CN.json` 的 `nav.tags`、`tags.*`、`drawer.tags`、`filters.tags`、`dashboard.taggedRepos` / `topTags`、`bulk` 中的 tag 文案、`importExport` 范围说明。
- 测试：上述文件的 `*.test.ts(x)`，含 inspector overlay、filter、export snapshot、readme 返回、bulk runner。

### 共享包

- `packages/core`：`models/tag.ts`、`repos/filter.ts` 的 `tagIds`、`repos/analytics.ts` 的 `topTags` / `taggedRepoCount`、`data-port` 的 v1 tags 字段与 CSV/Markdown 渲染。
- `packages/db`：`queries/tags.ts`、`queries/repo-tags.ts`、`import-user-data.ts`、`bulk-operations.ts` 的 `BulkRelationType`、`database.types.ts`。
- `packages/ui`：无独立 Tag 业务组件；badge radius token 仍用于 chip，与退役无关。

### Supabase

- 表：`tags`、`repo_tags`。RLS 与 `ON DELETE CASCADE`。
- 唯一性：`tags_user_normalized_name_idx` 与 `collections_user_normalized_name_idx` 共用 `normalize_classification_name`。
- `bulk_operations` / `bulk_operation_items.relation_type` 仍允许历史 `'tag'`。
- `bulk-organize` executor 仍写 `repo_tags`（`supabase/functions/bulk-organize/index.ts`、`relationships.ts`）。
- Collection 关系继续只走受信 RPC / `collection_relation_heads`（ADR 0034）。Tag 迁入的新 `collection_repos` 必须补 baseline head，幂等 no-op 不推进 version。
- 直写 `repo_tags` 的客户端路径在 cutover 后删除；不要留下半套 Tag API。

### 明确不在范围内

- 不回滚 #29–#34 Collection Dial。
- 不改 embedding / 混合搜索 / Related Stars。
- 不改 GitHub OAuth scope。
- 不把 throwaway prototype 加回来。
- 不在本轮创建 GitHub issue。

## 5. 迁移规格（实现时执行，本轮不跑）

单一追加 migration，对全部用户一次完成。新环境靠历史 migration 建出 Tag 表，再被本 migration 收敛，与 ADR 0032 的「先有后删」纪律相同。

1. **对齐规则**：`normalize_classification_name(name)` 相等即同名。
2. **每个 Tag**：若同用户已有同名 Collection，使用该 Collection（保留其 `name` 拼写与 `description`）；否则插入 Collection，`name` 用 Tag 当前显示名，`description` 为空，`color` 丢弃。
3. **每个 `repo_tags` 行**：写入对应 `collection_repos`；已存在则跳过。随后为新出现的 membership 插入或补齐 `collection_relation_heads` baseline（`present=true`，不归属新 operation）。已有 head 保持不动。
4. **删除** `repo_tags`、`tags` 及仅服务它们的索引 / RLS / 触发器。
5. **账本**：不改写历史 `bulk_operation_items`。创建 / 校验路径此后只接受 `relation_type = 'collection'`。读取历史结果时，`tag` 只作为过去时事实展示或忽略，不得再执行。
6. **导入**：v1 JSON 若含 `tags` / `repoTags`，在应用层按 1–3 转成 Collection 后再写入；与在线表迁移同一套规范化。v2 导出省略这些字段。CSV / Markdown 只按 Collection 与 Notes 组织。
7. **导出版本**：新写使用 v2（无 tags）。导入同时接受 v1 与 v2。
8. **失败**：migration 必须事务内完成或整段回滚。不得出现「Collection 已建、Tag 未删」的可登录中间态。
9. **自部署**：`supabase/README.md` runbook 在实现落地时同步；本轮不改该文件里与 #34 无关的段落。

不可逆点：Tag color；同名合并后的独立 Tag 身份；新备份不再含 Tag。成员关系与 Collection 名称可逆性仅限于「再做一个新的 Tag 产品」，需要新 ADR。

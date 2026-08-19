# ADR 0035 · 退役用户自定义 Tag，统一到 Collection

- Status: Accepted and implemented
- Date: 2026-08-19
- Implemented: 2026-08-19 (`supabase/migrations/20260819120000_retire_user_tags.sql`)
- Builds on: ADR 0023、0032、0033、0034

Accepted 已落地：用户自定义 Tag 已迁入 Collection，Tag 用户面与 `tags` / `repo_tags` 已删除。Cutover 细节见 `logs/2026-08-19-retire-user-tags-cutover.md`。

## Context

Asterism 同时提供用户自定义 Tag 与 Collection。二者在实现上都是用户命名的仓库多对多关系，都支持多归属、单项与批量增删。产品曾试图把 Tag 说成描述性属性 / 筛选切面，把 Collection 说成可进入的策展清单。这条边界必须靠示例或说明才能成立，说明它不够自明。

用户明确拒绝「用例子教人区分」作为解决方案，并问「如果直接去掉 tag 呢」。任务审计确认：Tag 独占的真实任务几乎都可以被 GitHub metadata、Collection 或 Note 接管。最强反证是「待读 / 生产可用」这类状态型短标记；它们在结构上仍是命名分组，作为可进入、可筛选的 Collection 比作为不可进入的彩色 chip 更自然。排他状态（待读 XOR 已读）今天的 Tag 也做不到，不能成为保留第二概念的理由。

Collection Dial 已经把 Collection 选成 Browse 的直接整理动词。继续保留平行的 Tag 分类学，只会让同一关系被两套 UI 编辑。

## Decision

退役用户自定义 Tag。用户组织仓库的唯一概念是 Collection。

- **GitHub metadata**（Language、Topics、Archived、star 数、时间）承担客观描述与筛选。
- **Collection** 承担全部用户命名的组织关系：主题清单、工作列表、状态型短标记都是 Collection。
- **Note** 承担个人上下文。
- 不为状态型短标记重新发明轻量标签、Label 或第二套 chip 分类学。
- Tag color 不迁移，也不给 Collection 补调色盘。颜色曾经是 Tag 的视觉身份；补上等于把 Tag 变相留住。
- 名称按已有 `normalize_classification_name`（NFKC、trim、空白折叠、小写）对齐。每个 Tag 转为同名 Collection；已有同名 Collection 时合并关系到该集合，保留其显示名与 description；重复关系幂等。
- 旧 JSON 导入继续接受 `tags` / `repoTags`，按同一规则转成 Collection。新版导出只写 Collection。
- 不丢 canonical 成员关系。历史 `bulk_operation_items.relation_type = 'tag'` 作为账本事实保留，cutover 后不再创建。

Cutover 完成后，现有 Tag 页面、筛选、Quick Look 与批量路径不再可用。实现规格、迁移与 UI 收敛见 `logs/2026-08-19-retire-user-tags.md` 与 `logs/2026-08-19-retire-user-tags-cutover.md`。

## Considered Options

- **保留两个概念，只改交互与文案。** 拒绝。结构相同，任何必须解释的边界都会回到教学。
- **退役 Collection，只留 Tag。** 拒绝。可进入详情、description、Collection Dial、受信关系 mutation 与短期 Undo 都已经围绕 Collection 建成。
- **把 Tag 收成「仅状态」的轻量标记。** 拒绝。这是换名字重建 Tag；待读本身就是工作列表。

## Consequences

- Browse 必须能按 Collection 筛选；Quick Look 与批量整理只保留 Collection 与 Notes；Collection Dial 仍是主要直接整理入口。
- Collections 索引、选择器与筛选必须能处理几十到上百个集合。当前索引无搜索、Browse 无集合筛选、Quick Look 会列出全部集合，这些在 cutover 时一并修，而不是事后补丁。
- `/tags` 在 cutover 后重定向到 `/collections`。侧栏不再出现 Tags。
- Phase 3 扩展的「页内打标签」改为加入 Collection / 写笔记。不要先按旧契约实现 Tag，再立刻删掉。
- 若未来有真实证据表明需要独立于 Collection 的排他状态字段，必须用新 ADR 立项，不能复活 Tag。

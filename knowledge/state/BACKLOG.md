# BACKLOG · 待办与已知开放项

> 持久状态层（Durable State）。本文件汇总**尚未解决的开放问题、待确认决策、未落地的工作项**。
> 与其他文件分工：里程碑/阶段进度看 `PROGRESS.md`；轻量便签看 `NOTES.md`；阶段功能拆分看 `roadmap.md`；已定的重大决策看 `decisions/*`。
> 维护约定：解决一项就勾选并简述结论；若上升为正式决策，迁移到 `decisions/` ADR 并在此留指针。

## 待确认 / 开放问题

- [x] **品牌配色 / 圆角已定稿**：2026-07-10 配色升级为 **Asterism Graphite Glass**（见 ADR 0009），保留 8px 圆角、Geist 字体与 4px 间距栅格。
- [ ] **公共实例域名待定**：当前占位 `asterism.dev`，最终域名待确认后同步 `README.md` 与 `runbooks/self-host.md`。
- [x] **a11y 目标确认**：以 **WCAG 2.1 AA** 为 UI 验收目标；Graphite Glass 核心文字/状态组合已计算通过。
- [ ] **是否加入匿名遥测**：默认**不加**（隐私优先）；如要加，需明确采集范围、可关闭开关与隐私说明，先讨论再实现。
- [ ] **LICENSE 署名确认**：MIT，版权年份 2026，**署名占位待确认**（个人/组织名）。
- [ ] **测试策略深度**：需明确单测/集成/E2E 的边界与覆盖目标（Vitest 已选为基线），写入 `contracts/conventions.md`。

## 未落地的工作项（基础设施）

- [x] **CI（GitHub Actions）已建**：`.github/workflows/ci.yml` 跑 lint / typecheck / test / build（pnpm + Node 22，纯 Node）。2026-06-29 落地。
- [ ] **发布工程细化**：Changesets 已配根，但发布流程（版本、changelog、tag）待 Phase 0+ 跑通。
- [ ] **扩展专属 i18n**：`apps/extension` popup 当前为最小硬编码英文文案，MV3 `_locales` 国际化按计划留到 **Phase 2**（见 `decisions/0004`）。
- [ ] **Biome 不约束 CSS**：因 Tailwind v4 语法，`*.css` 已排除出 Biome；如需 CSS 规范后续再决策（见 `decisions/0004`）。
- [x] **`globals.css` 同步 Graphite Glass token**（2026-07-10）：light/dark、单色 brand、语义状态、蓝色阶图表与限定交互层玻璃已落地；见 ADR 0009 与对应日志。
- [x] **同步进度必须来自真实状态**（2026-07-15）：Edge Function 尚未暴露 processed/total，因此 Browse 已改为 indeterminate 同步状态，不再用已有记录数推算伪精确计数；未来后端提供真实进度后再升级为 determinate。
- [ ] **Topbar Search 作用域需收敛**：Search 在全部路由显示但只写 Browse filter store。后续需裁决为 Browse/collection scoped search，或升级为真正的全局搜索/command surface，避免跨页隐藏筛选状态。
- [ ] **写操作失败恢复需统一**：标签、集合与笔记 mutations 的 pending、错误、重试、草稿保留和 optimistic rollback 尚未形成一致契约；后续需统一交互与数据恢复策略，并验证错误通告后的焦点路径。
- [x] **Browse 筛选层级精简**（2026-07-14）：主栏保留语言 / Topic / 标签 / 更多筛选 / 排序，Star 阈值、更新时间与状态收进带 active count 的次级弹层；高基数 facets 使用固定结果窗口与搜索，见 `logs/2026-07-14-browse-filter-hierarchy-and-facet-performance.md`。
- [ ] **重度用户批量整理路径**：上千 stars 仍以单仓库 Drawer 操作为主；Phase 2/后续需设计 bulk select + 批量 tags/collections，并考虑保存筛选与 recent query。
- [x] **DB 强类型查询**（2026-06-30，Slice 3）：`packages/db` 已收紧为 `SupabaseClient<Database>`，新增 `listStarredRepos`/`getLatestStarredAt` 强类型读查询。当前 `database.types.ts` 为**手写**（7 表 Row/Insert/Update + 关系）作为过渡；待 Supabase CLI 流程统一后用 `supabase gen types typescript` 生成版替换（保留此指针）。见 `logs/2026-06-30-phase1-slice3-stars-sync.md`。
- [ ] **迁移版本管理**：迁移文件用时间戳前缀（兼容 `supabase db push`）。若团队统一改用 Supabase CLI 流程，需在 ADR 固化「迁移即源、禁止手改线上」纪律。
- [ ] **Web 首屏 chunk 偏大**：2026-07-02 已通过路由 `React.lazy` 拆分（主 chunk ~395KB，Dashboard ~160KB）；`use-session`/Supabase 仍较大，后续可再拆 auth 层。
- [x] **按标签筛选维度**（2026-07-02）：`RepoFilterBar` 已加 tag 多选 DropdownMenu，`filterStarredRepos` 支持 `tagIds` OR 语义。
- [x] **集合详情页**（2026-07-02）：`/collections/:id` + `CollectionDetailPage`，列表卡片可点击进入。
- [x] **标签/集合重名前端校验**（2026-07-02）：表单提交前 case-insensitive 去重 + toast/inline 错误。

## 未来任务（按阶段）

详见 `knowledge/roadmap.md` 的阶段拆分：

- [x] **Phase 0 · 脚手架**：Monorepo 实包、共享包骨架、CI、初始 schema + RLS 迁移、GitHub OAuth 登录均已完成；2026-06-29 迁移已应用 + 登录端到端验证通过，验收达成
- [x] **Phase 1 · Web MVP**：同步 stars、卡片/列表 + 虚拟滚动、多维筛选与搜索、标签、集合、笔记、统计仪表盘、导入导出 — 2026-07-02 验收完成
- [ ] **Phase 2 · 扩展**：WXT popup 快搜 + content-script 页内操作、共享会话
- [ ] **Phase 3 · AI（BYOK）**：pgvector 向量化、语义搜索、AI 自动分类、Edge Functions
- [ ] **Phase 4 · 桌面**：Tauri 2 套壳

# BACKLOG · 待办与已知开放项

> 持久状态层（Durable State）。本文件汇总**尚未解决的开放问题、待确认决策、未落地的工作项**。
> 与其他文件分工：里程碑/阶段进度看 `PROGRESS.md`；轻量便签看 `NOTES.md`；阶段功能拆分看 `roadmap.md`；已定的重大决策看 `decisions/*`。
> 维护约定：解决一项就勾选并简述结论；若上升为正式决策，迁移到 `decisions/` ADR 并在此留指针。

## 待确认 / 开放问题

- [x] **品牌配色 / 圆角已定稿**（2026-06-30）：定为 **GitHub Primer 体系**（dark 取自 Ardot 设计稿、light 为 Primer 官方配对），已回填 `contracts/ui-ux.md`，见 `decisions/0005`。**字体 / 间距仍为 TBD**，待外部工具产出后填入。
- [ ] **公共实例域名待定**：当前占位 `asterism.dev`，最终域名待确认后同步 `README.md` 与 `runbooks/self-host.md`。
- [ ] **a11y 目标确认**：暂定 **WCAG 2.1 AA**，待最终确认并写入 `contracts/ui-ux.md`。
- [ ] **是否加入匿名遥测**：默认**不加**（隐私优先）；如要加，需明确采集范围、可关闭开关与隐私说明，先讨论再实现。
- [ ] **LICENSE 署名确认**：MIT，版权年份 2026，**署名占位待确认**（个人/组织名）。
- [ ] **测试策略深度**：需明确单测/集成/E2E 的边界与覆盖目标（Vitest 已选为基线），写入 `contracts/conventions.md`。

## 未落地的工作项（基础设施）

- [x] **CI（GitHub Actions）已建**：`.github/workflows/ci.yml` 跑 lint / typecheck / test / build（pnpm + Node 22，纯 Node）。2026-06-29 落地。
- [ ] **发布工程细化**：Changesets 已配根，但发布流程（版本、changelog、tag）待 Phase 0+ 跑通。
- [ ] **扩展专属 i18n**：`apps/extension` popup 当前为最小硬编码英文文案，MV3 `_locales` 国际化按计划留到 **Phase 2**（见 `decisions/0004`）。
- [ ] **Biome 不约束 CSS**：因 Tailwind v4 语法，`*.css` 已排除出 Biome；如需 CSS 规范后续再决策（见 `decisions/0004`）。
- [x] **`globals.css` 同步新 token**（2026-06-30）：`packages/ui` 的 `globals.css` 已从 neutral oklch 占位同步为 `contracts/ui-ux.md` 定稿的 GitHub Primer 配色 / 圆角（hex，含 `--link` / `--brand-*` 扩展 + `@theme inline` 映射，`--radius: 0.5rem`），light/dark 两套完整；文字/交互对比度经计算达 WCAG 2.1 AA，lint/typecheck/build 全绿。见 `logs/2026-06-30-globals-css-primer-sync.md` 与 `decisions/0005`。
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

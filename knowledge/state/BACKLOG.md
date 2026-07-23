# BACKLOG · 待办与已知开放项

> 持久状态层（Durable State）。本文件汇总**尚未解决的开放问题、待确认决策、未落地的工作项**。
> 与其他文件分工：里程碑/阶段进度看 `PROGRESS.md`；轻量便签看 `NOTES.md`；阶段功能拆分看 `roadmap.md`；已定的重大决策看 `decisions/*`。
> 维护约定：解决一项就勾选并简述结论；若上升为正式决策，迁移到 `decisions/` ADR 并在此留指针。

## 待确认 / 开放问题

- [x] **品牌配色 / 圆角已定稿**：2026-07-10 配色升级为 **Asterism Graphite Glass**（见 ADR 0009），保留 8px 圆角、Geist 字体与 4px 间距栅格。
- [ ] **自定义公共域名（非 Phase 1 阻断）**：当前维护者实例使用 Vercel 生产地址；未来确认并绑定品牌域名时，同步 README、runbook 与 Supabase Auth Site URL / Redirect URLs。
- [x] **a11y 目标确认**：以 **WCAG 2.1 AA** 为 UI 验收目标；Graphite Glass 核心文字/状态组合已计算通过。
- [x] **匿名遥测不纳入当前计划**（2026-07-18）：隐私优先，不采集产品行为。未来若有明确分析需求，重新定义采集范围、关闭机制、自部署行为与隐私说明。
- [x] **LICENSE 署名已确认**（2026-07-18）：MIT，版权年份 2026，使用 GitHub 名 `Mournerliao`；`LICENSE` 与 README 已统一。
- [x] **测试策略深度已明确**（2026-07-18）：Phase 1 以 Vitest 单元/集成测试 + 真实环境 smoke test 验收；不新增 E2E 工具、不设覆盖率百分比。重复核心旅程回归或进入跨端阶段时再评估自动化 E2E。详见 `contracts/conventions.md`。
- [ ] **AI 整理评审剩余次要项**（2026-07-23，来自 UI/UX critique，非阻断）：banner 多条堆叠缺优先级/去重；手动批量整理对话框在大量标签/集合时缺搜索与当前归属提示；确认全成功但 operation 尚未翻转 completed 的瞬间可能出现"需要处理 + 绿勾 + 无按钮"的过渡态。见 `logs/2026-07-23-ai-organization-uiux-critique.md`。

## 未落地的工作项（基础设施）

- [x] **CI（GitHub Actions）已建**：`.github/workflows/ci.yml` 跑 lint / typecheck / test / build（pnpm + Node 22，纯 Node）。2026-06-29 落地。
- [x] **Phase 1 阻断项 — 跨平台四道门禁全绿**：2026-07-18 已增加 `.gitattributes`、将文本规范化为 LF，并确认 `pnpm lint / typecheck / test / build` 全部成功（代码评审回归测试补齐后 121 tests）。
- [x] **Phase 1 阻断项 — 可执行的 self-deployment runbook**：2026-07-18 已按用户自有 Supabase Cloud + 静态托管重写，覆盖 migrations、GitHub OAuth、两个 Edge Functions、环境变量、Web 部署与 smoke test；完整 Supabase Docker 栈不在 Phase 1。
- [x] **Phase 1 阻断项 — 清理已取消的 Dexie 空壳**：2026-07-18 已删除 cache、公共导出、依赖与 lockfile 记录；持久数据仍只经 `packages/db` 访问 Postgres。
- [x] **部署并验收 `read-repo-readme` Edge Function**：2026-07-18 确认当前 Supabase 环境已部署；authenticated / public fallback / no README / not in library / rate limit / ETag 304 及真实复杂 README 路径均已验收。
- [ ] **首个公开版本的发布工程（非 Phase 1 阻断）**：Changesets 已配根；准备 `v0.1.0` 前再设计并验收 semver、Changelog、Git tag 与 release notes 流程。当前生产部署以 Git commit / Vercel deployment 追溯。
- [ ] **扩展专属 i18n**：`apps/extension` popup 当前为最小硬编码英文文案，MV3 `_locales` 国际化随路线调整移到 **Phase 3**（见 ADR 0015）。
- [x] **Phase 1 阻断项 — Biome 纳入 Tailwind v4 CSS**：2026-07-18 已启用 Tailwind directives parser、移除 CSS 排除并为 reduced-motion 的 4 处必要 `!important` 添加精确抑制；未引入 Stylelint。
- [x] **`globals.css` 同步 Graphite Glass token**（2026-07-10）：light/dark、单色 brand、语义状态、蓝色阶图表与限定交互层玻璃已落地；见 ADR 0009 与对应日志。
- [x] **同步进度必须来自真实状态**（2026-07-15）：Edge Function 尚未暴露 processed/total，因此 Browse 已改为 indeterminate 同步状态，不再用已有记录数推算伪精确计数；未来后端提供真实进度后再升级为 determinate。
- [x] **Phase 1 阻断项 — Browse Search 路由收敛**：2026-07-18 Topbar Search 已只在 Browse 的实际根索引路由 `/` 显示，不升级为全局搜索或其他页面搜索；代码评审后补充路由级回归测试。
- [x] **Phase 1 阻断项 — 写失败恢复**：2026-07-18 标签、集合、笔记与关联均保留目标/输入或服务器状态，提供双语错误与原位重试/取消；未引入 optimistic mutation 或通用 rollback。
- [x] **Phase 1 阻断项 — 对外文案与真实能力对齐**：2026-07-18 登录页双语文案已改为名称/描述关键词搜索，并增加双语断言。
- [x] **Browse 筛选层级精简**（2026-07-14）：主栏保留语言 / Topic / 标签 / 更多筛选 / 排序，Star 阈值、更新时间与状态收进带 active count 的次级弹层；高基数 facets 使用固定结果窗口与搜索，见 `logs/2026-07-14-browse-filter-hierarchy-and-facet-performance.md`。
- [x] **Phase 2 批量整理契约对齐**（2026-07-19，ADR 0023）：选择范围按 repository ID 固化；关系变更是最小执行与重试单位；确认后持久化操作及逐项结果；失败分为可重试 / 终止；选中导出沿用 JSON / CSV / Markdown 语义。
- [x] **Phase 2 选中导出（GitHub #12）**（2026-07-20）：Browse 批量模式可将固定 repository ID 范围导出为 JSON 部分备份 / CSV 清单 / Markdown 可读归档；只读读取下载时最新数据，不改动用户数据也不创建写操作记录；裁剪范围与筛选无关（核心 `scopeExportSnapshot`）。GitHub #11 / #12 均已验证并关闭。
- [x] **Phase 2 AI 切片 A — BYOK Generation Connections（GitHub #13）**（2026-07-22 全面复审完成）：Generation Connection 的添加、编辑、替换凭据、模型发现/手填、测试、显式启停、删除、active connection/model 与笔记偏好已落地；连接表只经受信函数返回安全投影，`user_settings` 客户端只读并由数据库 trigger 强制 active pair。AES-256-GCM + AAD、版本化 master key、独立带外轮换、类型化 Provider Registry、SSRF + allowlist + 同源重定向边界均有自动化覆盖；en / zh-CN、Impeccable 检测和四道门禁全绿。AI 整理建议流程（`ai_organization_drafts`）仍为切片 B。见 `logs/2026-07-21-issue-13-byok-generation-connections.md`。
- [x] **Phase 2 AI 切片 B — AI 整理建议草稿（GitHub #14）**（2026-07-23）：#15 生成 / 恢复有界草稿、#16 持久化人工审阅与 #17 受信确认到可靠批量操作均已完成。最终链路具备 review schema v2、revision CAS、准确确认计数、规范化分类复用、近似名称保守拒绝、事务消费、完整 payload 幂等、50 条有界执行与刷新恢复，并已在真实 Supabase 环境完成 RLS、响应丢失、等价 / 近似名称与执行结果验收。见 `logs/2026-07-23-issue-15-ai-organization-drafts.md`、`logs/2026-07-23-issue-16-ai-organization-review.md`、`logs/2026-07-23-issue-17-ai-organization-confirmation.md`。
- [x] **Phase 2 不做 Saved View / Query History**（2026-07-18）：不持久化命名筛选，也不记录关键词或语义查询历史；未来出现明确复用需求时作为独立能力设计。
- [x] **Embedding 与语义搜索已移出路线图**（2026-07-18，ADR 0022）：不实现 pgvector 向量表、索引任务、Semantic 模式、相似推荐或自动聚类；Browse 继续使用现有关键词搜索。未来只有在出现明确价值且能提供无需理解底层模型的一键、多语言方案时重新立项。
- [x] **AI 笔记数据边界已明确**（2026-07-18）：首次分类前展示发送字段与目标 Generation Provider；当前用户笔记只有在明确启用后才发送。关闭后不发送笔记；README 与其他用户私有数据永远不可访问。
- [x] **Phase 2 Generation Provider 架构边界已明确**（2026-07-18）：首批内置 OpenAI、Google Gemini、Anthropic、OpenRouter，并支持具名自定义 OpenAI-compatible Connection。自定义模型允许手填；每个 Connection 一个 credential，不做完整 Gateway 的 key 池、fallback、预算或限流，也不回退到 Asterism 付费额度。见 ADR 0018、0022。
- [x] **Phase 2 技术验证 — 自定义 endpoint 安全**（2026-07-20，ADR 0024）：已向目标 Supabase Edge Runtime 部署一次性探针实测——`Deno.resolveDns` 可用（可服务端先解析再校验），云 metadata 已被平台挡，但 loopback / 私网出站会真实发起，故分类器守卫（resolve 后校验 + 逐跳重定向重校验）恒开为必需；因任一实例可能托管多租户，自定义 endpoint 叠加部署者域名 allowlist（内置 Provider 免配、个人实例可 allow-all）。HTTPS DNS-rebinding TOCTOU 记为已知残余限制。见 ADR 0024。
- [x] **DB 强类型查询**（2026-06-30，Slice 3）：`packages/db` 已收紧为 `SupabaseClient<Database>`，新增 `listStarredRepos`/`getLatestStarredAt` 强类型读查询。当前 `database.types.ts` 为**手写**（7 表 Row/Insert/Update + 关系）作为过渡；待 Supabase CLI 流程统一后用 `supabase gen types typescript` 生成版替换（保留此指针）。见 `logs/2026-06-30-phase1-slice3-stars-sync.md`。
- [x] **迁移版本纪律已明确**（2026-07-18）：`supabase/migrations/*.sql` 是 schema/RLS 唯一来源；禁止只在 Dashboard 手改线上，紧急修复必须补等价 migration。手写 database types 可暂时保留，不阻断 Phase 1。
- [ ] **Web 主 chunk 性能观察项（非 Phase 1 阻断）**：2026-07-18 构建主 JS 约 815KB / gzip 241KB，Vite 发出默认 500KB warning；Dashboard 约 160KB。暂不抬高阈值或盲目拆包，待 Core Web Vitals、低端设备加载时间、流量或平台成本指标证明问题后再优化。
- [x] **按标签筛选维度**（2026-07-02）：`RepoFilterBar` 已加 tag 多选 DropdownMenu，`filterStarredRepos` 支持 `tagIds` OR 语义。
- [x] **集合详情页**（2026-07-02）：`/collections/:id` + `CollectionDetailPage`，列表卡片可点击进入。
- [x] **标签/集合重名前端校验**（2026-07-02）：表单提交前 case-insensitive 去重 + toast/inline 错误。

## 未来任务（按阶段）

详见 `knowledge/roadmap.md` 的阶段拆分：

- [x] **Phase 0 · 脚手架**：Monorepo 实包、共享包骨架、CI、初始 schema + RLS 迁移、GitHub OAuth 登录均已完成；2026-06-29 迁移已应用 + 登录端到端验证通过，验收达成
- [x] **Phase 1 · Web MVP**：2026-07-18 用户可见主流程、真实 Supabase 链路与七项最终收尾全部验收，四道工程门禁全绿；进入 Phase 2。
- [x] **Phase 2 · AI（BYOK）+ 批量整理**：2026-07-23 完成并验收 Generation 整理建议、类型化 Provider Registry、加密 BYOK，以及仅写 Asterism 私有数据的批量 tags / collections / export；不包含 Embedding 或语义搜索。见 `logs/2026-07-23-phase2-closure-release.md`。
- [ ] **Phase 3 · 扩展**：WXT popup 快搜 + content-script 页内操作、共享会话、扩展 i18n
- [ ] **Phase 4 · 桌面**：Tauri 2 套壳

# ADR 0032 · 退役 AI 整理与 BYOK Generation

- Status: Accepted
- Date: 2026-08-05
- Supersedes: ADR 0015 的 AI 优先顺序、0017、0018、0020、0024、0025、0029、0030、0031
- Preserves: ADR 0016、0021、0023、0026–0028 的浏览器内 embedding、可靠手动批量账本与检索优先边界

## Context

Phase 2 先后实现了 selection-first AI 草稿和 intent-first Organization Task。真实使用表明，这套流程难以稳定地产生让用户信任、愿意继续审阅的整理结果；任务、Provider、费用、分页、计划与风险审批带来的操作负担，也高于它替用户节省的整理劳动。继续叠加 Task Undo 或迁移旧草稿只会扩大一个用户本人已经不愿使用的系统。

与此同时，手动批量整理、标签、集合、笔记、导入导出，以及浏览器内 embedding 支撑的隐形混合搜索和 Related Stars 都有独立价值，不依赖服务端 Generation。

## Decision

完整退役 AI 整理运行时：

- 删除 AI Organization 导航、路由、页面、原型、双语文案与 Settings 中的 Generation Connection 管理。
- 删除 Generation Provider Registry、SSRF 适配、AI 草稿、Organization Task / Plan / Review 领域代码和数据访问层。
- 删除 `manage-ai-connections`、`rotate-ai-connections`、`manage-ai-organization`、`manage-organization-tasks` Edge Functions，并停止同步后创建 Organization Opportunity。
- 通过追加 migration 删除 Provider credential、用户 AI 设置、草稿、Task / Plan / Generation 表与 RPC；删除 AI 来源的批量执行账本和草稿 provenance 字段。
- 删除只服务于 AI 候选近似匹配的 `classification_name_near_key`；保留支撑标签/集合规范化唯一索引的 `normalize_classification_name`，因为它已经是手动整理的数据完整性约束，不属于 AI 运行时。
- 不回滚 AI 已经写入的普通标签、集合及 `repo_tags` / `collection_repos` 关系。它们已经是 canonical 用户数据，退役来源系统不等于撤销用户确认过的结果。
- 保留手动批量整理及历史兼容的 `promotion` source；新的 bulk create 只接受 `manual`。
- 保留 `user_repo_embeddings`、浏览器内模型、隐形混合搜索与 Related Stars。它们不保存 Provider credential，不调用服务端 Generation，也不修改 canonical。

历史 migration、ADR 和日志不删除。新环境必须顺序重放历史 migration，再由退役 migration 收敛到当前 schema；否则无法保证已部署环境与全新环境得到相同结果。

## Consequences

- 产品重新聚焦为用户掌控的 Star 管理器，Settings 不再要求配置 AI 密钥，部署也不再需要 AI 加密或轮换 secrets。
- Phase 2.1 的 #27 Task Undo 与 #28 legacy cutover 取消；Phase 3 浏览器扩展恢复为下一 frontier。
- AI 来源 operation ledger 被删除后，系统不再保留任务级 provenance，也无法提供自动任务撤销。现存 canonical 关系仍可由用户通过普通单项或批量操作修改。
- 已部署实例应用 migration 后，还应从 Supabase 项目中 undeploy 四个退役函数并删除不再使用的 AI secrets；仓库只负责声明目标 schema 和函数源码集合，不自动变更远端部署状态。
- 若未来重新提出 AI 整理，必须以新的产品证据和 ADR 重新立项，不能直接复活本次删除的 Provider、Task 或 Plan 架构。

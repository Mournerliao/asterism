# 2026-08-06 · 完成 AI Organization 远端退役

## 目标

把 ADR 0032 已在仓库完成的 AI Organization 退役同步到维护者 Supabase 项目 `hqtrmulypxwdqvzlkhke`，同时保留手动批量整理、同步与 README 读取能力。

## 执行

- 先部署已移除 Organization Opportunity 写入的 `sync-stars`，避免删表后现役同步函数访问退役表。
- 部署只接受手动整理请求的 `bulk-organize`。
- 经用户明确批准，按历史顺序应用 `20260804120000_organization_plan_review_execution.sql` 与 `20260805120000_remove_ai_organization.sql`。前者补齐远端缺失的 migration 历史，后者立即删除 AI / Organization 表、RPC、Provider credential 与 AI 来源执行账本。
- 删除 `manage-ai-connections`、`rotate-ai-connections`、`manage-ai-organization`、`manage-organization-tasks` 四个 Edge Functions。
- 删除 `AI_CREDENTIAL_ENCRYPTION_KEYS`、`AI_CREDENTIAL_ACTIVE_VERSION`、`AI_CUSTOM_ENDPOINT_ALLOWLIST`、`AI_CREDENTIAL_ROTATION_SECRET` 四项专用 secrets；未触碰 Supabase 系统 secrets。

## 验收

- `supabase migration list --linked` 显示本地与远端均已对齐到 `20260805120000`。
- 远端 Function 清单只剩 `sync-stars`、`read-repo-readme`、`bulk-organize`，状态均为 `ACTIVE`。
- 远端 secret 清单不再包含任何 `AI_*` 项。
- migration 执行成功；`accept_organization_opportunity(uuid, uuid)` 因已被历史 migration 替换而由 `drop function if exists` 正常跳过，不影响退役结果。

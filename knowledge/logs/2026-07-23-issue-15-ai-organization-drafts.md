# 2026-07-23 · GitHub #15 有界 AI 整理草稿

## 目标

实现 Phase 2 AI 切片 B 的第一个 tracer bullet：从 Browse 固定选择 1–50 个仓库，经受信服务生成严格、可恢复的 AI 整理建议草稿；新生成失败不得破坏已有草稿，本切片不执行人工审阅持久化或确认写入。

## 实现

- `packages/core` 扩展类型化 Generation Provider Registry，为 OpenAI / OpenRouter / OpenAI-compatible、Anthropic 与 Gemini 构建原生组织生成请求，并校验版本化 `relationChanges` / `newClassifications` schema。服务端拒绝未知仓库、未知分类、矛盾重复与规范化后的重名新分类；有效空建议集是成功结果。
- 新增 `ai_organization_drafts` migration：每用户唯一活动草稿、1–50 个 UUID 仓库范围、Provider / adapter / model provenance、review state、revision 与时间戳；authenticated 客户端无表权限，成功生成通过 service-role-only 原子 upsert 替换旧草稿并递增 revision。
- 新增 `manage-ai-organization` Edge Function，JWT 鉴权后按 `auth.uid()` 重建 Postgres 权威仓库、标签、集合及关系上下文。README 永不查询；笔记仅在持久偏好开启时读取，并按每条 2,000 个 Unicode code points 截断。连接必须 active、valid 且 model 与已测试 capability 精确一致，credential 仅在函数调用期间解密。
- Provider 调用复用既有 DNS / SSRF、部署者 allowlist 与同源重定向守卫，并增加 60 秒超时与 1 MB 响应上限。只有网络调用及 schema 校验成功后才写草稿，因此 Provider、网络或 schema 失败均保留旧草稿。
- `packages/db` 新增生成、读取、丢弃 wrapper 与严格响应守卫，递归拒绝 credential、ciphertext、nonce、API key 与 raw output 字段。
- Browse 新增 AI 入口与预检对话框，披露准确仓库数、Provider、model、发送字段、笔记截断及 README / credential 排除；0 个或超过 50 个仓库时明确阻止生成但保留选择。已有草稿可跨刷新恢复，只读区分 additions、removals、new classifications，识别 “No changes recommended”，并支持显式丢弃。所有文案覆盖 en / zh-CN。

## 验证

- `pnpm lint`：通过，Biome 检查 284 个文件。
- `pnpm typecheck`：通过，8 个包 / 9 个任务成功。
- `pnpm test`：通过，core 132、db 52、Supabase Functions 83、web 145。
- `pnpm build`：通过，6 个任务成功；仅保留既有 Web 主 chunk 大于 500 kB warning。
- Impeccable detector：0 findings。
- 真实 Chrome 登录态视觉复核：桌面与 390 × 844 窄屏、light / dark、零选择预检及字段披露均正常；未触发真实 Provider 生成。

## 边界与后续

本轮实现沿用 ADR 0017、0018、0020、0023、0024，没有新增难以逆转的决策，因此不新增 ADR。migration 与 Edge Function 仅提供部署 runbook，本轮未部署真实环境。#16 负责人工审阅选择的持久化，#17 负责受信确认、可靠批量操作交接与真实环境验收。

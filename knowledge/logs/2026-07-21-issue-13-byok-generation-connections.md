# 2026-07-21 · GitHub #13 BYOK 生成连接

## 目标

交付 Phase 2 AI 的第一个纵向切片：BYOK Generation Connections（自带 API Key 的生成连接）与凭据的受信管理。用户可在 Settings 添加 / 测试 / 编辑 / 删除某个 Generation Provider 连接，并选择活跃连接、模型与是否在 AI 中包含笔记；凭据在存储时加密、客户端无该表直读权限、自定义端点受 SSRF 与部署者 allowlist 约束。AI 整理建议流程（`ai_organization_drafts`）为切片 B，依赖本切片，不在本次范围。

## 实现

- **迁移** `20260721120000_ai_provider_connections.sql`：`ai_provider_connections`（`credential_ciphertext` / `credential_nonce` / `credential_version` / 可选 `credential_hint`，adapter 五值 check，`base_url` 按 adapter 约束——内置四家禁带、自定义 `openai-compatible` 必带，复合唯一键 `(id, user_id)`，内置 adapter 每用户每种至多一个的部分唯一索引，`status` 四值 check）。RLS 开启且对 `anon` / `authenticated` 全部 `revoke`——客户端无直读，凭据生命周期只经受信函数。`user_settings`（active 连接、模型、是否含笔记、locale、theme；`generation_connection_id` 以 deferred 复合 FK 指向 `(id, user_id)`，owner-only RLS，删除连接前由函数清引用）。
- **`packages/core`** `ai/generation-registry.ts`：类型化 Generation Provider Registry——内置 OpenAI / Gemini / Anthropic / OpenRouter + 自定义 OpenAI-compatible 的原生瘦 Adapter，凭据 schema、capability 探测的请求构造与响应解析（含 `validateOrganizationResult` 等纯逻辑），不依赖 Vercel AI SDK 以自控 SSRF fetch。`ai/ssrf.ts`：纯 SSRF IP 分类器 + 部署者域名 allowlist 匹配（`assertCustomEndpointAllowed`），HTTPS 强制、解析后 IP 必须公网可路由。
- **Edge Function** `supabase/functions/manage-ai-connections`：注入依赖的 `handler.ts`（`list` / `create` / `test` / `update` / `delete` / `get-settings` / `update-settings`；校验调用者 JWT 得 `user_id`、操作限定到 `auth.uid()`、`list` 只回传不含密文/nonce 的安全投影）+ 瘦 `index.ts`（service-role client + CORS）+ `crypto.ts`（AES-256-GCM，随机 12 字节 nonce，AAD 绑定 `version:userId:connectionId`，密钥按版本存放支持轮换）+ `provider-call.ts`（保存与探测都过 SSRF 守卫、逐跳重定向重校验）。函数按 `.ts` 路径直接复用 core 源码，Deno 与 Vitest 双消费者共解析。
- **`packages/db`** `ai-connections.ts`：`invokeAiConnections` 系列 wrapper（list / create / update / delete / test / get-settings / update-settings）+ 响应类型守卫（`isAiConnection` / `isAiSettings`）+ 类型，作为 Web 唯一数据访问入口。
- **`apps/web`**：`data/use-ai-connections.ts` 提供 TanStack Query hooks 与 query keys；`components/ai-connections-manager.tsx` 承载连接列表、状态 chip、表单对话框与测试对话框，接入 Settings 页替换原「AI Features / Coming Soon」占位（移除占位 `Badge` / `Input` / `Label` 导入）。UI 走 `/impeccable`：状态用 tinted chip，布尔偏好用 `SegmentedControl`。
- **i18n**：en / zh-CN 新增 `settings.ai.*` 命名空间（约 40 键），zh-CN 遵守汉字与拉丁/插值间半角空格，复用 `「{{name}}」` 安全插值，无 `star` 术语违规。

## 决策指针

- 加密边界见 ADR 0017、Provider Registry 见 ADR 0018、自定义 endpoint SSRF + allowlist 见 ADR 0024（均在前序会话裁决并落档，本次无新增 ADR）。

## TDD 与验证

- core：`generation-registry` 请求构造/响应解析与 `ssrf` 分类器/allowlist 先红后绿。
- functions：`crypto` 加解密与 AAD 绑定、`handler` 七个 action 的授权与安全投影、`provider-call` 的 SSRF 守卫。
- web：`ai-connections-manager` 空态与填充态渲染；新增 locale key 奇偶校验，证明 en / zh-CN 完全对齐。
- 构建陷阱：`apps/web` 经 `dist` 解析 `@asterism/{core,db}`，新增导出后需先 `pnpm build`（或 web 的 `predev` 前置构建）Web typecheck / test 才能解析到。
- 门禁复核发现前序会话新增的 AI 文件从未过根 Biome：`pnpm lint` 报 10 项（格式 + `organizeImports` + `useOptionalChain`），已用 `biome check --write` 修复格式并手动应用等价的可选链（`asArray` 仅返回 array | null，转换安全）。
- 最终全绿：`pnpm lint`（264 files）、`pnpm typecheck`（9 包）、`pnpm build`（6 tasks；主 chunk warning 为既有观察项）、测试 core 98 / db 42 / functions 52（其中 manage-ai-connections 29）/ web 138。functions 的 Vitest 用例经 `vitest run --root supabase/functions` 执行，沿用既有约定（不在 `turbo run test` 内）。

## 运行手册

- `supabase/README.md` 迁移清单与 Edge Functions 表补入本迁移与 `manage-ai-connections`（并回填此前缺失的 `bulk_organization` 迁移与 `read-repo-readme` 函数），校验 SQL 覆盖新表；`manage-ai-connections` 运行前须用 `supabase secrets set` 配置 `AI_CREDENTIAL_ENCRYPTION_KEYS` 等，env / 轮换 / allowlist 完整说明见函数 README。
- `.env.example` 增说明：函数加密 secrets 走服务端 `supabase secrets set`，不入任何客户端 `.env`。

## code-review 后续（2026-07-21）

- `/code-review` 双轴（Standards + Spec）通过后 triage 出五项修复并全部落地：
  - **Sp3**：`packages/db` 的 `isAiConnection` 类型守卫在断言安全投影时，额外断言不含 `credential_ciphertext` / `credential_nonce`，任何一个出现即判定非法（+测试），防止受信函数投影回归时把密文泄漏给客户端。
  - **S1**：外部化 `ai-connection-form-dialog` 里 baseUrl / apiKey 的 `placeholder` 文案到 `settings.ai.*`（en + zh-CN），消除硬编码 UI 文本。
  - **Sp4 / US14**：笔记披露开关的说明改为显式枚举随请求外发的字段与目标 Provider，让用户在开启前明确知情。
  - **Sp2 / US26**：`update-settings` 把活跃模型约束到该连接**已测试通过 capability** 的模型；选择未验证模型被拒（+测试）。
  - **Sp1 / US22**：新增独立带外密钥轮换 Edge Function `rotate-ai-connections`（见下节）。
- 均沿用既有 ADR（0017 / 0018 / 0024），无新增 ADR。

## 密钥轮换例程（US22 / Sp1）

- 决策落地方式：**独立 Edge Function** `supabase/functions/rotate-ai-connections`，而非 CLI 脚本——与用户面 `manage-ai-connections` 物理分离，用户请求路径无法触达轮换逻辑。
- `rotate.ts`（纯逻辑）：`rotateCredentialRow` 对 active 版本行返回 `null`（跳过），否则解密旧版本密文并用 active 版本重加密、AAD 重绑定 `version:userId:connectionId`；`rotateCredentials` 遍历全部行，单行失败隔离计入 `failed` 不中断，返回 `scanned / rotated / skipped / failed` 汇总。
- `handler.ts`（可测）：独立管理员密钥 `AI_CREDENTIAL_ROTATION_SECRET` 经 `x-rotation-secret` header + 常量时间比较守卫；非 POST → 405、缺失/不符 → 401、轮换抛错 → 500。
- `index.ts`（瘦入口）：校验必需 env（缺任一 → 500 `server_configuration_missing`）、缓存 key ring、以 service-role client 分页覆盖全部凭据行；部署走 `--no-verify-jwt`（不经 Supabase 用户鉴权，仅由自有 secret 保护）。
- 运维纪律：退役旧密钥版本前必须先把轮换跑到「无残留旧版本行」。README + runbook + `.env.example` 已同步。
- TDD：`rotate.test.ts`（跳过 active / 重加密保留 plaintext / 混合集 scanned 4·rotated 2·skipped 1·failed 1 / 幂等第二次全跳过）+ `handler.test.ts`（匹配 200 且调用一次、缺失 401、不符 401、非 POST 405、抛错 500），先红后绿。

## 收尾门禁（2026-07-21）

- 四道门禁复跑全绿：`pnpm lint`（271 files）、`pnpm typecheck`（9 包）、`pnpm build`（6 tasks；主 chunk warning 为既有观察项）、测试 core 107 / db 47 / functions 65（manage-ai-connections 33 + rotate-ai-connections 9 + 其余 23）/ web 138。functions 的 Vitest 用例经 `vitest run --root supabase/functions` 执行（9 files / 65 tests，不在 `turbo run test` 内）。
- 门禁复核补记：本会话早期修复涉及的 `ai-connection-form-dialog.tsx` 与 `generation-selection.test.ts` 曾未过根 Biome，已 `biome check --write` 修复格式后复跑全绿。

## 收口

- `/code-review` 双轴通过、五项修复与轮换函数均已落地并复跑门禁全绿；knowledge（PROGRESS / NOTES / 本 log）已同步。实现随后经全面复审进一步收敛，并以 `e908ddc feat(ai): add secure BYOK generation connections` 提交；GitHub #13 实现完成。

## 全面复审与最终收敛（2026-07-22）

用户对暂存实现提出进一步的完整性、方案合理性与复杂度复审。复核发现原实现虽覆盖主路径，但仍存在安全边界与状态模型缺口；本轮直接修复而非只留评审意见：

- **安全**：Provider 携带 credential 的重定向限制为同源，跨源下一跳发送前拒绝，消除 Authorization 泄漏路径；SSRF 分类补齐 IPv4-compatible IPv6、6to4、Teredo、site-local、benchmark、discard-only 等保留范围；客户端响应类型守卫拒绝 ciphertext / nonce 字段。
- **一致性**：普通客户端对 `user_settings` 改为只读；受信函数解析最近成功 capability，数据库 trigger 再强制 active connection/model 同空同非空、归属正确、状态有效、model 精确匹配。连接失效、禁用或 capability model 改变时自动清除旧 active pair。
- **生命周期**：客户端不再直接提交任意 status，只提交 `enabled` 意图；端点或 credential 变化会清除旧 capability 并重置测试状态，避免以后错误恢复为 valid；禁用连接的探活只更新 capability，不隐式启用。
- **功能闭环**：新增 `/models` 发现链路及手填 fallback、启用/禁用入口、最近一次测试的 model / 结果 / 时间、稳定失败原因、列表 loading/error/retry、状态操作失败提示；私密笔记披露明确字段与目标 Provider，没有有效 active connection 时不可开启。
- **复杂度**：部署入口 `index.ts` 收敛为配置与依赖装配，HTTP 解析留在 `handler.ts`，数据库/加密/生命周期集中在 `service.ts`；Provider 请求解释和 active selection 保持在 `packages/core` 纯模块，Web 只经 `packages/db` 与 hooks 访问。未引入额外框架或通用状态机。
- **轮换**：保留并验证独立 `rotate-ai-connections` 带外例程，用户路径不可达，旧 key 退役前必须完成全部旧版本密文迁移。
- **UI**：新增探活对话框、连接管理器与生命周期交互回归测试；Impeccable 静态检测返回空问题列表，所有文案 en / zh-CN 对齐。

最终门禁：`pnpm lint`（274 files）、`pnpm typecheck`（9 tasks）、`pnpm test`（core 122 / db 49 / functions 75 / web 142）、`pnpm build`（6 tasks）全部通过；构建仅保留既有 Web 主 chunk 大于 500 kB warning。测试输出中的 happy-dom `github.com` DNS 失败为既有用例副输出，对应用例仍通过。契约、状态、backlog 与函数 runbook 已同步，无需新增 ADR。

## 真实环境验收（2026-07-22）

- 目标 Supabase 项目已应用 `20260721120000_ai_provider_connections.sql`，并配置版本 1 encryption key、active version 与独立 rotation secret。
- `manage-ai-connections` 已按用户 JWT 路径部署；`rotate-ai-connections` 已以 `--no-verify-jwt` 部署并由独立 header secret 保护。首次安装没有旧密文，因此未触发轮换任务。
- 使用部署者 allowlist 内的 DeepSeek OpenAI-compatible endpoint 完成真实 API smoke test：连接创建、模型发现/手填、capability 探活与 active selection 正常；禁用/重新启用、替换 credential 后回到 `untested`、删除后清理设置引用均无异常。
- 用户确认真实环境验收通过。至此 #13 的代码门禁、部署 runbook 与运行时链路均已验证，可以关闭 GitHub issue；后续 AI 整理建议作为独立切片处理。

# Edge Function · `manage-ai-connections`

BYOK 生成连接（generation connections）与凭据的**受信管理路径**。决策见
`knowledge/decisions/0017-edge-function-byok-encryption.md`（凭据加密）、
`knowledge/decisions/0018-typed-ai-provider-registry.md`（生成 Provider 注册表）、
`knowledge/decisions/0024-custom-endpoint-ssrf-boundary.md`（SSRF 与部署者 allowlist）。

## 为什么需要它

`ai_provider_connections` 表对任何客户端角色都**不授予**访问权限（`revoke all`，RLS
作纵深防御）。加密后的凭据密文、nonce、明文密钥只在 service role 的受信环境里流转。
Deno Edge Function 正是这个受信环境：它校验调用者 JWT、把每个操作限定到
`auth.uid()`，并只回传不含密文/nonce 的安全投影。

## 契约

- **方法**：`POST`（含 CORS 预检 `OPTIONS`）。
- **认证**：请求头 `Authorization: Bearer <supabase access_token>`（由 supabase-js
  `functions.invoke` 自动带上），函数用 service role 校验得到 `user_id`。
- **请求体**：`{ "action": "...", ... }`。`action` 取值：
  - `list` — 列出本人的连接（安全投影，**永不**返回密文/nonce/明文）。
  - `create` — 校验凭据与 base_url → 自定义端点过 allowlist/SSRF → 生成 id、派生
    hint、加密后写入；内置 adapter 每用户每种至多一个（唯一冲突返回 409）。
  - `discover-models` — 解密已保存凭据，经同一 SSRF 边界获取可用模型；不支持发现或
    上游失败时返回空列表，客户端继续提供手动 model ID 输入。
  - `test` — 解密凭据 → 经 SSRF 守卫探测目标 model → 记录 `generation_capability`；
    启用中的连接据结果变为 `valid` / `invalid`，已禁用连接保持 `disabled`，不会因测试被
    隐式启用（上游失败不转成 500）。
  - `update` — 局部更新名称/base_url/凭据，或通过 `enabled` 执行启用/禁用；凭据或端点
    变更会清除旧 capability 并重置为 `untested`，重新启用只有在保留成功能力时才恢复为
    `valid`。
  - `delete` — 先清除 `user_settings` 对该连接的引用，再删除连接。
  - `get-settings` / `update-settings` — 读写本人 `user_settings`（active 连接、模型、
    是否在 AI 中包含笔记、locale、theme）；active 连接与 model 必须成对设置，且 model
    必须精确等于该有效连接最近一次成功探活的 model。
- **响应**：`{ connections }` / `{ connection }` / `{ settings }` / `{ deleted }`；错误为
  `{ error: <code> }`，状态码按客户端错误（400/401/404）、冲突（409）、服务端（500）区分。

## 安全边界

- **加密**：AES-256-GCM（Web Crypto），每次写入随机 12 字节 nonce，AAD 绑定
  `version:userId:connectionId`，密钥按版本存放以支持轮换。见 `crypto.ts`。
- **SSRF**：自定义 openai-compatible 端点在保存与探测时都过 `packages/core` 的
  SSRF 守卫；HTTPS 强制、解析后 IP 必须公网可路由、逐跳（`redirect: 'manual'`）重校验。
  带凭据请求只允许同源跳转，跨源跳转会在发送下一跳前拒绝，防止 Authorization 泄漏。
  内置 Provider 使用固定端点，视为天然 allowlist，免配置。见 `provider-call.ts`。
- **偏好一致性**：客户端对 `user_settings` 只有读取权限；写入集中在本函数，并由数据库
  trigger 再次校验 active connection/model。连接失效、禁用或成功 model 改变时，数据库
  自动清除不再成立的 active pair。

入口 `index.ts` 只负责环境配置、依赖装配与 HTTP 启动；生命周期与持久化逻辑集中在
`service.ts`，纯 HTTP 边界在 `handler.ts`，避免部署入口同时承担多种职责。

> 请求构造与响应解释的纯逻辑来自 `packages/core/src/ai/generation-registry.ts`、
> SSRF 分类器来自 `packages/core/src/ai/ssrf.ts`；本函数按 `.ts` 路径直接引入同一份源码
> （以 core 的 Vitest 为权威），Deno 与 Vitest 双消费者均可解析。

## 运行所需环境变量

Supabase 自动注入：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

需由部署者配置（用 `supabase secrets set`，**不要**提交任何密钥）：

- `AI_CREDENTIAL_ENCRYPTION_KEYS`：JSON 对象，键为整数版本、值为 base64 编码的
  256 位（32 字节）主密钥，例如 `{"1":"<base64-32-bytes>"}`。**必填**。
- `AI_CREDENTIAL_ACTIVE_VERSION`：可选。选择新写入使用的密钥版本；缺省取上表中的
  最高版本。
- `AI_CUSTOM_ENDPOINT_ALLOWLIST`：可选。逗号分隔的域名后缀，仅对自定义
  openai-compatible 端点生效；`*` 放行任意公网主机；留空或未设则**拒绝**所有自定义端点。

> Biome 已对 `supabase/functions/**` 关闭 `noUndeclaredEnvVars`（它们不属于 Turborepo
> 构建环境）。

## 密钥轮换

1. 生成新的 32 字节随机密钥并 base64 编码，作为版本 `N+1` 加入
   `AI_CREDENTIAL_ENCRYPTION_KEYS`（保留旧版本键）。
2. 设 `AI_CREDENTIAL_ACTIVE_VERSION=N+1` 并重新部署。新写入用新版本；旧密文仍以其
   记录的版本解密。
3. 运行带外轮换例程 `rotate-ai-connections` 把所有旧版本密文重加密到新版本；确认再无旧
   版本行后方可移除旧密钥。步骤与触发方式见 `../rotate-ai-connections/README.md`。

## 部署

```bash
# 需要 Supabase CLI 并已 link 项目（见 ../../README.md）
supabase functions deploy manage-ai-connections
```

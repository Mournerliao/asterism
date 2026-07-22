# Edge Function · `rotate-ai-connections`

BYOK 凭据主密钥的**带外轮换例程**（issue #13 · US22）。决策见
`knowledge/decisions/0017-edge-function-byok-encryption.md`（凭据加密与版本化密钥）。

## 为什么需要它

版本化密钥让新写入用当前 active 版本、旧密文仍以其记录版本解密；但**退役旧密钥前**必须
先把所有旧版本密文重加密到 active 版本，否则移除旧密钥会让这些行永久无法解密。手工「逐个
重存/重测」既容易漏，又要求用户参与。本函数把这一步做成 service role 的一次性带外例程。

## 为什么独立于 `manage-ai-connections`

轮换要遍历并改写**所有用户**的凭据，权限远超任一用户会话，因此它：

- 单独部署为一个函数，**不经**用户面 handler，用户 JWT 无法触达；
- 由一个**独立的管理员密钥** `AI_CREDENTIAL_ROTATION_SECRET` 保护（非用户会话）；
- 只做重加密，绝不返回任何明文；响应摘要仅含计数。

## 契约

- **方法**：`POST`。
- **认证**：请求头 `x-rotation-secret: <AI_CREDENTIAL_ROTATION_SECRET>`；缺失或不匹配返回
  `401 { "error": "unauthorized" }`（比较为长度无关的常量时间实现，不泄露时序/长度）。
- **行为**：用与 `manage-ai-connections` **同一份** `crypto.ts` 构建密钥环，遍历
  `ai_provider_connections`（分页覆盖全部行）；已在 active 版本的行跳过，其余解密后以
  active 版本重加密并写回，AAD 从旧版本重新绑定到新版本。单行解密/写入失败被计为 `failed`
  且不中断整轮，操作者可反复运行直至 `failed` 归零。
- **响应**：`200 { "summary": { "scanned", "rotated", "skipped", "failed" } }`；轮换过程
  异常返回 `500 { "error": "rotation_failed" }`；缺少任一必需 secret 返回
  `500 { "error": "server_configuration_missing" }`。

## 运行所需环境变量

Supabase 自动注入 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`。需由部署者配置（用
`supabase secrets set`，**绝不提交**任何密钥）：

- `AI_CREDENTIAL_ENCRYPTION_KEYS` / `AI_CREDENTIAL_ACTIVE_VERSION`：与
  `manage-ai-connections` **同一套**密钥材料（见其 README）。轮换到新版本前，先把新版本
  加入 KEYS 并置为 active。
- `AI_CREDENTIAL_ROTATION_SECRET`：保护本函数的管理员密钥，**必填**，须区别于任何用户凭据。

## 轮换流程

1. 生成新的 32 字节随机密钥并 base64，作为版本 `N+1` 加入 `AI_CREDENTIAL_ENCRYPTION_KEYS`
   （保留旧版本键），设 `AI_CREDENTIAL_ACTIVE_VERSION=N+1`，重新部署两个函数。
2. 触发本函数（带 `x-rotation-secret`），反复运行直至响应 `failed` 为 0：

   ```bash
   curl -sS -X POST \
     -H "x-rotation-secret: $AI_CREDENTIAL_ROTATION_SECRET" \
     "https://<project-ref>.supabase.co/functions/v1/rotate-ai-connections"
   ```

3. 确认再无旧版本行后，从 `AI_CREDENTIAL_ENCRYPTION_KEYS` 移除旧版本键并重新部署。

## 部署

```bash
# 需要 Supabase CLI 并已 link 项目（见 ../../README.md）
# 用 --no-verify-jwt：本函数不走 Supabase 用户鉴权，只由 x-rotation-secret 管理员密钥保护
supabase functions deploy rotate-ai-connections --no-verify-jwt
```

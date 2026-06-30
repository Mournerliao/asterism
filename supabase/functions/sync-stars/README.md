# Edge Function · `sync-stars`

把当前用户的 GitHub starred 仓库同步进 Postgres 的**受信路径**。决策见
`knowledge/decisions/0006-stars-sync-edge-function.md`。

## 为什么需要它

`repos` 表的 RLS 只放开 `SELECT`，客户端**不能直写**。同步需要用 service role 在受信
环境里写 `repos` 与 `user_stars`。Deno Edge Function 正是这个受信环境。

## 契约

- **方法**：`POST`（含 CORS 预检 `OPTIONS`）。
- **认证**：请求头 `Authorization: Bearer <supabase access_token>`（由 supabase-js
  `functions.invoke` 自动带上），函数用 service role 校验得到 `user_id`。
- **请求体**：`{ "providerToken": "<github oauth provider_token>" }`。客户端从登录会话
  的 `session.provider_token` 取得（见 `packages/db/src/sync.ts` 的 `invokeSyncStars`）。
- **响应**：`{ total, upserted, starsLinked, incremental }`。

## 行为

1. 校验调用者 JWT → `user_id`。
2. 读该用户已有的最新 `starred_at` 作为增量界。
3. 用 `providerToken` 调 GitHub GraphQL `viewer.starredRepositories`（倒序、游标分页），
   遇到不晚于增量界的项即停。
4. service role 幂等 `upsert` `repos`（冲突键 `github_id`）→ 拿回 `id` 映射 →
   幂等 `upsert` 该用户 `user_stars`（冲突键 `user_id,repo_id`）。

重试不脏写：两次 upsert 均按唯一键幂等。

> 纯查询/映射逻辑与 `packages/core/src/github/stars.ts` 同源（以该处 Vitest 为权威）；
> 因 Deno 与 workspace 打包边界，这里就近内联一份实现，改动需同步两处。

## 运行所需环境变量（Supabase 自动注入）

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

> 这些由 Supabase 运行时注入，**不要**提交任何密钥。Biome 已对 `supabase/functions/**`
> 关闭 `noUndeclaredEnvVars`（它们不属于 Turborepo 构建环境）。

## 部署

```bash
# 需要 Supabase CLI 并已 link 项目（见 ../../README.md）
supabase functions deploy sync-stars
```

GitHub OAuth 的只读 scope 已够读取公开 star 列表（见 `packages/db/src/auth.ts`）。

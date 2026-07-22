# Supabase

Asterism 的数据库 schema 与行级安全（RLS）以迁移文件形式存放于 `migrations/`，是数据层
的单一事实源。本文件说明如何把迁移应用到你的 Supabase 项目，以及 GitHub OAuth 的后台配置。

> 迁移文件不含任何密钥；密钥（Publishable / Secret key）只在本地 `.env` 与 Supabase 后台
> 中配置，**绝不提交**。

## 迁移清单

| 文件 | 作用 |
| --- | --- |
| `20260629120000_initial_schema.sql` | 核心表（`repos` / `user_stars` / `tags` / `repo_tags` / `collections` / `collection_repos` / `notes`）、索引、`updated_at` 触发器，并预启用 `pgvector` 扩展 |
| `20260629120100_row_level_security.sql` | 启用 RLS 并创建策略：`repos` 全局可读，其余表按 `user_id` 隔离 |
| `20260719143000_bulk_organization.sql` | 持久化批量整理：`bulk_operations` / `bulk_operation_items` 表与按 `user_id` 隔离的 RLS（详见 ADR 0023） |
| `20260721120000_ai_provider_connections.sql` | BYOK 生成连接：`ai_provider_connections`（凭据密文，客户端 `revoke all`）与 `user_settings`（owner-only RLS）（详见 ADR 0017 / 0018 / 0024） |

> Phase 3 的 `repo_embeddings` 暂未建表（见 `knowledge/contracts/data-model.md`）。

迁移可重复执行（`if not exists` / `create or replace` / `drop policy if exists`）。

## 应用迁移

### 方式 A：SQL Editor（最简单，无需安装）

1. 打开 Supabase 项目 → 左侧 **SQL Editor**。
2. 按文件名（时间戳前缀即执行顺序）依次把各迁移文件的内容粘贴执行。

### 方式 B：Supabase CLI

```bash
# 1) 安装 CLI：https://supabase.com/docs/guides/cli
# 2) 在仓库根目录初始化（已存在 supabase/migrations 时不会覆盖）
supabase init
# 3) 关联远端项目（project-ref 见 Dashboard URL）
supabase link --project-ref hqtrmulypxwdqvzlkhke
# 4) 推送迁移（会提示输入数据库密码）
supabase db push
```

应用后可在 SQL Editor 运行校验：

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
```

`repos / user_stars / tags / repo_tags / collections / collection_repos / notes /
bulk_operations / bulk_operation_items / ai_provider_connections / user_settings` 的
`rowsecurity` 应均为 `true`。

## GitHub OAuth 配置（后台手动一次）

登录流程的客户端代码已在 `apps/web` 接通；登录可用还需在后台完成以下配置：

1. **GitHub** → Settings → Developer settings → **OAuth Apps** → New OAuth App：
   - Homepage URL：你的站点地址（本地可填 `http://localhost:5173`）。
   - **Authorization callback URL**：`https://hqtrmulypxwdqvzlkhke.supabase.co/auth/v1/callback`
   - 创建后拿到 **Client ID** 与 **Client Secret**。
2. **Supabase** → Authentication → **Providers → GitHub**：启用并填入 Client ID / Secret。
3. **Supabase** → Authentication → **URL Configuration**：
   - **Site URL** 填生产站点地址。
   - **Redirect URLs** 增加本地开发地址 `http://localhost:5173`（应与登录时传入的
     `redirectTo = window.location.origin` 一致）。

完成后，在本地 `pnpm --filter @asterism/web dev` 启动，点击「使用 GitHub 登录」即可走通
OAuth 回流并显示当前用户。

## Edge Functions

| 函数 | 作用 |
| --- | --- |
| `sync-stars` | 受信路径（service role）同步用户 GitHub starred 仓库到 `repos` / `user_stars`，支持增量。详见 `functions/sync-stars/README.md` 与 `knowledge/decisions/0006` |
| `bulk-organize` | 受信路径（service role）创建并执行持久化批量 tag / collection 关系变更；按逐关系结果恢复和重试。详见 `functions/bulk-organize/README.md` 与 ADR 0023 |
| `read-repo-readme` | 受保护的 README 读取边界：校验会话与 `user_stars` 成员关系后代理 GitHub REST README HTML，ETag 重验证，token 与内容不落库。详见 `functions/read-repo-readme/README.md` |
| `manage-ai-connections` | 受信路径（service role）管理 BYOK 生成连接与凭据：JWT 校验、操作限定到 `auth.uid()`、AES-256-GCM 加密、自定义端点过 SSRF / allowlist；`list` 只回传安全投影。详见 `functions/manage-ai-connections/README.md` 与 ADR 0017 / 0018 / 0024 |
| `rotate-ai-connections` | 带外密钥轮换例程（service role）：由独立管理员密钥 `AI_CREDENTIAL_ROTATION_SECRET` 保护、用户 handler 不可达；遍历所有凭据，把旧版本密文重加密到 active 版本。详见 `functions/rotate-ai-connections/README.md` 与 ADR 0017 |

```bash
# 部署（需 Supabase CLI 且已 link 项目）
supabase functions deploy sync-stars
supabase functions deploy bulk-organize
supabase functions deploy read-repo-readme
supabase functions deploy manage-ai-connections
# 轮换例程不走用户鉴权，只由 x-rotation-secret 保护，需 --no-verify-jwt
supabase functions deploy rotate-ai-connections --no-verify-jwt
```

> `manage-ai-connections` 运行前必须先配置加密主密钥等 secrets（`AI_CREDENTIAL_ENCRYPTION_KEYS`
> 等，用 `supabase secrets set` 设置，**绝不提交**）；env 变量、密钥轮换与自定义端点
> allowlist 的完整说明见 `functions/manage-ai-connections/README.md`。带外轮换例程
> `rotate-ai-connections` 另需 `AI_CREDENTIAL_ROTATION_SECRET`，流程见
> `functions/rotate-ai-connections/README.md`。

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

> Phase 3 的 `repo_embeddings`、`user_settings` 暂未建表（见 `knowledge/contracts/data-model.md`）。

迁移可重复执行（`if not exists` / `create or replace` / `drop policy if exists`）。

## 应用迁移

### 方式 A：SQL Editor（最简单，无需安装）

1. 打开 Supabase 项目 → 左侧 **SQL Editor**。
2. 依次把两个迁移文件的内容粘贴执行（**先 schema，后 RLS**）。

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

`repos / user_stars / tags / repo_tags / collections / collection_repos / notes` 的
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

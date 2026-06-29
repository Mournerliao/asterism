# Loop 运行日志 · 2026-06-29 · Phase 0 认证 + schema

> 运行日志层（Logs）。承接 `2026-06-29-phase0-scaffold.md`：在拿到 Supabase
> Publishable key 后，落地初始 schema + RLS 迁移与 GitHub OAuth 登录代码。

- **日期**：2026-06-29
- **阶段**：Phase 0 · Scaffold 剩余里程碑（schema/RLS + OAuth 登录）
- **范围**：迁移文件 + 客户端登录代码 + 环境变量对齐；**不含**用户在 Supabase 后台的应用/配置动作

## Goal（目标）

补齐 Phase 0 剩余里程碑，使 Web 能本地启动、完成 GitHub 登录、读到当前用户基础信息。完成判据：

- `supabase/migrations/` 含核心表 + RLS，对齐 `contracts/data-model.md`（`repos` 全局可读、其余按 `user_id` 隔离）。
- `apps/web` 登录流程代码就位（GitHub OAuth 回流 + 会话展示 + 登出），数据/认证访问仅经 `packages/db`。
- 四道工程门（lint/typecheck/test/build）保持全绿；密钥不入库。

## Steps（已执行步骤）

1. **本地 `.env`**：写入真实 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`；`git check-ignore` 确认被忽略、`git status` 不出现，未提交。
2. **环境变量对齐**：`VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY`（`.env.example`、`apps/web/src/vite-env.d.ts`、`apps/web` 读取处），并在注释区分 Publishable（客户端）/ Secret（服务端）key。
3. **`packages/db` 认证辅助**：新增 `src/auth.ts`（`signInWithGitHub` / `signOut` / `getSession` / `onAuthChange`）并经 `index.ts` 导出，保持「认证/数据访问唯一入口」。
4. **`apps/web` 登录接通**：`src/lib/supabase.ts`（客户端单例，env 缺失即抛错）、`src/auth/use-session.ts`（订阅会话）、`src/pages/home.tsx`（登录/登出 UI + 当前用户展示），i18n 增 `auth.*`（en/zh-CN）。
5. **`supabase/migrations/`**：
   - `20260629120000_initial_schema.sql`：核心 7 表 + 索引 + `updated_at` 触发器 + 预启用 `pgvector`。
   - `20260629120100_row_level_security.sql`：启用 RLS，`repos` 全局可读、用户私有表 `for all` 限 `(select auth.uid()) = user_id`。
   - 均幂等（`if not exists` / `create or replace` / `drop policy if exists`）。
6. **`supabase/README.md`**：迁移应用（SQL Editor / `supabase db push`）与 GitHub OAuth 后台配置步骤。

## Verification（验证）

- [x] `pnpm build`：6/6 通过（web 产出含登录 UI）。
- [x] `pnpm typecheck`：8/8 通过。
- [x] `pnpm test`：2/2 通过（db client 用例；turbo 复用 core 缓存）。
- [x] `pnpm lint`：Biome 0 错误（`biome check --write` 归一导入/格式）。
- [x] 契约核对：认证/数据访问仅经 `db`、文案外部化、密钥仅在本地 `.env`（gitignore）未入库、迁移对齐 `data-model.md` 字段与 RLS 约束。

## Outcome（结果）

Phase 0 代码侧完成：登录链路（`db` 辅助 + `web` UI）与初始 schema/RLS 迁移就位，工程门全绿。

**2026-06-29 验证更新**：用户注册 GitHub **OAuth App**（callback 指向 Supabase）、在 Supabase 配置 GitHub provider 与 Redirect URLs 后，本地 `apps/web` 点击「使用 GitHub 登录」**端到端跑通**——成功回流并显示当前用户邮箱。用户确认数据库迁移（schema + RLS）也已在 Supabase 应用。**Phase 0 验收达成**（本地启动 Web + GitHub 登录 + 读到当前用户基础信息）。

## Follow-ups（后续，需用户后台动作）

1. 应用 `supabase/migrations/`（SQL Editor 粘贴或 `supabase db push`）。
2. 配置 GitHub OAuth：GitHub OAuth App（callback 指向 `…supabase.co/auth/v1/callback`）→ Supabase GitHub provider → Redirect URLs 增 `http://localhost:5173`。
3. `pnpm --filter @asterism/web dev` 验证登录回流。
4. Phase 1：`supabase gen types` 生成 `Database` 类型并收紧 `db` 客户端泛型；接 stars 同步/查询。

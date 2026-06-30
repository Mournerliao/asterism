# 0006 · stars 同步经 Edge Function（受信路径写入）

- Status: Accepted
- Date: 2026-06-30

## Context（背景）

进入 Phase 1，第一刀是「同步 starred」。`contracts/architecture.md` 的数据流图把第 3 步画成
**客户端（`core`/`db`）直接写 Postgres**；但 `contracts/data-model.md` 与已落地的
`supabase/migrations/20260629120100_row_level_security.sql` 规定 `repos` 表**只有 SELECT
策略、无 INSERT/UPDATE**——即「仅受信路径（Edge Function / service role）可写，普通用户不可
直写」。两份契约相互矛盾，必须先裁决，否则同步逻辑无处落脚。

补充约束：

- `repos` 是**全局共享**表（多个用户共用同一行仓库元数据）。若放开 authenticated 直写，任一
  登录用户都能改全局数据，存在数据完整性与滥用风险。
- GitHub GraphQL API 需要 token。Supabase GitHub OAuth 登录后，会在**会话中**短暂返回
  `provider_token`（GitHub 访问令牌），但 Supabase 默认**不持久化、不刷新**该令牌。

## Decision（决策）

**stars 同步的写入走 Edge Function `sync-stars`（service role），不放客户端直写。** 修正
`architecture.md` 数据流使其与 `data-model.md`/RLS 一致（受信路径写）。

1. **执行位置**：新增 `supabase/functions/sync-stars`（Deno）。函数校验调用者的 Supabase 用户
   JWT 拿到 `user_id`，再用 **service role**（绕过 RLS）幂等 upsert `repos`（按 `github_id`）
   与该用户的 `user_stars`。客户端只**触发**同步并**读取**结果（读走 RLS：`repos` 全局可读、
   `user_stars` 按 `user_id`）。
2. **GitHub token 来源**：客户端在 OAuth 登录回流时捕获会话里的 `provider_token`，每次同步随
   请求体/头传给 `sync-stars`，函数用它调用 GitHub GraphQL。**已知局限**：`provider_token`
   不被 Supabase 持久化/刷新，页面刷新后会话中不再带它；因此「同步」能力在**本次登录会话**内
   可用，过期或丢失时引导用户重新登录刷新。MVP 接受此局限（只读公开 star，最小 scope）。
3. **增量**：函数支持全量与增量。增量以「该用户 `user_stars` 已有的最新 `starred_at`」为界，
   GitHub GraphQL `viewer.starredRepositories(orderBy: STARRED_AT desc)` 游标分页拉取，遇到
   不晚于该界的项即停止；幂等 upsert 保证重试不产生重复/脏数据。
4. **代码边界（共享 vs Deno）**：纯函数部分——GitHub GraphQL 查询串、响应到领域 `Repo` 的映射、
   增量截断判断——放在 `packages/core`（无平台专有 API，仅用全局 `fetch`），可被单测覆盖。
   `sync-stars` 函数承载编排 + service role 写库；因 Supabase Edge（Deno）与 workspace 包的
   打包边界，函数侧对纯逻辑采用「就近内联 / 复制最小实现」，以 `core` 的单测版本为权威，二者保持
   一致（后续如引入 Deno 友好的共享方式再收敛，记为一个已知 seam）。
5. **类型**：理想用 `supabase gen types typescript` 生成 `Database` 泛型收紧客户端（见 BACKLOG）。
   在无法连上线项目/CLI 的环境中，先**按迁移手写** `Database` 类型置于 `packages/db`，结构与
   `migrations/` 对齐，待具备条件再用 CLI 重新生成覆盖。

字体/间距 token、AI/向量、写操作（unstar/star，需 `public_repo`）不在本决策范围。

## Consequences（影响）

正面：

- 同步写入与 RLS/`data-model` 的「受信路径写全局表」纪律一致，全局 `repos` 不暴露给客户端直写。
- 客户端职责清晰：触发 + 读取 + 缓存；服务端密集型拉取/批量写集中在函数，规避客户端长时占用与
  速率限制（与 `architecture.md` 「服务端密集型同步可由 Edge Functions 承担」一致）。

负面 / 需注意：

- **提前引入 Edge Function 基建**：Deno 运行时、`SUPABASE_SERVICE_ROLE_KEY` 等 secret 管理、
  本地 `supabase functions serve` / 部署流程，原排在 Phase 3，现 Phase 1 即用到（仅 `sync-stars`）。
- **`provider_token` 局限**：同步依赖登录会话内的 GitHub 令牌，刷新后需重新登录获取；UI 需对
  「令牌缺失/过期」给出明确反馈与重新登录引导。
- **代码 seam**：纯逻辑在 `core` 与函数侧暂存在重复风险，需靠单测对齐，后续再收敛共享方式。

## Alternatives considered（备选方案）

1. **客户端直写 + 放开 `repos` 的 authenticated upsert RLS**：无需新基建、最快跑通，契合
   architecture 数据流原图；但让任一登录用户可写全局共享表，削弱 `data-model` 的「仅受信路径写」
   保证，全局数据完整性/滥用面变差。已否决（与数据模型纪律冲突）。
2. **每部署一个 GitHub PAT 由函数统一调用**：避免依赖用户 `provider_token`；但非「按用户身份」
   拉取、速率与归属混乱，且自部署者需额外配置。已否决。
3. **持久化用户 GitHub 令牌到库**：可后台/定时同步；但等于托管用户第三方令牌，安全面变大，
   与「最小权限/不存敏感凭据」取向相悖，MVP 不必要。已否决（如未来要后台同步再评估，需加密存储）。

# 2026-06-30 · Phase 1 Slice 3：stars 同步（数据地基）

## 范围

打通「同步 GitHub stars」端到端：`packages/core` 同步逻辑 → `supabase/functions/sync-stars`
受信写入 → `packages/db` 强类型读查询 + 触发封装 + Dexie → `apps/web` Query hooks + 顶部栏
Sync 按钮接线与进度反馈。首个真实数据驱动地基，Browse 等切片在其上读数。

## core · GitHub GraphQL 同步

- `packages/core/src/github/stars.ts`：`STARRED_REPOS_QUERY`（`viewer.starredRepositories`，
  游标分页 + `starredAt` 倒序）、`mapStarEdgeToRow`/`mapStarEdgeToRepo` 映射、
  `createGitHubStarsFetcher`（注入 fetch，便于测试）、`collectStarredRepos`（全量 + 按
  `starredAt` 增量截断；跳过无 `databaseId` 的节点）。
- `stars.test.ts`：5 个 Vitest 覆盖映射、分页、增量界、缺 `databaseId` 跳过。

## supabase/functions/sync-stars · 受信写入

- Deno 函数：校验调用者 JWT → `user_id`；读该用户最新 `starred_at` 作增量界；用会话
  `provider_token` 调 GraphQL 拉取（遇不晚于界即停）；service role 幂等 upsert `repos`
  （冲突键 `github_id`）→ 拿 id 映射 → upsert `user_stars`（冲突键 `user_id,repo_id`）。
- 分块 upsert（500/批），重试不脏写。响应 `{ total, upserted, starsLinked, incremental }`。
- 纯逻辑与 `core` 同源、就近内联（Deno 与 workspace 打包边界）；以 `core` 单测为权威。
- 文档：`functions/sync-stars/README.md` + 根 `supabase/README.md` 增 Edge Functions 段。
- `biome.json` 对 `supabase/functions/**` 关闭 `noUndeclaredEnvVars`（`SUPABASE_URL` 等为
  运行时注入，非 Turborepo 构建变量）。

## db · 强类型查询 / 触发封装 / 缓存

- `database.types.ts`：手写 `Database` 类型（7 表 Row/Insert/Update + 关系），`client.ts`
  `createSupabaseClient` 收紧为 `SupabaseClient<Database>`（兑现 BACKLOG「DB 强类型查询」的
  接入；`supabase gen types` 待 CLI 流程统一后替换为生成版）。
- `queries/repos.ts`：`listStarredRepos`（`user_stars ⋈ repos` 按当前用户、`starred_at`
  倒序，走 RLS）、`getLatestStarredAt`、`mapRepoRow`（snake→camel）。
- `sync.ts`：`invokeSyncStars`（调 `functions.invoke('sync-stars', { providerToken })`，
  错误归一为 `SyncStarsError`）。
- `cache.ts`：Dexie schema v2，`repos` 增 `starredAt` 索引（离线浏览/排序）。

## web · Query hooks + Sync UI

- `data/keys.ts` query key 工厂；`data/use-starred-repos.ts`（`useStarredRepos`，按
  `session.user.id` enable）；`data/use-sync-stars.ts`（`useSyncStars` mutation：取
  `session.provider_token` 调 `invokeSyncStars`，成功 `invalidateQueries` + sonner 成功提示，
  失败/缺 token 分别提示）。
- `components/app-topbar.tsx`：Sync 按钮接 `useSyncStars`，pending 时禁用 + 图标 `animate-spin`
  + 文案切「Syncing…」。
- i18n：`sync.syncing/success/error/noToken` en + zh-CN 双语。
- `packages/ui` 从 sonner 再导出 `toast`（UI owns toast）。

## 验收

- `pnpm lint`（Biome）/ `pnpm typecheck` / `pnpm test` / `pnpm build` 全绿；core 同步 5 测通过。
- 写入仅经 Edge Function（service role），客户端只触发 + 读取，符合 `data-model.md` RLS 与
  ADR 0006。
- 唯一数据访问入口仍是 `@asterism/db`（web 不直接拼 Supabase 查询）。

## 后续

- Slice 4：Browse 卡片/列表 + TanStack Virtual，消费 `useStarredRepos` 读真实数据。
- 限制：`provider_token` 不被 Supabase 持久化/刷新，长时间后需重新登录才能再同步（已在
  ADR 0006 记录；UI 以 `sync.noToken` 提示）。

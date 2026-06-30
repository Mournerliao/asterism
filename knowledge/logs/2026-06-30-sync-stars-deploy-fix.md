# 2026-06-30 · 修复「同步星标报错」（部署 sync-stars + 错误透传）

## 症状

用户在顶部栏点「Sync」后弹出通用错误 toast：`Sync failed. Please try again.`
（即 `sync.error`，非 `sync.noToken`）。

## 排查

- 报错文案是通用 `sync.error`，说明点击时 `session.provider_token` 存在（缺 token 会走
  `sync.noToken`），失败发生在调用 Edge Function 这一步。
- Slice 3 的验收只跑了 `lint/typecheck/test/build` 与 core 单测，**没有任何「部署 /
  端到端验证 sync-stars」记录**。
- 直接探测函数端点：

  ```
  OPTIONS https://hqtrmulypxwdqvzlkhke.supabase.co/functions/v1/sync-stars → HTTP 404
  POST   …/sync-stars → {"code":"NOT_FOUND","message":"Requested function was not found"}
  ```

- `supabase functions list --project-ref hqtrmulypxwdqvzlkhke` 返回空表。

**根因**：`sync-stars` Edge Function 从未部署到 asterism 项目；客户端 `functions.invoke`
命中网关 404，supabase-js 抛 `FunctionsHttpError`，被前端归一成通用 `sync.error`，真实原因
（404）被吞掉。

## 修复

1. **部署函数（主修复）**：`supabase functions deploy sync-stars --project-ref hqtrmulypxwdqvzlkhke`。
   部署后 `functions list` 显示 `sync-stars ACTIVE v1`；OPTIONS → 200，未认证 POST → 401
   （网关 verify_jwt，符合预期，非 404）。`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 由平台
   自动注入，无需额外配置。
2. **错误透传（防回归）**：`packages/db/src/sync.ts` 的 `invokeSyncStars` 现在解析
   `FunctionsHttpError.context`（Response 体）取出函数返回的真实 `{ error }` 文案与 HTTP 状态，
   写入 `SyncStarsError.message` / `.status`（404 显式提示「函数未部署」）。`apps/web` 的
   `use-sync-stars.ts` 在失败 toast 上附 `description` 展示底层原因，headline 仍走本地化
   `sync.error` / `sync.noToken`。
3. **忽略 CLI 临时产物**：`supabase functions list/deploy --project-ref` 会自动 link 并生成
   `supabase/.temp/`，Biome（`useIgnoreFile`）会扫到它。已在根 `.gitignore` 加
   `supabase/.branches/`、`supabase/.temp/`。

## 验收

- `pnpm lint`（Biome，127 文件）/ `pnpm --filter @asterism/{db,web} typecheck` 全绿。
- `pnpm --filter @asterism/{core,db} test`：core 17 测、db 2 测全过。
- 函数端点 404 已消除（`ACTIVE v1`）。

## 已知局限 / 后续

- `provider_token` 仍不被 Supabase 持久化/刷新（ADR 0006）：刷新页面后再同步会走 `sync.noToken`，
  需重新登录。本次未改变该行为。
- **部署是「每环境一次性」的手工步骤**：换 Supabase 项目 / 新部署者需重新
  `supabase functions deploy sync-stars`（见 `supabase/README.md` Edge Functions 段）。
- 真正的端到端「点 Sync → 写库 → Browse 读到数据」仍待在浏览器内由用户在登录态下确认。

# 2026-08-13 · 修复受信集合 mutation 数据库 CI

## 症状与反馈环

`main` 的 GitHub Actions 在 `pnpm test:db` 稳定失败。`lint`、`typecheck` 与普通测试先通过，
pgTAP 执行前三项 baseline / no-op 断言后，在首个并发 dblink 连接报
`password or GSSAPI delegated credentials required`，计划的 17 项只执行 3 项。

本机没有 Docker、PostgreSQL 或 psql，无法用本地 `supabase test db` 触达同一故障。诊断以 GitHub
runner 上的 draft PR #35 为真实反馈环，每轮保持原 pgTAP 文件和 Supabase CLI 路径不变，只调整一个
连接或 SQL 变量因素。

## 根因与修复

第一层根因是并发测试的 dblink conninfo 只有数据库名。补充 `postgres` 测试密码后错误仍在，因为
数据库容器内的 `127.0.0.1` 连接命中 trust 认证，目标服务器没有真正执行密码交换；PostgreSQL 17
会拒绝非超级用户复用这种连接。最终改为使用 `inet_server_addr()` 指向数据库容器网络地址，并以
`require_auth=scram-sha-256` 强制真实 SCRAM 认证。两个独立 dblink session 和真实并发覆盖均保留。

认证修复后，三个并发断言全部执行，门禁推进至第 6 项并暴露第二个生产缺陷：
`mutate_collection_relation` 的 PL/pgSQL 局部变量 `operation_id` 与
`bulk_operation_items.operation_id` 同名，`item.operation_id = operation_id` 在 PostgreSQL 17
被判定为歧义。局部变量改为 `created_operation_id`，响应 receipt 中的引用同步调整。既有响应丢失
重放 pgTAP 路径直接覆盖此缺陷，没有新增不能触达真实调用链的浅层测试。

## 验证

- 本地：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 通过。
- GitHub Actions run `31679586695`：全部 migrations 应用成功。
- `trusted_collection_relation_mutations.test.sql`：`Files=1, Tests=17`，`Result: PASS`。
- CI 后续 `pnpm build` 实际执行并通过；完整 job 用时 2m37s。
- 仓库无 `[DEBUG-*]` 临时 instrumentation，也没有遗留 throwaway harness。

## 后续

本轮只修复 CI 与其暴露的现役 mutation seam 缺陷，没有部署 migration 或 Edge Function 到远端
Supabase，也没有开始 #31。下一产品 frontier 仍是 GitHub #31 单项生产 Collection Dial；远端部署与
真实环境 smoke 继续按 `supabase/README.md` 单独授权执行。

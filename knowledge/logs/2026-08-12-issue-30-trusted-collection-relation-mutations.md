# Issue #30 · 受信集合关系 mutation seam

日期：2026-08-12

## 范围

实现 Collection Dial blockers-first 链的第一个 tracer bullet：在不新增生产 Collection Dial UI、
不改变现有用户文案与标签关系语义的前提下，把所有现役 collection relation writer 收敛到
同一受信边界，并为后续短期 Undo 建立可验证的 effective mutation identity。

## 实现

- 新增 migration `20260812120000_trusted_collection_relation_mutations.sql`：
  - 建立 `collection_relation_heads`，按用户 / 集合 / 仓库保存当前存在态、单调 version、最后
    effective mutation UUID 与可空 bulk item identity；既有 membership 回填为 version 1、
    `last_operation_item_id = null` 的 baseline，不改变 canonical `collection_repos`。
  - authenticated `mutate_collection_relation` 从 `auth.uid()` 取得身份并在同一事务创建 / 恢复
    单项 bulk operation + item；service-role
    `apply_collection_relation_mutation` 在同一事务内校验 Star membership、collection owner 与
    operation item binding，串行化并发 pair，原子写 relation / head / item receipt。幂等 no-op
    不推进 version；worker 在写后丢失响应并重领时复用 item 已持久化的原 receipt。
  - `collection_repos` RLS 收敛为 owner SELECT，撤销 anon / authenticated 直接 DML；head 与 bulk
    表只允许 owner SELECT，受信函数权限按 authenticated / service-role 分离。
  - bulk operation 增加 interaction、UUID client request id、可空 Undo link / expiry；
    `(user_id, client_request_id)` 唯一且冲突时核对规范化 scope / changes，保证相同命令在 create
    响应丢失后返回同一 operation，并拒绝同一 key 偷换 payload。Item 增加
    `effective_changed` 与可空 mutation receipt。
- `packages/db` 新增严格 typed collection mutation command；HTTP/DB projection 对未知字段、
  非法 interaction、伪造 no-op receipt 与畸形响应 fail closed。Bulk 列表改为显式列投影。
- Quick Look toggle、JSON import 与 `bulk-organize` executor 已全部迁移；单项写入也形成 operation /
  item identity，调用方在响应丢失后复用 request UUID。Import 对既有 membership
  继续计为 skipped，用户可见旅程与失败恢复语义不变。
- Web bulk dialog 在会话内用 `useRef` 按确认 payload 保留 client request UUID：失败重试复用，
  权威成功后清除；该临时值不触发额外 render，符合项目 React skill 规则。
- 修复既有 `embedding-consent` 测试对 `Storage.prototype` 的无效 spy，改在 happy-dom 实例边界
  `localStorage.getItem` 上观察缓存行为；产品实现未改。

## 测试与验收

- TDD seams：`mutateCollectionRelation` typed command、`bulk-organize` HTTP handler / executor /
  ownership-checked relationship interface、bulk operation strict projection。
- 新增 / 扩展回归覆盖：有效变更与 no-op receipt、请求 / 响应未知字段拒绝、interaction / client request
  传递、跨用户 repository、失效 / 他人 target、tag / collection effectiveChanged、失败安全投影。
- `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全绿；build 仅保留契约允许的既有
  主 chunk warning。
- 本机无 Docker 与 psql，无法执行本地 Postgres / RLS / 并发 smoke；本轮未推送 migration、
  未部署 `bulk-organize`。双用户隔离、并发 add、响应丢失、baseline 行数与 direct DML 拒绝的
  可执行真实环境步骤已追加到 `supabase/README.md`。

## 后续

评审补强：item receipt 同时持久化原始 relation version；成功、no-op 与写成功但响应丢失后的重试均回放同一 receipt。失败落账只更新状态与错误，不清除 apply 阶段已写入的 receipt。新增 `supabase/tests/trusted_collection_relation_mutations.test.sql` pgTAP 数据库集成回归和 CI 门禁，自动覆盖 baseline/no-op、两个独立连接的并发 add、响应丢失重放、跨用户、非法 target 与 authenticated 直写拒绝。

GitHub #31 是唯一下一 frontier：只实现单仓库生产 Collection Dial。#32 多选、#33 More / New /
Undo / recovery 与 #34 实测验收仍受 blockers 约束，不得提前混入。

# Edge Function · `manage-ai-organization`

受信的 AI 整理草稿生命周期：`generate`、`read`、`update-review`、`confirm`、`discard`。函数验证
Supabase JWT，所有读取与写入按该 `user_id` 限定；普通客户端对
`ai_organization_drafts` 无表权限。

生成固定读取 1–50 个已 Star 仓库的最新 Postgres 元数据、当前标签 / 集合与关系。仅当
`include_notes_in_ai=true` 时读取笔记，并按每条 2,000 个 Unicode code points 截断。README
不会被查询。函数只接受 active、有效且 model 精确匹配最近 capability 测试的 Connection；
凭据在本次调用内解密，经与 Connection 管理相同的 SSRF / allowlist / 同源重定向边界调用
Provider。

Provider 调用与严格 schema 校验先完成；成功后通过单个数据库函数原子插入或替换该用户的
唯一草稿。网络、超时、Provider 或 schema 错误不会触碰旧草稿。草稿只保存验证后的建议、
repository ID 快照与 Connection / adapter / model provenance，不保存 credential 或原始响应。

持久化草稿使用 review schema v2：现有关系建议带稳定 ID 且默认 `selected=true`，建议新建
分类带稳定 ID、依赖的 repository ID 范围且默认 `approved=false`。每次
`update-review` 只修改一项选择，并必须携带当前 `expectedRevision`；数据库函数用
compare-and-set 原子推进 revision。旧 revision 返回稳定 conflict 结果，不覆盖较新的审阅选择。

`confirm` 必须提交 `draftId`、当前 `expectedRevision` 与界面展示的完整最终 suggestions。仅
service role 可调用的数据库事务以 `for update` 锁定草稿，要求 revision 与 suggestions
精确匹配，并重新校验全部 source repositories、已选择的现有分类目标及批准的新分类范围。
事务按 NFKC、首尾 / 连续空白与大小写规范化名称；等价标签或集合复用已有 ID，并以规范化
唯一索引阻止并发重复。migration 会先把历史等价分类合并到最早创建的稳定 ID，并迁移关系与
bulk item，再建立唯一索引；去除空白 / 标点后的保守近似键若命中非等价名称，确认会失败并
保留草稿，不会静默重定向用户选择。随后创建一个带 `source_draft_id` 幂等键并保存确认
revision 与完整 suggestions 的
`source: "ai_draft"` bulk operation 及全部逐关系 items，只有这些记录全部落库后才删除草稿。
任何错误都会回滚分类与操作写入并保留草稿。

确认事务不执行关系写入。正常响应后 Web 立即调用既有 `bulk-organize` 50 条有界 executor；
recovery banner 继续中断的 pending items、只重试 retryable failures，并保留已成功 items。
双击、并发标签页或提交成功后 HTTP 响应丢失时，相同
`source_draft_id + expectedRevision + suggestions` 只会返回已创建的 operation；同草稿 ID 的
不同 payload 返回 conflict。刷新会发现草稿已消费与活跃 bulk operation，不会创建第二个操作。

## 部署

先依次应用 `20260723120000_ai_organization_drafts.sql` 与
`20260723160000_ai_organization_review.sql`、
`20260723190000_ai_organization_confirmation.sql`、
`20260723193000_fix_ai_organization_confirmation.sql`，并按
`../manage-ai-connections/README.md` 配置 `AI_CREDENTIAL_ENCRYPTION_KEYS`、
`AI_CREDENTIAL_ACTIVE_VERSION` 与 `AI_CUSTOM_ENDPOINT_ALLOWLIST`，再执行：

```bash
supabase functions deploy manage-ai-organization
supabase functions deploy bulk-organize
```

两者缺一不可：前者消费草稿并创建持久化 operation，后者执行 operation 中的逐关系 items。

## Smoke test

准备：两个已登录测试用户、每人至少两个已同步 Star、通过 Generation capability 测试且已
设为 active 的 Connection/model。不要在命令、fixture、截图或日志中写入真实 credential、
笔记正文、完整 prompt 或 Provider 响应。

1. 用户 A 生成草稿，取消一条现有关系、批准一个会作用于两个仓库的新分类；刷新确认选择与
   revision 已恢复。用户 B 读取不到 A 的草稿、bulk operation 或 items。
2. 在最终确认层核对新分类、additions、removals 的准确数量；确认后应立即开始执行，草稿
   消失，且只出现一个 `source: "ai_draft"` 的 bulk operation，其 items 与最终选择逐条一致。
3. 重放同一个 `draftId + expectedRevision + suggestions` 请求，或在两个标签页同时确认；
   应返回同一个 operation ID，`bulk_operations` 不增加第二行。
4. 预先建立一个仅大小写 / NFKC / 多余空白不同的等价标签或集合，再确认批准的新分类；应复用
   既有分类 ID，不创建重复分类。另用仅标点不同的近似名称验证确认被拒绝且草稿保留。
5. 在确认前删除一个已选择的现有目标或从 `user_stars` 删除一个 source repository；确认应
   返回稳定的 stale / invalid 结果，草稿仍存在，且不产生新分类、operation 或孤立 item。
6. 正常确认后在 `bulk-organize` recovery banner 继续执行；制造一条 retryable 与一条
   terminal failure，确认成功 items 保留、retry 只重跑 retryable item，最后可显式结束
   terminal failure。
7. 用 DevTools 阻断确认响应但允许请求到达服务端，再刷新页面；应直接恢复同一个活跃 bulk
   operation，不重新提交已消费草稿。

可用 SQL Editor 做不含敏感内容的最终计数核对：

```sql
select source, source_draft_id, status, count(items.id) as item_count
from public.bulk_operations operations
join public.bulk_operation_items items on items.operation_id = operations.id
where operations.user_id = '<test-user-uuid>'
group by operations.id;
```

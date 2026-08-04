# manage-organization-tasks

受信 Organization Task 生命周期接口。客户端只发送目标、任务 ID、期望 revision
和结构化决定；函数使用用户 JWT 确定 ownership，并以 service role 执行候选发现、
快照固化、Generation 披露批准、可恢复分页 Generation、Plan 风险审阅、精确确认与结束。

部署：

```sh
supabase functions deploy manage-organization-tasks
```

候选 / 审阅路径不读取 credential；只有用户批准固定 Generation workload 后的分页路径会
在服务端解密当前 BYOK Connection 并调用 Generation Provider。候选扫描会分页读取完整授权
Star 库、当前 canonical、笔记授权输入和可用的浏览器 derived embedding；客户端可选提交
本地生成的目标向量，向量只用于候选发现且不会进入任务投影。Opportunity 只持久化
kind/count，接受时由当前 locale 的翻译资源固化 Task goal。

部署前应按时间戳应用全部 migration，尤其是：

- `20260728180000_organization_tasks.sql`
- `20260728183000_localized_organization_opportunity_goal.sql`
- `20260730090000_organization_generation_runs.sql`
- `20260804120000_organization_plan_review_execution.sql`

#26 的确认 RPC 会在一个事务中重新校验 task / Plan revision、group fingerprints、准确计数、
Star ownership、分类目标、名称规范化与当前关系前置条件，只创建 `source: organization_task`
的 operation / items / task link；实际 canonical 关系由 `bulk-organize` 有界执行器另行写入。
完全相同的确认重放会恢复原 operation ID，不能创建重复 operation。

部署后 smoke 应至少验证：三档风险默认值、逐仓库排除使批准失效、跨标签页 stale revision
冲突、名称等价复用 / near-match 保守拒绝、确认响应丢失重放、部分成功与只重试
`retryable_failed`、刷新后从 task link 恢复准确执行计数，以及普通 authenticated 角色不能
写审阅 / 链接表或执行两个 service-role RPC。

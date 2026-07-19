# 2026-07-19 · GitHub #11 可靠批量整理

## 目标

在不依赖 AI 的前提下交付可靠批量整理底座：稳定选择范围、tags / collections 添加与移除、持久化逐关系结果、部分失败恢复与明确完成；不访问 GitHub 写接口，不改变 star 状态或 OAuth scope。

## 实现

- Browse 增加手动选择、全选当前筛选结果快照、准确计数与清空；卡片和虚拟表格共享键盘可达的选择接口。
- 确认层复用现有 Dialog / Select 与 Graphite Glass tokens，可在同一次操作中配置多个 tag / collection 的添加或移除，所有文案提供 en / zh-CN。
- `bulk_operations` 固化 repository ID 范围；`bulk_operation_items` 以“仓库 × 关系类型 × 目标 × 动作”为最小状态、执行和重试单位。
- `bulk-organize` 验证 Supabase JWT，并通过只授予 service role 的函数原子创建操作、按 50 条有界批次领取项目、记录结果或明确结束。普通 authenticated 客户端只有本人行的 SELECT 权限。
- 关系写入在执行时再次验证仓库与目标归属；添加已有关系和移除缺失关系直接返回成功。未知基础设施错误只暴露安全的可重试摘要。
- TanStack Query 从 Postgres 权威账本恢复未完成操作；自动续跑有界批次，刷新或中断后可显式继续，只重试 `retryable_failed`，终止失败需用户明确结束。
- self-host runbook 与 Supabase README 增加 migration / `bulk-organize` 部署说明。

## TDD 与验证

- 受信 HTTP 接口：会话、输入归一化、稳定范围、动作路由与跨用户 404。
- 执行状态机：成功保留、可重试/终止分类、仅失败项重试与错误脱敏。
- 关系模块：tag / collection 两条路径、重复添加与缺失移除的幂等成功。
- Web / DB：选择快照、Edge transport 类型守卫与双语 key 对齐。
- 最终运行全仓 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。

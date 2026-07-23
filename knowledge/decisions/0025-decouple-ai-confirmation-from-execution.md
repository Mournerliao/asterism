# 0025 · AI 整理确认事务与批量执行解耦

- Status: Accepted
- Date: 2026-07-23

## 背景

AI 整理草稿在用户确认后，原实现把「提交确认事务」与「运行批量执行器」塞进同一个前端
mutation（`useConfirmAiOrganizationDraft` 内联 `runBulkOperationUntilSettled`）。这带来两个
问题：确认对话框在数十秒执行期间被锁定、不可关闭、且只显示一个 spinner，剥夺了系统状态可
见性；同时它架空了项目已有的可续跑批量操作管线（ADR 0023）与 `BulkOperationBanner`，等于维
护了两套可靠性语义。

## 决策

确认 mutation 只负责提交确认事务：调用 `confirmAiOrganizationDraft`（单次
`manage-ai-organization` 的 `confirm` 动作），成功后清空草稿缓存并关闭对话框。批量执行不再
在 mutation 内联触发，而是交还给既有的 `BulkOperationBanner` 管线——确认成功返回
`operationId` 后，页面据此拉取该操作并由横幅驱动逐项执行、展示进度、在失败时提供可续跑入
口。手动批量整理与 AI 确认由此共用同一条执行与展示路径。

## 影响

- 高风险时刻（把私密数据交给第三方后的写入执行）恢复了完整的进度可见性与可续跑能力。
- 对话框交互从"阻塞式 spinner"变为"确认即关闭"，认知负荷下降。
- 数据层 `confirmAiOrganizationDraft` 的契约收敛为纯事务，不再有执行副作用；相应移除了前端
  的 `confirmAndExecuteAiOrganizationDraft` 复合封装，测试改为断言确认只调用一次
  `manage-ai-organization`、绝不内联 `bulk-organize`。
- 与 ADR 0020（人工确认的 AI 整理）、ADR 0023（持久化逐项批量写入）一致，不引入第二套可靠性
  语义。

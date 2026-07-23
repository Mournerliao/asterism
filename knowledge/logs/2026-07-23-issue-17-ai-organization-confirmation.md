# Issue #17 · AI 草稿受信确认与可靠批量执行

日期：2026-07-23

## 范围

完成 Phase 2 AI 切片 B 的最后一个纵向切片：把已人工审阅的 AI 整理草稿，经受信事务交接到
既有持久化批量整理系统，并确保重复提交、响应丢失、刷新恢复、分类名称碰撞与部分执行都不会
产生第二个操作或静默改变用户决定。

## 实现

- `manage-ai-organization` 新增 `confirm` action；请求必须携带草稿 ID、当前 revision 与界面
  展示的完整 suggestions。handler 把数据库冲突、stale target 与非法 payload 映射为稳定响应。
- 数据库事务锁定草稿并重验用户、revision、完整 suggestions、source repositories 与现有分类
  目标；在同一事务中创建批准的新分类、`source: "ai_draft"` bulk operation 和逐关系 items，
  全部成功后才删除草稿。
- 规范化名称使用 NFKC、首尾 / 连续空白与大小写折叠。迁移先合并历史等价分类及其关系 /
  bulk items，再建立 per-user 规范化唯一索引；仅标点等形成的近似但非等价名称会保守拒绝。
- operation 保存 `source_draft_id`、确认 revision 与完整 suggestions。完全相同的重放返回原
  operation；同草稿 ID 的不同 revision 或 suggestions 返回 conflict。
- Web 最终确认层显示批准新分类、additions 与 removals 的精确数量。确认成功后立即调用既有
  50 条有界 executor；刷新或响应丢失时由 recovery banner 继续同一 operation。
- `packages/core`、`packages/db`、Edge Function、hook、组件与 runner 均新增回归测试；错误处理
  使用类型化 `AiOrganizationConfirmationError`，不依赖文案匹配。

## 审查收敛

按 implement 工作流完成 Standards / Spec 双轴审查，并修正：

- 历史规范化重复分类在唯一索引创建前安全合并。
- 近似名称不静默复用，改为拒绝并保留草稿。
- 幂等重放同时核对 revision 与完整 suggestions。
- 正常确认路径立即驱动有界 executor，而不只依赖恢复入口。
- 数据模型与架构契约补齐确认快照、幂等键和事务不变量。

## 真实环境验收

项目：`hqtrmulypxwdqvzlkhke`。

- 已应用 `20260723120000`、`20260723160000`、`20260723190000`、
  `20260723193000`，并部署 `manage-ai-organization` 与 `bulk-organize`。
- 用两个真实 Star 仓库构造无敏感内容的受控草稿；UI 准确显示
  `1 approved new classification / 2 additions / 0 removals`。
- 模拟确认响应丢失后，数据库只存在一个 operation、草稿已消费、两个 items 为 pending；
  刷新后 recovery banner 恢复同一 operation，继续执行后为 `completed / 2 succeeded`。
- 完全相同 payload 重放返回同一 operation ID；revision 改变返回
  `draft_confirmation_conflict`。
- 非 owner 查询 operation / items 得到 0 行；owner 可读取自己的记录。
- 规范化等价名称复用已有标签且不增加分类；近似但非等价名称返回 stale target 并保留草稿。
- 通过真实 Edge handler 确认后自动执行完成，未遗留草稿或 applying banner。
- 所有 fixture operation、items、标签、关系与草稿均已清理，最终计数为 0。

真实 Postgres 首次解析暴露了 PL/pgSQL 变量与 SQL 标识符歧义；后续迁移
`20260723193000` 以明确变量名替换，并在远端重放验证。`bulk-organize` 部署时也发现 Deno
相对导入缺少 `.ts` 扩展，修正后成功打包部署。

Provider 生成 smoke 中 DeepSeek 上游曾返回失败；既有草稿按契约保持不变。该上游波动不属于
#17 确认链路，受控草稿覆盖了本 issue 的事务与 UI 验收。

## 门禁

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`（434 tests）
- `pnpm build`（通过；仅既有 Vite 主 chunk warning）
- `git diff --check`
- Impeccable 设计检测：无违规

本次沿用 ADR 0023 的持久化批量操作模型与现有 AI 草稿契约，无新增 ADR。

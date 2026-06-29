# <Loop 名称> Loop

> 复制本文件为 `<task-slug>.loop.md` 并逐节填写。删除尖括号占位说明，保留小节标题。
> 原则：Goal 必须可验证；Verification 必须是能跑/能判定的 gate；Guardrails 必须可执行约束。

- Status: <Draft | Active | Deprecated>
- Owner/Applicable: <谁/哪个 agent 角色可执行>
- Last updated: <YYYY-MM-DD>

## Goal（可验证的完成条件）

<用一句话说明本 loop 要达成什么，并给出"完成"的客观判据。完成条件应是可机检或可人工验收的，例如："X 组件在 packages/ui 导出且 typecheck/lint/测试全绿、a11y 达 WCAG AA"，而不是"把 X 做好"。>

## Inputs / Context（读哪些契约与状态）

执行前必须读取以下来源以获取"什么是对/完成"和"当前进展"：

- 契约（contracts）：<列出相关 `knowledge/contracts/*.md`，如 product / architecture / data-model / conventions / ui-ux>
- 持久状态（state）：`knowledge/state/PROGRESS.md`（恢复进度）、`NOTES.md`（便签）、`BACKLOG.md`（已知问题）
- 决策（decisions）：<相关 ADR>
- 其它输入：<外部规范、设计产物、issue 链接、命令输出等>

## Steps（每轮迭代动作）

1. <步骤 1>
2. <步骤 2>
3. <步骤 3>
4. <…按需增减；保持可重复执行>

## Verification（验证门 / Gates）

只有当下列 gate **全部通过**才算本轮"完成"：

- [ ] 类型检查：`<typecheck 命令，如 turbo run typecheck>`
- [ ] Lint / 格式：`<lint 命令，如 biome check>`
- [ ] 测试：`<test 命令，如 turbo run test / vitest>`
- [ ] 契约验收：<对照相关 contract 的具体验收点逐条核对>
- [ ] <其它 gate：构建通过 / a11y / 性能阈值 等>

## Guardrails（护栏）

- **Scope / file-claims**：本 loop 仅允许修改 <列出文件/目录范围>；不得改动范围之外的文件或他人认领的文件。
- **Iteration cap（迭代上限）**：单次运行最多 <N> 轮；超过则停止并上报，不得无限重试。
- **Budget（预算）**：<时间/调用/成本上限；超出即停>。
- **No-secret（禁密钥）**：禁止在代码、日志、提交中写入任何密钥；`.env` 不入库；敏感值仅经安全通道。
- **Sandbox（沙箱）**：默认在沙箱内执行；联网/安装/破坏性操作需显式批准；不擅自运行 `git push`、`reset --hard` 等危险命令。
- **No-invent（不臆造）**：不得脱离 contracts 自创规范/设计 token/接口；如需新增，先更新对应 contract 或开 ADR。

## Stop condition（停止条件）

满足任一即停止本 loop：

- 成功：所有 Verification gate 通过，且 Goal 的完成判据满足。
- 触顶：达到 Iteration cap 或 Budget 上限仍未通过 → 停止并上报现状与阻塞点。
- 阻塞：遇到需人类决策/授权（如缺密钥、需联网、需扩大 scope）→ 停止并上报，不擅自越界。

## Logging（运行日志）

每轮结束向 `knowledge/logs/<YYYY-MM-DD>-<task-slug>.md` 追加：

- 目标与本轮意图（Goal / intent）
- 迭代次数与关键动作（iterations / actions）
- 验证结果（每个 gate 通过与否、失败原因）
- 成本 / 耗时（cost / duration）
- 收敛后：同步更新 `knowledge/state/PROGRESS.md`；产生新决策时写入 `knowledge/decisions/`。

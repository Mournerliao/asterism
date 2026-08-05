# ADR 0030 · Task Undo 使用有效关系变更身份

- Status: Superseded by ADR 0032
- Date: 2026-07-28
- Related: ADR 0023、0029、GitHub #23

## Context

Task Undo 只能反转原 Organization Task 实际成功的关系变更，同时不能覆盖任务之后发生的用户操作。仅检查当前关系是否存在不足以区分“仍是原任务结果”和“用户后来移除、重新添加或再次移除”的状态；既有 bulk operation item 也不覆盖单项 UI 等其他写入路径。

## Decision

所有标签 / 集合关系写入路径为每次**有效关系变更**记录受信、稳定的 mutation identity / version；幂等 no-op 不推进版本。Organization Task 的成功执行项记录由它产生的有效 mutation identity。

Task Undo 仅在当前关系的最后有效 mutation identity 仍等于原执行项记录时创建反向 bulk operation item。后来发生任何有效关系变更、目标或归属失效时，该项保守跳过并报告冲突。撤销本身继续复用 ADR 0023 的可靠 bulk operation 语义，并且只反转关系，不删除标签或集合实体。

## Consequences

- 所有单项、手动批量、Organization Task 与撤销写入必须经过可推进关系 mutation identity 的受信路径。
- 撤销可以准确保护任务之后的用户意图，刷新、重试和部分失败语义保持可靠。
- 需要新增关系级变更记录或等价版本机制，并在迁移时覆盖全部现有关系写入入口。
- 不采用“只看当前关系状态”或“只查询原 bulk operation”的近似判断，因为它们无法识别中间发生过的用户变更。

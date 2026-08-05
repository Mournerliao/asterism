# ADR 0031 · 客户端驱动的有界分页 Generation loop

- Status: Superseded by ADR 0032
- Date: 2026-07-30
- Related: ADR 0023、0029、0030、GitHub #23、#25

## Context

已批准 Generation 工作量的 Organization Task 必须完成内部有界分页（每页 ≤50 个唯一仓库），并持续产生可恢复的整体进度、支持暂停 / 恢复 / 重试 / 结束。谁来推进这个逐页 loop 有三种形态：

- **A. 服务端常驻 worker / cron** 自动跑完所有页；
- **B. 单次长运行的 Edge Function** 在一次调用里循环所有页；
- **C. 客户端驱动**，每次受信调用只推进一页。

约束：技术栈没有常驻后台执行设施；Supabase Edge Function 有单次执行时长上限（B 不适合大库）；任务必须可观测、可暂停、可跨会话恢复；成功页在刷新或响应丢失后不得重复接受；页面状态机、调用账本与上限判定已落在仅 service-role 的 RPC 中；客户端本就按“查询边界重新读取权威状态”工作（见 architecture 契约）。

## Decision

采用 **C：客户端拥有分页 loop**。任务处于 `generating` 时，Web 反复调用受信 `run-page` 动作，每次结算恰好推进一页，并在任何非成功 outcome（call_ceiling / token_ceiling / exhausted / in_flight / drift / page_failed / plan_ready）处停止。服务端把全部正确性留在数据库状态机里（claim + 租约 + complete + 账本 + 上限），客户端只是“泵”——可随时中断、由任意会话恢复或交接。

客户端 loop 的实现必须：用 ref 防重入（StrictMode remount 安全）、在结算回调里**直接观测 outcome**、并在 `runPending`（pending → settled）翻转时重新武装下一页；**不得**使用 `active`/`cancel` cleanup 标志，因为 `runPending` 翻转触发的 cleanup 会清空该标志，导致 outcome 永不被观测、在 `generating` 态 busy-spin。

## Consequences

- 无需常驻 worker 或 cron，也不依赖单次长运行函数，契合 Supabase 执行时长上限与“客户端在查询边界重新读取权威状态”的数据流。
- 进度天然可观测、可暂停：关闭标签页只是停泵，状态在 Postgres 中，任意会话可续跑。
- 正确性（恰好一次接受、上限、确定性归并）由 service-role RPC 在服务端强制，与“哪个客户端在驱动”无关；响应丢失只留下过期租约，被下一次 claim 关为 `lost` 并继续计入上限。
- 代价：页面只在有客户端打开时推进，没有无人值守的后台完成。对 #25 tracer bullet 可接受；未来若需后台自动跑完，可在不改数据库契约的前提下叠加服务端 worker。
- 客户端 loop 必须严格按上述 ref / 直接观测 / 翻转重新武装写，否则会 busy-spin 或丢失 outcome；该实现陷阱已记入 `state/NOTES.md`。

# 2026-08-04 · GitHub #25 真实环境验收

## 目标

在维护者 Vercel + Supabase + BYOK Generation Connection 的真实链路上核验 #25 的可恢复分页、持久 checkpoint、暂停 / 恢复、调用账本与 Organization Plan 归并，并在证据满足后关闭 GitHub #25。

## 环境

- Web：`https://asterism-xcm1115s-projects.vercel.app`（Chrome 已登录维护者账号）
- Supabase project：`hqtrmulypxwdqvzlkhke`
- Migration：`20260730090000` 已由 `supabase migration list --linked` 确认 Local=Remote
- Edge Function：`manage-organization-tasks` 已由 `supabase functions list` 确认 `ACTIVE v12`、JWT verification 开启
- Generation：active DeepSeek OpenAI-compatible Connection，model `deepseek-v4-flash`，笔记发送关闭

## 真实旅程与结果

1. **多页 Plan 归并与 durable recovery**：稳定任务面读取一条 134 candidates 的真实多页任务，状态为 `plan_ready`；披露包含 Provider/model、固定仓库 / 页面数、初始与 retry call ceiling、token ceiling、费用未知、发送字段和截断边界。Plan revision 1 含 242 actions、1 conflict、0 uncertainties，并明确 canonical 尚未修改。刷新同一路由后仍恢复完全相同的候选 revision、披露和 Plan 摘要。
2. **失败与重试耗尽投影**：读取一条 `needs_attention` 任务，权威进度为 6 / 27 pages、11 / 54 calls、42,501 tokens，失败页显示 `provider_output_truncated`、安全错误说明和 Attempt 2 of 2；未暴露上游原始响应、credential 或 authorization 数据。
3. **暂停 / 在途调用 / 恢复**：打开一条既有 442 candidates / 9 pages、0 calls 的 generating 任务，客户端自动领取 page 1。调用在途时点击 Pause，状态稳定为 `generation_paused`，调用账本从 0 增至 1 且没有继续领取页面。刷新后仍显示 Resume 和相同 durable checkpoint。点击 Resume 后任务进入 generating 并领取下一 checkpoint（page 2），随后再次 Pause；调用账本增至 2，任务保持暂停，阻止后续调用。
4. **工作量与隐私边界**：该任务披露 9 initial + up to 9 retry calls、2,304,000 token upper bound；发送字段仅 owner/name、description、language、topics、当前用户 tags / collections，description 上限 1000 code points，notes 为 0，README / credentials / other-user data 明确排除。

## 自动化门禁

- `pnpm lint`：通过（335 files）
- `pnpm typecheck`：通过
- `pnpm test`：通过（77 files / 570 tests；实现提交已另用 `TURBO_FORCE=1` 非缓存复核）
- `pnpm build`：通过；仅保留契约允许的既有主 chunk warning

## 结论

#25 的真实主链路、恢复与安全投影满足关闭标准。验收未执行 canonical 写入；完整 Plan 文档审阅、风险批准和 bulk execution 属于 #26。验收触发的 442 candidates 任务最终保持暂停，避免继续扩大 BYOK 调用。C7/C11 等非阻断 robustness follow-up 继续保留在 `knowledge/state/BACKLOG.md`。

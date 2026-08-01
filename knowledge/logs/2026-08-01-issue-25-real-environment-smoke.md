# 2026-08-01 · GitHub #25 真实环境 smoke

## 目标

在维护者真实 Supabase 环境与已登录的本地 Web 应用中，验证 #25 的持久任务、Generation 批准、内部有界分页、暂停 / 恢复、刷新恢复、usage 账本与最终 Plan 归并。

## 场景

- 真实资料库：520 条 Star。
- 任务目标：按 coding agents、developer tooling、design 与 productivity 的用途整理，优先复用现有分类，不确定项保持 no-op。
- 候选快照：134 条，固定为 3 页（50 / 50 / 34）。
- Provider：OpenAI-compatible，model `deepseek-v4-flash`。
- 披露：3 initial + 3 retry calls，token ceiling 768,000；发送公开仓库元数据与当前 tags / collections，不发送 notes / README / credential。

## 已通过的真实链路

- 目标创建、全库候选发现、固定 snapshot 与 Generation disclosure 正常。
- Generation approval 与 start revision CAS 正常；任务进入 `generating`。
- 暂停后进入 `generation_paused`，恢复后 revision 前进并继续同一持久任务。
- 页面刷新后能够从 Postgres 恢复同一任务、run、pages、calls 与 tokens；未重复创建任务。
- Provider credential、网络调用与 usage 提取有效；3 次初始调用累计 27,266 tokens。
- 整个 #25 流程未修改 tags / collections 等 canonical 数据。

## 阻断发现

### 1. 客户端 checkpoint 契约遗漏

`20260730090000_organization_generation_runs.sql` 把 `organization_task_messages.checkpoint_type` 扩展为 `generation` / `plan`，但 `packages/core` 的 `OrganizationTaskMessage`、`packages/db` 的严格响应校验及手写 database types 仍只接受旧枚举。真实 start RPC 写入 `generation_started` 后，合法任务因此被客户端误判为无效，页面显示无法从 Postgres 读取。

已用 `packages/db/src/organization-tasks.test.ts` 的真实消息形状建立红灯测试并修复：core 类型、db trust boundary 与 database types 同步接受 `generation` / `plan`，定向测试 8 / 8 与 core / db typecheck 通过。重建共享包并刷新后，原任务从 `generating` revision 5 正常恢复。

### 2. 50 仓库页面撞到输出上限

三个初始页面均完成 Provider 调用并写入 usage，但 0 / 3 页面被接受。OpenAI-compatible Organization 请求当前固定 `max_tokens: 4096`；前两页总 usage 分别约 9.7k / 9.6k，第三页结算后总计 27,266，形态与输出达到 4,096 后截断一致。截断内容无法解析为完整、受信的页面 JSON，因此每页进入 failed，无法到达 Plan merge。

`50` 在产品合同中只是单次安全上限，不应被当成所有 Provider / 目标下都可靠的固定页面容量。需要设计并验证更小或可预算的页面容量，或在不破坏费用披露与确定性 manifest 的前提下调整输出预算；不得简单用剩余 retry calls 重放同一必然截断请求。

### 3. 失败可诊断性不足

权威 page run 已持久化 `error_code`，但任务面只显示通用 “A page failed”，没有渲染安全的 per-page error code / attempt count。真实 smoke 无法仅从 UI 区分 provider HTTP、timeout、invalid JSON、schema rejection 或授权漂移；这与 2026-07-30 code-review follow-up 的 C7 / C11 一致，现已从非阻断 robustness 项升级为 smoke 修复所需的诊断面。

## 最终状态

- 测试任务：`1b32d025-f397-4663-a972-68b219a4d396`。
- 状态：`generation_paused`。
- 进度：0 / 3 pages，3 / 6 calls，27,266 / 768,000 tokens。
- 未执行 retry calls，未生成 Organization Plan，未写 canonical。
- #25 smoke **未通过**；不得关闭 #25 或启动 #26。

## 验证

- 定向红灯：`pnpm --filter @asterism/db test -- organization-tasks.test.ts` 在修复前 1 failed / 7 passed，准确拒绝包含 `checkpointType: 'generation'` 的真实任务投影。
- 修复后定向测试 8 / 8 通过，`@asterism/core` 与 `@asterism/db` typecheck 通过。
- 全仓 `pnpm lint / typecheck / test / build` 全绿；77 个 test files / 571 tests 通过。build 仅保留既有 Web 主 chunk > 500 kB warning。

## 下一步

1. 用自动化测试锁死“页面输出预算不会在典型 50 仓库输入下必然截断”的失败形态，并确定 page capacity / output budget 策略。
2. 在稳定任务面显示安全的 page error code 与 attempt count。
3. 通过 lint / typecheck / test / build，部署需要的后端变更（若有）。
4. 新建真实任务重跑：多页成功、暂停 / 恢复、刷新恢复、至少一次失败重试、最终 `plan_ready` 与 Plan summary。

## 修复演进与最终结果

首次失败后，页面容量从合同安全上限 50 收敛为 5，使 134 个候选形成 27 个固定页面；Provider 输出新增跨适配器截断识别（OpenAI-compatible `finish_reason=length`、Anthropic `stop_reason=max_tokens`、Google `finishReason=MAX_TOKENS`），并持久化稳定错误码 `provider_output_truncated`。任务面现展示失败页、原因、attempt / max 与安全错误码，只有显式 retry 才会重领失败页，耗尽后不再提供无效按钮。

仅缩页仍不足：v2 稀疏对象协议在部分页面会因重复 JSON key 与 Provider 输出膨胀触顶。最终 `organization-generation-v3` 将 page wire format 改为紧凑 tuple：`relationChanges` 使用 `[repoId, relationType, action, targetId]`，`newClassifications` 使用 `[relationType, name, repoIds]`；解析器同时兼容旧对象格式，内部领域类型和 Plan 文档不变。每个 repository 最多 4 条关系变化、最多进入 1 个新 tag 与 1 个新 collection，不确定项保持 no-op。

最终任务 `29b4c964-6aba-429c-aa4b-27707b499a37` 在 v3 + 4,096 output tokens 的第 1 页仍截断，总 usage 4,867，证明 `deepseek-v4-flash` 将隐藏 reasoning 计入 completion budget。将有界页面预算提升至 8,192（仍远低于已批准的每调用 128,000 token ceiling）后，对该页执行唯一一次显式 retry：第 1 页成功，随后第 2–27 页全部首次成功，没有新的截断或 schema mismatch。

最终真实状态：

- 520 Stars，134 candidates，27 pages（每页 5，末页 4）。
- Provider：OpenAI-compatible / `deepseek-v4-flash`。
- 27 / 27 pages complete；28 / 54 calls（含修复前第 1 页失败调用与一次 retry）；最终页面观察到约 10 万 / 6,912,000 tokens。
- 状态 `plan_ready`；Plan revision 1，242 actions，1 conflict，0 uncertainties。
- 页面明确确认 Plan 只读待审，tags / collections 等 canonical 数据未修改。

#25 真实环境 smoke **通过**，后续可进入 #26 风险审阅与可靠执行。

# 2026-07-30 · GitHub #25 可恢复分页 Generation 与 Organization Plan

## 交付

- 已批准 Generation 工作量的 Organization Task 现在由**客户端驱动的有界 loop** 自动完成内部分页：任务处于 `generating` 时逐页调用受信 run-page 动作，每页最多 50 个唯一仓库，逐页产生可恢复的整体进度、当前 checkpoint 与真实调用 / token 用量，用户无需决定“下一批 50 条”。
- 新增迁移 `20260730090000_organization_generation_runs.sql`：`organization_generation_page_runs`（页状态机 pending / leased / succeeded / failed / cancelled + 租约 + attempt_count）、`organization_generation_calls`（调用账本，含 usage / truncation / request_hash，成功 / 失败 / lost）、`organization_plans`（immutable、revisioned 归并结果 + action groups / conflicts / uncertainties），并给 `organization_tasks.status` 扩展 `generating` / `generation_paused` / `needs_attention` / `plan_ready` 四个状态。
- 新增 8 个仅 service-role 的 RPC：`start` / `claim` / `complete` / `pause` / `resume` / `retry` / `flag-attention` / `save-plan`。claim 领取下一 pending / stale-leased 页并判定 complete / in_flight / exhausted / call_ceiling / token_ceiling；complete 恰好一次记录成功 / 失败，暂停或结束后到达的在途调用仍落账但不改变页面接受；save-plan 写出确定性归并 Plan。
- 受信 `manage-organization-tasks` 扩展 start / pause / resume / retry / run-page 五个驱动动作与 `plan_ready` 摘要；service 编排页面租约、Provider 调用与账本写回，index / handler 接线并输出安全 HTTP 响应投影。
- `packages/db` 新增 `startOrganizationGeneration` / `pauseOrganizationGeneration` / `resumeOrganizationGeneration` / `retryOrganizationGeneration` / `runOrganizationGenerationPage` 类型化 wrapper，`readOrganizationRunResponse` 严格校验运行响应（拒绝未知 outcome 或泄露键）。
- `apps/web` 任务面（GenerationPanel + GenerationProgressBar）展示 pages / calls / tokens 进度、当前 checkpoint、暂停 / 恢复 / 重试 / 结束入口与安全错误反馈；客户端驱动 loop 用 `runningRef` 防重入（含 StrictMode remount）、直接观测 outcome 并在任何非成功结果处停止；en / zh-CN 新增 generation / plan 命名空间与新状态 / 错误文案，键盘、live progress、reduced-motion 齐备。

## 边界

- 本切片只到确定性归并出 immutable、revisioned Organization Plan 与 `plan_ready` 摘要；完整 read-plan 文档 UI、分层风险审阅与可靠执行（复用 ADR 0023 批量账本）属于 #26。
- Generation 只处理已解释候选范围内的公开元数据、当前 canonical 与获准笔记截断值，不读取 README 或其他用户私有数据，不修改 canonical。
- 归并用 locale-independent 大小写折叠（`toLowerCase`）与码位比较，页面顺序、重试次数与 worker 恢复不改变最终 action identity（C15）。
- 本次实现会话未部署；随后维护者环境已应用迁移并部署函数，2026-08-04 完成真实环境 smoke。部署与验收结果见 `2026-08-04-issue-25-real-environment-acceptance.md`。旧 `ai_organization_drafts` 与 selection-first UI 的 cutover 仍属 #28。

## 验证

- TDD seam：core 归并 Plan（`organization-plan.ts` + `organization-plan.test.ts`）、受信 HTTP / service（`service.test.ts` 追加 run-page 编排）、db 安全投影（`organization-tasks.test.ts`）、稳定任务页面驱动 hooks。
- 全仓 `pnpm test` 通过 77 个文件 / 570 个测试（core 13 / 190、supabase-functions 15 / 118、db 8 / 74、web 41 / 188，`TURBO_FORCE=1` 非缓存复核）；`pnpm lint`、`pnpm typecheck`（9 包）、`pnpm build`（6 tasks）全部通过，build 仅保留既有大 chunk 提示。
- 修复过程中发现并修正客户端驱动 loop 的严重 bug：早期用 `active` 标志 + cleanup，`runPending` 翻转时 cleanup 清空 `active` 导致 `.then` 永不观测 outcome，in_flight / page_failed 保持 `generating` 会 busy-spin；改为 `useRef` 防重入 + 直接观测 outcome + `runPending` 翻转重新武装。
- `/code-review` Standards / Spec 双轴完成：修复 C15（locale-dependent 归并的确定性 bug，`toLocaleLowerCase` → `toLowerCase`）；C7/C11（failed 页误标 retry_exhausted 与 per-page attemptCount 未渲染）、C2（字段 gating 只覆盖 note）、C4（截断记录 limit）、C8（token ceiling 启发式）、C19（SQL 级测试缺口）、C20（a11y 无自动化测试）判为非阻断，记入 `state/BACKLOG.md` follow-up。

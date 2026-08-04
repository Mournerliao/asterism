# Issue #26 · Organization Plan 风险审阅与可靠执行

日期：2026-08-04

## 结果

- 新增纯函数 Plan Review 模型，把混合 Plan action groups 拆成已有分类新增、新建分类、移除关系三档 semantic groups。已有分类新增默认纳入；新建与移除默认关闭且必须显式批准。
- group fingerprint 由服务端绑定 goal、source group、risk、target、未排除 actions、关系前置条件与证据页。逐仓库排除、goal / target / action / risk / precondition 变化只使受影响批准失效；最新 prior Plan decision 仅在 key / risk / fingerprint 完全未变时保留。
- exact normalized equivalent 复用已有分类稳定 ID；去标点近似但不等价的名称保守停止并保持可审阅，不允许静默重定向。
- `manage-organization-tasks` 新增 read-review、action exclusion、group review 与 confirm-plan HTTP 动作。最终确认绑定准确 task / Plan revision、Plan fingerprint、排序批准 fingerprints 与四类准确计数；旧标签页不能覆盖新 revision。
- 新 migration 建立 action exclusions、group reviews、Task execution operation links 三张 owner-RLS 私有表，以及两个仅 service-role RPC。确认事务锁定任务，重新核验 ownership、Star authorization、Plan/action/target identity、关系前置条件、名称规范化、near-match、最新批准、排除与准确计数，再幂等创建已批准新分类、唯一 `source: organization_task` operation / items / link，并推进 task 到 executing。
- 确认事务不直接写 `repo_tags` / `collection_repos`；实际关系继续只由 ADR 0023 的既有 `bulk-organize` 有界 executor 执行。Task execution 投影从 operation/items 权威账本派生成功、可重试失败、终态失败、dismissed、pending、running 与总数；刷新或确认响应丢失可从唯一 task link 恢复，不创建重复 operation。
- Web 稳定任务页新增三档风险、分类 kind、规范化 / 等价 / near-match 信息、仓库证据 disclosure、逐仓库排除、no-op 区、准确最终计数与显式确认；执行中 / 完成后展示权威账本进度。每个 semantic group 由 target heading 命名，group / repository 控件具备目标感知的 accessible name，准确计数通过 polite live region 播报，uncertainty no-op 展示具体 repository / target / name 与证据页。en / zh-CN、键盘原生 details、aria pressed/busy/live/error 与 reduced-motion 齐备。

## 验证

- TDD 覆盖保守默认值、精确计数、显式新建 / 移除批准、排除导致 fingerprint 失效、只影响漂移组、跨 Plan revision 指纹保留、等价复用 / near-match 拒绝、stale group / final binding、确认丢响应后 operation 已进入 `needs_attention` 的重放、HTTP 严格输入、安全响应投影、三档 UI 授权绑定与目标感知 ARIA / live region / no-op 证据。
- 既有 bulk executor 测试继续覆盖部分成功、可重试 / 终态失败分离、只重试 retryable 项、未知失败安全降级和幂等关系写入。
- 仓库四道门禁通过：`pnpm lint`；`pnpm typecheck`（9 tasks）；`pnpm test`（core 195、db 75、Supabase Functions 124、web 190）；`pnpm build`。Web build 仅保留既有大 chunk warning。
- `/code-review` Standards / Spec 双轴完成；修复了 lost-response canonical 重建、旧 Plan revision 确认、create source 类型越权、错误码漂移、checkpoint 类型、locale-dependent 排序、fingerprint 漂移绑定、partial-failure replay、semantic group ARIA 与 no-op 证据等 findings。
- 本地 Supabase 容器 smoke 未执行：Docker / OrbStack daemon 未运行；CLI 明确返回 daemon unavailable。Edge Function TypeScript typecheck 与非容器 Vitest 可独立执行。
- 因此 migration 内的普通 authenticated role 防伪、RLS / service-role RPC、事务生成 ledger 到既有 executor 的完整黑盒安全矩阵仍须按清单在可用 Supabase 环境执行；该项不能由 mock 单元测试替代。已补充 migration / function 部署与真实环境 smoke 清单；本实现会话未修改远端 Supabase schema、未部署 Edge Function 或 Web。

## 范围边界

- 未实现 #27 Task Undo，也未实现 #28 legacy draft migration / selection-first cutover。
- 旧 `ai_organization_drafts` 路径保持不变；#26 只扩展 intent-first Organization Task。

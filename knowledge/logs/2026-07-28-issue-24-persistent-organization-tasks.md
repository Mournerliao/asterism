# 2026-07-28 · GitHub #24 持久 Organization Tasks

## 交付

- 新增目标优先 Organization Task 领域模型：生命周期、CAS、完整库确定性候选快照、排除 revision 与 Generation manifest。
- 新增 Opportunity / Task / message / event / snapshot / item / manifest / page / approval 共 9 张私有表和 owner-read RLS；checkpoint 与批准 RPC 仅 service role 可执行。
- 新增 `manage-organization-tasks` 受信 HTTP 生命周期，覆盖创建、列表 / 读取、目标澄清、发现、排除、批准、结束及 Opportunity 接受 / 忽略。
- `sync-stars` 在达到语境阈值时创建首次或增量 Opportunity，不读取 credential、不调用 Provider，也不修改 canonical。
- `packages/db` 增加严格安全投影守卫和类型化调用；Web 增加可直接到达的任务历史与稳定详情路由、候选依据、完整披露、授权复核错误与双语恢复路径。

## 边界

- 本切片只到持久 Generation 批准；不会发生 Provider 调用。内部可恢复分页、call ledger、跨页 merge 与 Organization Plan 属于 #25。
- 原有 `ai_organization_drafts` 和 selection-first UI 暂不切换或双写，迁移 / cutover 属于 #28。
- Canonical tags / collections 没有新增写入通道。

## 验证

- TDD seam：core 领域、受信 HTTP/service、db 安全投影、稳定任务页面。
- 全仓 `pnpm test` 通过 76 个文件 / 537 个测试；`pnpm typecheck`、`pnpm lint`、`pnpm build` 全部通过，build 仅保留既有的大 chunk 提示。
- 真实浏览器复核通过桌面与 390px 移动布局、en / zh-CN 切换和语义结构，控制台无 warning / error。
- Supabase dry-run 分别确认仅有 `20260728180000` 与审查修复 `20260728183000` 待部署；远端 migration 已与本地一致，`manage-organization-tasks` 为 `ACTIVE v4`，`sync-stars` 为 `ACTIVE v6`。
- Standards / Spec 双轴审查最终均为 PASS；发现并修复了低 `max_rows` 下的完整分页、精确上下文、derived signal、披露输入指纹、token 真上限、CAS / 查询恢复、Opportunity i18n、写入反馈和完整旅程自动化缺口。

# 2026-07-28 · 自然 AI 整理规格

## 目标

把 ADR 0029 与 B「规划对话」原型 verdict 收敛为可实施的 Phase 2.1 Organization Task 规格，并发布到项目 issue tracker；本次不拆实现 tickets、不进入实现。

## 结果

- 用户确认测试 seam：以受信 Organization Task HTTP 生命周期接口为主 seam，把既有 bulk organization 接口与可靠账本作为执行黑盒，UI 只验证用户可见旅程。
- 已发布 GitHub #23 `spec(ai): add persistent intent-first Organization Tasks`，标签为 `ready-for-agent`。
- 规格明确了聊天与稳定任务面的权威边界、持久生命周期与暂停 / 结束语义、候选快照、Generation manifest / 页级检查点、工作量与费用披露、跨页归并、风险分层审批、执行与旧草稿迁移。
- Task Undo 只反转原任务实际产生且之后未被有效改动的关系；该安全前提形成 ADR 0030。
- 未创建实现 tickets，未修改生产代码，未运行代码门禁。

## 下一步

在独立会话中对 GitHub #23 使用 `/to-tickets`，拆出 tracer-bullet tickets 与 blocking edges；实现仍须经过单独批准。

# 0012 · 从产品范围移除业务 Realtime

- Status: Accepted
- Date: 2026-07-18
- Supersedes: ADR 0001 中“使用 Supabase Realtime 实现多端近实时同步”的部分

Asterism 继续使用 Supabase Auth、Postgres、RLS 与 Edge Functions，但不实现 Postgres 变更订阅或多个客户端会话的主动推送收敛。当前产品对近实时跨会话一致性没有足够需求，业务 Realtime 会额外引入订阅范围、查询失效、断线恢复、重复事件与自托管组件运维成本；客户端以 Postgres 为 source-of-truth，在进入页面、查询刷新、完成本地操作或重新连接后读取最新状态。未来若出现明确用户场景，Realtime 将作为新功能重新设计和验收，而不是当前阶段的隐藏待办。

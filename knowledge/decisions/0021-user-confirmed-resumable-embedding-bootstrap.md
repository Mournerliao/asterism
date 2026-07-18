# 0021 · 首次 Embedding 建库须确认且可恢复

- Status: Superseded by ADR 0022
- Date: 2026-07-18

保存或测试 Embedding Connection 不得自动处理用户的全部 Star。系统必须先展示待处理数量、所选 Connection / model 与费用由用户 Provider 承担的提示，经用户明确确认后才启动持久化、可恢复的分批任务；首次确认同时授权该索引后续只对新 Star、仓库语义元数据或当前用户笔记变化做自动增量维护。任务记录成功、失败和待处理数量，允许用户离开页面、在中断后继续或随时暂停；停用或删除 Connection 后立即停止调用。这个边界避免配置动作意外消耗 BYOK 额度和索引长期过期，也避免把全库处理错误地塞进一次受 Edge Function 时限约束的长请求。

# 0022 · 移除 Embedding 与语义搜索

- Status: Superseded by ADR 0026（2026-07-23）
- Date: 2026-07-18
- Supersedes: ADR 0001 中的 pgvector 产品用途、ADR 0016、ADR 0021，以及 ADR 0018 中的 Embedding 部分

> **已被 ADR 0026 取代（2026-07-23）**：0026 满足了本 ADR 末尾设定的重启门槛——「无需理解底层模型的一键、多语言方案」，以纯浏览器内 `multilingual-e5-small`（非 BYOK、同源自托管、向量按用户存）重新立项语义检索。下文保留为历史背景。

当前路线图不实现 Embedding、pgvector 语义搜索、向量索引任务或 Embedding Provider 设置，Browse 继续使用已有关键词搜索。虽然 Supabase Edge Functions 提供内置 `gte-small`，但它当前只适合英文且会把模型限制、索引生命周期与资源语义带入用户体验；自定义 Embedding Provider 又会把基础设施选择暴露给自部署用户。Phase 2 因而只保留 Generation BYOK，用于生成须经用户确认的标签 / 集合整理建议，并与批量整理结合。未来只有在出现明确用户价值且能提供无需理解底层模型的一键、多语言方案时，才重新立项语义搜索。

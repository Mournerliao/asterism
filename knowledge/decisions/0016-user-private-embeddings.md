# 0016 · Embedding 按用户隔离

- Status: Superseded by ADR 0022
- Date: 2026-07-18

Phase 2 的 `repo_embeddings` 是由当前用户 BYOK 生成并仅归该用户使用的派生数据，而不是由所有用户共享的全局仓库资产。每条记录以 `user_id`、`repo_id`、provider connection、model、dimensions 与 `content_hash` 标识，并受 `auth.uid()` RLS 隔离；固定输入包含仓库 owner/name、描述、语言与 GitHub topics，当前用户笔记只有在用户明确启用后才发送给 Embedding / Generation Provider。首次调用前必须展示实际发送字段与目标 Provider；关闭笔记发送后两类 Adapter 都不得收到笔记正文，切换该设置会使相关向量失效并要求重建。标签、集合、star 数、时间字段、README 与其他用户私有数据不写入向量。README 继续遵循 ADR 0011 的动态读取边界，完整索引不属于 Phase 2。这样生成成本不会由一个用户替其他用户承担，不同 Connection/model/输出维度可以独立演进。切换 Embedding Connection、model、dimensions 或笔记数据范围，或仓库语义内容/获准使用的当前用户笔记变化后，必须重建受影响向量。代价是同一仓库可能被多个用户重复向量化和存储，这是 BYOK 成本归属与隐私清晰性的有意取舍。

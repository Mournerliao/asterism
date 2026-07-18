# 0018 · 类型化 Generation Provider Registry

- Status: Accepted
- Date: 2026-07-18

> ADR 0022 已移除 Embedding 与语义搜索；本 ADR 当前只适用于 Generation Provider。

Phase 2 在受信 Edge Functions 内建立类型化 Generation Provider Registry，以原生 Adapter 处理各 Provider 不同的 credential schema 和 API；首批内置 OpenAI、Google Gemini、Anthropic 与 OpenRouter。只有通过 Generation capability 测试的 Connection / model 才能用于整理建议。单一 OpenAI-compatible 协议无法可靠表达 Azure、Vertex、Bedrock 等复合凭据，因此不是所有原生 Provider 的共同数据模型。

同时提供受控的自定义 OpenAI-compatible Adapter：用户可建立具名 Connection，填写 HTTPS endpoint、credential 与模型 ID，DeepSeek 等兼容服务无需逐一内置。模型发现优先调用 `/models`，失败时允许手填 ID；Generation 测试必须验证返回可解析、非空且满足整理建议 schema。所有自定义 endpoint 在保存、测试和调用时执行 SSRF 防护。

每个 Connection 只维护一个 credential；允许多个具名自定义 Connection，但不组成 credential 池。Phase 2 不实现多 key 排序、跨 Provider 自动 fallback、预算、限流或 ZDR 路由，也不得回退到 Asterism 付费的系统额度。这保留了主流 BYOK 的 Connection / capability 边界与扩展能力，同时避免把个人 Star 管理器过早建设成完整 AI Gateway。

调研依据：Vercel AI Gateway 与 OpenRouter 的 BYOK 都按 Provider 定义 credential，并把多 key、排序、fallback 与数据策略作为额外 Gateway 能力；Vercel AI SDK 的 Provider Registry 为不同 Provider 保留类型化 Adapter；Open WebUI 支持 OpenAI-compatible Connection、模型发现和手填模型 allowlist。Asterism 只采用完成 Generation 整理建议所需的最小子集。

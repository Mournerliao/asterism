# 0001 · 采用 Supabase 作为后端（BaaS）

- Status: Accepted
- Date: 2026-06-29

> 2026-07-18 后续裁决：ADR 0012 废止业务 Realtime；ADR 0014 将 Phase 1 部署边界收敛为 Supabase Cloud + 静态托管，不承诺项目维护 Docker Compose；ADR 0015 将 AI 调整到 Phase 2、扩展调整到 Phase 3；ADR 0022 移除 Embedding 与 pgvector 语义搜索。下文保留 2026-06-29 的历史背景，冲突处以后续 ADR 与当前契约为准；Supabase Auth、Postgres、Edge Functions 与 RLS 的核心选型仍有效。

## Context（背景）

Asterism 是一个开源、可自部署的多端 GitHub Star 管理器（Web → 浏览器扩展 → 桌面），需要：

- 身份认证：以 GitHub OAuth 登录（用户用自己的 GitHub 账号读取 star 列表）。
- 持久化：存储 stars、标签、集合、笔记等结构化数据，并支持按用户隔离（RLS）。
- 多端同步：Web / 扩展 / 桌面之间近实时同步用户数据。
- 语义搜索 / AI（Phase 3）：对仓库做向量化与相似检索，需要向量存储。
- 服务端逻辑：批量同步 stars、调用 GitHub GraphQL、AI 嵌入等需要安全的服务端执行环境（不暴露 token）。

约束与价值取向：项目是 OSS，要求能自部署（既提供公共体验实例，也允许使用者用 Docker 自托管），尽量减少自维护后端的运维负担，并保证贡献者本地可复现。

## Decision（决策）

采用 **Supabase** 作为统一后端（BaaS），覆盖以下能力：

- **Auth**：内置 GitHub OAuth provider，开箱即用，免去自建 OAuth 回调与会话管理。
- **Postgres**：作为主数据库，承载 `repos / user_stars / tags / collections / notes` 等数据模型。
- **pgvector**：在同一 Postgres 内启用向量扩展，支撑 Phase 3 的语义搜索与 AI 自动分类，无需额外引入独立向量库。
- **Edge Functions**：承载 `sync-stars`、`ai-embed` 等服务端逻辑，安全持有/转发凭据。
- **Realtime**：基于 Postgres 变更订阅实现多端近实时同步。
- **RLS（Row Level Security）**：除全局可读的 `repos` 外，所有用户数据按 `user_id` 行级隔离。

共享包 `packages/db` 封装 Supabase 客户端与查询，客户端不直接散落 SQL。

## Consequences（影响）

正面：

- 一套服务覆盖 Auth + DB + 向量 + 函数 + 实时，显著降低初期集成与运维成本。
- 开源且可自托管，符合项目 OSS 与"可自部署"定位；公共实例与自托管共用同一套 schema/RLS。
- `pgvector` 与业务数据同库，语义检索可直接 JOIN 业务表，简化 AI 能力落地。
- GitHub OAuth 内置，缩短"能登录读 star"的最短路径。

负面 / 需注意：

- **免费实例会休眠**：长时间无活动后冷启动有延迟，公共体验实例需说明或用保活/升级方案缓解。
- **自托管偏重**：完整自托管 Supabase（Postgres + GoTrue + Realtime + Storage + Edge Runtime 等）相比纯前端方案运维更重，需在 `runbooks/self-host.md` 提供 `docker-compose` 指南。
- **一定程度的平台耦合**：Auth/Realtime/Edge Functions API 会带来 vendor 接口耦合；通过 `packages/db` 收敛、并保持标准 Postgres + SQL 迁移，降低未来迁移成本。
- 服务端密钥（如 service role key、用户 BYOK key）必须仅存在于 Edge Functions / 加密存储，严禁进入客户端或仓库。

## Alternatives considered（备选方案）

1. **纯客户端 local-first（同步走 GitHub Gist）**
   - 优点：零后端、极易自部署、隐私好。
   - 缺点：多端同步、并发合并、服务端 AI 嵌入、RLS 式共享都需自造；Gist 作为同步层容量/并发/冲突处理脆弱。与近实时多端同步和 Phase 3 AI 目标不匹配。

2. **Cloudflare 全家桶（D1 + Workers + Vectorize + Workers AI）**
   - 优点：边缘性能好、冷启动友好、Workers AI 一体。
   - 缺点：D1（SQLite）与 pgvector 的成熟度/生态不同；自托管完整等价栈困难，OSS"可自部署"诉求弱；GitHub OAuth 需自行搭建会话层。

3. **自建后端（Node/Go + 自管 Postgres + 自实现 Auth/Realtime）**
   - 优点：完全掌控、无平台耦合。
   - 缺点：初期工程量与长期运维成本最高，与"减少自维护后端"目标相悖；Auth、Realtime、RLS、迁移等都要重造轮子，拖慢 MVP。

**为何选 Supabase**：开源且可自托管（满足 OSS 定位）、`pgvector` 原生支持语义搜索、GitHub OAuth 内置，且一套服务覆盖认证/数据/向量/函数/实时，是当前需求下集成成本与可自部署性的最佳平衡点。

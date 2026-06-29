# Data Model Contract · 数据模型契约

> 本文件定义 Asterism 的 Postgres 数据模型与行级安全（RLS）约束。它是数据层的 verification 依据：迁移与查询都应满足这里规定的结构与隔离规则。schema 以**清晰的字段清单**呈现，便于在 Supabase 迁移中落地。

## 设计原则

- **`repos` 为全局共享、公共可读**：同一个 GitHub 仓库的元数据全局只存一份，所有用户共享读取，避免重复。
- **用户私有数据按 `user_id` 隔离**：star 关系、标签、集合、笔记、设置等都归属具体用户，彼此不可见。
- **关系尽量规范化**：多对多关系（仓库↔标签、仓库↔集合）用独立连接表表达。
- **AI 相关表延后到 Phase 3**：`repo_embeddings`、`user_settings` 属进阶阶段。

约定：所有表含 `id`（主键，uuid 或 bigint，下文不再逐一重复）、`created_at`、`updated_at`（时间戳）。`user_id` 引用 Supabase `auth.users(id)`。

---

## Core Tables · 核心表（MVP）

### `repos` — 仓库全局元数据（公共可读）

每个 GitHub 仓库一行，全局共享。

- `github_id` — GitHub 仓库数字 ID（唯一，幂等同步键）
- `full_name` — `owner/name` 全名
- `name` — 仓库名
- `owner` — 拥有者 / 组织名
- `description` — 仓库描述
- `language` — 主要编程语言
- `topics` — topic 列表（text[]）
- `stargazers` — star 数
- `forks` — fork 数（可选）
- `homepage` — 主页 URL（可选）
- `pushed_at` — 最近一次 push 时间
- `repo_created_at` — 仓库在 GitHub 上的创建时间（可选）
- `archived` — 是否已归档（boolean）
- `is_fork` — 是否为 fork（boolean，可选）
- `synced_at` — 本系统最近一次同步该仓库元数据的时间

关系：被 `user_stars`、`repo_tags`、`collection_repos`、`notes`、`repo_embeddings` 引用。

### `user_stars` — 用户的 star 关系

表达"某用户 star 了某仓库"。

- `user_id` → `auth.users(id)`
- `repo_id` → `repos(id)`
- `starred_at` — 用户在 GitHub 上 star 该仓库的时间

约束：`(user_id, repo_id)` 唯一。

### `tags` — 用户自定义标签

- `user_id` → `auth.users(id)`
- `name` — 标签名
- `color` — 标签颜色（可选）

约束：`(user_id, name)` 唯一（同一用户内标签名不重复）。

### `repo_tags` — 仓库↔标签连接表（多对多）

- `user_id` → `auth.users(id)`（冗余，便于 RLS 过滤）
- `repo_id` → `repos(id)`
- `tag_id` → `tags(id)`

约束：`(user_id, repo_id, tag_id)` 唯一。

### `collections` — 用户集合

- `user_id` → `auth.users(id)`
- `name` — 集合名
- `description` — 集合描述（可选）

约束：`(user_id, name)` 唯一。

### `collection_repos` — 集合↔仓库连接表（多对多）

- `user_id` → `auth.users(id)`（冗余，便于 RLS 过滤）
- `collection_id` → `collections(id)`
- `repo_id` → `repos(id)`
- `position` — 集合内排序位（可选）

约束：`(collection_id, repo_id)` 唯一。

### `notes` — 仓库笔记

- `user_id` → `auth.users(id)`
- `repo_id` → `repos(id)`
- `body` — 笔记正文（markdown 文本）

约束：MVP 下 `(user_id, repo_id)` 唯一（每仓库一条笔记）；如未来需多条可放开。

---

## Phase 3 Tables · 进阶表（AI / 设置）

### `repo_embeddings` — 仓库向量嵌入（pgvector）

支撑语义搜索与相似推荐，依赖 `pgvector` 扩展。

- `repo_id` → `repos(id)`
- `embedding` — 向量（`vector(N)`，维度由所选嵌入模型决定）
- `model` — 生成该向量的模型标识
- `content_hash` — 被嵌入文本的哈希（用于增量重算）

索引：对 `embedding` 建向量索引（ivfflat / hnsw）以支持近邻检索。归属：嵌入由全局 `repos` 派生，可全局可读（与 `repos` 同策略）；若涉及用户私有文本嵌入则需按 `user_id` 隔离，届时再细化。

### `user_settings` — 用户设置（含加密 BYOK key）

- `user_id` → `auth.users(id)`（唯一，一对一）
- `ai_provider` — AI 供应商标识（如 openai / 兼容）
- `ai_api_key_encrypted` — **加密存储**的 BYOK API key（绝不明文落库）
- `ai_base_url` — 自定义兼容端点（可选）
- `locale` — 语言偏好（en / zh-CN）
- `theme` — 主题偏好（system / light / dark）
- `preferences` — 其他偏好（jsonb，可选）

约束：`user_id` 唯一。安全：API key 必须加密，密钥管理见 `conventions.md` 安全章节。

---

## Row Level Security · 行级安全（RLS）

所有表启用 RLS。策略遵循"`repos` 全局可读，其余按 `user_id` 隔离"。

- **`repos`**
  - SELECT：全局可读（所有已认证用户均可读）。
  - INSERT / UPDATE：仅由受信路径写入（同步逻辑 / Edge Functions / service role），普通用户不可直接写。

- **`repo_embeddings`**
  - SELECT：与 `repos` 同策略（全局可读，作为公共派生数据）。
  - 写入：仅受信路径（Edge Functions / service role）。

- **`user_stars` / `tags` / `repo_tags` / `collections` / `collection_repos` / `notes` / `user_settings`**
  - SELECT / INSERT / UPDATE / DELETE：均要求 `user_id = auth.uid()`。
  - 用户只能读写自己的行，无法看到或修改他人数据。

> 通用规则：除 `repos`（及其派生的 `repo_embeddings`）全局可读外，**一切都以 `auth.uid()` 与行内 `user_id` 匹配**作为读写前提。连接表冗余存 `user_id` 即为简化此类 RLS 过滤。

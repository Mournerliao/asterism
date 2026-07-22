# Data Model Contract · 数据模型契约

> 本文件定义 Asterism 的 Postgres 数据模型与行级安全（RLS）约束。它是数据层的 verification 依据：迁移与查询都应满足这里规定的结构与隔离规则。schema 以**清晰的字段清单**呈现，便于在 Supabase 迁移中落地。

实现层以 `supabase/migrations/*.sql` 为 schema 与 RLS 的唯一来源；Dashboard 中的任何紧急手工修复都必须立即补等价 migration，禁止环境长期漂移。

## 设计原则

- **`repos` 为全局共享、公共可读**：同一个 GitHub 仓库的元数据全局只存一份，所有用户共享读取，避免重复。
- **用户私有数据按 `user_id` 隔离**：star 关系、标签、集合、笔记、设置等都归属具体用户，彼此不可见。
- **关系尽量规范化**：多对多关系（仓库↔标签、仓库↔集合）用独立连接表表达。
- **Phase 2 表按能力解耦落地**：不依赖 AI 的 `bulk_operations` / `bulk_operation_items` 先提供可靠批量写入；`ai_provider_connections`、`ai_organization_drafts` 与 `user_settings` 再承载可选的 AI（BYOK）能力。当前路线不建立 Embedding 或向量表。

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

关系：被 `user_stars`、`repo_tags`、`collection_repos` 与 `notes` 引用。

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

## Phase 2 Tables · 进阶表（批量整理 / AI / 设置）

### `bulk_operations` — 持久化批量操作

- `user_id` → `auth.users(id)`
- `source` — `manual` / `ai_draft`，仅说明操作来源，不改变执行语义
- `source_repo_ids` — 用户确认时固化的选择范围快照
- `status` — `pending` / `running` / `needs_attention` / `completed`
- `completed_at` — 全部成功或用户明确结束剩余终止失败的时间（可选）

约束：用户确认写入后才创建；`source_repo_ids` 不随筛选变化或后续同步改变。操作状态由其逐关系项目汇总：仍有待执行项为 `pending` / `running`，存在失败项为 `needs_attention`，全部成功或终止失败已由用户明确结束后为 `completed`。AI 草稿确认后复用同一模型，不建立另一套 AI 写入通道。

### `bulk_operation_items` — 批量关系变更

- `user_id` → `auth.users(id)`
- `operation_id` → `bulk_operations(id)`
- `repo_id` → `repos(id)`
- `relation_type` — `tag` / `collection`
- `target_id` — 对应用户标签或集合的 ID
- `action` — `add` / `remove`
- `status` — `pending` / `running` / `succeeded` / `retryable_failed` / `terminal_failed` / `dismissed`
- `attempt_count` — 已执行次数
- `last_error_code` — 稳定、非敏感的错误码（可选）
- `last_error_message` — 可展示且不含 credential / token / SQL 细节的错误摘要（可选）

约束：一条“仓库 × 关系类型 × 目标 × 动作”是最小执行、结果与重试单位，并在同一操作内唯一。添加已有关系或移除不存在的关系必须视为 `succeeded`。只允许 `retryable_failed` 原样重试；`terminal_failed` 只能由用户明确结束为 `dismissed`，或修正条件后创建新操作。操作与项目的 `user_id` 必须一致，目标标签 / 集合及仓库成员关系必须属于同一用户可见范围。

### `ai_provider_connections` — 用户的 AI Provider Connection

- `user_id` → `auth.users(id)`
- `adapter` — Provider Registry 中的稳定 Adapter 标识：内置 Provider 或 `openai-compatible`
- `name` — 用户可识别的 Connection 名称
- `base_url` — 自定义兼容 endpoint；内置 Adapter 为空并使用项目固定地址
- `credential_ciphertext` — 对该 Provider 类型化 credential payload 做 authenticated encryption 后的密文
- `credential_nonce` — 当前密文对应的唯一 nonce
- `credential_version` — master key / 加密格式版本，用于轮换
- `credential_hint` — 不敏感提示（可选），不得足以恢复 credential
- `status` — `untested` / `valid` / `invalid` / `disabled`
- `generation_capability` — 最近一次 Generation 测试结果与时间（jsonb，可选，不含敏感响应）

约束：每个 Connection 只持有一个 credential；内置 Adapter 每用户最多一个 Connection，自定义 `openai-compatible` 可建立多个具名 Connection，但不组成 credential 池或 fallback 顺序。不同 Adapter 的 credential schema 由服务端验证，不用统一的 `apiKey + baseUrl` 字段表达；普通客户端无该表的直接 SELECT/INSERT/UPDATE/DELETE 权限，所有生命周期操作经验证 JWT 的受信 Edge Function 完成，客户端只读取不含 ciphertext/nonce 的安全投影。自定义 endpoint 必须满足 `conventions.md` 的网络边界。

### `user_settings` — 用户设置

- `user_id` → `auth.users(id)`（唯一，一对一）
- `generation_connection_id` → `ai_provider_connections(id)` — 当前 Generation Connection（可选）
- `generation_model` — 当前 generation model（可选）
- `include_notes_in_ai` — 是否允许把当前用户笔记发送给所选 Generation Provider；首次 AI 分类前必须由用户明确选择
- `locale` — 语言偏好（en / zh-CN）
- `theme` — 主题偏好（system / light / dark）
- `preferences` — 其他偏好（jsonb，可选）

约束：`user_id` 唯一。`generation_connection_id` 与 `generation_model` 必须同时为空或同时非空；非空时 Connection 必须属于当前用户、状态为 `valid`，model 必须精确等于该 Connection 最近一次成功 Generation capability 测试的 model。普通客户端只可读取本人的设置，写入集中在受信 Edge Function，并由数据库 trigger 纵深校验；连接失效、禁用或成功测试的 model 改变时，数据库自动清除不再成立的 active pair。关闭 `include_notes_in_ai` 后，任何 AI Adapter 都不得收到笔记正文。credential 安全与轮换见 `conventions.md` 安全章节、ADR 0017；Provider Registry 见 ADR 0018、0022。

### `ai_organization_drafts` — AI 整理建议草稿

- `user_id` → `auth.users(id)`，唯一；每个用户最多一个活动草稿
- `suggestions` — 待确认的添加 / 移除关系与建议新建分类（jsonb，不含 credential）；现有分类目标保存 `relationType` + 稳定分类 ID，建议新建分类保存 `relationType` + 经服务端规范化的名称，不使用名称指代现有分类
- `source_repo_ids` — 本次用户明确选择的仓库 ID 集合
- `suggestion_version` — 已验证建议 schema 的版本；当前为 `1`
- `generation_connection_id` → `ai_provider_connections(id)`
- `generation_adapter` — 生成时的 Adapter 稳定标识，作为 Connection provenance 的一部分
- `generation_model` — 生成草稿的模型标识
- `review_state` — 当前切片固定为 `review`（只读待审阅）
- `revision` — 每次成功替换递增；失败生成不改变
- `created_at` / `updated_at` — 当前草稿生成与最近替换时间

约束：草稿按 `user_id` 隔离且每个用户最多一个活动草稿；刷新或离开页面后可继续审阅。草稿中的现有分类 ID 必须属于当前用户，未知 ID 不得持久化；新分类名称必须先完成大小写、空白与近似名称检查。开始新生成前提示用户将替换旧草稿，新生成成功后原子替换，生成失败保留旧草稿；主动丢弃直接删除。确认必须在一个受信数据库事务中重新校验最终勾选，幂等创建已确认的新标签 / 集合，创建 `source: "ai_draft"` 的 `bulk_operations` 与全部 `bulk_operation_items`，并仅在这些记录成功落库后删除草稿；实际关系写入不属于该事务。草稿不得包含 API credential、其他用户数据或 README。

---

## Row Level Security · 行级安全（RLS）

所有表启用 RLS。策略遵循"`repos` 全局可读，其余按 `user_id` 隔离"。

- **`repos`**
  - SELECT：全局可读（所有已认证用户均可读）。
  - INSERT / UPDATE：仅由受信路径写入（同步逻辑 / Edge Functions / service role），普通用户不可直接写。

- **`user_stars` / `tags` / `repo_tags` / `collections` / `collection_repos` / `notes`**
  - SELECT / INSERT / UPDATE / DELETE：均要求 `user_id = auth.uid()`。
  - 用户只能读写自己的行，无法看到或修改他人数据。

- **`ai_organization_drafts`**
  - 普通客户端角色无直接表权限；RLS 仍以 `user_id = auth.uid()` 的 owner SELECT 作为纵深防御。
  - 生成 / 原子替换、读取与丢弃只经验证用户 JWT 的受信 Edge Function；客户端只能通过 `packages/db` 使用严格响应守卫后的安全投影。

- **`user_settings`**
  - SELECT：要求 `user_id = auth.uid()`。
  - INSERT / UPDATE / DELETE：普通客户端无直接表权限；设置写入只经验证用户 JWT 的受信 Edge Function，active connection/model 另由数据库 trigger 强制保持一致。

- **`bulk_operations` / `bulk_operation_items`**
  - SELECT：要求 `user_id = auth.uid()`，客户端可读取本人的操作进度与结果。
  - INSERT / UPDATE / DELETE：普通客户端无直接表权限；创建、执行、重试与明确结束只经验证用户 JWT 的受信批量写入路径完成，避免客户端伪造执行结果或绕过状态机。
  - 受信路径必须同时校验操作、项目、仓库成员关系以及目标标签 / 集合都属于当前用户。

- **`ai_provider_connections`**
  - 普通客户端角色无直接表权限；RLS 仍启用为纵深防御。
  - 验证用户 JWT 的设置 Edge Function 通过受信服务端角色执行保存、测试、启用/停用、替换与删除。
  - 客户端设置页只通过受信接口读取 provider、name、base URL、状态、capability 与非敏感提示，不返回 ciphertext、nonce 或完整 credential。

> 通用规则：只有 `repos` 全局可读；用户私有数据都以 `auth.uid()` 与行内 `user_id` 匹配作为访问前提。连接表冗余存 `user_id` 即为简化此类 RLS 过滤。

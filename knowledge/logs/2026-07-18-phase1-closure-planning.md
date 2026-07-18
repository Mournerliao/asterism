# 2026-07-18 · Phase 1 收尾规划与路线审计

## 目标

复核当前项目真实能力，完成 Phase 1 收尾裁决，并在调整 Phase 2/3 路线后审计 AI（BYOK）规划是否与现有架构、migration 和 README 动态读取边界冲突。

## Phase 1 已定范围

- 当前 Supabase、GitHub OAuth/会话、首次与增量 Stars 同步、标签/集合/笔记、RLS，以及 `read-repo-readme` 的授权、公开 fallback、无 README、非成员、限流与 ETag 304 路径均已在真实环境验收。
- 业务 Realtime 与 Dexie/离线浏览移出当前范围；Postgres 是唯一持久化 source-of-truth，TanStack Query 只做会话内缓存。
- Browse Search 只在 Browse 路由出现；写失败必须保留输入/目标、明确报错并允许重试，不引入通用 optimistic rollback。
- Phase 1 测试采用 Vitest 单元/集成 + 真实环境 smoke test，不新增 E2E 工具或覆盖率门槛。
- Phase 1 只承诺 Supabase Cloud + 静态托管的可自部署路径，不维护完整 Supabase Docker 栈。
- Vite chunk warning、正式 Changesets 发布流、自定义品牌域名均不阻断 Phase 1；当前不采集匿名产品遥测。
- `supabase/migrations/*.sql` 是 schema/RLS 唯一来源；MIT 署名统一为 `Mournerliao`。
- Biome 2.5.1 原生支持 Tailwind v4 指令，CSS 纳入 Biome，必要 `!important` 精确抑制，不引入 Stylelint（ADR 0019）。

## 路线与 AI 决策

- Phase 2 调整为 AI（BYOK）+ 批量整理；Phase 3 为浏览器扩展；Phase 4 桌面不变。
- 批量整理只修改 Asterism 私有 tags/collections/export，不执行 GitHub star/unstar，也不申请 `public_repo`。
- Embedding 按用户与 Connection/model/dimensions/content hash 隔离，只服务 Phase 2 自然语言语义搜索；相似推荐和自动聚类延期。
- 已确定的 Embedding 输入是 owner/name、描述、语言、GitHub topics 与当前用户笔记；标签、集合、star 数、时间字段不进入向量。
- README 继续按 ADR 0011 动态读取、仅有 5 分钟会话缓存；没有完整索引流水线前不进入语义搜索，也不因用户偶然打开 README 建立残缺索引。
- Phase 2 的 AI 自动分类只生成整理建议草稿；用户可逐项取消，明确确认后才通过批量整理写入标签 / 集合，不允许模型无人值守地直接修改用户组织数据（ADR 0020）。
- Phase 2 不做 Saved View 或 Query History；批量整理只使用当前手动选择或当前筛选结果。
- README 完整索引移出 Phase 2；语义搜索只使用已持久化仓库元数据与当前用户笔记，README 继续动态读取。
- 首次 Embedding 建库必须展示范围、Connection / model 与 BYOK 成本归属，经用户确认后启动持久化、可恢复的分批任务；保存或测试 Connection 不自动批量调用模型（ADR 0021）。
- 首次授权后，索引自动增量维护新 Star、仓库语义元数据与当前用户笔记变化；用户可暂停，停用或删除 Embedding Connection 后停止调用。
- Browse Search 保留默认、即时的 Keyword 模式，Semantic 由用户显式切换并提交后才调用 BYOK；两种模式都能叠加现有结构化筛选，Phase 2 不做自动意图判断或复杂 hybrid ranking。
- Semantic 只查询 ready 且匹配当前索引配置的向量，并显示已索引 / 总数覆盖率；未完成、暂停或部分失败提供恢复入口，调用失败不静默降级为 Keyword。
- AI 整理建议优先复用现有标签 / 集合；新分类经规范化和近似名称检查后独立呈现，只有用户单独确认才创建。
- 首次建库和首次分类前明确展示发送字段与目标 Provider；当前用户笔记可关闭，关闭后 Embedding / Generation 都不发送笔记，切换设置后相关向量失效并重建。
- 最终裁决（ADR 0022）取代本日志中所有 Embedding 相关规划：Phase 2 移除 Embedding、pgvector 语义搜索、索引任务、Semantic 模式与 Embedding Provider 设置；Browse 保留关键词搜索，AI 只使用 Generation BYOK 生成须经用户确认的整理建议。Supabase 内置 `gte-small` 虽无需外部 API，但仅适合英文，仍会把低价值的模型与索引复杂度带入产品，故不采用。
- 已应用 initial migration 中历史预启用但未使用的 `vector` 扩展不自动删除，以免破坏自部署者在同一 Supabase 项目中的外部依赖；它不构成 Asterism 功能、费用或 Phase 1 阻断。
- AI 整理只处理用户手动选择或“全选当前筛选结果”的仓库，调用前显示数量；不后台扫描整个库，输出仍是须经用户确认的建议草稿。
- AI 建议允许添加或移除标签 / 集合关系；审阅界面明确区分两类变化，只有用户确认后才执行。
- 未确认 AI 整理建议按用户持久化，刷新或离开后可继续；确认、主动丢弃或重新生成后清理旧草稿，草稿不含 credential。
- Provider Registry 首批内置 OpenAI、Google Gemini、Anthropic 与 OpenRouter；同时提供受控 OpenAI-compatible Connection，DeepSeek 等通过自定义 endpoint/credential/model 接入。
- Embedding 与 Generation Connection 分开选择和测试；每个 Connection 一个 credential，不做 key 池、跨 Provider fallback、预算/限流/ZDR 路由，也不回退到 Asterism 付费额度。
- 类型化 credential 由 Edge Function 使用独立 master key 做 authenticated encryption；普通客户端无密文表直读权限，支持测试、启用/停用、替换、删除与轮换。

## 反向审计修正

- README 从“初始化中/只有根配置”更新为 Phase 1 收尾，并移除“搜索全部内容/笔记”的虚假承诺。
- Product Contract 将已经实现的统计仪表盘与导入/导出移回 Phase 1 验收清单。
- ADR 0001、0004 显式标注被 ADR 0012/0014/0015/0019 替代的历史部分；migration 的 AI 阶段注释改为 Phase 2。
- `ai_provider_connections` 改为客户端无直接表权限，通过受信接口返回安全投影；Connection 引用使用带 `user_id` 的复合外键防止跨用户关联。
- 为支持自定义 Embedding dimensions，`repo_embeddings.embedding` 不再错误承诺单一固定 `vector(N)` ANN 索引；Phase 2 基线先做用户/Connection/model/dimensions 范围内的精确近邻查询，指标需要时再增加固定维度 partial ANN index。
- 全库 Embedding 的长任务模型与自定义 endpoint SSRF 防护列为 Phase 2 实现前技术验证，不假定单次 Edge Function 长请求或当前 runtime 必然满足安全条件。

## Phase 1 最终阻断项

1. 增加 `.gitattributes` 固化 LF，规范化检出，让 lint/typecheck/test/build 在干净跨平台检出中全绿。
2. Biome 启用 Tailwind v4 CSS parser，移除 CSS 排除并精确处理 4 处必要 `!important`。
3. 删除未使用 Dexie cache、导出、依赖与 lockfile 记录。
4. App Topbar Search 仅在 Browse 路由渲染。
5. 完成标签/集合/笔记/关联的写失败恢复与双语反馈。
6. 完成可执行的 Supabase Cloud + 静态托管 self-deployment runbook。
7. 把登录页“Full-text search / 全文搜索”改为符合当前名称/描述关键词搜索的双语文案，并补断言。

七项均为实施收尾，已无待用户裁决的 Phase 1 产品问题；全部关闭后方可标记 Phase 1 Done。

## 验证

- 对照了当前 migrations（仅 Phase 1 七张业务表，pgvector 只预启用）、README 实时读取代码、Topbar、Dexie 依赖、写入 mutation 与 runbook。
- 本轮为规划/文档审计，未执行 Phase 1 代码修复；沿用同日门禁证据：typecheck/test/build 通过（118 tests），lint 因 Windows CRLF 产生 188 个格式诊断。
- 文档完成后执行 `git diff --check`；仅报告待 `.gitattributes` 收尾解决的工作区 LF/CRLF 警告，无 whitespace error。

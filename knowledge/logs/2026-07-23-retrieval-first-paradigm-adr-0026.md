# 2026-07-23 · 检索优先范式定案与 Accept（ADR 0026 三问钻透）

## 背景

现有 AI 整理是「批处理审批」流水线（选 ≤50 个 → Generation 产出全量建议 → 逐项审阅 → 确认写入），`AI_ORGANIZATION_REPO_LIMIT = 50` 的别扭是范式症状而非数值问题。重审核心价值后确认：重度 star 用户的第一诉求是**「随时找到 / 看懂自己 star 过什么」**（检索优先），而非「把库整理好」。所有痛苦都源自同一个危险动作——**AI 把建议写进 canonical 数据**。本轮设计对话把 ADR 0026 从「方向草案」推进到**三个开放问题全部定案**，并于当日经用户拍板 **Accept**（本轮为纯设计 + 契约对齐，未落地实现）。

## 定案（写入 ADR 0026）

- **决策 1–2｜检索优先 + 双平面**：产品重心转向语义搜索 / 涌现式浏览 / 相似导航。Canonical 平面（手动标签 / 集合 / 笔记）神圣不变；Derived 平面（embedding 驱动）非破坏性、可重算、永不写 canonical；**promotion 是唯一写入桥**，且是「主动增益」而非「防污染守门」。
- **决策 3｜Embedding = 纯浏览器内平台能力（非 BYOK）**：默认 **`multilingual-e5-small`**（118M / **384 维** / **MIT**），刻意不选更强的 EmbeddingGemma-300M（零配置通吃弱设备 + 许可证干净 + 中英文达标）；模型同源自托管、懒下载缓存、模型 ID 版本化可逆；弱设备降级关键词搜索。
- **决策 4 + 6｜向量按用户存、客户端直写**：新表 `user_repo_embeddings`（与 `notes` 同构，`vector(384)` + `embedding_model` + `content_hash`），RLS 同 `notes`，浏览器直接 upsert 自己的行，**无受信写入路径、无跨用户投毒面**。回填 = 求「无行 / model 失配 / hash 失配」集合，天然增量可续跑。个人量级先精确扫描、不建 ANN。
- **决策 5｜Generation 仍是可选 BYOK**：仅用于 derived 的簇命名 / 摘要增益，未配置不影响。
- **决策 7｜检索交互 = 隐形混合搜索（地基）+ 石墨语义星图（第二视图）**：单一搜索框、关键词与语义融合为一套排序、**零模式开关**（不做 Semantic 开关）；列表实时重排。星图是与列表**并列可切换**的第二视图（**否决背景层**），遵循四条反 slop 物理法则（实体节点非发光粒子 / 确定性语义投影非力导向 / 分层渲染非堆节点 / 检索是点亮非过滤）；列表是星图的 a11y 等价路径。
- **决策 8｜涌现簇 + promotion（性格 = 安静的镜子）**：簇 = **纯向量密度聚类**（HDBSCAN 类，自动定簇数 + 孤立点，**不混 topic / language**——那已是 Browse facet 维度）；命名默认从 topics / 高频词提取，generation 仅可选增益。Promotion = 固化那一刻**快照**写 `collections`、斩断与 derived 簇的联系，复用 0023 账本（`bulk_operations.source` 加 `promotion`）。**安静的镜子**：系统永不主动提示「要不要加进某集合」，promotion 全由用户显式发起；此性格可逆（将来要「副驾」式活建议易加，反之难改）。

## 与既有决策的关系

- **Supersedes 0022**：0022 拒绝的是 gte-small（英文偏科）与 BYOK-embedding（基础设施外泄）；本 ADR 用「多语言小模型 + 非 BYOK + 浏览器内 + 同源自托管」精确穿过这两点。
- **Reframes 0020**：AI 不再写 canonical，无人值守写入的「防污染」担忧溶解；人工确认精神保留在 promotion 的显式动作里。
- **废弃 `ai_organization_drafts` 路径**：旧批处理审批草稿是被 reframe 的对象；promotion 不经该草稿机制。
- **复用 0023 / 0025**：promotion 走既有持久化逐项批量账本与 `BulkOperationBanner`，不造第二套可靠性语义。

## Accept 与契约对齐（2026-07-23）

用户当日拍板 **Accept 0026**。Accept 边界 = 决策生效 + 知识库（ADR + 契约 + state）零矛盾对齐；**建迁移 / 写代码 / 拆 issue 属之后的实现阶段**。本轮已完成：

- ADR 0026 `Status: Proposed → Accepted`；ADR 0022 `Status: Accepted → Superseded by ADR 0026`（加历史背景注记）。
- 改写禁语义遗留（0022 遗产）：`product.md`（L25 AI 能力 scope、L78 关键词 → 隐形混合搜索、L128 重启门槛已满足、Advanced Features 加 0026 重构注记）、`ui-ux.md`（L244 Browse Search 隐形混合搜索）、`roadmap.md`（L63 范围边界改为检索优先）、`architecture.md`（L122 Provider 边界：留「无服务端 Embedding Provider」、重构「无语义搜索」）。
- `data-model.md`：解除「不建向量表」、新增 `user_repo_embeddings` 表（`vector(384)` + `embedding_model` + `content_hash`、`(user_id, repo_id)` 唯一）与 RLS（并入 `notes` 同组：`user_id = auth.uid()` 直读写，无受信写入路径）。
- 关键一致性：ADR 0026「零模式开关」与既有 ui-ux「不暴露 Semantic 模式」同向不冲突——智能藏进排序、不做模式切换。

## 剩余开放问题（实现期）

- e5-small 浏览器量化档位（q8 / q4）与 WebGPU / WASM 回退实测。
- 确定性语义投影降维算法选型（UMAP / PCA / t-SNE）与可复现性；星图分层渲染技术栈（Canvas / WebGL）与规模阈值。
- 密度聚类（HDBSCAN 类）具体参数与计算位置（浏览器 / 服务端）、簇重算触发与缓存。
- 回填与「检测—下载」UX、精确扫描 vs ANN 阈值、增量流与 promotion 衔接。

## 产物

- 决策：`decisions/0026-ai-organization-flow-and-cluster-paradigm.md`（决策 1–8 完整 + `Status: Accepted`）；`decisions/0022-remove-embedding-and-semantic-search.md`（`Status: Superseded by ADR 0026`）。
- 契约对齐：`contracts/product.md`、`contracts/ui-ux.md`、`contracts/data-model.md`、`roadmap.md`。
- 同步 `state/PROGRESS.md`、`state/NOTES.md`、`state/BACKLOG.md`。
- 无代码变更；本轮为纯设计定案 + 契约对齐，落地实现待排期。

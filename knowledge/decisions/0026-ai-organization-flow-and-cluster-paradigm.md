# 0026 · 检索优先范式：双平面 + 浏览器内 embedding

- Status: Accepted（2026-07-23 拍板；Accepted 指方向定案与契约对齐，非已落地实现）
- Date: 2026-07-23
- Supersedes: ADR 0022（移除 Embedding 与语义搜索）——本 ADR 在其留下的技术缝隙上重新立项
- Reframes: ADR 0020（人工确认的 AI 整理）
- Relates to: 0023（持久化批量写入）、0025（确认与执行解耦）、0024（多租户边界思路参照）

## 背景

现有 AI 整理是一条**批处理审批**流水线：选 ≤50 个仓库 → Generation 产出全量建议表 → 逐项审阅 → 确认写入。`AI_ORGANIZATION_REPO_LIMIT = 50` 的别扭是范式症状而非数值问题：50 是与内容无关的任意切割，把「分批」的认知负担转嫁给用户，而「挑哪 50 个」本身正是用户想让 AI 代劳的整理劳动。

更根本地，重新审视核心价值后确认：重度 star 用户的第一诉求不是「把库整理好」，而是**「随时找到 / 看懂自己 star 过什么」**——检索优先。整理是手段，检索才是目的；若检索足够好，手动整理的需求大幅萎缩。而现范式所有痛苦都源自同一个危险动作：**AI 把建议写进用户的 canonical 数据**——正因为这是破坏性写入，才需要确认门、有界、重审阅。最有杠杆的一步，是让这个危险动作根本不存在。

## 决策（方向）

### 1. 核心价值重定位为检索优先

产品重心从「帮你整理」转向「让你随时找到 / 看懂你 star 过什么」：语义搜索、涌现式主题浏览、相似仓库导航。

### 2. 双平面：canonical 神圣，derived 可弃

- **Canonical 平面**：用户手动的标签 / 集合 / 笔记。神圣，只有用户能改，完全不变。
- **Derived 平面**：embedding 驱动的语义搜索 / 涌现簇 / 相似导航。**非破坏性、可随时重算、永不写入 canonical。**
- **Promotion 是唯一的桥**：用户浏览 derived 视图，主动把某个簇「固化」为 canonical 集合。这是唯一写入，且是**主动增益**而非「防污染守门」。

### 3. Embedding = 平台能力（纯浏览器内），非 BYOK

- **默认模型：`multilingual-e5-small`**（intfloat；118M 参数、**384 维**、**MIT 许可证**；Transformers.js 经 `Xenova/multilingual-e5-small` 多年成熟支持）。选它而非「更强」的 EmbeddingGemma-300M，是刻意的「做正确的事」权衡：
  - **零配置要通吃弱设备**：118M vs 308M，下载更小（约 100–120MB）、单次嵌入算力约 1/2.6，中低端手机 / 笔记本也扛得住；而 repo 文本很短（名 + 简介 + topics），二者在检索上的质量差距对本场景很小。
  - **许可证干净**：MIT 可无摩擦自托管 / 转发给自部署者；EmbeddingGemma 是 Gemma Terms（开放权重但非 OSI、含使用限制条款），会把条款传导给每个部署者。
  - **中英文达标**：e5 系列在 MIRACL 多语言检索上 EN + ZH 均可用。
- 被嵌文本 = repo 的 `full_name` + `description` + `topics`；查询 / 文档分别加 e5 的 `query:` / `passage:` 前缀。
- 模型文件由**应用同源自托管**（不依赖外部 CDN，锁网可用、离线友好）；首次用到搜索时**懒下载并缓存**（Cache API / IndexedDB），「检测本地是否已有模型、无则一次性下载」是该工具链默认行为，仅包一层「一次性准备搜索（约 100MB）」的 UX。
- 模型 ID 是**全局钉死的常量**（存 `packages/core`，也是每条向量记录的 `embedding_model` 值）并**可版本化**；换 / 升模型 = 改常量 → 各客户端据 `embedding_model` 失配惰性重嵌。此路**可逆**，故现在选轻量模型是安全的：将来若嫌弱，平滑升级到 EmbeddingGemma（q4、MRL 截 256 维）即可。
- 弱设备嵌入慢时**优雅降级到既有关键词搜索**，不阻断。

### 4. 向量按用户存储、客户端直写（纯浏览器方案能干净支持多租户的关键）

- 向量存**用户维度**的表（`user_id + repo_id + vector + model_version`），RLS 与 `user_stars` / `tags` 同构：本人可读写。
- 因此浏览器算完**直接经普通 RLS 写自己的行，无需受信写入路径**，也**没有跨用户投毒面**（只可能影响自己的搜索）。
- 代价：热门 repo 被多用户各自嵌一份（冗余）。但向量小，个人量级（数百~数千）可忽略；换设备时新设备可直接读库里已有向量，只需为**查询**加载模型，跳过文档回填。
- 规模说明：个人量级下按 `user_id` 过滤后的**精确向量扫描**即毫秒级，未必需要 ANN 索引；HNSW / IVFFlat 与 RLS 预过滤的取舍留作后续规模优化。pgvector 扩展已在初始迁移启用，地基现成。

### 5. Generation 仍是可选 BYOK

- 只用于 derived 平面的命名 / 摘要增益（给簇起名、写摘要）；未配置也不影响语义搜索与原始簇可用。

### 6. 数据模型：`user_repo_embeddings`（本轮决议）

与 `notes` 表同构（`unique (user_id, repo_id)`、UUID 主键、级联删除、`set_updated_at` 触发器）：

```sql
create table if not exists public.user_repo_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  embedding vector(384) not null,      -- pgvector 类型（extension 装在 extensions schema）；维度随默认模型 e5-small
  embedding_model text not null,       -- 产出该向量的模型 ID（= packages/core 常量）
  content_hash text not null,          -- 被嵌文本(full_name+description+topics)的哈希，用于探测过期
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repo_id)
);
create index if not exists user_repo_embeddings_user_id_idx on public.user_repo_embeddings (user_id);
```

- **RLS 与 `notes` 同构**：本人可 select / insert / update / delete（`user_id = auth.uid()`）。因此浏览器**直接 upsert 自己的行，无需受信写入路径**。
- **回填 = 求「缺失或过期」集合**：某 repo 需要（重）嵌，当且仅当无行、或 `embedding_model` ≠ 当前常量、或 `content_hash` ≠ 当前文本哈希。天然**增量、可续跑**：sync 后新增 repo 自动入待嵌集合；模型升级令全库 `embedding_model` 失配从而惰性重嵌。
- **搜索位置**：查询**文本**在本地嵌成向量，仅**向量**发到用户自己的 Supabase 做距离检索（`where user_id = auth.uid() order by embedding <=> $q limit k`）——不出用户自有后端、无第三方。
- **索引**：个人量级（数百~数千行 / 用户）按 `user_id` 过滤后的**精确扫描**即毫秒级，**先不建 ANN 索引**；HNSW / IVFFlat 及其 RLS 预过滤取舍留待规模变大再引入。维度若随未来模型改变，需 `alter` + 全库重嵌（属版本升级成本）。

### 7. 检索交互：隐形混合搜索（地基） + 石墨语义星图（第二视图）

本轮（开放问题 #2）钻透，定案交互范式；星图的**区域命名**留给 #3（涌现簇）的高潮，本轮不做。

**地基（不可谈判）**：

- **单一搜索框，隐形混合排序**：关键词精确命中与语义近邻融合为**一套排序**，**零模式开关**——不做「Semantic 模式」切换。这既顺承 ui-ux 契约的既有立场（反对暴露 Semantic 开关），也是刻意的品味选择：把智能藏进结果，而非甩给用户一个开关。
- **列表即结果画布**：现有 Browse 列表 / 卡片就是结果画布，打字时**实时重排**，语义近邻在 hairline 分隔线下按 `--ease-out-quart`（120–240ms）浮入。
- **降级不阻断**：模型未就绪 / 弱设备时降级为纯关键词排序，与决策 3 的降级一致。

**新鲜感层：石墨语义星图 = 列表的并列第二视图（可切换，非背景层）**：

- 明确**否决**「浮在内容底下的背景层」——那是「截图惊艳、用起来灾难」的陷阱（干扰阅读、违克制、性能与 a11y 双输）。星图是**与列表并列、可切换**的第二视图。
- **检索与聚簇是同一张语义地图的两种读法**：检索 = 在画布上**点亮一条路径**；涌现簇（#3）= 在画布上**划出一片区域**。故星图预留**区域层**给 #3，本轮只做「能检索、能看密度」的裸画布。

**四条反 slop 物理法则**（守住离 AI slop 的那一线）：

1. **星是实体节点，不是发光粒子**：石墨画布上默认克制、近乎素描；仅**选中 / 邻近 / 命中**时点上电光蓝 `#2563EB` 与玻璃材质。惊艳来自「克制中的一点亮」，非满屏星尘——严守 Graphite Glass 的 glow / 噪点禁令。
2. **坐标用确定性语义投影，不是随机力导向**：384 维向量**稳定**降维到 2D，**同一批 star 每次打开位置一致**，让用户长出「地图肌肉记忆」——这是新鲜感能沉淀成熟悉感的前提。
3. **规模靠分层，不靠堆节点**：远景看密度 / 区域轮廓，拉近才显个体节点；视口裁剪 + 聚合，**永不同时渲染数千点**。
4. **检索是点亮，不是过滤**：命中的星**升起聚焦**、其余**沉入背景**——与地基「列表实时重排」是同一套排序的空间化表达。

**无障碍**：星图对键盘 / 读屏天然不友好；**列表视图正是它的 a11y 等价路径**——列表不是退路，是星图合法存在的前提。

### 8. 涌现簇 + promotion：双平面唯一的写入桥

本轮（开放问题 #3）钻透，收口整条长线。涌现簇与 promotion 是**同一座桥的两端**：derived 侧自动浮现「主题区域」，promotion 把某个区域**固化**为 canonical 集合——这是双平面里**唯一的写入**。

**涌现簇（derived 侧，可弃、可重算）**：

- **确定性**：同一批 star 每次浮现的簇一致，与决策 7 的投影确定性同源——用户信任的前提。
- **算法：纯向量的密度聚类**（HDBSCAN 一类：自动定簇数 + 允许「孤立点」不属任何簇），**不预设 k、不混 topic / language**。理由：topic / language 已是 Browse 的 facet 维度，簇的价值恰在发现 facet 之外的语义邻近；混进去就退化成已有筛选。具体参数留实现期实测。
- **命名：默认零依赖**——从簇内 repos 的 topics / 高频词提取区域标签；BYOK generation 只是**可选增益**（起更漂亮的名 + 写摘要），未配置不影响簇可用。呼应决策 5。这就是 #2 给星图预留的**区域层**的落地。

**Promotion（derived → canonical 的唯一写入）**：

- **固化 = 快照，斩断联系**：固化那一刻选中的 repos 成为 `collections` 成员，此后就是**普通 canonical 集合**（用户手动管）；derived 簇继续独立演化、互不影响。这是 canonical 神圣性的硬保障。
- **显式动作 + 轻审阅态**：promotion 由用户主动发起，进一个轻审阅态（改名、剔除个别 repo、确认写入）。
- **复用 0023 账本**：写入走持久化逐项批量账本，`bulk_operations.source` 新增 `promotion` 值作 provenance——不造第二套可靠性语义，白拿持久化 / 逐项重试 / 失败分类。

**性格：安静的镜子（定案）**：

- 系统**永不主动开口**：簇只在用户主动看星图时呈现；promotion 是用户发起的显式动作。新 star 照常自动嵌入、自然归簇（derived 侧），但**绝不提示「要不要加进某集合」**。
- 与检索优先 / 双平面神圣性最一致，最克制（impeccable）；且**可逆**——先做安静的镜子，将来真要「副驾」式活建议再加很容易；反之把爱说话的助手改安静，是跟用户已养成的习惯作对。

## 与既有决策的关系

- **Supersedes 0022**：0022 拒绝的是 gte-small（英文偏科）与 BYOK-embedding（基础设施外泄）。本 ADR 用**多语言小模型 + 非 BYOK + 浏览器内 + 同源自托管**精确穿过这两点，未违背其保护的「简单、可自托管、多语言、零心智负担」价值。
- **Reframes 0020**：AI 不再写 canonical 数据，危险的无人值守写入不存在，0020 的「防污染」担忧溶解。人工确认精神仍在（promotion 是显式动作），但从「守门」降级为「主动增益」。
- **废弃 `ai_organization_drafts` 路径**：旧的批处理审批草稿（canonical 写入前的待确认表）是被 reframe 掉的对象；promotion 不经由该草稿机制，而是用户在 derived 星图上直接发起的轻审阅。
- **复用 0023 / 0025**：promotion 落地仍走持久化逐项批量账本与 `BulkOperationBanner`（`source: promotion`），不产生第二套可靠性语义。
- **已同步改写的契约遗留（Accept 时完成）**：0022 遗产中的禁语义条款已随本 ADR Accept 一并对齐——`product.md`（L25 AI 能力 scope、L78 关键词搜索 → 隐形混合搜索、L128 语义搜索重启门槛已满足、Advanced Features 加重构注记）、`ui-ux.md`（L244 Browse Search 隐形混合搜索）、`data-model.md`（解除禁向量表 + 新增 `user_repo_embeddings` 表与 RLS）、`roadmap.md`（L63 范围边界）、`architecture.md`（L122 Provider 边界：留「无服务端 Embedding Provider」、重构「无语义搜索」）。#18 数据地基与 #19 浏览器运行时 / 回填已于 2026-07-24 落地；混合搜索、星图与聚类仍分别由 #20–#22 交付，不得提前声称整条能力已完成。

## 影响与成本（老实列）

- **每设备首次下模型**（量化后数十至一百多 MB，缓存后免）；锁网环境靠同源自托管缓解。
- **浏览器内回填**数百~数千向量：一次性、分块可续跑，仅新增增量重跑。
- **弱设备 / 老手机 WASM 慢**：WebGPU 加速 + 降级关键词搜索兜底。
- **向量冗余存储**（跨用户重复）：个人量级可忽略；大规模 ANN 索引与分区留作后续。
- **放弃服务端更强模型 / 更高质量 embedding**：对个人 / 隐私优先定位是可接受取舍，未来有硬需求另立 ADR（不提前造）。

## 实现期验证与剩余开放问题

- **已解决（#19，2026-07-24）**：真实 Chromium 原型对比后选择 q8；模型 ONNX 为 118,308,185 bytes（q4 399 MB、q4f16 205 MB，均更大），固定 revision 与 SHA-256 后由应用同源自托管。暖缓存、batch 16 的 WebGPU 初始化 / 推理为 1.00s / 454ms，WASM 为 608ms / 236ms；冷 WebGPU 首次下载 + 编译 39.25s。运行时仍按契约 WebGPU 优先、失败回退 WASM，因为跨设备加速能力不能由本机单点反推；任一后端失败都保留关键词搜索。
- **（#2 剩余实现细节）** 确定性语义投影的降维算法选型（UMAP / PCA / t-SNE 等）与可复现性保证；星图分层渲染的技术栈（Canvas / WebGL）与「远景聚合 → 拉近显个体」的规模阈值。
- **（#3 已定案）** Derived 簇 = 纯向量密度聚类（不混 topic / language）；命名默认从 topics / 高频词提取，generation 仅可选增益；promotion 固化为快照写 `collections`、复用 0023 账本（`source: promotion`）；性格为「安静的镜子」（系统不主动提示）。
- **已解决（#19，2026-07-24）**：有仓库时展示非阻断的显式「准备搜索」动作并披露约 100–150 MB；同意按用户 + 模型版本记在本机。先查 owner 的缺失 / 过期集合，空集合不加载 Worker；非空集合才懒加载模型，以 16 条分块、逐行 RLS upsert 形成检查点。刷新 / 失败可由已成功行继续，sync 新增与内容 / 模型变化自动触发增量回填；换设备可复用服务端已有文档向量。
- 搜索精确扫描 vs ANN 的切换阈值。
- **（#3 已定案，剩实现细节）** 密度聚类（HDBSCAN 类）的具体参数（最小簇大小、距离度量）与在浏览器 / 服务端的计算位置；簇重算的触发时机与缓存。

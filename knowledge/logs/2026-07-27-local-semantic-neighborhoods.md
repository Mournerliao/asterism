# 2026-07-27 · 从全库涌现簇纠偏为局部语义邻域

## 用户问题

最新涌现簇在真实收藏库中出现 `vue · interview · python`、`javascript · windows · react` 等低信息标签。初始审视确认这不是视觉润色问题，而是需要回看产品任务与 ADR 0026 §8 的核心假设。

## 真实库证据

通过开发期只读审计句柄检查用户的 518 条真实 Star：

- 7 个地图簇合计只覆盖 173 / 518 条。
- 多个簇的命名 token 只出现在 1–4 个成员中。
- `agent · cs231n · llm` 的 11 个成员混合求职信息、语法学习、前端面试、Mac 效率工具、LLM 教程与 Leetcode。
- `javascript · windows · react` 的 56 个成员混合 Rust 课程、Windows 激活 / 启动盘、AI agent、React 工具、文档、游戏与 VPN。
- 原始 384 维 e5 向量无法形成 HDBSCAN 真分裂；现有 7 簇来自 2D PCA 展示投影上的 leaf 聚类，实际是地图区域而非可靠语义分类。

因此命名失败只是表象。全库硬分区、互斥边界与自动命名制造了不存在的分类确定性。

## 原型与用户选择

使用真实数据制作了三个只读、dev-only 候选：

1. A：从当前仓库出发的局部语义邻域；
2. B：展开真实成员的全局区域；
3. C：最近 Star 回看。

B 在成员展开后直接证伪。A / C 的裸 Top-K 都暴露假关联，随后改为互为 Top-12 近邻并允许空结果，噪声明显下降。用户最终选择 A。

决策沉淀为 ADR 0027，部分取代 ADR 0026 §8；当时保留了 0026 的检索优先、双平面、浏览器内 embedding、隐形混合搜索与语义星图。后续继续审视后，语义星图已由同日 ADR 0028 取代并移除。

## 正式实现

- `packages/core/src/repos/semantic-neighborhood.ts`
  - 新增确定性 `findMutualSemanticNeighbors`。
  - 候选必须互为 Top-12，最多 5 条。
  - 不产生重复、自身结果或不可用向量结果，分数相同时按 repo ID 稳定排序。
- `apps/web/src/data/use-semantic-neighborhood.ts`
  - 复用全量 embedding Query cache。
  - 只在用户已同意准备 embedding 且 Quick Look 有当前仓库时读取。
  - 严格过滤模型失配、content hash 失配和非当前 Star 的向量。
- `apps/web/src/components/repo-inspector.tsx`
  - Overview 后渐进显示 Related Stars。
  - 最多 5 条整行按钮，不显示模型相似度百分比。
  - 无可信结果时不显示标题、空态或占位。
  - 点击后保持 Quick Look，允许从新仓库继续探索。
- 星图删除簇区域、簇命名、hover 卡片与 promotion。
- 删除实验 `semantic-assistance-prototype`、`useStarMapClusters`、`PromotionReviewDialog` 以及已无调用方的 core clustering / naming 模块。
- 数据库与 db 类型中的 `source: promotion` 兼容值保留，以免破坏历史记录。
- en / zh-CN 与产品、UI、路线图、进度契约同步更新。

## 验证

- 新增 5 个 core 测试：互惠筛选、单向拒绝、确定性 tie-break、缺失 / 零向量、去重 / 上限。
- 新增 2 个 Web 数据测试：新鲜向量映射、旧 / 未知向量静默排除。
- Quick Look 覆盖点击 Related Star 后保持浮窗。
- `pnpm lint` 通过，仅剩投影模块中的 18 个既有 `noNonNullAssertion` warning。
- `pnpm typecheck` 全仓通过。
- `pnpm test` 全仓通过：core 177、db 67、functions 94、web 173。
- `pnpm build` 全仓通过；Web 仅保留既有主 chunk > 500 kB warning。
- Impeccable detector 对三个变更界面文件输出 `[]`。
- 真实 Chrome / 518 条 Star：
  - `earendil-works/pi` 展示 5 条 Related Stars。
  - 点击 `Pythagora-io/gpt-pilot` 后 Quick Look 保持并重新计算邻域。
  - `foru17/make-x-great-again` 无互为近邻，Related Stars 整段不出现。
  - 星图无簇边界、簇名或 promotion 入口。

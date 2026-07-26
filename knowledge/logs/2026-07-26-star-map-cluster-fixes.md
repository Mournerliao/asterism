# 2026-07-26 · 修复涌现簇单巨簇退化 + promotion 体验修正

## 现象

真实数据（518 stars）下星图涌现簇退化为单个 511 巨簇，「涌现簇 ≈ 全部仓库」，
区域层失去意义。连带两个体验问题：`PromotionReviewDialog` 仓库列表渲染裸
UUID 无法轻审阅；搜索「点亮命中」时簇卡片仍显示「固化为集合」，易被误解为
固化的是搜索命中集。

## 根因

1. **HDBSCAN condensed tree 语义偏离**（核心 bug）：`extractClusters` 旧实现把
   dendrogram 中每个 ≥ minClusterSize 的子节点都立为新簇。标准语义是只有
   「真分裂」（两侧都 ≥ minClusterSize）才诞生子簇；单侧甩噪声时父簇应延续并
   累积 stability = Σ(λ_leave − λ_birth)。旧实现造成链式簇把 stability 稀释到
   每层近零，EOM 比较 `父 ≥ 子树和` 在 `0 >= 0` 下父簇恒胜，层层坍缩到根下巨
   簇。合成数据（3 高斯团 + 均匀噪声）实锤：旧实现输出 1 簇吞 409/410。
2. **UUID 裸渲染**：对话框直接渲染 `repoId`，未解析为 `owner/name`。
3. **搜索态 promotion 误导**：promotion 固化的始终是簇全量成员，与搜索命中集
   正交（ADR 0026 §7/§8），但搜索激活时入口仍在，视觉暗示错误。

## 修复

- `packages/core/src/clustering/hdbscan.ts`：按标准语义重写 `extractClusters`。
  数组式 condensed cluster 记录（parent / birth / stability / children），三分支：
  真分裂 → 当前簇死亡、剩余点贡献 `(λ_split − birth)`、诞生两个子簇；单侧大 →
  小侧点脱落贡献 stability、父簇以同一簇号延续进大侧；两侧都小 → 簇死亡全部
  脱落。EOM 按创建序反向遍历即自底向上，根簇永不可选。点标签取其脱落簇祖先
  链上被选中的簇，否则为噪声。
- `packages/core/src/clustering/clustering.test.ts`：
  - 原 384 维测试 `spread` 0.2 → 0.03：0.2 时噪声范数 ≈ 3.9 远超中心范数 1，
    L2 归一化后数据实际无结构，旧 bug 的巨簇恰好让它侥幸通过。
  - 新增回归测试「3 个不均衡团（150/120/100，σ=0.05）+ 40 均匀噪声，64 维」，
    断言 ≥ 3 簇且最大簇 < 80% 总量，锁死单巨簇退化形态。
- `apps/web/src/components/promotion-review-dialog.tsx`：新增 `repoNames`
  prop（repoId → owner/name），缺失时回退原 id。
- `apps/web/src/components/star-map-view.tsx`：新增 `searchActive` prop，搜索
  激活时隐藏簇卡片上的 promotion 按钮（簇名 + 计数仍显示）。
- `apps/web/src/components/browse-repo-list.tsx` / `apps/web/src/pages/browse.tsx`：
  透传 `starMapSearchActive={Boolean(filters.query.trim())}` 与已有的
  `repoNames` Map。

## 验证

- `pnpm turbo run typecheck test --filter=@asterism/core --filter=@asterism/web`
  全绿（7 任务）。
- 合成 3 团 + 噪声数据从「1 簇吞 409/410」修正为精确 3 簇
  （sizes = 124/150/100，噪声 36），新增回归测试常驻 `clustering.test.ts`。
- `biome check` 仅既有 noNonNullAssertion warning，无新增问题。

## 边界说明

- 「固化 511」在语义上本就是预期行为（promotion 操作簇而非搜索命中集），本次
  只是在搜索态隐藏入口消除误导，不改变 promotion 语义。
- 真实数据下的簇形态需用户在真实应用中复核（合成数据已证明算法正确性）。

## 追加修复（同日）：刷新后星图误报「需要准备向量」

- 现象：页面刷新后星图恒显示空态「Star map requires prepared vectors」，
  语义搜索同时失效，尽管 518 条向量全部在库且新鲜。
- 根因：`runRepositoryEmbeddingBootstrap` 的全量新鲜路径按设计不创建
  Worker，返回 `backend: null`；而 browse 页就绪判定是
  `optedIn && backend !== null`，把「本会话存在活 Worker」误当成了「向量
  就绪」。此前只在刚跑完回填的会话里能看到星图，首次全新鲜刷新即暴露。
- 修复：`apps/web/src/pages/browse.tsx` 将判定改为
  `optedIn && (phase === 'ready' || backend !== null)`。星图只读库中向量不需
  Worker；查询嵌入走 `getEmbeddingRuntime().embed()`，Worker 收到 embed 请求
  会自动 prepare，不依赖 bootstrap 留下的 backend。
- 验证：`pnpm turbo run typecheck test --filter=@asterism/web` 全绿。

## 追加修复（同日）：修正后真实数据又退化为零簇 → 改在 2D 投影空间聚类 + leaf 选择

- 现象：condensed tree 语义修正后，真实 518 条 e5 向量从「1 个巨簇」变成
  「0 簇全噪声」。
- 实证（浏览器内对真实向量扫参）：384 维上 `minClusterSize ≥ 5` 时整棵树
  无一次「两侧都 ≥ minClusterSize」的真分裂（高维距离集中 + 单链吸积，
  大团靠逐点生长而非对等合并，凝缩树退化成链）；而 2D PCA 投影上结构
  清晰（EOM 得 2 宏观区，leaf + mcs=8 得 7 个主题区 56/32/23/21/17/13/11）。
  PCA 降到 5–20 维再聚效果仍不稳，业界标准即降维后聚类。
- 修复：
  - `packages/core` `hdbscan` 新增 `clusterSelection: 'eom' | 'leaf'` 选项
    （对齐 scikit-learn `cluster_selection_method`），leaf 取凝缩树叶簇；
    新增回归测试（leaf 簇数 ≥ EOM、确定性）。
  - `apps/web` `useStarMapClusters` 改为在星图 2D 投影空间聚类（仍是纯向量
    派生、确定性 PCA，不混 topic/language，符合 ADR 0026 §8；且簇区域与用户
    看到的画面天然一致），`clusterSelection: 'leaf'`，minClusterSize 随规模
    缓升 `clamp(5, n/64, 25)`。
- 验证：真实浏览器复核——518 仓库浮现 7 个主题区域，簇名有意义
  （vue·interview·python / javascript·windows·react / awesome-list·typescript /
  ai·best-practices / cs231n·llm 等）；`typecheck / test` 全绿。
- 开发中临时加过的 `window.__asterismClusterDebug` 诊断句柄已随重写移除。

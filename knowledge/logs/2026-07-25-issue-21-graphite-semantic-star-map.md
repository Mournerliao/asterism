# 2026-07-25 · Issue #21 · 石墨语义星图

## 概要

实现 ADR 0026 第四纵向切片——石墨语义星图（Graphite Semantic Star Map）。Browse 新增可切换的第三视图「星图」，将用户 384 维嵌入向量经确定性 PCA top-2 投影到 [0,1]² 坐标并以 Canvas2D 分层渲染呈现。

## 变更范围

### packages/core

- `src/projection/pca.ts` — 幂迭代法求 top-2 主成分：Float64Array 内计算、deterministic sine init → 每次调用位相同结果（Δ=0）
- `src/projection/normalize.ts` — 稳健归一化：quantile clipping（默认 q=0.02）+ 等比 aspect ratio 保持 + 离群点 clamp
- `src/projection/index.ts` — 重导出 + `projectAndNormalize` 便捷入口
- `src/projection/projection.test.ts` — 10 个 Vitest 用例（确定性、聚类保持、退化输入、归一化范围）
- `src/index.ts` — 新增 `export * from './projection'`

### apps/web

- `src/stores/browse-view.ts` — 扩展 `RepoViewMode = 'grid' | 'list' | 'star-map'`
- `src/data/keys.ts` — 新增 `starMap` query key
- `src/data/use-star-map-projection.ts` — Hook：listRepoEmbeddings → pca2d → robustNormalizeLayout，10min staleTime
- `src/components/star-map-canvas.ts` — 生产 Canvas2D 分层渲染器：
  - INDIVIDUAL_CAP=900（≤900 个体节点，>900 密度场）
  - viewport culling
  - 实时 CSS token 读取适配明暗主题
  - 搜索「点亮路径」：hitSet primary×0.95，neighborSet primary×0.4，其余 0.12 沉底
  - pick() 命中检测
- `src/components/star-map-view.tsx` — React 组件：
  - rAF 循环、pointer 拖拽平移 / 滚轮缩放 / 点击选中联动 Inspector
  - EmptyState 嵌入未就绪降级
  - LoaderCircle projecting 状态
  - reduced-motion 尊重
- `src/components/repo-view-toggle.tsx` — 新增 Sparkles 图标 star-map 选项
- `src/components/browse-repo-list.tsx` — 扩展为三视图挂载（grid/list 显隐复用、star-map 独立分支）
- `src/pages/browse.tsx` — 接入 useStarMapProjection、计算 hitRepoIds / neighborRepoIds、onStarMapSelectRepo
- `src/i18n/locales/en.json` / `zh-CN.json` — 新增 `browse.viewStarMap` + `browse.starMap.*` 5 个键

## 设计决策

- **PCA 而非 t-SNE/UMAP**：确定性、无超参数、零随机种子 → 同批数据每次布局一致（ADR 0026 §5 第一技术未知数）
- **Canvas2D 而非 WebGL**：900 个体节点 + 视口裁剪在所有设备足够流畅；无 WebGL 降级意味着无降级路径可失败
- **稳健归一化替代 min/max**：避免单个离群点主导整个布局范围
- **repoId 作为交互标识**：而非数组索引，支持与 Inspector / 搜索 hitSet 直接交叉

## 门禁

| Gate | Result |
|------|--------|
| `pnpm lint` | 0 errors, 21 warnings (pre-existing) |
| `pnpm typecheck` | 9 packages pass |
| `pnpm test` | 170 tests pass (37 files) |
| `pnpm build` | 6 tasks success (主 chunk warning 为既有观察项) |

## 无新增 ADR

所有决策均在 ADR 0026 已有覆盖范围内；原型 spike 验证结论直接沿用。

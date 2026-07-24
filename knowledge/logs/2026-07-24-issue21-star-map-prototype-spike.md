# 2026-07-24 · #21 石墨语义星图 · prototype 收口两个未知数

## 上下文

检索优先范式（ADR 0026）已推进到 #20 隐形混合搜索落地。下一票 #21「石墨语义
星图」在 ADR 0026 §7 与票据草稿 `.scratch/retrieval-first/04-*.md` 中留了两个
必须先收口的技术未知数（否则实现会走偏）：

- **Q1**：确定性降维（UMAP / PCA / t-SNE）到底能否做到「同批向量每次坐标一致」
  的可复现性（地图肌肉记忆是法则二的硬要求）。
- **Q2**：分层渲染的技术栈（Canvas / WebGL）与「远景聚合 → 拉近显个体」的规模
  阈值，能否在不同渲数千点的前提下保持流畅。

按恢复点建议「先用 `/prototype` 收口，再进实现」。

## 原型形态

一次性 dev-only 原型，零新增依赖、纯手搓，接入既有 `/dev/*` lab 约定：

- 路由 `/dev/star-map-prototype`（`router.tsx` 的 `import.meta.env.DEV` 段，lazy 加载）。
- `apps/web/src/prototype/star-map/`：`synthetic-vectors.ts`（K 个高斯 blob + 离群点，
  已知 ground-truth）、`projection.ts`（PCA / 确定性精修 / 随机力导向 + 重投影探针）、
  `star-canvas.ts`（分层 Canvas2D：密度场 ↔ 个体 + 视口裁剪 + Graphite Glass token）、
  `star-map-prototype-page.tsx`（控制旋钮 + FPS/mode/Δmax 状态表）。
- `biome.json` 加 `apps/web/src/prototype/**` override 关 `noNonNullAssertion`（数值内
  循环 + `noUncheckedIndexedAccess` 双约束下的隔离豁免，仿 `fixtures/readme-corpus` 先例）。

## 实测结论

**Q1 确定性降维（可复现）**：

- PCA（top-2 主成分幂迭代，固定 init、无 RNG）重投影 **Δmax = 0.00e+0 · stable ✓**。
- PCA-init 确定性精修（邻域吸引、无 RNG）同样 **Δmax = 0.00e+0 · stable ✓**（N=1200 ≈ 850ms）。
- 反面随机初始力导向 **Δmax = 9.24e-1 · scrambles ✗**：归一化 [0,1]² 里几乎横跨整张图，
  换 seed（= 新会话 / 设备）即全乱。
- → #21 采用 **PCA top-2 为默认确定性投影**，可选确定性精修增强局部邻域；
  **禁用任何随机初始化力导向**。

**Q2 分层渲染 + 阈值 + 技术栈**：

- **Canvas2D 足够，WebGL 非必需**（无 WebGL 天然降级）。
- 阈值 `INDIVIDUAL_CAP=900`：可见点 >900 → 密度场（`GRID=72` 网格 cell 填充，O(cells)）；
  ≤900 → 个体节点；均视口裁剪。命中 / 邻近 / 选中恒画最上层（有界集）。
- 实测：N=5000 全量 PCA、density **FPS 117 / visible 4649**；个体 N=800 **FPS 66 / visible 519**。
- 投影 PCA@5000 ≈ 1.0–1.1s（一次性，真实场景预计算 / 缓存）；精修与力导向因 O(N²·D)
  精确 kNN 需限 N（原型 cap 2000）。
- → 远景密度 + 近景个体 + 裁剪即满足「大库不同时渲染数千点」。

## 对 #21 实现的输入

- **稳健归一化**：原型暴露真实坑 —— PCA + 全局 min/max 归一化被离群点主导，点云挤到
  角落、画布利用率低。实现须用分位裁剪 / 按标准差缩放 / 离群点单列，勿裸 min/max。
- **视觉法则**：密度场为石墨网格、无 glow / 无噪点（法则一 / 三）；仅命中 / 邻近 / 选中
  电光蓝，检索表现为「点亮路径」（法则四）已在交互中演示。
- **a11y**：列表视图是等价路径（原型仅提示，未实现）。

## 验证与门禁

- 浏览器实测（Chromium 预览）零控制台错误；截图证据
  `.scratch/retrieval-first/star-map-01-pca-default.png`、`star-map-02-density-5000.png`。
- 四道门禁全绿：`pnpm lint`（`biome check .`，313 文件）✓；`pnpm typecheck` ✓；
  `pnpm test`（37 files / 170 tests）✓；`pnpm build`（6 tasks）✓。
- `noUncheckedIndexedAccess` × `noNonNullAssertion` 夹击：数值访问用 `!` 断言 +
  prototype 目录 lint override 化解。

## 状态更新与后续

- 结论已带回票据草稿 04（`## Prototype 结论`）与 `NOTES.md` 便签。
- #21 未知数已收口，可进入实现（第二视图、确定性 PCA 投影、Canvas2D 分层、点亮路径、
  区域层为 #22 预留）。
- **原型代码保留到 phase2 全部实现后再统一清理**（用户决策 2026-07-24）：dev-only、
  `import.meta.env.DEV` 门控、已隔离，留作 #21 及后续实现的活参照；清理时回滚
  `prototype/` 目录、`router.tsx` 路由段与 `biome.json` override 三处。

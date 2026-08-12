# Collection Dial 文件夹图标精修

日期：2026-08-12

## 目标

保留用户指定的简约文件夹造型，只做适配 Asterism 的必要二次修改。用户明确排除 3D、拟物、自绘与图标库替代方案。

## 素材

使用用户下载的两份 Vecteezy 压缩包：

- `vecteezy_folder-icon-vector-design-template-in-white-background__966.zip`：闭合状态。
- `vecteezy_folder-icon-vector-design-template-in-white-background__166.zip`：打开 / 接收状态。

压缩包内提供 EPS、1920×1920 JPG 与许可说明。最终实现以 EPS 为矢量源，用户 Downloads 中的原始文件保持不变。

## 二次处理

- 从 Illustrator EPS 的 PostScript 图形段逐条提取原始 `moveto` / `lineto` / `curveto`，转换为保持同一控制点的透明 SVG；不再使用由 JPG 缩放得到的 512×512 PNG。
- 保持素材原有四级明暗和大面积弧形高光，将黄色阶映射为 Asterism 浅蓝色阶：最深层使用 `#6EA8FE`，其余层依次提亮，纸张保持 `#EAF1FF`，避免大面积 `#2563EB` 显得过重。
- 闭合状态保持原版三层结构，不添加纸张 / 内衬色带。EPS 复合路径转换为 SVG 后曾在前片交界处透出背景，最终将背板整理为位于前片之后的封闭底层，并让前片按原轮廓覆盖，从几何上消除空隙；暗色页面也不会透底。
- 当前选中集合完整显色；其他集合通过饱和度与不透明度降低视觉权重，维持 UI 契约的 restrained 色彩策略。
- 删除图标下方独立的 `.collection-folder__shadow` 椭圆落地阴影节点、打开态样式和 reduced-motion 引用；不删除素材内部用于表达平面分层的弧形色块。
- 闭合与打开素材按原状态机交叉淡入；拖放接收、点击选择、Q/E + Enter、ARIA、reduced-motion 与响应式逻辑均未改变。
- 资源放在 `apps/web/src/assets/prototypes/collection-dial/` 并由 Vite 静态导入，避免项目自定义 `publicDir` 导致路径失效。

## 验证

- 真实 Chrome 核验七个闭合文件夹的弧形排布、透明背景、选中与非选中层级。
- 点击 `Add to Frontend` 核验打开文件夹接收态，原素材的背板、纸张和前片均保持可辨识。
- DOM 核验 `.collection-folder__shadow` 数量为 0，图标与标签之间不再有额外投影。
- 浅色 / 暗色主题均在真实 Chromium 核验；闭合状态的背板与前片直接相接，无白色 / 浅色带，暗色背景下也不透出黑缝，控制台无新增错误。
- 闭合 / 打开两份资源均以 Vite 内联 SVG 加载，任意 DPR 和界面缩放下由浏览器重新栅格化，不再受固定 512×512 位图清晰度限制。
- `pnpm lint`、`pnpm typecheck`、Web production build、Impeccable detector 与 `git diff --check` 均通过。
- Web 全量测试 35 个文件中 34 个通过、166 个测试中 165 个通过；唯一失败仍为既有 `src/lib/embedding-consent.test.tsx` storage lookup 断言，并伴随测试环境 `github.com` DNS 失败，与本次原型 SVG / CSS / DOM 变更无依赖。

## 边界

本轮仍是开发态 throwaway prototype 的视觉精修，不改变正式产品契约，不创建 ADR。

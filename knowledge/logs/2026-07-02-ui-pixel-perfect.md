# UI 像素级还原 · 2026-07-02

> 运行日志：Phase 1 全量 11 frame 设计稿像素级校对与落地。

## 目标

按 Ardot fileId `698428420561751` 对 Phase 1 全部画面进行像素级还原，补齐字体/间距 token，统一设计系统组件，逐页修正布局。

## 完成项

### 设计 token（ADR 0007）

- `ui-ux.md`：Typography / Spacing 从 TBD 定稿（Geist + Geist Mono，8 档字号，4px 栅格）。
- `packages/ui/globals.css`：引入 `@fontsource-variable/geist`、语义字号 CSS 变量、`text-brand-gradient` utility。
- `TAG_COLORS` 对齐契约 8 色分类调色板。

### packages/ui 基础组件

- Card：`rounded-lg`，去 shadow。
- Badge：`rounded-sm`（4px）。
- Button：link 变体 `text-link`；outline 扁平化；新增 `xs`/`icon-sm` 尺寸。
- Input：默认 `h-8`、card 底。
- Tooltip：popover 中性底。
- Sheet：右侧默认 `max-w-[480px]`。

### 应用外壳

- 侧栏 240px（`w-60`）、`bg-sidebar`、`p-4`；导航项 `h-9`。
- Topbar `px-6`；搜索框 400×32 + `/` 快捷键徽标；Sync outline 32px；Avatar 28px。

### 逐页

- Login `8:2`：28px 标题、48px OAuth、权限区 background 底、品牌渐变 Logo。
- Browse 卡片 `8:227`：20px 页标题、370px 网格、16px 卡片 padding、72×32 视图切换。
- Browse 列表 `8:59`：新增 `RepoTable`（表头 + 56px 行 + mono 数字 + 色块标签）。
- Drawer `8:364`：480px 宽、24px padding、色块 TagBadge、Notes inline 编辑。
- Settings/Dashboard/Tags/Collections/Import-Export/Empty/Loading：字号、间距、卡片尺寸对齐。
- `collection-detail`：按 Collections 风格 extrapolate。

## 验证

- `pnpm lint` / `typecheck` / `test` / `build` 全绿。
- 明暗两态截图对比建议本地 `pnpm --filter @asterism/web dev` @ 1440×900 人工复核。

## 遗留 / 说明

- 列表视图分页栏：设计稿有 Previous/页码/Next，当前为全量表格（虚拟滚动在卡片视图保留）；若数据量极大可后续加客户端分页。
- Sync 进度 banner 使用估算进度（无服务端流式计数）。

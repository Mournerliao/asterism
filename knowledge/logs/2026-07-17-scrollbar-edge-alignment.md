# 2026-07-17 · Outline / Browse 滚动条贴边

## 目标

复用 README 主文档“滚动层覆盖工作区、内容层负责限宽”的边界语义，让局部导航与页面滚动条明确归属于各自容器，而不是悬浮在内容旁。

## 评估

- 按 Impeccable layout 流程并行执行隔离布局评估与机械预扫描：detector 为 0 findings，目标文件无任意 `gap/p/m/z` 偏离；两路结论一致，问题来自滚动容器层级而非颜色、字号或间距体系。
- Outline 现有层级、32px 桌面导航密度、一级/二级缩进和 12px 卡片 padding 均合理；仅桌面 `<ul>` 被外层 padding 推离卡片边缘。
- Browse 的 20px 页面分组、16px 控制组、12px 行内分组与 `max-w-6xl` 扫描宽度均保留；只提升真实滚动层，不把表格拉满超宽屏。

## 实现

- README 桌面 Outline 为列表启用 edge-to-edge variant：`-mr-3` 让滚动盒跨过卡片 12px 右 padding，`pr-3` 补回条目安全距离；Popover / Sheet 继续使用原有内边距，标题仍固定不滚动。
- Browse populated / loading / empty 路径统一页面边界：根节点以 `-m-6` 穿过 AppLayout padding，固定控制区和滚动内容分别以内层 `px-6` + `max-w-6xl` 保持原位置与宽度。
- populated 路径的 `repoScrollElement` ref 继续绑定真正的全宽 `overflow-y-auto`；TanStack Virtual、`useScrollMargin`、表头 sticky、滚动归零和 stuck 状态监听无需改写。
- 更新 UI/UX scrollbar 契约，固定“全宽滚动层、限宽内容层”的 Browse 结构。

## 验证

- README 路由级 Vitest：23/23 通过，新增桌面 Outline 贴边结构断言。
- 完整 monorepo test / build：通过（Web 73 项测试，Vite 882 modules 生产构建成功）。
- 变更文件 Biome check：通过；Web TypeScript typecheck：通过。
- Impeccable layout 复扫：0 findings；任意 `gap/p/m/z` 复查无新增命中。
- 按用户要求未连接本地浏览器；生产 CSS 已包含 `-m-6` / `-mr-3` / `pr-3` 与全局 thin scrollbar 规则。

## 布局复核

- **Spacing**：Outline 仍由 `p-3` / `px-2` / `py-1` 维持 12/8/4px 节奏；Browse 保留 `gap-5` / `gap-4` / `gap-3` 的 20/16/12px 分组。
- **Hierarchy**：Outline 的标题、active 背景、父子缩进未变；Browse 的固定控制区仍先于仓库内容，scrollbar 不再形成错误的局部层级暗示。
- **Grid & structure**：`data-browse-scroll-container` 是全宽真实滚动层，`max-w-6xl` 只存在于其内容子层；Outline 仍只滚动 `<ul>`，不会带走标题。
- **Rhythm & variety**：列表/卡片切换、表格 sticky header 与现有 section gap 均未改动，产品型数据密度保持克制一致。
- **Density & responsiveness**：Outline 桌面 `min-h-8`、移动触发器 44px、Browse 桌面/移动虚拟行估算均未修改；内容仍由 `px-6` 在窄屏提供安全边距。

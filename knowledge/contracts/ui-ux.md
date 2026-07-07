# UI/UX Contract · 设计契约

> 本文件定义 Asterism 的设计 tokens、组件使用规范、明暗模式、可访问性目标与品牌语气。它是设计层 verification 的依据。
>
> **重要**：配色、圆角、字体与间距 tokens 已**定稿**（见 [ADR 0005](../decisions/0005-design-tokens-github-primer.md)、[ADR 0007](../decisions/0007-typography-spacing-tokens.md) 与下方各小节）。值以 **hex（sRGB）** 为权威，取自设计稿 / Primer 官方色板。

## Design Source · 设计源（Ardot）

> 视觉与 token 的**单一设计源**。下次需要查看 / 复刻 / 校对界面时，直接读取下方 Ardot 文件，不要凭空臆造。本节配色 / 圆角 tokens 即从此文件实测回填。

- **工具**：Ardot（腾讯）设计文件，通过 `user-ardot` MCP server 读取。
- **链接**：<https://ardot.tencent.com/file/698428420561751>
- **fileId**：`698428420561751` · **page**：`0:1`（Page 1）

**画面（top-level frame）与 nodeId**：

| 画面 | nodeId | 备注 |
| --- | --- | --- |
| Login Page | `8:2` | 登录页（左 brand / 右 GitHub OAuth） |
| Browse · 列表/表格 | `8:59` | ⚠️ frame 名为 "Browse - Card View"，**实为表格/列表视图** |
| Browse · 卡片 | `8:227` | ⚠️ frame 名为 "Dashboard"，**实为卡片视图** |
| Settings | `8:299` | 外观 / 账号 / AI（BYOK，Coming Soon） |
| Repo Detail Drawer | `8:364` | 仓库详情抽屉（tags / collections / notes） |
| Dashboard · Insights | `8:413` | ⚠️ frame 名为 "Browse - List View"，**实为统计仪表盘** |
| Tags Management | `12:2` | 标签管理 |
| Collections | `12:126` | 集合 |
| Import / Export | `12:182` | 导入导出（JSON / CSV / Markdown） |
| Browse · Empty State | `12:240` | 空状态 |
| Browse · Loading State | `12:267` | 同步加载 / 骨架屏 |

> ⚠️ 三个 frame 的**名字与内容不符**（`8:59` / `8:227` / `8:413`），以「备注」列描述的实际内容为准。

**读取方式（`user-ardot` MCP）**：

- `fetch_file_info` / `fetch_editor_state`：确认当前文件与 top-level 节点。
- `batch_read`（`properties: ["fills","strokes","cornerRadius","characters"]`）：取节点的精确色值 / 圆角 / 文案——本契约 tokens 即由此抽出。
- `capture_screenshot`（必填 `screenShotDir`，建议工作区下 cache 目录）：导出为 **webp**，本机用 `sips -s format png in.webp --out out.png` 转 png 再查看。
- 注意：`fetch_variables` 对本文件返回**空**（设计未定义变量），token 全部挂在节点 fill / cornerRadius 上，需用 `batch_read` 抽取。

## Design Tokens · 设计 tokens（配色 / 圆角已定稿）

> 配色与圆角已定稿为 **GitHub Primer 体系**；字体 / 间距仍为占位区，待用外部设计工具产出后填入。所有 tokens 以 CSS 变量 / shadcn theme 形式落到 `packages/ui` 的 `globals.css`，保持 light / dark 两套。值以 **hex（sRGB）** 为权威。

### Color Palette · 配色（定稿 · GitHub Primer）

> **dark** 取自 Ardot 设计稿实测，**light** 为 GitHub Primer 官方配对。在 shadcn 单 `--primary` 模型下：**主色用 Primer 绿**（对齐设计稿 Create / New / Sync / Import 等主操作按钮），**品牌蓝**作为 `--link` 与焦点环 `--ring`、**蓝→紫渐变**作为 brand 装饰（见下方 Brand & Category 小节）。

| Token | 用途 | Light 值 | Dark 值 |
| --- | --- | --- | --- |
| `--background` | 页面背景（画布） | `#FFFFFF` | `#0D1117` |
| `--foreground` | 主文字 | `#1F2328` | `#E6EDF3` |
| `--card` / `--popover` | 卡片 / 弹层底 | `#FFFFFF` | `#161B22` |
| `--card-foreground` / `--popover-foreground` | 卡片 / 弹层文字 | `#1F2328` | `#E6EDF3` |
| `--primary` | 主色 / 主按钮（Primer 绿） | `#1F883D` | `#238636` |
| `--primary-foreground` | 主色上的文字 | `#FFFFFF` | `#FFFFFF` |
| `--secondary` | 次要按钮底 | `#F6F8FA` | `#21262D` |
| `--secondary-foreground` | 次要按钮文字 | `#1F2328` | `#E6EDF3` |
| `--muted` | 弱化背景 | `#F6F8FA` | `#161B22` |
| `--muted-foreground` | 弱化文字 | `#59636E` | `#8B949E` |
| `--accent` | 悬停 / 选中底 | `#EFF2F5` | `#21262D` |
| `--accent-foreground` | 悬停 / 选中文字 | `#1F2328` | `#E6EDF3` |
| `--destructive` | 危险 / 删除（实心按钮底） | `#CF222E` | `#DA3633` |
| `--destructive-foreground` | 危险按钮文字 | `#FFFFFF` | `#FFFFFF` |
| `--border` / `--input` | 边框 / 输入边框 | `#D0D7DE` | `#30363D` |
| `--ring` | 焦点环（品牌蓝） | `#0969DA` | `#58A6FF` |
| `--link` | 链接 / 可点蓝（自定义扩展） | `#0969DA` | `#58A6FF` |

> 完整 token（含 `card` / `popover` / `input` / `*-foreground` / `chart-*` / `sidebar-*` / `--brand-*` / `--link` / `--radius`）以下方 CSS 为准。`--link` / `--brand-from` / `--brand-to` 为本契约在 shadcn 标准 token 之外的扩展；`@theme inline` 映射与 base layer 沿用 shadcn 标准脚手架。

```css
:root {
  --radius: 0.5rem;
  /* Surfaces · Primer light */
  --background: #ffffff;
  --foreground: #1f2328;
  --card: #ffffff;
  --card-foreground: #1f2328;
  --popover: #ffffff;
  --popover-foreground: #1f2328;
  /* Actions */
  --primary: #1f883d;
  --primary-foreground: #ffffff;
  --secondary: #f6f8fa;
  --secondary-foreground: #1f2328;
  --muted: #f6f8fa;
  --muted-foreground: #59636e;
  --accent: #eff2f5;
  --accent-foreground: #1f2328;
  --destructive: #cf222e;
  --destructive-foreground: #ffffff;
  /* Lines */
  --border: #d0d7de;
  --input: #d0d7de;
  --ring: #0969da;
  /* Extensions · brand + link */
  --link: #0969da;
  --brand-from: #0969da;
  --brand-to: #8250df;
  /* Charts / category (Primer light data colors) */
  --chart-1: #0969da;
  --chart-2: #1a7f37;
  --chart-3: #8250df;
  --chart-4: #bc4c00;
  --chart-5: #bf3989;
  /* Sidebar */
  --sidebar: #f6f8fa;
  --sidebar-foreground: #1f2328;
  --sidebar-primary: #1f883d;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #eff2f5;
  --sidebar-accent-foreground: #1f2328;
  --sidebar-border: #d0d7de;
  --sidebar-ring: #0969da;
}

.dark {
  /* Surfaces · Primer dark (Ardot 设计稿实测) */
  --background: #0d1117;
  --foreground: #e6edf3;
  --card: #161b22;
  --card-foreground: #e6edf3;
  --popover: #161b22;
  --popover-foreground: #e6edf3;
  /* Actions */
  --primary: #238636;
  --primary-foreground: #ffffff;
  --secondary: #21262d;
  --secondary-foreground: #e6edf3;
  --muted: #161b22;
  --muted-foreground: #8b949e;
  --accent: #21262d;
  --accent-foreground: #e6edf3;
  --destructive: #da3633;
  --destructive-foreground: #ffffff;
  /* Lines */
  --border: #30363d;
  --input: #30363d;
  --ring: #58a6ff;
  /* Extensions · brand + link */
  --link: #58a6ff;
  --brand-from: #58a6ff;
  --brand-to: #8c5cff;
  /* Charts / category (标签调色板取色) */
  --chart-1: #58a6ff;
  --chart-2: #3fb950;
  --chart-3: #d2a8ff;
  --chart-4: #f0883e;
  --chart-5: #f778ba;
  /* Sidebar */
  --sidebar: #010409;
  --sidebar-foreground: #e6edf3;
  --sidebar-primary: #238636;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #161b22;
  --sidebar-accent-foreground: #e6edf3;
  --sidebar-border: #21262d;
  --sidebar-ring: #58a6ff;
}
```

### Typography · 字体（定稿 · 取自设计稿）

| Token | 用途 | 值 |
| --- | --- | --- |
| `--font-sans` | 正文无衬线字体栈 | `"Geist Variable", ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | 数字 / 日期等宽字体 | `"Geist Mono Variable", ui-monospace, monospace` |
| `--text-display` | Login 主标题等 | `1.75rem`（28px）/ Bold |
| `--text-page-title` | 页面标题（Settings/Dashboard/Tags） | `1.5rem`（24px）/ Bold |
| `--text-section-title` | 区块标题（Browse 页头、空状态） | `1.25rem`（20px）/ SemiBold |
| `--text-drawer-title` | Drawer 标题 | `1rem`（16px）/ SemiBold |
| `--text-repo-name` | Drawer 仓库名 | `1.375rem`（22px）/ Bold |
| `--text-body` | 描述、卡片正文 | `0.8125rem`（13px）/ line-height `1.25rem` |
| `--text-caption` | 筛选、统计、副标题 | `0.75rem`（12px） |
| `--text-micro` | 表格列头 | `0.6875rem`（11px）/ Medium |

字重：Regular 400 · Medium 500 · SemiBold 600 · Bold 700。

### Spacing · 间距（定稿 · 4px 栅格）

| Token | 值 | 用途 |
| --- | --- | --- |
| `--spacing-unit` | `0.25rem`（4px） | 基准单位 |
| xs | 4px | 紧凑间隙 |
| sm | 8px | 筛选 chip 间距 |
| md | 12px | 卡片内 section 间距 |
| lg | 16px | 卡片 padding、网格 gap |
| xl | 20px | Browse 内容区 section gap |
| 2xl | 24px | 页面内容 padding（Browse）、Topbar 水平 padding |
| 3xl | 32px | Tags/Collections/Settings 页面 padding |

### Scrollbar · 滚动条（定稿）

> 全局样式落在 `packages/ui/src/styles/globals.css` `@layer base`，所有可滚动区域（页面内容区、Drawer、下拉菜单、代码预览等）统一应用。Authenticated app 的 `AppLayout` 主内容区**不滚动**（`overflow-hidden`），各页面根节点或 Browse 列表区自行承担纵向滚动；Browse 列表区可用 `-mx-6 px-6` 使滚动条贴主内容区右边缘。Drawer / Dropdown / Select / 代码预览 / 横向表格等局部交互可保留局部滚动。

| Token / 属性 | 值 | 说明 |
| --- | --- | --- |
| `--scrollbar-size` | `8px` | 滚动条宽高 |
| `--scrollbar-thumb` | `color-mix(in oklch, var(--muted-foreground) 24%, transparent)` | 滑块默认色，随明暗主题自动适配 |
| `--scrollbar-thumb-hover` | `color-mix(in oklch, var(--muted-foreground) 44%, transparent)` | 滑块悬停色 |
| 轨道 | `transparent` | 无默认灰轨道 |
| 形状 | `border-radius: 9999px` + `3px transparent border` + `background-clip: content-box` | pill 形态，保留 8px 命中区域但视觉更细 |
| Firefox | `scrollbar-width: thin` + `scrollbar-color` | 跨浏览器兜底 |

行为：**始终可见**细滚动条（非 hover 才显示）；hover 时滑块略加深。

应用主内容区（`AppLayout` 的 `<main>`）为 **flex 列容器、不滚动**（`overflow-hidden p-6`），各页面自行声明滚动区域。

Browse 页在有仓库数据时采用 **上下分栏**：标题 + 视图切换 + 筛选栏（及同步进度条）固定在上方 `shrink-0` 区域；仅下方列表区 `flex-1 overflow-y-auto` 滚动，虚拟列表绑定该区域。无需 `position: sticky`，也不依赖修改 `main` 的 padding 或给各页面补 `pt-6`。

其余页面根节点使用 `flex-1 min-h-0 overflow-y-auto` 整页滚动。

### Radius · 圆角（定稿 · 取自设计稿）

> 基准 `--radius: 0.5rem`（8px），派生采用 **shadcn 标准** 档位（非比例缩放）。设计稿实测：badge 4px / 按钮 · 输入 · 导航项 6px / 卡片 · 抽屉 8px，恰好对应下表。

| Token | 用途 | 值 |
| --- | --- | --- |
| `--radius-sm` | 小元素（badge / 标签） | `calc(var(--radius) - 4px)` = 4px |
| `--radius-md` | 按钮 / 输入 / 导航项 | `calc(var(--radius) - 2px)` = 6px |
| `--radius-lg` | 卡片 / 抽屉 / 大容器 | `var(--radius)` = 8px |
| `--radius-xl` | 更大容器 | `calc(var(--radius) + 4px)` = 12px |

### Brand & Category · 品牌渐变与分类色

> 这些是 shadcn 标准 token 之外的扩展，用于 logo 与「标签 / 分类」的多色编码。分类色取自设计稿标签点（dark），light 用 Primer 官方对应色。

**品牌渐变（logo）**：`--brand-from` → `--brand-to`，linear-gradient。light `#0969DA → #8250DF`；dark `#58A6FF → #8C5CFF`。

**标签 / 分类调色板**（8 色，用于标签圆点、分类高亮；`--chart-*` 取其前 5 色用于仪表盘）：

| 名称 | Light（Primer） | Dark（设计稿） |
| --- | --- | --- |
| blue | `#0969DA` | `#58A6FF` |
| green | `#1A7F37` | `#3FB950` |
| purple | `#8250DF` | `#D2A8FF` |
| orange | `#BC4C00` | `#F0883E` |
| sky | `#218BFF` | `#79C0FF` |
| amber | `#9A6700` | `#DB6D28` |
| pink | `#BF3989` | `#F778BA` |
| lime | `#2DA44E` | `#7EE787` |

### Dark Mode Tokens · 暗色（定稿）

> 暗色取值（取自 Ardot 设计稿实测）已并入上方各表的 "Dark 值" 列。需保证 light / dark 两套完整且对比度达标（见 a11y）。

## Component Usage Rules · 组件使用规范

- **以 shadcn/ui 为基底**：所有基础组件优先使用 shadcn/ui + Tailwind 实现，统一视觉与交互。
- **复用优先于新建**：新增 UI 前先检查 `packages/ui` 是否已有可复用组件；能复用 / 组合就不要重造。确需新建时落到 `packages/ui`，遵循本契约 tokens。
- **richer 库的使用边界**（明确何处可用更丰富的库）：
  - **统计 / 仪表盘** → 可用 **shadcn Charts**（基于 Recharts）做数据可视化。
  - **营销 / 落地页** → 可酌情用 **Magic UI / Aceternity** 等做动效与视觉，但**仅限 marketing 场景**，不渗入核心应用界面，避免风格割裂与体积膨胀。
- **不得凭空造新风格**：组件实现须对齐本契约（tokens 填妥后），不自行引入与设计系统冲突的配色 / 间距 / 圆角。

### Glass Control Pattern · 磨砂控制条模式

用于高频、紧凑、状态明确的控制区域：视图切换、筛选工具条、Drawer 内局部分区导航。实现以 `GlassControlRow` + `GlassRail` + `SegmentedControl` 为准，并对齐 Lumno options 源码参数：light page `#f1f5f9`、fixed noise overlay opacity `.24`、stuck row `rgba(241,245,249,.92)` + 1px sticky line、4px rail padding、12px rail radius、4px backdrop blur、4px indicator inset、8px/14px tab padding、10px tab radius、14px icon、240ms indicator 滑动。这些尺寸 / 圆角 / 透明度 / 变换 / 动效时长均为 Lumno 已调好的字面量，**保留原值，不映射到 Tailwind 预设刻度**。

**`variant: 'glass' | 'solid'`**（`GlassRail` / `SegmentedControl`，默认 `'glass'`）：

- `glass`：上述磨砂效果（backdrop-blur + 半透明背景），用于 Browse 视图切换、筛选栏等吸顶 / 悬浮控制条。
- `solid`：不透明背景、无 blur、无 sticky 语义，对应 Lumno 内联小控件（如 Settings 主题切换）；**不要**用 `GlassControlRow` 包裹 `solid` 控件——`GlassControlRow` 自带 `position: sticky`，只服务于真正需要吸顶的磨砂控制条。

**`--glass-*` 专属 token**（`globals.css` 的 `:root` / `.dark`，独立命名空间，不与核心 Primer 语义色混用，颜色数值 100% 取自 Lumno options 源码）：

| Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--glass-page-bg` | `#f1f5f9` | — | `asterism-glass-page` 背景（dark 走 `var(--background)`） |
| `--glass-rail-bg` | `rgba(255,255,255,.25)` | `#1f2732` | `GlassRail` glass 变体背景 |
| `--glass-rail-border` | `rgba(146,161,114,.25)` | `rgba(148,163,184,.2)` | `GlassRail` glass 变体边框 |
| `--glass-rail-solid-bg` | `rgba(15,23,42,.04)` | `#2f2f2f` | `GlassRail` solid 变体背景 |
| `--glass-rail-solid-border` | `rgba(15,23,42,.05)` | `rgba(255,255,255,.12)` | `GlassRail` solid 变体边框 |
| `--glass-indicator-bg` | `#ffffff` | `linear-gradient(180deg,#475569 0%,#4e6382 100%)` | `SegmentedControl` 滑块背景 |
| `--glass-indicator-border` | 无边框 | `#5e779d` | 滑块 dark 态描边（light 不加 `border`） |
| `--glass-indicator-shadow` | `0 1px 3px rgba(15,23,42,.06)` | `0 1px 2px rgba(0,0,0,.15)` | 滑块阴影 |
| `--glass-tab-active-text` | `#0f172a` | `#f8fafc` | 选中 tab 文字 |
| `--glass-tab-inactive-text` | `#8b94a4` | `#7f8898` | 未选中 tab 文字 |
| `--glass-stuck-bg` | `rgba(241,245,249,.92)` | `rgba(17,17,17,.9)` | `GlassControlRow[data-stuck]` 背景 |
| `--glass-sticky-line` | `rgba(15,23,42,.08)` | `rgba(241,245,249,.16)` | 吸顶下划线颜色 |
| `--glass-row-before-bg` | 复用 `--glass-page-bg` | `#111111` | `::before` 吸顶背景淡入层 |

组件通过 Tailwind 任意值 / 任意属性引用（如 `bg-[var(--glass-rail-bg)]`、`[background:var(--glass-indicator-bg)]`），CSS 规则里直接 `var(--glass-stuck-bg)`；渐变类的值需用 `[background:var(...)]` 任意属性而非 `bg-[var(...)]`，否则 Tailwind 会当作 `background-color` 处理导致渐变失效。

**`stuck` 判定**：`GlassControlRow` 的吸顶视觉状态（背景淡入 + 噪点 + 下划线生长）由调用方传入的 `stuck: boolean` 驱动，非自带检测。当控制条所在容器不使用原生 `position: sticky`（如 Browse 头部本身 `shrink-0` + 独立滚动列表区，见上文滚动策略），调用方需自行监听列表容器 `scrollTop`，`> 0` 时设为 `true`；订阅派生布尔值而非连续 scrollTop，避免逐像素 re-render。

边界：Lumno neutral page/noise 背景只作为 glass controls 的承托环境；不得引入水彩 / 插画 / 新图片资产，不得玻璃化 repo cards、列表行或大面积内容 section。颜色、圆角、阴影、动效必须来自该模式定义或现有 tokens，动效需支持 `prefers-reduced-motion`。

## Dark Mode · 明暗模式

- **默认跟随系统 + 可切换**：首次进入跟随操作系统偏好（system），并提供显式切换（light / dark）。
- **两套主题都受支持**：light 与 dark 均为一等公民，组件在两套主题下都需正确显示且对比度达标。
- 用户主题偏好持久化（见 `data-model.md` 的 `user_settings.theme`）。

## Accessibility · 可访问性

- **目标：WCAG 2.1 AA**（作为目标 / goal）。
- 关注点：颜色对比度达 AA、可键盘操作、焦点可见（`--ring`）、合理的语义化标签与 ARIA、虚拟滚动列表的可访问性。
- 验收时把 a11y 检查纳入 UI 生成循环（见下）。

## Brand Tone · 品牌语气

- **名称**：Asterism（星群 / 星组）。
- **主题意象**：stars / constellation（星标 / 星座 / 星图）——把零散的 GitHub star 连成有意义的"星座"。
- **语气**：克制、专业、面向开发者；克制使用动效与装饰，信息密度优先，体现"工具感"与"秩序感"。
- **隐喻一致性**：集合 / 分组等概念可呼应"星座"意象，但避免过度堆砌主题词导致功能表达含糊。

## UI Generation Loop · UI 生成循环

所有 UI 的生成 / 改造工作，走可复用的 UI 生成循环执行：**生成 → 对齐本设计契约（tokens / 组件规范）→ review 后落 `packages/ui` → a11y 验收**。

详见 `../loops/ui-generation.loop.md`。

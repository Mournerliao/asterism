# UI/UX Contract · 设计契约

> 本文件定义 Asterism 的设计 tokens、组件使用规范、明暗模式、可访问性目标与品牌语气。它是设计层 verification 的依据。
>
> **重要**：配色、圆角、字体与间距 tokens 已**定稿**（见 [ADR 0005](../decisions/0005-design-tokens-github-primer.md)、[ADR 0007](../decisions/0007-typography-spacing-tokens.md) 与下方各小节）。值以 **hex（sRGB）** 为权威，取自设计稿 / Primer 官方色板。

## Design Source · 设计源

> 本契约与 ADR 0009 是当前视觉 / token 的权威来源。下方 Ardot 文件保留为 Phase 1 的历史布局、排版和间距参考；其 Primer 配色与品牌渐变已被 Graphite Glass 体系取代，不得反向覆盖本契约。

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
| Repo Quick Look | evolved from `8:364` | 非模态仓库快速详情（tags / collections / notes） |
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

## Design Tokens · 设计 tokens（定稿）

> 配色、圆角、字体与间距均已定稿。2026-07-10 起配色采用 **Asterism Graphite Glass**：带品牌蓝色相的石墨中性色、单一电光蓝强调与限定在交互层的磨砂玻璃。所有 tokens 落到 `packages/ui/src/styles/globals.css`，light / dark 均为一等主题；值以 **hex（sRGB）** 为权威，玻璃层使用明确的 `rgba` 覆盖色。

### Color Palette · 配色（定稿 · Graphite Glass）

> 色彩策略为 **Restrained**：蓝色只用于主操作、链接、焦点、当前选择与 info 状态；success / warning / destructive 使用独立语义色；大面积内容保持带微量蓝色相的石墨中性色。

| Token | 用途 | Light 值 | Dark 值 |
| --- | --- | --- | --- |
| `--background` | 页面背景（画布） | `#F5F6F8` | `#0B0E13` |
| `--foreground` | 主文字 | `#161A22` | `#F2F4F7` |
| `--card` | 实体内容面板 | `#FCFCFD` | `#12161D` |
| `--popover` | 弹层内容底 | `#FCFCFD` | `#151A22` |
| `--card-foreground` / `--popover-foreground` | 面板文字 | `#161A22` | `#F2F4F7` |
| `--primary` | 主色 / 主按钮（电光蓝） | `#2563EB` | `#2563EB` |
| `--primary-foreground` | 主色上的文字 | `#FFFFFF` | `#FFFFFF` |
| `--secondary` | 次要交互底 | `#E9EDF3` | `#1A2029` |
| `--secondary-foreground` | 次要交互文字 | `#161A22` | `#F2F4F7` |
| `--muted` | 弱化背景 | `#EDF0F4` | `#171C24` |
| `--muted-foreground` | 弱化文字 | `#606774` | `#9AA3AF` |
| `--accent` | 悬停 / 选中底 | `#E3E9F3` | `#1D2A3B` |
| `--accent-foreground` | 悬停 / 选中文字 | `#161A22` | `#F2F4F7` |
| `--destructive` | 危险 / 删除 | `#D13B43` | `#E0525A` |
| `--destructive-foreground` | 危险按钮文字 | `#FFFFFF` | `#0B0E13` |
| `--success` | 成功状态 | `#18794E` | `#52C58B` |
| `--warning` | 警告状态 | `#9A5A05` | `#F2B84B` |
| `--info` | 信息 / 进度状态 | `#2563EB` | `#6EA8FE` |
| `--border` | 边框 | `#D7DBE2` | `#2A303A` |
| `--input` | 输入边框 | `#CCD2DC` | `#353C48` |
| `--ring` | 焦点环 | `#3B82F6` | `#60A5FA` |
| `--link` | 链接 / 可点蓝 | `#1E54C7` | `#6EA8FE` |
| `--brand` | 单色 Logo | `#2563EB` | `#60A5FA` |

> `--chart-1..5` 使用蓝色阶加一个石墨中性色；`--sidebar-*` 使用与画布同色相、不同明度的第二中性层。实现必须通过 `@theme inline` 暴露语义色，不得在业务组件中复制核心色值。

### Typography · 字体（定稿 · 取自设计稿）

| Token | 用途 | 值 |
| --- | --- | --- |
| `--font-sans` | 正文无衬线字体栈 | `"Geist Variable", ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | 数字 / 日期等宽字体 | `"Geist Mono Variable", ui-monospace, monospace` |
| `--text-display` | Login 主标题等 | `1.75rem`（28px）/ Bold |
| `--text-page-title` | 页面标题（Settings/Dashboard/Tags） | `1.5rem`（24px）/ Bold |
| `--text-section-title` | 区块标题（Browse 页头、空状态） | `1.25rem`（20px）/ SemiBold |
| `--text-drawer-title` | Drawer 标题 | `1rem`（16px）/ SemiBold |
| `--text-repo-name` | Repo Inspector 仓库名 | `1.125rem`（18px）/ SemiBold |
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

### Brand & Category · 品牌与分类色

**Logo**：节点与连线统一使用 `--brand`；连线以较低 opacity 表达层级。禁止蓝紫渐变、gradient text 与装饰性 glow。

**新建标签调色板**：`blue #2563EB`、`green #18794E`、`purple #6D4CC7`、`orange #B65F18`、`sky #167C9A`、`amber #9A5A05`、`pink #B6406A`、`lime #3F7F55`。既有用户存储的标签颜色不迁移；语言与标签色只用于小面积信息编码，不用于 Dashboard 大面积图形。

### Dark Mode Tokens · 暗色（定稿）

> 暗色不是浅色反转：深度由 `#0B0E13 → #12161D → #151A22` 的表面明度建立，不给实体卡片增加宽阴影。需保证 light / dark 两套完整且对比度达标（见 a11y）。

## Component Usage Rules · 组件使用规范

- **以 shadcn/ui 为基底**：所有基础组件优先使用 shadcn/ui + Tailwind 实现，统一视觉与交互。
- **复用优先于新建**：新增 UI 前先检查 `packages/ui` 是否已有可复用组件；能复用 / 组合就不要重造。确需新建时落到 `packages/ui`，遵循本契约 tokens。
- **richer 库的使用边界**（明确何处可用更丰富的库）：
  - **统计 / 仪表盘** → 可用 **shadcn Charts**（基于 Recharts）做数据可视化。
  - **营销 / 落地页** → 可酌情用 **Magic UI / Aceternity** 等做动效与视觉，但**仅限 marketing 场景**，不渗入核心应用界面，避免风格割裂与体积膨胀。
- **不得凭空造新风格**：组件实现须对齐本契约（tokens 填妥后），不自行引入与设计系统冲突的配色 / 间距 / 圆角。

### Glass Control Pattern · 磨砂控制条模式

玻璃是**交互材质**，不是默认内容容器。适用范围：Topbar、搜索 / 筛选 / 切换器、吸顶控制行、Dropdown / Select / Tooltip / Toast、Dialog / Drawer 等浮层；Repo Card、Dashboard 图表主体、Settings 内容块保持实体 `card` 表面。背景保持纯净石墨，不使用噪点、星尘、彩色光晕或渐变文字。

### Session Recovery Pattern · 会话恢复模式

GitHub provider token 缺失只影响同步能力，不属于全局应用故障。不得使用横跨 App Shell、推挤页面内容的持久 banner；恢复状态由原 Sync 入口就地承载，页面高度保持稳定。

- Topbar：正常显示 Sync；需要恢复时原位切换为 warning 风格的 Reconnect GitHub，移动端保留图标、tooltip 与 aria-label，pending 原位显示 Connecting。
- User Menu：以简短标题和说明解释 GitHub 连接已过期，并提供同一恢复动作作为备用入口；技术性的 provider token / authorization 描述不得暴露给普通用户。
- Browse / Dashboard 空状态：需要恢复时直接显示 Reconnect GitHub，不隐藏唯一主操作。
- Toast 只报告恢复启动失败，不承担持久状态提示；恢复状态不得通过 modal 阻断浏览已有仓库。

实现保留 `GlassControlRow` + `GlassRail` + `SegmentedControl` API，以及 4px rail padding、12px rail radius、4px indicator inset、8px/14px tab padding、10px tab radius、14px icon 与 240ms indicator 滑动。控制条 blur 为 8px；浮层与吸顶背景为 12px。动效使用 `--ease-out-quart`，交互反馈 120–240ms，并支持 `prefers-reduced-motion`。

**`variant: 'glass' | 'solid'`**（`GlassRail` / `SegmentedControl`，默认 `'glass'`）：

- `glass`：半透明背景 + hairline border + 8px blur，是应用内分段切换器的统一视觉标准；Browse 视图切换与 Settings 主题切换均使用该变体，文本或图标只改变内容表达，不改变轨道与选中态材质。
- `solid`：不透明背景、无 blur，仅保留给确有实体表面语义的内联小控件；不得作为页面间分段切换器的另一套默认样式。**不要**用 `GlassControlRow` 包裹 `solid` 控件——`GlassControlRow` 自带 `position: sticky`，只服务于真正需要吸顶的磨砂控制条。

**`--glass-*` 专属 token**：

| Token | Light | Dark | 用途 |
| --- | --- | --- | --- |
| `--glass-page-bg` | `#F5F6F8` | `#0B0E13` | 纯净石墨画布 |
| `--glass-surface` | `rgba(252,252,253,.72)` | `rgba(18,22,29,.68)` | 控件 / Topbar |
| `--glass-surface-strong` | `rgba(252,252,253,.90)` | `rgba(18,22,29,.90)` | 浮层 / 吸顶层 |
| `--glass-border` | `rgba(22,26,34,.12)` | `rgba(242,244,247,.12)` | hairline border |
| `--glass-highlight` | `rgba(255,255,255,.80)` | `rgba(242,244,247,.08)` | 顶部 inset highlight |
| `--glass-indicator-bg` | `#EAF1FF` | `#172A46` | 蓝色选中滑块 |
| `--glass-indicator-border` | `#BDD0F8` | `#2E5FAD` | 滑块描边 |
| `--glass-tab-active-text` | `#1E54C7` | `#D7E7FF` | 选中 tab 文字 |
| `--glass-tab-inactive-text` | `#606774` | `#9AA3AF` | 未选中 tab 文字 |
| `--glass-stuck-bg` | `rgba(245,246,248,.94)` | `rgba(11,14,19,.94)` | 吸顶背景 |

**`stuck` 判定**：由调用方传入 `stuck: boolean`；监听列表 `scrollTop` 时只订阅 `> 0` 的派生布尔值，避免逐像素 re-render。吸顶仅做背景淡入与 hairline 生长，不恢复噪点层。

### Repo Card Pattern · 仓库卡片模式

Browse 卡片采用舒展但高效的固定节奏：桌面 / 平板目标高度 208px，窄屏允许按内容安全增高；加载骨架与实体卡片使用相同分区，虚拟化行高以实测结果校准。信息层级固定为仓库身份 → 两行描述 → 单行整理上下文 → 单基线 Footer，不因字段缺失插入占位文案。卡片内部以 12px 为主要垂直节奏，让内容、整理信息与辅助元数据形成清晰分区。

- 仓库身份：弱化 owner、强调 repo name；语言色点只作为小面积编码，Archived 使用既有 outline badge。
- 描述：固定最多两行；仅当文本真实溢出时，hover 展示完整描述 tooltip，未溢出时不创建冗余浮层。完整文本保留在 DOM 中供辅助技术读取。
- 整理上下文：用户自定义标签优先，GitHub topics 仅补充剩余空间；同名项按大小写不敏感去重，溢出统一折叠为 `+n` 并通过 tooltip 展示。集合数量与笔记存在状态位于该行右侧，集合名称与笔记正文仍留在 Repo Inspector。
- 单基线 Footer：Stars / Forks 位于左侧，Updated / Starred 组成右侧不可换行的紧凑时间组（如 `Updated 2w · Starred 4w`）；完整相对时间通过 tooltip 与无障碍标签提供。仅极窄单列允许两个信息组整体上下排列，不允许时间字段自行散落换行。
- 交互语义：整卡详情触发器与 GitHub 外链必须是并列交互，不得把链接嵌套在 `role=button` 容器内；两条路径均需键盘可达并有可见焦点。

### Repo List Pattern · 仓库列表模式

Browse 列表是紧凑生产力视图，不是 GitHub 元数据表格的复刻。每行必须优先回答仓库身份、技术属性与近期 activity；个人整理信息只在真实存在时作为 Repository 的次级上下文出现，不得以空状态占用独立列。桌面目标行高为 64px，移动端按内容安全增高并使用实测高度驱动虚拟滚动。

- 仓库身份与点击语义：整行是打开 Asterism Repo Inspector 的主操作，支持 pointer click 与聚焦后的 Enter / Space；仓库名称与卡片视图保持一致，作为唯一的 GitHub 外链并新窗口打开，不再额外显示重复的 external-link 图标。名称链接与整行详情触发器必须并列，点击或键盘激活名称只打开 GitHub。行继续保持原生 `row` 语义，不改写为 `role=button`；Archived 使用既有 outline badge，描述保持单行截断。
- 整理上下文：用户自定义标签、集合数量与笔记存在状态收进 Repository 次级信息，不混入 GitHub topics；标签按真实可用宽度折叠为 `+n`。三者都不存在时不渲染占位文案，不设置 Organization 独立列。
- Activity：Updated 与 Starred 同时可见，完整相对时间通过 tooltip 与无障碍文本提供；按更新时间排序时，Updated 不得被响应式布局隐藏。
- 表面与对齐：列表容器使用与 Repo Card 一致的 `--card` 内容表面，圆角必须裁切表头、行 hover 与虚拟占位内容；表头和 cell 必须复用同一列模板与水平内边距，并统一左对齐。表头使用独立的 muted surface、micro 字号与 medium 字重，必须与正文形成可辨识层级。
- 响应式列：按列表容器而非浏览器视口切换；容器 `≥1024px` 显示 Repository / Language / Stars / Activity，`640–1023px` 视觉隐藏 Language、保留其表头与 cell 语义，`<640px` 视觉隐藏表头并重排为身份、描述/整理上下文、Language / Stars / Activity。任何详情呈现都不得改变主内容的 x、宽度或产生横向滚动。
- 可访问性：语义表格提供总行数与虚拟行索引；隐藏列必须在辅助技术树中保留正确的四列表头关联。名称、外链、标签溢出等交互各自键盘可达并使用 `--ring`；触控设备上的 segmented control 与紧凑入口命中区域不小于 44px。

### Repo Quick Look Pattern · 仓库快速详情模式

Repo Quick Look 是 Browse 与集合详情共享的瞬时、非模态详情层。它服务于快速扫读与轻量整理，不是持久工作区；打开前后主内容的位置与宽度必须完全不变。

- 自适应呈现：`≥768px` 通过 body portal 默认固定在右侧与底部各 `24px`，宽 `480px`；高度随内容收缩，最大为 `min(46rem, 100svh - 48px)`，超过上限时仅主体内部滚动，不允许用固定高度制造空白。悬浮层无遮罩、焦点锁定或布局占位。`<768px` 使用底部 Sheet，最大高度 `90svh`。
- 表面与动效：悬浮层使用 Graphite Glass overlay、`12px` 圆角与既有 `--glass-shadow`，不得添加装饰性玻璃或更大阴影。打开与关闭从当前可见 repo trigger 以 `220ms` ease-out 位移和轻微缩放展开/收回；trigger 不可见时退化为淡入淡出。相邻仓库切换只对内容做 `120ms` crossfade，窗口不移动；reduced motion 下直接切换。
- 连续浏览：当前卡片或列表行使用完整 inset ring / surface 表达选中，不使用侧边色条；`J` / `K` 与面板内上一项 / 下一项控制沿当前可见排序移动，并在虚拟列表中把新选中项滚入视野。输入框、菜单与对话框聚焦时不得劫持快捷键。
- 选择与关闭：点击当前已选仓库再次关闭，点击其他仓库直接切换；点击悬浮窗外或按 Esc 关闭，repo trigger 自身不走外部关闭处理。任何路由变化都关闭 Quick Look，不跨页面保留。键盘 Enter / Space 打开时把焦点移入窗口，关闭后返回原 trigger；pointer 打开保留列表操作上下文。
- 窗口移动：桌面与平板悬浮层以仓库身份所在的完整首行作为拖动区域，不添加 drag icon 或其他冗余能力提示；仓库链接短按仍打开 GitHub，pointer 位移达到 `4px` 后才进入拖动并抑制链接点击，关闭按钮不参与拖动。浮窗限制在视口 `12px` 安全边距内，窗口尺寸变化后自动收回视口，手机底部 Sheet 不提供拖动。
- 编辑安全：笔记草稿切换仓库、关闭面板、浏览器后退或离开页面前必须拦截；用户可选择保存并继续、放弃并继续或继续编辑。三个互斥动作必须组成同一个紧凑决策组，桌面按 tertiary → secondary → primary 右对齐，窄屏改为同宽单列，不得用 `space-between` 把其中一个动作孤立。保存失败时保留草稿与原选择，不得静默丢失。
- 内容层级：头部只保留仓库身份、GitHub 外链与关闭；`owner / repo` 保持单行，弱化 owner、以链接蓝强调 repo name，并让整段仓库身份成为唯一 GitHub 外链，不再额外显示重复的 external-link 图标。仓库身份使用 18px/SemiBold，描述使用 13px body，常规元数据使用 12px caption，Activity 与紧凑元数据使用 11px micro，数字和日期值使用 Geist Mono + tabular numerals。更新时间默认展示紧凑值（如 `Updated 2d`），完整相对时间保留在 title 与辅助技术文本中。主体固定为 Overview → Tags → Collections → Notes 的单列结构。
- 可访问性：桌面和平板悬浮层使用命名的非模态 `dialog`，手机沿用 Sheet 语义；所有图标按钮必须有 i18n 标签与 tooltip，选中行 / 卡片暴露 `aria-selected` 或等价状态，并通过 `aria-controls` / `aria-expanded` 关联面板。

### Browse Filter Pattern · 浏览筛选模式

Browse 筛选条采用两级信息架构，避免把所有维度平铺成同等权重：主栏只直出语言、Topic、用户标签、更多筛选与排序；Star 阈值、更新时间和仓库状态收进“更多筛选”，触发器显示已启用的次级筛选数量。排序保持独立可见，不计入“清除筛选”的 active 状态。

- 语言与 Topic 使用固定高度的可搜索 facet picker；初次打开最多渲染 20 个选项，搜索从完整集合中匹配并最多渲染 50 个结果，禁止在弹层首开时挂载全部高基数 facets。
- 搜索输入的放大镜统一使用 `black/60`，并置于 Input 表面之上，避免被半透明 Glass 背景覆盖洗白。
- Topic 默认沿用出现频率排序，语言沿用字母排序；当前选中项即使不在首屏窗口内也必须保持可见。
- 筛选栏采用无外框的开放式工具栏：语言、Topic、标签、更多筛选与清除组成左侧筛选组，排序作为独立右侧组；使用空间而非额外容器边框表达分组。所有 trigger 统一使用现有 `size="sm"` 高度，不得额外覆盖造成 Select 与 Button 尺寸不一致。空间不足时组级换行，单个 trigger 不横向溢出。
- 未选择的 facet trigger 使用简短类别名（Language / Topic），菜单内仍保留“全部”选项；已启用的筛选以既有 primary token 的轻量边框和背景表达 active 状态。GlassRail 仅用于具有共享轨道语义的 Segmented Control，不包裹独立下拉控件。
- 弹层使用既有 Graphite Glass token、可见焦点与 reduced-motion 规则。
- “更多筛选”内的 Select 属于子浮层：点击父 Popover 表面只关闭当前子 Select，父层保持打开；点击父子浮层之外才关闭两层。父层必须在 Radix Select 的 modal pointer-event 隔离期间保持可交互。
- 所有搜索提示、空结果、active count 与清除动作必须外部化到 en / zh-CN；键盘可完成打开、搜索、选择、组合次级筛选与清除。

### Loading Feedback Pattern · 加载反馈模式

加载反馈按状态来源分层，必须保持布局稳定、进度真实，并避免把同一个等待过程叠加成多段不一致的骨架。

- 会话恢复：应用尚无法判断是否进入 authenticated shell 时使用居中的轻量 spinner 与明确状态文案；spinner 需要 `role=status`、`aria-live=polite`，并在 `prefers-reduced-motion` 下停止旋转。
- 路由模块：默认入口 Browse 直接随 shell 加载，不显示独立 route fallback；其余懒加载页面使用与目标页面一致的结构化 fallback，禁止使用单个大矩形代替整页结构。
- 初始数据：骨架必须镜像最终内容的表面、分区、行高与响应式重排。Browse 宫格保持 208px 卡片节奏，列表保持表头、64px 桌面行与移动端堆叠；Collections、Tags、Dashboard、Collection Detail 与 Import / Export 使用各自专属骨架，不复用无语义的空 Card。
- 后台刷新：已有可用数据时继续显示当前内容，不重新覆盖页面骨架；只在原操作入口或局部状态区表达 fetching。
- 空态判定：页面必须等待决定空态所需的全部首屏查询结束，禁止先显示“无数据”再跳到真实内容。
- 未知进度：后端未提供真实 `processed / total` 时使用 indeterminate 状态，不得用当前记录数推算伪百分比或伪计数。
- 写操作：保存、删除、恢复等操作使用按钮内部 spinner + 动作文案，保持按钮宽度稳定，设置 `aria-busy` 并阻止重复提交；pending 期间不得允许关闭仍在提交的对话框或再次选择导入文件。
- 骨架语义：基础 Skeleton 使用 `muted` 表面、克制 pulse 与 `motion-reduce:animate-none`，形状本身 `aria-hidden`；骨架区域统一提供单一的屏幕阅读器 loading 状态，避免逐块播报。

### Empty State Action Pattern · 空状态操作模式

空状态必须提供单一、明确的主操作，不得在页头与空状态主体重复显示同一个 primary action。Collections / Tags 等创建型页面在数据为空时由空状态主体承担首次创建入口；存在数据后，创建入口移至页头以支持高频追加。筛选或搜索无结果不等同于数据为空，此时保留页头创建入口，并在内容区表达无匹配结果。

## Dark Mode · 明暗模式

- **默认跟随系统 + 可切换**：首次进入跟随操作系统偏好（system），并提供显式切换（light / dark）。
- **两套主题都受支持**：light 与 dark 均为一等公民，组件在两套主题下都需正确显示且对比度达标。
- 用户主题偏好持久化（见 `data-model.md` 的 `user_settings.theme`）。

## Accessibility · 可访问性

- **目标：WCAG 2.1 AA**（作为目标 / goal）。
- 关注点：颜色对比度达 AA、可键盘操作、焦点可见、合理的语义化标签与 ARIA、虚拟滚动列表的可访问性。
- `Input`、`Textarea`、`SelectTrigger` 等表单控件以 `foreground/60` 中性边框变化表达 `focus-visible`，不使用外扩蓝色焦点环；错误态 destructive 边框优先。Button、Tabs、Toggle 与其他独立交互仍使用 `--ring`，不得完全移除键盘焦点反馈。
- 验收时把 a11y 检查纳入 UI 生成循环（见下）。

## Brand Tone · 品牌语气

- **名称**：Asterism（星群 / 星组）。
- **主题意象**：stars / constellation（星标 / 星座 / 星图）——把零散的 GitHub star 连成有意义的"星座"。
- **语气**：克制、专业、面向开发者；克制使用动效与装饰，信息密度优先，体现"工具感"与"秩序感"。
- **隐喻一致性**：集合 / 分组等概念可呼应"星座"意象，但避免过度堆砌主题词导致功能表达含糊。

## UI Generation Loop · UI 生成循环

所有 UI 的生成 / 改造工作，走可复用的 UI 生成循环执行：**生成 → 对齐本设计契约（tokens / 组件规范）→ review 后落 `packages/ui` → a11y 验收**。

详见 `../loops/ui-generation.loop.md`。

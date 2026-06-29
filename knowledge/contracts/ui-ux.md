# UI/UX Contract · 设计契约

> 本文件定义 Asterism 的设计 tokens、组件使用规范、明暗模式、可访问性目标与品牌语气。它是设计层 verification 的依据。
>
> **重要**：配色与圆角 tokens 已**暂定**为 shadcn 默认 *neutral* 主题（Tailwind v4 / oklch，见下表与完整 CSS），作为占位以便先推进开发；**最终品牌配色仍待定**。字体 / 间距等其余 tokens 暂为 **TBD（待填）**，由用户用外部设计工具（如 [tweakcn](https://tweakcn.com)）产出后填入。在对应 tokens 落定前，UI 实现一律采用本契约给出的值，不得自行臆造视觉风格。

## Design Tokens · 设计 tokens（部分暂定）

> 配色与圆角已暂用 shadcn 默认主题占位（见下）；字体 / 间距仍为占位区，待用外部设计工具产出后填入。所有 tokens 以 CSS 变量 / shadcn theme 形式落到 `packages/ui` 的 `globals.css`，保持 light / dark 两套。

### Color Palette · 配色（暂定 · shadcn 默认 neutral）

> 已**暂定**采用 shadcn 默认 *neutral* 主题作为占位，先推进开发；**最终品牌配色待定**，确定后整体替换本节。值以 Tailwind v4 / oklch 为准（括号内为近似 hex，仅供肉眼参考）。

| Token | 用途 | Light 值 | Dark 值 |
| --- | --- | --- | --- |
| `--background` | 页面背景 | `oklch(1 0 0)` ≈ #FFFFFF | `oklch(0.145 0 0)` ≈ #242424 |
| `--foreground` | 主文字 | `oklch(0.145 0 0)` ≈ #242424 | `oklch(0.985 0 0)` ≈ #FAFAFA |
| `--primary` | 主色 / 主按钮 | `oklch(0.205 0 0)` ≈ #343434 | `oklch(0.922 0 0)` ≈ #EBEBEB |
| `--primary-foreground` | 主色上的文字 | `oklch(0.985 0 0)` ≈ #FAFAFA | `oklch(0.205 0 0)` ≈ #343434 |
| `--secondary` | 次要色 | `oklch(0.97 0 0)` ≈ #F5F5F5 | `oklch(0.269 0 0)` ≈ #434343 |
| `--muted` | 弱化背景 | `oklch(0.97 0 0)` ≈ #F5F5F5 | `oklch(0.269 0 0)` ≈ #434343 |
| `--muted-foreground` | 弱化文字 | `oklch(0.556 0 0)` ≈ #8E8E8E | `oklch(0.708 0 0)` ≈ #B5B5B5 |
| `--accent` | 强调 / 高亮（悬停 / 选中底） | `oklch(0.97 0 0)` ≈ #F5F5F5 | `oklch(0.269 0 0)` ≈ #434343 |
| `--destructive` | 危险 / 删除 | `oklch(0.577 0.245 27.325)` ≈ #DC2B2B | `oklch(0.704 0.191 22.216)` ≈ #E5564B |
| `--border` | 边框 | `oklch(0.922 0 0)` ≈ #EBEBEB | `oklch(1 0 0 / 10%)`（白 10%） |
| `--ring` | 焦点环 | `oklch(0.708 0 0)` ≈ #B5B5B5 | `oklch(0.556 0 0)` ≈ #8E8E8E |

> 完整 token（含 `card` / `popover` / `input` / `*-foreground` / `chart-*` / `sidebar-*` / `--radius`）以下方 CSS 为准；脚手架阶段经 `shadcn init` 注入 `packages/ui` 的 `globals.css`，其中 `@theme inline` 映射与 base layer 用 shadcn 标准脚手架。

```css
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

### Typography · 字体（TBD）

| Token | 用途 | 值 |
| --- | --- | --- |
| `--font-sans` | 正文无衬线字体栈 | _TBD_ |
| `--font-mono` | 代码 / 仓库名等等宽字体 | _TBD_ |
| 字号阶梯 | h1 / h2 / h3 / body / caption | _TBD_ |
| 字重 | regular / medium / semibold / bold | _TBD_ |
| 行高 | 标题 / 正文 | _TBD_ |

### Spacing · 间距（TBD）

| Token | 值 |
| --- | --- |
| 间距基准单位（如 4px / 8px 栅格） | _TBD_ |
| 间距阶梯（xs / sm / md / lg / xl） | _TBD_ |

### Radius · 圆角（暂定 · shadcn 默认）

> 基准 `--radius: 0.625rem`（shadcn 默认）；下列为派生档位，最终可随品牌定稿调整。

| Token | 用途 | 值 |
| --- | --- | --- |
| `--radius-sm` | 小元素（标签 / 输入） | `calc(var(--radius) * 0.6)` ≈ 0.375rem |
| `--radius-md` | 卡片 / 按钮 | `calc(var(--radius) * 0.8)` ≈ 0.5rem |
| `--radius-lg` | 弹层 / 大容器 | `var(--radius)` = 0.625rem |

### Dark Mode Tokens · 暗色（TBD）

> 暗色取值已并入上方各表的 "Dark 值" 列。需保证 light / dark 两套完整且对比度达标（见 a11y）。

## Component Usage Rules · 组件使用规范

- **以 shadcn/ui 为基底**：所有基础组件优先使用 shadcn/ui + Tailwind 实现，统一视觉与交互。
- **复用优先于新建**：新增 UI 前先检查 `packages/ui` 是否已有可复用组件；能复用 / 组合就不要重造。确需新建时落到 `packages/ui`，遵循本契约 tokens。
- **richer 库的使用边界**（明确何处可用更丰富的库）：
  - **统计 / 仪表盘** → 可用 **shadcn Charts**（基于 Recharts）做数据可视化。
  - **营销 / 落地页** → 可酌情用 **Magic UI / Aceternity** 等做动效与视觉，但**仅限 marketing 场景**，不渗入核心应用界面，避免风格割裂与体积膨胀。
- **不得凭空造新风格**：组件实现须对齐本契约（tokens 填妥后），不自行引入与设计系统冲突的配色 / 间距 / 圆角。

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

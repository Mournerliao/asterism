# UI/UX Contract · 设计契约

> 本文件定义 Asterism 的设计 tokens、组件使用规范、明暗模式、可访问性目标与品牌语气。它是设计层 verification 的依据。
>
> **重要**：本契约的设计 tokens 部分目前为 **TBD（待填）**。配色 / 字体 / 间距 / 圆角 / 明暗等具体取值，由用户用外部设计工具（如 [tweakcn](https://tweakcn.com)）产出后填入下方占位表格。在 tokens 填妥前，UI 实现不得自行臆造一套视觉风格。

## Design Tokens · 设计 tokens（TBD）

> 占位区。请用外部设计工具生成主题变量后，把取值填入下表。建议以 CSS 变量 / shadcn theme 形式落到 `packages/ui`，并保持 light / dark 两套。

### Color Palette · 配色（TBD）

| Token | 用途 | Light 值 | Dark 值 |
| --- | --- | --- | --- |
| `--background` | 页面背景 | _TBD_ | _TBD_ |
| `--foreground` | 主文字 | _TBD_ | _TBD_ |
| `--primary` | 主色 / 主按钮 | _TBD_ | _TBD_ |
| `--primary-foreground` | 主色上的文字 | _TBD_ | _TBD_ |
| `--secondary` | 次要色 | _TBD_ | _TBD_ |
| `--muted` | 弱化背景 | _TBD_ | _TBD_ |
| `--muted-foreground` | 弱化文字 | _TBD_ | _TBD_ |
| `--accent` | 强调 / 高亮 | _TBD_ | _TBD_ |
| `--destructive` | 危险 / 删除 | _TBD_ | _TBD_ |
| `--border` | 边框 | _TBD_ | _TBD_ |
| `--ring` | 焦点环 | _TBD_ | _TBD_ |

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

### Radius · 圆角（TBD）

| Token | 用途 | 值 |
| --- | --- | --- |
| `--radius-sm` | 小元素（标签 / 输入） | _TBD_ |
| `--radius-md` | 卡片 / 按钮 | _TBD_ |
| `--radius-lg` | 弹层 / 大容器 | _TBD_ |

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

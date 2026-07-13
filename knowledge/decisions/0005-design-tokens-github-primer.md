# 0005 · 设计 token 定稿为 GitHub Primer 体系

- Status: Superseded by ADR 0009
- Date: 2026-06-30

## Context（背景）

`contracts/ui-ux.md` 的配色与圆角此前为**占位**：`0004` 脚手架阶段暂用 shadcn 默认
*neutral* 主题（灰阶、无色相、`--radius: 0.625rem`，oklch 表达），并在 `BACKLOG.md`
留「最终品牌配色待定」。

用户在 Ardot（腾讯）产出了一套完整的 11 画面设计稿（fileId `698428420561751`），
经 `user-ardot` MCP `batch_read` 实测，其视觉体系即 **GitHub Primer 暗色**（画布
`#0D1117`、面板 `#161B22`、边框 `#30363D`、文字 `#E6EDF3`、链接蓝 `#58A6FF`、
主操作按钮绿 `#238636`、危险红、logo 蓝→紫渐变；圆角 badge 4 / 按钮 6 / 卡片 8 px）。
对一个 GitHub Star 管理器而言，沿用 GitHub 自家设计语言契合度高。需要把这套已定稿的
配色 / 圆角回填进契约，作为后续 UI 实现的权威来源。

设计稿只提供了 dark；契约要求 light / dark 均为一等公民。

## Decision（决策）

将 `contracts/ui-ux.md` 的**配色与圆角 tokens 定稿为 GitHub Primer 体系**，取代 `0004`
引用的 neutral 占位：

1. **dark = 设计稿实测，light = Primer 官方配对**。dark 各 token 取自 Ardot 节点 fill；
   light 采用 GitHub Primer 官方 light 色板（bg `#FFFFFF`、fg `#1F2328`、border
   `#D0D7DE`、绿 `#1F883D`、蓝 `#0969DA`、红 `#CF222E` 等）与之配对。light 属「官方配对」
   而非凭空臆造。
2. **`--primary` = Primer 绿**（light `#1F883D` / dark `#238636`）。在 shadcn 单一
   `--primary` 模型下，绿对齐设计稿的主操作按钮（Create / New / Sync / Import）。
3. **品牌蓝作为 `--link` 与焦点环 `--ring`**（light `#0969DA` / dark `#58A6FF`）；
   **蓝→紫渐变**作为 logo brand 装饰，新增扩展 token `--brand-from` / `--brand-to`。
   `--link` / `--brand-*` 是 shadcn 标准 token 之外的扩展。
4. **`--radius` 调整为 `0.5rem`（8px）**，派生用 **shadcn 标准**档位
   （`sm = -4px = 4px`、`md = -2px = 6px`、`lg = var = 8px`、`xl = +4px = 12px`），
   精确对应设计稿 badge / 按钮 / 卡片圆角，取代旧的 `0.625rem` + 比例缩放派生。
5. **token 值改用 hex（sRGB）作为权威**，取代 neutral 占位的 oklch 表达——hex 是设计稿与
   Primer 官方的原生表达，精确无歧义；Tailwind v4 亦原生支持。
6. **新增标签 / 分类调色板（8 色）**，`--chart-1..5` 取其前 5 色用于仪表盘。
7. **设计源登记**：在 `ui-ux.md` 增「设计源（Design Source）」小节，记录 Ardot 链接、
   fileId、各画面 nodeId 与 `user-ardot` MCP 读取方式，作为 token 的单一设计源。

字体 / 间距 tokens **仍为 TBD**，不在本次范围。

## Consequences（影响）

正面：

- 配色 / 圆角脱离占位，成为有据（设计稿实测）可循的定稿；后续 UI 生成不再「凭空造风格」。
- 沿用 GitHub Primer，与产品域（GitHub Star 管理）天然契合，light / dark 两套完整。
- 设计源（Ardot 链接 + nodeId + 读取工具）写进契约，跨会话可被下一个 agent 自动发现复用。

负面 / 需注意：

- **代码尚未同步**：`packages/ui` 的 `globals.css` 仍是 `0004` 注入的 neutral oklch。
  需按本契约新 token 同步（已记入 `state/BACKLOG.md` 作为跟进项）。同步时确保 light / dark
  对比度达 WCAG 2.1 AA。
- **表达从 oklch 改为 hex**：与 `0004` 描述的「oklch 脚手架」表达不一致；如未来 `shadcn`
  工具链强依赖 oklch，可在同步 `globals.css` 时换算，但以本契约 hex 为准。
- **新增非标准 token**（`--link` / `--brand-*`）：需在 `@theme inline` 中显式映射，
  shadcn 升级 / 重新 `init` 时注意保留。

## Alternatives considered（备选方案）

1. **`--primary` 用品牌蓝、绿作「成功/确认」语义色**：更接近常规品牌蓝产品；但与设计稿
   主操作按钮（绿）不一致，落地时需对每个主按钮特判，偏离设计稿。
2. **`--primary` 保持中性（白底深字，仿 GitHub 登录按钮）**：最克制，但丢掉设计稿明确的
   绿色主操作语义，CTA 辨识度下降。
3. **只回填 dark，light 暂缺**：省事，但违背「light / dark 均为一等公民」；Primer 官方
   light 是成熟配对，现在补齐成本低、收益高。
4. **保留 oklch 占位、仅改数值**：与「以设计稿 hex 为权威」相悖，且换算引入误差与维护负担。

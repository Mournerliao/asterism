# Loop 运行日志 · 2026-06-30 · 设计 token 回填 + 设计源登记

> 运行日志层（Logs）。把 Ardot 设计稿（GitHub Primer 体系）的配色 / 圆角 token 回填进
> `contracts/ui-ux.md`，补 ADR 记录品牌色定稿，并登记设计源供后续 agent 自动发现。

- **日期**：2026-06-30
- **阶段**：设计契约对齐（不改业务代码）
- **范围**：`knowledge/` 文档（契约 + ADR + 状态 + 日志）；**不含** `packages/ui` 代码同步

## Goal（目标）

把已确定的视觉体系写进契约作为权威来源，消除「配色占位 / 最终待定」状态，并让下一个会话
能自动找到设计稿与读取方式。完成判据：

- `ui-ux.md` 配色 / 圆角脱离 neutral 占位，反映设计稿实测值（light/dark 两套完整）。
- 有 ADR 记录品牌色定稿与取舍。
- 设计源（Ardot 链接 + nodeId + 读取工具）写进契约，状态文件指针同步。

## Steps（已执行步骤）

1. **抽取设计源**：经 `user-ardot` MCP 对 fileId `698428420561751` 用 `fetch_editor_state`
   列出 11 个 top-level frame、`capture_screenshot` 截图（webp→`sips` 转 png）逐页查看、
   `batch_read`（`fills`/`strokes`/`cornerRadius`）实测精确色值与圆角。`fetch_variables`
   返回空（设计未定义变量）。
2. **`contracts/ui-ux.md`**：
   - 顶部说明：配色 / 圆角「暂定 neutral / 最终待定」→「定稿为 GitHub Primer，值以 hex 为权威」。
   - 重写 Color Palette 表 + `:root`（Primer light）/`.dark`（设计稿实测）CSS 块；
     `--primary` = Primer 绿；新增扩展 token `--link` / `--brand-from` / `--brand-to`；
     `--chart-1..5`、`--sidebar-*` 取设计稿色。
   - Radius：`--radius: 0.5rem`（8px）+ shadcn 标准派生（4/6/8/12px）。
   - 新增「Brand & Category」小节（logo 渐变 + 8 色标签调色板，dark/light 两列）。
   - 新增「Design Source」小节（Ardot 链接 / fileId / 11 画面 nodeId / 读取工具；标注
     `8:59`、`8:227`、`8:413` 三处 frame 名与内容不符）。
3. **`decisions/0005-design-tokens-github-primer.md`**：新建 ADR，记录定稿（绿主色、Primer
   light 配对、hex 取代 oklch、`--radius` 改 0.5rem、新增非标准 token）与备选取舍。
4. **状态同步**：`NOTES.md`（便签改「已定稿」+ 关键指针加 ADR 0005 与设计源）、
   `BACKLOG.md`（「品牌配色待定」勾销 + 新增「`globals.css` 同步新 token」跟进项）。

## Verification（验证）

- [x] `ui-ux.md` light/dark 两套 token 完整，dark 与设计稿实测一致，light 为 Primer 官方配对。
- [x] `--primary` 映射为绿、蓝作 `--link`/`--ring`、渐变作 `--brand-*`，符合既定决策。
- [x] 设计源链接 / fileId / nodeId / 读取工具齐全，三处命名不符已标注。
- [x] ADR 0005 沿用既有格式（Status/Date/Context/Decision/Consequences/Alternatives）。
- [x] 状态文件（NOTES / BACKLOG）指针与本次变更一致。

## Outcome（结果）

配色 / 圆角 token 定稿落入契约，设计源可被后续 agent 自动发现复用。**字体 / 间距仍 TBD**。

## Follow-ups（后续）

1. 把 `packages/ui` 的 `globals.css` 从 neutral oklch 同步为本契约的 Primer hex token
   （含 `--link` / `--brand-*` 与 `@theme inline` 映射），核对 WCAG 2.1 AA 对比度。见 `BACKLOG.md`。
2. 字体 / 间距 tokens 待外部设计工具产出后回填 `ui-ux.md`。

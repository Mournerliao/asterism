# UI Generation Loop

> 用 AI/工具生成 UI，对齐设计契约，落地为可复用组件，并通过 a11y/lint/typecheck 验收。
> 基于 `_template.loop.md` 派生。设计基底为 shadcn/ui + Tailwind。

- Status: Active
- Owner/Applicable: 任意具备 v0 / shadcn MCP 能力的 agent
- Last updated: 2026-06-29

## Goal（可验证的完成条件）

把一个 UI 需求（页面/组件）落地为 `packages/ui` 中**已 review、可复用**的组件，且：

- 严格使用 `knowledge/contracts/ui-ux.md` 定义的设计 tokens（色板/字体/间距/圆角/明暗），不引入契约外的新风格；
- 复用 shadcn/ui 组件与 Tailwind 实现，不自造平行设计体系；
- 通过 a11y（WCAG AA）、lint、typecheck、视觉 review 全部 gate。

## Inputs / Context（读哪些契约与状态）

执行前必须读取：

- `knowledge/contracts/ui-ux.md`：设计 tokens、组件使用规范、a11y 目标、品牌语气（**唯一设计事实源**）。
- `knowledge/contracts/conventions.md`：编码/命名/i18n（文案外部化，禁硬编码）/发布规范。
- `knowledge/contracts/architecture.md`：`packages/ui` 的职责边界（仅放共享 UI，不含平台专有 API）。
- `knowledge/state/PROGRESS.md` / `BACKLOG.md`：当前 UI 进展与已知问题。
- 现有 `packages/ui` 既有组件与 shadcn 配置：优先复用，避免重复造件。

## Steps（每轮迭代动作）

1. **明确需求**：把目标组件/页面拆为明确的 props/状态/交互，列出涉及的设计 token 与既有可复用组件。
2. **优先 shadcn MCP**：用 shadcn MCP 在编辑器内搜索/添加已有 shadcn 组件作为基底；能用现成的就不要生成新结构。
3. **必要时用 v0 生成**：仅当 shadcn 无对应件时，用 v0 生成页面/组件草稿（作为草稿，不直接当成品）。
4. **对齐设计契约**：将生成产物的颜色/间距/字体/圆角/明暗等**替换为 `ui-ux.md` 的 tokens**；移除内联/魔法值；文案接入 i18n（en + zh-CN），禁止硬编码字符串。
5. **落地到 packages/ui**：整理为符合命名与导出规范的组件，确保支持明暗模式（默认跟随系统 + 可切换），具备无障碍属性（语义标签/aria/键盘可达/焦点态）。
6. **自检与修复**：跑验证门，修复 a11y/lint/type 问题。
7. **视觉 review**：人工/截图核对与契约一致（明暗两态、响应式断点、空/加载/错误态）。

## Verification（验证门 / Gates）

全部通过才算本轮完成：

- [ ] **a11y（WCAG AA）**：对比度达标、可键盘操作、焦点可见、有正确语义/aria；无可访问性 lint 报错。
- [ ] **Lint / 格式**：`biome check`（或 `turbo run lint`）零错误。
- [ ] **类型检查**：`turbo run typecheck`（或包级 `tsc --noEmit`）通过。
- [ ] **契约一致性**：颜色/字体/间距/圆角/明暗严格来自 `ui-ux.md` token；无契约外的新设计 token；文案已 i18n 外部化。
- [ ] **复用性**：基于 shadcn/ui，无重复实现的平行组件；导出与命名符合 `conventions.md`。
- [ ] **视觉 review**：明暗两态 + 关键断点 + 空/加载/错误态人工确认通过。

## Guardrails（护栏）

- **No-invent design tokens（不臆造设计 token）**：**绝不发明新的设计 token / 颜色 / 间距体系**；只能用 `ui-ux.md` 已定义的值。若契约缺所需 token，停止并上报，由用户用外部设计工具补充进 `ui-ux.md` 后再继续。
- **Reuse shadcn（复用 shadcn）**：优先复用 shadcn/ui 组件，不另起平行 UI 体系或重写已有件。
- **Scope / file-claims**：本 loop 仅修改 `packages/ui/**`（及必要的 i18n 资源文件）；不改动业务逻辑包 `core`/`db`、不改 app 私有实现。
- **Iteration cap**：单次运行最多 5 轮验证-修复；仍不达标则停止并上报。
- **No-secret**：不在组件/示例/日志写入任何密钥或私有数据。
- **Sandbox**：v0 / MCP 等需联网的调用按需进行；不擅自安装业务依赖、不运行破坏性命令。
- **i18n**：所有用户可见文案必须外部化（en + zh-CN），禁止硬编码字符串。

## Stop condition（停止条件）

- 成功：所有 Verification gate 通过，组件已落入 `packages/ui` 并可复用。
- 触顶：达到 5 轮迭代仍未全绿 → 停止并上报失败 gate 与原因。
- 阻塞：`ui-ux.md` 缺必要 token / 需扩大 scope / 需联网授权 → 停止并上报，不擅自越界或臆造。

## Logging（运行日志）

每轮结束向 `knowledge/logs/<YYYY-MM-DD>-ui-generation.md` 追加：

- 目标组件/页面与本轮意图
- 使用的工具（shadcn MCP / v0）与是否复用既有件
- 迭代次数与关键修改（token 对齐、a11y 修复等）
- 各 gate 结果（a11y / lint / typecheck / 契约一致性 / 视觉 review）
- 成本 / 耗时
- 收敛后更新 `knowledge/state/PROGRESS.md`；如产生设计/技术决策写入 `knowledge/decisions/`。

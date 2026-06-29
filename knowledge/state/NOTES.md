# NOTES · 工作便签

> 持久状态层（Durable State）的"草稿纸"。模型没有跨会话记忆，本文件就是放在 **context 之外** 的便签：随手记下中途的发现、临时结论、易忘的指针，下次进来先扫一眼即可快速恢复状态。

## 如何使用本文件

- agent 在每轮 loop 中可随时往这里追加**短小的便签**：临时发现、待确认点、踩坑提醒、"为什么当时这么做"的备注。
- 与其他状态文件的分工：里程碑/阶段进度写 `PROGRESS.md`；正式待办与已知问题写 `BACKLOG.md`；重大且不可逆的决策写 `decisions/*` ADR；本文件只放**轻量、易变**的工作记忆。
- 过期或已沉淀进契约/ADR 的便签可以删除，保持本文件简短可读。

## 关键指针（决策与契约在哪）

- **决策（ADR）**：`knowledge/decisions/*` —— 一条决策一个文件，含背景/取舍/结论。
  - `0001-supabase-baas.md`：后端选 Supabase（Auth + Postgres + pgvector + Edge Functions + Realtime）
  - `0002-pnpm-over-bun.md`：工具链选 pnpm（而非 Bun）的取舍
  - `0003-commitlint-lefthook.md`：提交规范 + git 钩子方案
- **契约（什么是"对/完成"）**：`knowledge/contracts/*` —— `product` / `architecture` / `data-model` / `conventions` / `ui-ux`。
- **路线图**：`knowledge/roadmap.md`（Phase 0–4）。
- **进度**：`knowledge/state/PROGRESS.md`；**待办**：`knowledge/state/BACKLOG.md`。
- **入口约定**：根 `AGENTS.md`（声明 `knowledge/` 为单一事实源）。

## 技术栈一句话

开源、可自部署的多端 GitHub Star 管理器：**TypeScript + React + Tailwind/shadcn-ui** 前端，**Supabase**（Auth/Postgres/pgvector/Edge Functions/Realtime）后端，**pnpm + Turborepo + Vite + Vitest + Biome** 工具链，端顺序 Web → 扩展 → 桌面（共享 `core`/`ui`/`db`）。

## Phase 0 脚手架便签

- **本地骨架已就位**：`pnpm install` 后，`pnpm dev`（turbo）可起各端；`apps/web` 用 `pnpm --filter @asterism/web dev`。四道门：`pnpm lint` / `typecheck` / `test` / `build`。
- **依赖版本**：由 `pnpm add` 在 2026-06 解析（如 TS 6、Vite 8、Vitest 4、React 19、WXT 0.20.x），以 `pnpm-lock.yaml` 为准，未手写臆造版本。
- **恢复点**：下一步是凭据 handoff（Supabase + GitHub OAuth），见 `PROGRESS.md` 与 `logs/2026-06-29-phase0-scaffold.md`。

## 待办提醒（便签级）

- **配色 / 设计 tokens 待定**：色板/字体/间距/圆角/明暗等设计 tokens 由用户用**外部设计工具**产出后，填入 `knowledge/contracts/ui-ux.md`（当前为占位）。在 tokens 落定前，UI 生成（`loops/ui-generation.loop.md`）不要凭空造配色。
- **工作区根目录未迁移**：本次初始化**未执行 `move_agent_to_root`**，当前会话仍以原工作区根为准，仓库位于 `/Users/asherliao/Projects/asterism`。后续若需以该仓库为工作区根，再单独切换。

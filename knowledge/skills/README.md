# Agent Skills · 项目级技能治理

`knowledge/skills/` 记录 Asterism 项目认可的 agent skills。这里是**事实源**：说明哪些 skill 被纳入、何时使用、从哪里同步、以及与项目契约的优先级关系。

## 职责边界

- `knowledge/skills/manifest.json`：技能清单、上游 commit、vendor 路径、`.agents` 同步目标与触发场景。
- `knowledge/skills/vendor/`：外部 skill 的仓库内 vendored 副本，用于审计与可复现更新。
- `.agents/skills/`：由 vendor 副本同步出的项目级 agent 可发现目录。
- `AGENTS.md`：声明任务触发规则，确保 agent 写代码或部署时会读取对应 skill。

`knowledge/contracts/*` 始终高于外部 skill。若外部规则与 Asterism 的产品、架构、目录边界、UI token、i18n、安全或提交规范冲突，以本项目契约为准。

## 首批 skills

| Skill | 何时使用 |
| --- | --- |
| `react-best-practices` | React 组件、hooks、TanStack Query、bundle/performance、渲染性能、客户端数据获取 |
| `composition-patterns` | `packages/ui`、可复用组件 API、provider/context、compound components、组件重构 |
| `vercel-cli-with-tokens` | Vercel token/env/CLI 管理、project linking、部署检查、域名与环境变量 |
| `deploy-to-vercel` | Vercel preview/production 部署、部署链接获取、部署流程 |
| `vercel-optimize` | 上线后基于 Vercel 指标的成本、性能、缓存、Core Web Vitals 审计 |
| `impeccable` | UI shape / colorize / critique / audit / polish、交互、动效、响应式与设计反模式检查 |

## Installer-managed skill

`impeccable` 由其官方 CLI 直接管理，而非 `scripts/sync-agent-skills.mjs`：

```bash
npx impeccable install --providers=codex --scope=project
npx impeccable update
```

技能落在 `.agents/skills/impeccable/`，Codex hook 落在 `.codex/hooks.json`。临时运行数据在 `.impeccable/` 并按根 `.gitignore` 排除；`PRODUCT.md`、`DESIGN.md` 与 live config 等共享设计上下文继续跟踪。安装/更新后必须确认 Asterism contracts 仍优先于上游规则。

## 同步流程

1. 更新 vendor 副本时，先确认上游 `vercel-labs/agent-skills` 的目标 commit。
2. 将选定 skill 目录复制到 `knowledge/skills/vendor/vercel-labs-agent-skills/<skill-name>/`。
3. 更新 `knowledge/skills/manifest.json` 的 `upstream.ref` 与对应 notes。
4. 运行同步：

```bash
node scripts/sync-agent-skills.mjs
```

5. 验证同步状态：

```bash
node scripts/sync-agent-skills.mjs --check
```

同步脚本只管理 manifest 的 `skills` 数组，不覆盖 `installerManagedSkills`；它不联网，也不写用户级 `~/.agents` 或 `~/.codex`。

## 安全规则

- 不在 manifest、docs、logs 或脚本中保存任何 Vercel / GitHub / Supabase token。
- 不把外部 skill 规则直接升级为项目规范；需要改变项目行为时，先更新 `knowledge/contracts/*`，必要时补 ADR。
- `vercel-optimize` 需要真实 Vercel 指标；没有线上数据时不得把它的建议当作强约束。

# 2026-07-07 · Agent skills vendor

## Goal

把项目认可的 Vercel / React agent skills 纳入仓库治理：`knowledge/skills/` 作为事实源，`.agents/skills/` 作为仓库级可发现副本，并在根 `AGENTS.md` 声明触发规则。

## Changes

- 新增 `knowledge/skills/README.md` 与 `knowledge/skills/manifest.json`。
- Vendor `vercel-labs/agent-skills` commit `f8a72b9603728bb92a217a879b7e62e43ad76c81` 的 5 个 skills：
  - `react-best-practices`
  - `composition-patterns`
  - `vercel-cli-with-tokens`
  - `deploy-to-vercel`
  - `vercel-optimize`
- 新增 `scripts/sync-agent-skills.mjs`，用于从 vendor 副本同步 `.agents/skills`，并支持 `--check` 校验。
- 更新 `AGENTS.md`，要求 React、组件架构、Vercel CLI / deploy / optimize 任务读取对应 skill；若外部 skill 与 `knowledge/contracts/*` 冲突，以 Asterism contracts 为准。

## Verification

- `node scripts/sync-agent-skills.mjs --check`
- `pnpm lint`

## Notes

- 本次只维护仓库内 `.agents/skills`，不安装到用户级 `~/.agents/skills` 或 `~/.codex/skills`。
- manifest、docs、logs 与脚本均不保存任何 Vercel / GitHub / Supabase token。

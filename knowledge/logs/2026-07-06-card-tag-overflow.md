# 2026-07-06 · Card Tag Overflow

## Context

Browse 卡片视图中 topics / tags chip 行会因为内容较多而换行，导致卡片高度不稳定，截图中长 topic 列表会挤占统计信息区域。

## Changes

- 新增 `OverflowChipRow`，用 `ResizeObserver` 和隐藏 measurement layer 按真实 chip 宽度计算可见数量。
- `RepoCard` 的 GitHub topics 与用户自定义 tags 都改为单行 `flex-nowrap overflow-hidden`，剩余项合并成 `+n`。
- `+n` 支持 hover / focus tooltip，展示被隐藏的剩余项名称，并阻止点击冒泡打开卡片详情。
- 移除全局 Tooltip 的 arrow 节点，避免浮层下方出现无语义的菱形装饰。
- 新增 `browse.moreTopicsLabel` / `browse.moreTagsLabel` 两套 i18n 文案。
- 补充纯函数测试，覆盖全量可见、预留 `+n`、`+9` 到 `+10` 宽度变化、极窄宽度兜底。

## Verification

- `pnpm --filter @asterism/web test`
- `pnpm --filter @asterism/web typecheck`
- `pnpm --filter @asterism/ui typecheck`
- `pnpm --filter @asterism/ui build`
- `pnpm exec biome check apps/web/src/components/overflow-chip-row.tsx apps/web/src/components/overflow-chip-row.test.ts apps/web/src/components/repo-card.tsx apps/web/src/i18n/locales/en.json apps/web/src/i18n/locales/zh-CN.json`

备注：根目录 `pnpm lint` 仍会因 `.github/skills/impeccable/scripts/*` 既有 Biome 问题失败，本次改动文件的定向 Biome 检查已通过。

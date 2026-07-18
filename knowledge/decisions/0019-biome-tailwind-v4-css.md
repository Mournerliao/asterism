# 0019 · Biome 统一检查 Tailwind v4 CSS

- Status: Accepted
- Date: 2026-07-18
- Supersedes: ADR 0004 中“Biome 不处理 CSS”的部分

项目安装的 Biome 2.5.1 已支持 `css.parser.tailwindDirectives: true`，并实测可以解析当前 Tailwind v4 的 `@custom-variant`、`@source`、`@theme` 与 `@apply`。Phase 1 收尾移除 `*.css` 排除，让 CSS 与 TS/JS/JSON 共用 Biome lint/format 门禁；reduced-motion 中确有必要的 `!important` 采用精确抑制，不全局关闭规则，也不引入 Stylelint。这样避免维护第二套样式工具，同时明确废止 Phase 0 基于旧版 Biome 能力作出的临时规避。

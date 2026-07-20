# Web dev 共享包预构建修复

- Date: 2026-07-20
- Scope: `apps/web` 本地启动流程

## 症状

Vite 启动时从 `packages/db/dist/index.js` 加载 `@asterism/db`，但入口没有导出源码已提供的 `invokeBulkOperation`，浏览器抛出 named export `SyntaxError`。

## 根因

`@asterism/core`、`@asterism/ui` 与 `@asterism/db` 的 package exports 指向各自 `dist`，这些生成物被 `.gitignore` 排除。仓库支持直接运行 `pnpm --filter @asterism/web dev`，但该命令此前只启动 Vite，不会先构建 workspace 依赖，因此本地旧 `dist` 可以长期落后于源码。本次 `packages/db/src/index.ts` 与 `bulk-operations.ts` 更新于 7 月 20 日，旧 `dist/index.js` 仍停留在 7 月 17 日。

## 修复

为 `@asterism/web` 增加 `predev`，使用 pnpm workspace filter 只构建 Web 的依赖包，再启动 Vite。这样直接启动 Web 与根 Turborepo 启动都会先得到与源码一致的共享包公开入口。

## 验证

- 最小反馈环确认 `packages/db/dist/index.js` 包含 `invokeBulkOperation` 导出。
- `pnpm --filter @asterism/db test`：18 tests passed。
- `pnpm --filter @asterism/web build`：通过。
- `pnpm --filter @asterism/web predev`：通过，并构建 `core`、`db`、`ui`。

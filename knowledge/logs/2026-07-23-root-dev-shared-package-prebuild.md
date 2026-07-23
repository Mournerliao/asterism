# 根级开发服务器共享包预构建修复

- 日期：2026-07-23
- 目标：修复根级 `pnpm dev` 启动 Web 时读取过期共享包构建产物，导致 `@asterism/db` 新增命名导出不可用的问题。

## 现象与反馈环

浏览器从 `packages/db/dist/index.js` 加载 `@asterism/db` 时报告缺少 `discardAiOrganizationDraft`。源码 `packages/db/src/index.ts` 已正确导出该函数，但以下精确检查连续两次退出 `1`：

```sh
rg --fixed-strings 'discardAiOrganizationDraft' packages/db/dist/index.js
```

## 根因

`@asterism/db` 的 package export 指向被忽略的 `dist/index.js`。直接运行 Web package 的开发脚本已有 `predev` 预构建，但仓库根 `pnpm dev` 由 Turbo 直接并发启动各 package 的 `dev` task；任务图中 `@asterism/web#dev` 没有依赖共享包 `build`。因此 Vite 可以先于 `tsc --watch` 的首次编译读取旧 `dist`，形成稳定或时序相关的缺失导出错误。

单独执行 `pnpm --filter @asterism/db build` 后，`dist/index.js` 与 `dist/index.d.ts` 均出现该导出，排除了源码漏导出和 Vite 缓存作为首要根因。

## 修复

Turbo 的 `dev` task 增加 `dependsOn: ["^build"]`。根级开发启动现在先构建每个 package 的 workspace 依赖，再启动 Vite 与共享包 watcher；直接运行 `pnpm --filter @asterism/web dev` 的既有 `predev` 行为保持不变。

该修复只调整本地开发任务顺序，不改变产品、数据模型或架构边界，因此无需 ADR。

## 验证

- 精确导出反馈环转绿：`packages/db/dist/index.js` 与 `.d.ts` 均包含 `discardAiOrganizationDraft`。
- Turbo dry-run 任务图确认 `@asterism/web#dev` 等待 `@asterism/core#build`、`@asterism/db#build` 与 `@asterism/ui#build`。
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

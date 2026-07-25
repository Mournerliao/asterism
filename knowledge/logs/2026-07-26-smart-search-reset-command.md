# 2026-07-26 · 新增 pnpm reset-smart-search 开发期重置命令

## 动机

准备期（idle → 下载 → 回填 → ready）的 UI/UX 还需反复打磨，需要一条命令把
智能搜索完整重置回 idle 起点。就绪状态由三层组成：远端 `user_repo_embeddings`
向量行、localStorage opt-in 标记、浏览器 Cache Storage 模型缓存——后两层住在
浏览器里，纯 Node 脚本够不着，因此采用「应用内 dev-only 钩子 + pnpm 命令开
浏览器」的组合。

## 实现

- `packages/db`：新增 `deleteAllRepoEmbeddings`（owner 全量删除，走 RLS 按
  user_id 收窄），数据访问不越目录边界。
- `apps/web/src/dev/reset-smart-search.ts`：dev-only 重置模块，依次清远端向量
  行（复用登录态、无需密钥）、opt-in 标记、模型缓存，并清掉 URL 参数。
- `apps/web/src/main.tsx`：渲染前检测 `?reset-smart-search`，
  `import.meta.env.DEV` 守卫 + 动态 import，生产包不含重置代码。
- `apps/web/scripts/reset-smart-search.mjs` + 根/子 package.json 脚本：
  `pnpm reset-smart-search` 跨平台打开带参地址（`ASTERISM_WEB_URL` 可覆盖）。

## 验证

- typecheck（db + web）与 biome 通过；db 测试 67/67（新增删除收窄 / 错误上抛
  两条）。
- 浏览器实测：访问带参 URL → 控制台 `[reset-smart-search] Done` → URL 自动
  回到 `/` → 页面显示 idle 引导横幅。

## 边界说明

- 前提是 dev server 运行且目标浏览器已登录；未登录时跳过远端层并在控制台警告。
- 重置只影响当前用户本人数据（RLS + 显式 user_id 收窄），可安全重建。

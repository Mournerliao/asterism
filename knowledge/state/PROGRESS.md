# PROGRESS · 项目进度与里程碑

> 持久状态层（Durable State）。本文件记录 Asterism 的**长期进度与里程碑**，是跨会话恢复"项目走到哪一步"的单一参考。
> 它不同于编排/会话记忆（那类属于 agent 临时 context），这里只沉淀对项目有长期意义的状态变化。
> 维护约定：每完成一个里程碑或阶段，更新本文件 + 在 `knowledge/logs/` 追加对应运行日志；细碎便签写 `NOTES.md`，待办写 `BACKLOG.md`。

## 当前状态

**阶段：Phase 1 Web MVP — 进行中（2026-06-30 起）。** Phase 0 脚手架已验收（2026-06-29）；Phase 1 按切片 UI + 功能同步推进，已完成「设计系统地基 / 登录页改稿 / 应用外壳 / stars 同步数据地基 / Browse 卡片列表（虚拟滚动）」五刀，下一步做多维筛选 + 关键词搜索（Slice 5）。

Phase 1 已完成（见 `logs/2026-06-30-phase1-shell.md`、`logs/2026-06-30-phase1-slice3-stars-sync.md`、`logs/2026-06-30-phase1-slice4-browse.md`）：

- **契约裁决（ADR 0006）**：stars 同步写入走 Edge Function `sync-stars`（service role），客户端只触发 + 读取；修正 `architecture.md` 数据流与 `roadmap.md` 状态表。
- **Slice 0 设计系统地基**：`packages/ui` 增补一批 shadcn 组件（Card/Input/Textarea/Label/Badge/Avatar/Separator/Skeleton/Tabs/Tooltip/Dialog/Sheet/DropdownMenu/Select/Sonner）+ `ThemeProvider`/`ModeToggle`；`apps/web` 接 TanStack Query / Theme / Tooltip providers + Toaster，路由抽到 `router.tsx`；装 `@tanstack/react-query`、`@tanstack/react-virtual`、`zustand`、`lucide-react`。
- **Slice 1 登录页改稿**：按 Ardot `8:2` 拆出 `pages/login.tsx`（brand 面板 + GitHub OAuth 卡片 + 只读权限说明），明暗两套对齐设计稿；新增路由守卫 `RequireAuth`/`RequireAnon`。
- **Slice 2 应用外壳**：`AppLayout`（Sidebar 导航 + 顶部栏：搜索/Sync/语言/主题/账号菜单）+ 嵌套路由（Browse/Collections/Tags/Dashboard/Import-Export/Settings 骨架与空状态）；Settings 页已可用（主题、语言、账号登出、AI 区 Coming Soon）。
- **Slice 3 stars 同步（数据地基）**：`packages/core` GitHub GraphQL 同步（游标分页 + `starredAt` 增量，配 5 个 Vitest）；`supabase/functions/sync-stars` Deno 函数 service role 幂等 upsert `repos` + `user_stars`；`packages/db` 收紧 `Database` 泛型 + 读查询（`listStarredRepos`/`getLatestStarredAt`）+ `invokeSyncStars` + Dexie v2；`apps/web` Query hooks（`useStarredRepos`/`useSyncStars`）+ 顶部栏 Sync 按钮接函数与 sonner 进度反馈。
- **Slice 4 Browse（卡片/列表 + 虚拟滚动）**：`RepoCard`/`RepoListRow`/骨架组件；`RepoCollection` 用 `@tanstack/react-virtual` 行虚拟化 + 响应式列数（自带滚动容器）；视图模式存 Zustand（persist）；`useStarredRepos` 驱动 loading/error/empty/data 四态；`lib/format`（紧凑数字 + 相对时间）与语言色点；浏览器明暗双视图实测通过。

> 说明：筛选/标签/集合/笔记/仪表盘/导入导出当前为**骨架 + 空状态**，从 Slice 5 起逐切片落地（Browse 已读真实数据）。

初始化（Initialization）已于 2026-06-29 完成（知识库 + 开源基础 + Monorepo 根配置 + 提交钩子 + 首次提交）。

Phase 0 本地骨架已完成事项（见 `logs/2026-06-29-phase0-scaffold.md`、`decisions/0004-phase0-scaffold-choices.md`）：

- Monorepo 实包就位：`packages/{config,core,ui,db}` 与 `apps/{web,extension,desktop}` 均为最小可构建骨架。
- 共享包骨架：`core`（领域类型占位 + 用例）、`db`（`createSupabaseClient` + Dexie 缓存占位，唯一数据访问入口）、`ui`（Tailwind v4 + shadcn neutral 主题 + `Button`）、`config`（tsconfig 预设）。
- `apps/web`：Vite + React Router + 最小 react-i18next（en/zh-CN），已 `import @asterism/{ui,core,db}` 打通依赖图。
- `apps/extension`：WXT（MV3）最小 popup；`apps/desktop`：占位包（Tauri 2 推迟 Phase 4）。
- 工程门全绿：`pnpm lint`（Biome）/ `pnpm typecheck` / `pnpm test`（Vitest）/ `pnpm build`（Turborepo）均通过。
- CI：`.github/workflows/ci.yml`（pnpm + Node 22，lint/typecheck/test/build）。
- `.env.example` 就位（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 占位，无真实值）。

拿到 Supabase Publishable key 后新增（见 `logs/2026-06-29-phase0-auth-schema.md`）：

- 环境变量对齐新命名：`VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY`（`.env.example`、`apps/web` 读取处、本地 `.env`）。本地 `.env` 已填真实值且被 gitignore，未提交。
- `packages/db` 新增 GitHub OAuth 辅助（`signInWithGitHub` / `signOut` / `getSession` / `onAuthChange`），仍为唯一数据/认证访问入口。
- `apps/web` 接通登录：Supabase 客户端单例 + `useSession` Hook + 登录/登出 UI（含 en/zh-CN 文案），登录走 GitHub OAuth 回流。
- `supabase/migrations/` 初始 schema + RLS（对齐 `contracts/data-model.md`）：核心 7 表 + 索引 + `updated_at` 触发器 + 预启用 `pgvector`；RLS 策略 `repos` 全局可读、其余按 `user_id` 隔离。应用与 OAuth 配置步骤见 `supabase/README.md`。

**验收已完成（2026-06-29）**：

1. ✅ 已应用 `supabase/migrations/`（schema + RLS）。
2. ✅ 已配置 GitHub OAuth App + Supabase GitHub provider + Redirect URLs。
3. ✅ 本地 `pnpm --filter @asterism/web dev` 验证「使用 GitHub 登录」回流并显示当前用户邮箱。

> 说明：业务实现仍为**占位**，尚未接入 stars 同步/查询逻辑；进入 Phase 1 开发需另行批准。

设计层对齐（2026-06-30，见 `logs/2026-06-30-globals-css-primer-sync.md`、`decisions/0005`）：

- `contracts/ui-ux.md` 配色 / 圆角定稿为 GitHub Primer 体系（dark 取自 Ardot 设计稿、light 为 Primer 官方配对，hex 为权威）。
- `packages/ui` 的 `globals.css` 已从 neutral oklch 占位同步为 Primer hex token：light/dark 两套完整（含 `--link` / `--brand-from` / `--brand-to` 扩展 + `@theme inline` 映射，`--radius: 0.5rem`），文字/交互对比度达 WCAG 2.1 AA，`pnpm lint` / `typecheck` / `build` 全绿。**字体 / 间距仍 TBD**。

## 里程碑清单

### Phase 0 · 脚手架（Scaffolding）

- [x] 在 `apps/{web,extension,desktop}`、`packages/{core,ui,db,config}` 建实包骨架
- [x] `packages/core`/`ui`/`db` 共享包最小可构建（含 TS 配置、入口、占位导出）
- [x] CI（GitHub Actions）跑通 lint / typecheck / test / build 基线
- [x] 落地初始 schema 与 RLS 迁移（对齐 `contracts/data-model.md`）—— 2026-06-29 已在 Supabase 应用
- [x] 打通 GitHub OAuth 登录：`packages/db` 辅助 + `apps/web` 登录/登出 UI；2026-06-29 本地端到端验证通过（登录回流并显示当前用户邮箱）

### Phase 1 · Web MVP

- [x] 设计系统地基（shadcn 组件库 + ThemeProvider/ModeToggle）+ 应用 providers（Slice 0）
- [x] 登录页对齐 Ardot 设计稿 + 路由守卫（Slice 1）
- [x] 应用外壳（Sidebar + 顶部栏 + 分区路由骨架/空状态；Settings 可用）（Slice 2）
- [x] 同步 GitHub stars（首次全量 + 增量；Edge Function `sync-stars` + db 读查询 + Sync UI）（Slice 3）
- [x] 仓库卡片/列表视图 + 虚拟滚动（TanStack Virtual）（Slice 4）
- [ ] 多维筛选与搜索（语言/topic/时间等）
- [ ] 标签（tags）与集合（collections）管理
- [ ] 笔记（notes）
- [ ] 统计仪表盘（shadcn Charts）
- [ ] 导入/导出

### Phase 2 · 浏览器扩展

- [ ] WXT（MV3）popup 快速搜索
- [ ] content-script 页内打标签/写笔记
- [ ] 与 Web 共享 Supabase 会话

### Phase 3 · AI（BYOK）

- [ ] `pgvector` 向量化（`repo_embeddings`）
- [ ] 语义搜索
- [ ] AI 自动分类/打标
- [ ] Edge Functions（`sync-stars` / `ai-embed`）
- [ ] BYOK 密钥加密存储（`user_settings`）

### Phase 4 · 桌面端

- [ ] Tauri 2 套壳复用 Web 前端
- [ ] 桌面端打包与发布流程

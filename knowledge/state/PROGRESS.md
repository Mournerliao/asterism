# PROGRESS · 项目进度与里程碑

> 持久状态层（Durable State）。本文件记录 Asterism 的**长期进度与里程碑**，是跨会话恢复"项目走到哪一步"的单一参考。
> 它不同于编排/会话记忆（那类属于 agent 临时 context），这里只沉淀对项目有长期意义的状态变化。
> 维护约定：每完成一个里程碑或阶段，更新本文件 + 在 `knowledge/logs/` 追加对应运行日志；细碎便签写 `NOTES.md`，待办写 `BACKLOG.md`。

## 当前状态

**阶段：Phase 1 Web MVP — 已完成（2026-07-02 验收）；UI 像素级还原已完成（2026-07-02）。** Phase 0 脚手架已验收（2026-06-29）；Phase 1 按切片 UI + 功能同步推进，Slice 0–8 全部落地，含 Slice 6 补完（按标签筛选 / 集合详情 / 重名校验）、统计仪表盘（Slice 7）、导入导出（Slice 8）与路由懒加载。

> 修复（2026-06-30，见 `logs/2026-06-30-sync-stars-deploy-fix.md`）：顶部栏「Sync」此前报通用错误，根因是 `sync-stars` Edge Function **从未部署**到项目（端点 404）。已 `supabase functions deploy sync-stars`（现 `ACTIVE v1`），并让 `invokeSyncStars` 透传函数返回的真实错误（`FunctionsHttpError.context`）+ toast 附 `description`，避免再吞错。`provider_token` 不持久化的局限不变（刷新后需重登）。**部署是每环境一次性手工步骤**。

> 修复（2026-07-06，见 `logs/2026-07-06-ui-dist-alias-fix.md`）：`packages/ui` 的 dev/watch 产物曾残留 `@/lib/utils`、`@/components/*` path alias，导致 Web Vite 消费 `@asterism/ui/dist` 时报 `[plugin:vite:import-analysis] Failed to resolve import "@/lib/utils"`。已将 `packages/ui/src` 内部导入改为相对路径并重建，`dist` 不再含 `@/` alias。

> 修复（2026-07-06，见 `logs/2026-07-06-github-session-reconnect.md`）：刷新/恢复 Supabase 会话后可能缺少 GitHub `provider_token`，此前点击 Sync 只提示 session 过期，但界面仍显示已登录且没有重新登录入口。已将「Asterism 已登录但 GitHub 授权需刷新」建模为独立状态：应用顶部显示提示条并提供唯一可见的 Reconnect GitHub 主入口，点击后立即显示 pending 反馈，账号菜单保留备用入口，并新增 web 侧 Vitest 回归测试。

> 修复（2026-07-06，见 `logs/2026-07-06-app-page-scrollbar.md`）：应用内页面级纵向滚动统一由 `AppLayout` 主内容区承担，Browse / Collection Detail 的仓库虚拟列表不再创建内部纵向滚动条，滚动条贴主内容区右边缘；全局 scrollbar thumb 调轻调细，局部弹层/菜单/代码预览滚动保留。

> 优化（2026-07-06，见 `logs/2026-07-06-browse-sticky-toolbar.md`）：Browse 页上下分栏，标题 + 筛选栏固定、仅列表区滚动；`main` 恢复统一 `p-6`，不再用 sticky 或各页面补 `pt-6`。

> 优化（2026-07-06，见 `logs/2026-07-06-card-tag-overflow.md`）：Browse 卡片视图的 GitHub topics 与用户自定义 tags 统一为单行 chip 行，按真实宽度动态折叠为 `+n`，hover/focus 展示剩余项 tooltip，避免长标签撑高卡片。

Phase 1 已完成（见 `logs/2026-06-30-phase1-shell.md`、`logs/2026-06-30-phase1-slice3-stars-sync.md`、`logs/2026-06-30-phase1-slice4-browse.md`、`logs/2026-06-30-phase1-slice5-filter-search.md`、`logs/2026-06-30-phase1-slice6-tags-collections-notes.md`）：

- **契约裁决（ADR 0006）**：stars 同步写入走 Edge Function `sync-stars`（service role），客户端只触发 + 读取；修正 `architecture.md` 数据流与 `roadmap.md` 状态表。
- **Slice 0 设计系统地基**：`packages/ui` 增补一批 shadcn 组件（Card/Input/Textarea/Label/Badge/Avatar/Separator/Skeleton/Tabs/Tooltip/Dialog/Sheet/DropdownMenu/Select/Sonner）+ `ThemeProvider`/`ModeToggle`；`apps/web` 接 TanStack Query / Theme / Tooltip providers + Toaster，路由抽到 `router.tsx`；装 `@tanstack/react-query`、`@tanstack/react-virtual`、`zustand`、`lucide-react`。
- **Slice 1 登录页改稿**：按 Ardot `8:2` 拆出 `pages/login.tsx`（brand 面板 + GitHub OAuth 卡片 + 只读权限说明），明暗两套对齐设计稿；新增路由守卫 `RequireAuth`/`RequireAnon`。
- **Slice 2 应用外壳**：`AppLayout`（Sidebar 导航 + 顶部栏：搜索/Sync/语言/主题/账号菜单）+ 嵌套路由（Browse/Collections/Tags/Dashboard/Import-Export/Settings 骨架与空状态）；Settings 页已可用（主题、语言、账号登出、AI 区 Coming Soon）。
- **Slice 3 stars 同步（数据地基）**：`packages/core` GitHub GraphQL 同步（游标分页 + `starredAt` 增量，配 5 个 Vitest）；`supabase/functions/sync-stars` Deno 函数 service role 幂等 upsert `repos` + `user_stars`；`packages/db` 收紧 `Database` 泛型 + 读查询（`listStarredRepos`/`getLatestStarredAt`）+ `invokeSyncStars` + Dexie v2；`apps/web` Query hooks（`useStarredRepos`/`useSyncStars`）+ 顶部栏 Sync 按钮接函数与 sonner 进度反馈。
- **Slice 4 Browse（卡片/列表 + 虚拟滚动）**：`RepoCard`/`RepoListRow`/骨架组件；`RepoCollection` 用 `@tanstack/react-virtual` 行虚拟化 + 响应式列数（自带滚动容器）；视图模式存 Zustand（persist）；`useStarredRepos` 驱动 loading/error/empty/data 四态；`lib/format`（紧凑数字 + 相对时间）与语言色点；浏览器明暗双视图实测通过。
- **Slice 5 多维筛选 + 关键词搜索**：`packages/core` `repos/filter.ts`（filter/sort/facets/hasActive，11 个 Vitest）；`apps/web` Zustand 筛选态 + 顶部栏搜索接线 + `RepoFilterBar`（语言/topic/star/push/状态/排序 6 个 Select，facets 动态填充，可清除）；Browse useMemo 组合筛选排序 + 「无匹配」空态；浏览器实测语言筛选收窄计数与清除按钮。
- **Slice 6 标签 / 集合 / 笔记**：`packages/core` 增 `Tag`/`Collection`/`Note` 模型 + 标签调色板；`packages/db` 新增 tags/repo_tags/collections/collection_repos/notes 的 CRUD 查询（走 RLS 本人增删改、连接表 FK 级联），`StarredRepoRecord` 补 `repoId`；`apps/web` 五组 Query hooks + Repo Detail Drawer（标签胶囊增删 / 集合勾选 / 笔记编辑，对齐 Ardot `8:364`）+ Tags 管理页（`12:2`）+ Collections 管理页（`12:126`）+ 卡片点击打开 Drawer 并展示标签；i18n `common`/`drawer`/扩 `tags`/`collections`；浏览器明暗实测三处对齐设计稿。
- **Slice 6 补完**（见 `logs/2026-07-02-phase1-slice6-backlog-complete.md`）：`RepoFilter` 扩展 `tagIds` + Browse 多选标签筛选；`/collections/:id` 集合详情页；标签/集合表单重名前端校验。
- **Slice 7 统计仪表盘**（见 `logs/2026-07-02-phase1-slice7-dashboard.md`）：`packages/ui` shadcn Chart + recharts；`packages/core` `deriveDashboardInsights`；Dashboard 四 StatCard + 四图表（语言/趋势/topic/归档+标签 Top5），对齐 Ardot `8:413`。
- **Slice 8 导入/导出**（见 `logs/2026-07-02-phase1-slice8-import-export.md`）：`packages/core` v1 JSON/CSV/Markdown 数据端口 + Vitest；`packages/db` `importUserData` + `listNotes`；Import/Export 双栏页对齐 Ardot `12:182`。
- **工程 polish**：全路由 `React.lazy` + Suspense code-split（Dashboard 图表独立 chunk ~160KB）。
- **UI 像素级还原**（见 `logs/2026-07-02-ui-pixel-perfect.md`、`decisions/0007-typography-spacing-tokens.md`）：Ardot 11 frame 全量校对；Geist 字体 + 间距/字号 token 定稿；Shell/Browse 表格视图/Drawer/其余页面视觉对齐设计稿。
- **全局滚动条样式**（见 `logs/2026-07-02-scrollbar-styles.md`）：`packages/ui` 引入基于 `--muted-foreground` 的细 pill 滚动条，替换浏览器默认粗灰样式；Browse 内部滚动容器链路验收通过，无双滚动条。
- **移除 design 沙盒**（见 `logs/2026-07-02-remove-design-folder.md`）：删除本地 `design/` 目录；设计源统一为 Ardot + `ui-ux.md`。

> 说明：Phase 1 Web MVP 验收达成；下一步进入 Phase 2 浏览器扩展。

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
- [x] 多维筛选与搜索（语言/topic/star/pushed_at/归档 + 关键词，可组合可清除）（Slice 5）
- [x] 标签（tags）与集合（collections）管理（含 Repo Detail Drawer + 管理页）（Slice 6）
- [x] 笔记（notes）（Repo Detail Drawer 内编辑）（Slice 6）
- [x] 统计仪表盘（shadcn Charts）
- [x] 导入/导出
- [x] UI 像素级还原（Ardot 11 frame + collection-detail extrapolate；见 `logs/2026-07-02-ui-pixel-perfect.md`）

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

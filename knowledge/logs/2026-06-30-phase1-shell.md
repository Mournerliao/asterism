# 2026-06-30 · Phase 1 启动：契约裁决 + 设计系统地基 + 登录页 + 应用外壳

## 范围

Phase 1 Web MVP 起步（UI + 功能同步推进）。本日完成契约裁决与前三刀：Slice 0
设计系统地基、Slice 1 登录页改稿、Slice 2 应用外壳。stars 同步（Slice 3）起逐切片
接真实数据。

## 契约裁决（ADR 0006）

- 冲突：`architecture.md` 数据流画「客户端直写 Postgres」，与 `data-model.md` / 已落地
  RLS（`repos` 仅 SELECT、写需受信路径）矛盾。
- 决策：stars 同步写入走 Edge Function `sync-stars`（service role），客户端只触发 + 读取。
  写 `decisions/0006-stars-sync-edge-function.md`，并修正 `architecture.md` 时序图/数据流
  与 `roadmap.md` 过期「当前状态」表（Phase 0 已验收 / Phase 1 进行中）。
- token 来源：客户端登录会话捕获 `provider_token`，随同步请求传给函数；已记录其不被
  Supabase 持久化/刷新的局限。

## Slice 0 · 设计系统地基

- `packages/ui` 增补 shadcn 组件：Card / Input / Textarea / Label / Badge / Avatar /
  Separator / Skeleton / Tabs / Tooltip / Dialog / Sheet / DropdownMenu / Select / Sonner，
  全部对齐 Primer token、沿用 data-slot 风格；barrel 统一导出。
- 新增 `ThemeProvider`（system/light/dark，切 `.dark` class + localStorage 持久化）与
  `ModeToggle`。
- `apps/web` 接入 providers：TanStack Query（`lib/query-client.ts`）、Theme、Tooltip、
  Sonner Toaster；路由抽到 `router.tsx`；新增主题 i18n 文案与 `ThemeToggle` 包装。
- 依赖：`@tanstack/react-query`、`@tanstack/react-virtual`、`zustand`、`lucide-react`
  （pnpm add 实际版本，未臆造）。

## Slice 1 · 登录页改稿

- 读 Ardot Login `8:2`（batch_read + 截图）。左 brand 面板（星座 logo + 标语 + 四特性），
  右认证卡（Get started + Continue with GitHub + 只读权限说明）。
- 用语义 token；明暗两套均验证：dark 与设计稿实测一致，light 为 Primer 配对（右面板加
  `lg:border-l` 分隔）。GitHub 按钮用 `bg-foreground/text-background` 随主题反色（贴合 GitHub
  习惯）。
- 路由守卫 `RequireAuth`（未登录跳 `/login`）/`RequireAnon`（已登录跳 `/`），加载态全屏 loader。
- 新增 `BrandLogo`、`GitHubIcon`（lucide 该版本无 Github 图标，内联 SVG）。

## Slice 2 · 应用外壳

- `AppLayout` = 左 `Sidebar`（Asterism logo + Browse/Collections/Tags/Dashboard/
  Import-Export/Settings，NavLink 高亮当前）+ 顶部栏（搜索框、Sync 按钮占位、语言切换、
  主题切换、账号头像菜单含登出）+ `Outlet`；移动端 Sidebar 走 Sheet 抽屉。
- 嵌套路由：index=Browse，/collections /tags /dashboard /import-export /settings。除 Settings
  外均为「PageHeader + EmptyState」骨架（真实内容后续切片）。
- Settings 已可用：外观（主题 System/Light/Dark 段控 + 语言 Select）、账号（头像 + Connected
  via GitHub OAuth + 登出）、AI 区（Coming Soon，禁用的 Provider/Key/Endpoint 输入）。对齐
  Ardot `8:299`。
- 删除旧 `pages/home.tsx`（被外壳 + Browse 取代）。

## 验收

- `pnpm lint`（Biome）/ `pnpm --filter @asterism/web typecheck` / `build` 全绿；全仓 `pnpm build`
  通过。
- 浏览器实测：`/login`（明/暗）、应用外壳 Browse 空状态（暗）、Settings（暗）均与设计稿一致
  （验证时临时旁路 `RequireAuth` 截图后已还原）。
- i18n：所有新文案 en + zh-CN 双语，无硬编码。

## 后续

- Slice 3：`packages/core` GitHub GraphQL 同步 + `supabase/functions/sync-stars`（service role
  幂等 upsert）+ `packages/db` 强类型查询/Dexie/Query hooks + 顶部栏 Sync 接函数与进度反馈。
- 顶部栏搜索框、Sync 按钮当前为占位，分别在 Slice 5 / Slice 3 接通。

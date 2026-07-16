# PROGRESS · 项目进度与里程碑

> 持久状态层（Durable State）。本文件记录 Asterism 的**长期进度与里程碑**，是跨会话恢复"项目走到哪一步"的单一参考。
> 它不同于编排/会话记忆（那类属于 agent 临时 context），这里只沉淀对项目有长期意义的状态变化。
> 维护约定：每完成一个里程碑或阶段，更新本文件 + 在 `knowledge/logs/` 追加对应运行日志；细碎便签写 `NOTES.md`，待办写 `BACKLOG.md`。

## 当前状态

**阶段：Phase 1 Web MVP — 已完成（2026-07-02 验收）；UI 像素级还原已完成（2026-07-02）。** Phase 0 脚手架已验收（2026-06-29）；Phase 1 按切片 UI + 功能同步推进，Slice 0–8 全部落地，含 Slice 6 补完（按标签筛选 / 集合详情 / 重名校验）、统计仪表盘（Slice 7）、导入导出（Slice 8）与路由懒加载。

> README 仓库身份居中（2026-07-17，见 `logs/2026-07-17-readme-header-centered-identity.md`）：工作区 header 从顺序 flex 改为 `1fr / auto / 1fr` 对称三列，返回动作与 Outline / GitHub 操作分别锚定两侧，仓库身份保持几何居中且在窄空间安全截断；44px 移动触控目标、焦点语义与自适应 Outline 行为保持不变。

> README 自适应目录与 section 深链（2026-07-17，见 `logs/2026-07-17-readme-outline-deep-links.md`、ADR 0011）：最终清洗 HTML 经单一 Outline 模块补全稳定 heading target，兼容标题型 h1 排除、真实 h1 section、层级跳跃、GitHub anchor、重复/中文标题与空目录；主容器 `≥1100px` 使用实体 rail、`768–1099px` 使用 header Popover、`<768px` 使用底部 Sheet，长分支围绕 active section 折叠。选择条目更新 hash、滚动并聚焦 heading；自然滚动以 history replace 同步 active hash，复制深链在内容加载后恢复，reduced motion 禁用 smooth scroll。

> README 工作区端到端路径（2026-07-16，见 `logs/2026-07-16-readme-workspace-path.md`、ADR 0011）：Repo Quick Look 新增双语、全宽、44px 的 Read README 导航行；`/repos/:owner/:name` 重定向到 `/readme` 工作区，App Shell 保持挂载并立即呈现仓库身份、来源感知返回与文档骨架。新增 `packages/db` 查询链与 `read-repo-readme` Edge Function，在任何 GitHub 请求前校验会话和 `user_stars` 成员关系；返回的 GitHub HTML 不持久化，并经 DOMPurify + 显式允许列表清洗后使用固定本地 Markdown 样式渲染。Browse / Collection / 直链返回、en / zh-CN、成员拒绝与未保存笔记全部决策已有路由级回归测试。

> README 缓存与恢复状态（2026-07-16，见 `logs/2026-07-16-readme-fetch-recovery.md`、ADR 0011）：README 数据链完成 success / no README / not in library / rate limit / reconnect / retryable typed outcomes；所有状态留在 App Shell 内并提供上下文化恢复操作。provider token 只进入当前函数请求且不进入 key 或持久层；TanStack Query 以稳定 key 进行并发去重和 5 分钟内存 freshness，ETag 经 Edge Function 转为 GitHub `If-None-Match`，304 复用匹配内存 HTML。

> README 内容安全与链接边界（2026-07-16，见 `logs/2026-07-16-readme-content-security.md`、ADR 0011）：DOMPurify 后继续执行显式 tag / attribute / class allowlist，移除脚本、表单、可执行 embed、危险 scheme、事件属性及可覆盖 App Shell 的 utility class，同时保留 GitHub 常见结构、badge、居中内容、代码与 details。fragment 点击更新当前 README 路由 hash，并聚焦、滚动至匹配目标；仓库相对文件/目录分别解析为 GitHub `blob` / `tree`，全部离站链接统一为安全新标签页，异常媒体与不支持结构安全降级。

> README 响应式文档画布（2026-07-16，见 `logs/2026-07-16-readme-responsive-canvas.md`、ADR 0011）：`@asterism/ui` 新增显式 content / skeleton canvas variants，共享实体 card、60rem 最大宽度与响应式 padding；Asterism 原创 MIT `readme-document-v1.css` 固定覆盖 GFM、HTML-heavy header、badge、媒体、表格、代码和 details。大图保持比例，宽表/代码局部滚动，loaded 以 160ms opacity crossfade 进入并遵循 reduced motion；紧凑 header 在窄屏保留返回、仓库身份与 GitHub 图标。

> Repo Quick Look 可移动窗口（2026-07-16，见 `logs/2026-07-16-repo-quick-look-drag.md`）：桌面/平板浮窗默认位于右下角 24px，高度随内容收缩且最多 736px；以完整仓库身份首行为拖动区域且不增加冗余 drag icon，pointer 拖动使用 transform 保持流畅并限制在视口安全边距内，窗口 resize 后自动回收到可见范围，手机 Sheet 不启用拖动。

> Repo Quick Look 仓库链接统一（2026-07-16，见 `logs/2026-07-16-repo-quick-look-link-consistency.md`）：浮窗头部由分行 owner / repo + 独立 external-link 图标收敛为单行 `owner / repo` 主链接；弱化 owner、以链接蓝强调 repo name，并与 Browse 卡片和表格共享“仓库身份离站”的交互模型。

> 未保存笔记弹窗布局修正（2026-07-15，见 `logs/2026-07-15-unsaved-note-dialog-layout.md`）：确认弹窗从通用 512px / 24px 密度收敛为 448px / 20px，并压缩重复说明和动作文案；三个互斥动作取消左右分裂并真正收拢为右对齐决策组，窄屏使用同宽单列。

> 字体层级修正（2026-07-15，见 `logs/2026-07-15-repo-inspector-typography.md`）：Repo Table 与 Repo Inspector 重排为连续的 13px 身份/正文、12px 常规元数据、11px Activity/紧凑元数据；Inspector 仓库名由 22px/Bold 收敛为 18px/SemiBold。数字与日期统一 Geist Mono + tabular numerals；同时修复 `tailwind-merge` 误删自定义语义字号 class 的根因，并以用户 Chrome computed style 验证最终层级。

> Repo Quick Look（2026-07-15，见 `logs/2026-07-15-repo-quick-look.md`、ADR 0010）：移除低价值的 Pin / Expand / Peek / Focus 与桌面停靠布局；桌面右侧、平板居中使用非模态 portal 悬浮窗，手机保留底部 Sheet，主内容打开前后尺寸与位置完全不变。保留 J/K、虚拟列表定位、焦点恢复与未保存笔记三选项保护。

> 分段切换器统一（2026-07-15，见 `logs/2026-07-15-settings-segmented-control-consistency.md`）：Settings 主题切换从独立 solid 轨道收敛为 Browse 使用的默认 glass 轨道，文本 / 图标两种内容表达共享同一表面、边框、圆角、选中态与动效规范。

> 空状态动作收敛（2026-07-15，见 `logs/2026-07-15-empty-state-action-hierarchy.md`）：Collections / Tags 在无数据时只保留空状态主体中的首次创建主操作，不再于页头重复显示；已有数据后恢复页头创建入口，标签搜索无结果仍保留追加能力。

> 加载反馈统一（2026-07-15，见 `logs/2026-07-15-loading-state-unification.md`）：移除 Browse 首次进入时 route Suspense 的大矩形闪烁，默认页改为直接加载；其余路由与 Browse / Collections / Tags / Collection Detail / Dashboard / Import Export 全部改为镜像真实结构的专属骨架。初始查询与后台刷新分离，Import Export 不再闪现假空态；同步改为真实 indeterminate 状态，保存 / 删除 / 恢复等写操作统一按钮内 pending 反馈、重复提交防护、i18n 与 reduced-motion / a11y 语义。

> 交互统一（2026-07-15，见 `logs/2026-07-15-browse-repo-name-link-consistency.md`）：Browse 宫格与表格的仓库名称统一为 GitHub 外链；表格整行的其余区域继续打开详情抽屉，并移除名称旁重复的 external-link 图标。两种视图由此共享“名称离站、容器看详情”的交互模型。

> 优化（2026-07-14，见 `logs/2026-07-14-browse-list-organization-responsive.md`、`logs/2026-07-14-browse-list-information-hierarchy-correction.md`、`logs/2026-07-14-browse-list-row-interaction.md`）：Browse 列表从固定 640px GitHub 元数据表格重构为响应式语义表格：整行打开详情、独立外链打开 GitHub，新增 Archived 与 Updated + Starred activity；最终桌面列收敛为 Repository / Language / Stars / Activity，标签 / 集合 / 笔记仅在存在时作为 Repository 次级上下文出现，不再用 Organization 独立列或“未整理”占位。桌面 64px、移动端堆叠且无横向滚动，虚拟行按实测高度校准并补 `aria-rowcount` / `aria-rowindex`。

> 视觉修复（2026-07-14，见 `logs/2026-07-14-browse-list-surface-alignment-polish.md`）：Browse 列表表面改用与 Repo Card 一致的 `--card`，以 `overflow: clip` 完整裁切圆角且不引入新的滚动容器；表头统一左对齐并与 cell 共用列模板和内边距。吸顶控制区移除贯穿视口的底部分隔线，改为无硬边界的 10px 渐隐背景。

> 信息层级修正（2026-07-14，见 `logs/2026-07-14-browse-list-information-hierarchy-correction.md`）：移除低信息密度的 Organization 列及重复“未整理”状态，为 Language 恢复 9rem 固定空间；表头改用 40px muted band、12px semibold 与更高对比度，和 12px regular metadata 形成稳定层级。

> 交互修正（2026-07-14，见 `logs/2026-07-14-browse-list-row-interaction.md`）：Browse 列表由名称按钮改为整行打开详情；行支持 click、Enter 与 Space，并提供整行 hover / focus 状态。GitHub external-link 是唯一离站入口，显式隔离 click 与 keyboard 冒泡。

> 优化（2026-07-14，见 `logs/2026-07-14-contextual-github-reconnect.md`）：GitHub 授权恢复从横跨 App Shell 的持久 banner 重构为上下文化状态：Topbar Sync 原位切换为 warning Reconnect，User Menu 提供简短状态说明和备用入口，Browse / Dashboard 空状态直接恢复；页面不再被局部同步问题推挤或阻断，短说明 tooltip 按内容宽度紧凑呈现。

> 优化（2026-07-14，见 `logs/2026-07-14-open-filter-toolbar.md`）：Browse 筛选栏移除包裹独立控件的冗余 GlassRail，改为筛选靠左、排序靠右的开放式工具栏；默认 facet 文案缩短为 Language / Topic，active 筛选使用克制的 primary 边框与背景，窄屏按组安全换行。

> 修复（2026-07-14，见 `logs/2026-07-14-nested-filter-overlay-dismissal.md`）：修正“更多筛选”内 Select 打开后点击父 Popover 会导致父子两层同时关闭的问题；父层在 Radix Select 的 modal pointer-event 隔离期间显式保持可交互，实现点击父层只收起子层、点击两层之外才全部关闭。

> 优化（2026-07-14，见 `logs/2026-07-14-form-control-focus-treatment.md`）：共享 Input、Textarea 与 SelectTrigger 移除 shadcn 默认 3px 蓝色外扩焦点环，统一改为主题感知的 `foreground/60` 中性边框聚焦态；错误态优先级、键盘可见性和其他交互组件的既有 focus ring 保持不变。

> 优化（2026-07-14，见 `logs/2026-07-14-browse-card-information-hierarchy.md`）：Browse 卡片重构为 208px 舒展四段式结构，用户标签优先于 GitHub topics，集合数量与笔记状态归入整理信息栏，Stars / Forks 与紧凑 Updated / Starred 时间组形成单基线 Footer；真实溢出的两行描述 hover 展示完整 tooltip。新增轻量笔记 repo ID 索引与批量集合计数，避免逐卡查询。整卡详情触发器与 GitHub 外链改为并列语义，骨架、虚拟化估算、en / zh-CN 与键盘焦点同步更新。

> 优化（2026-07-14，见 `logs/2026-07-14-browse-filter-hierarchy-and-facet-performance.md`）：Browse 筛选条从 7 个同级决策收敛为语言 / Topic / 标签 / 更多筛选 / 排序，Star 阈值、更新时间与状态进入带 active count 的次级弹层；语言与 Topic 改为固定高度搜索 picker，首开仅渲染 20 个选项、搜索最多渲染 50 个完整集合匹配项，消除高基数 Topic 下拉的超长菜单与同步挂载卡顿。新增共享 Popover 原语、en / zh-CN 文案与结果窗口单测；三处搜索放大镜收敛为共享 `SearchInputIcon`，统一使用 `black/60` 和正确前景层级。

> 优化（2026-07-13，见 `logs/2026-07-13-import-export-clarity.md`）：导出区从“先选格式、再点通用下载”的隐含两步交互改为 JSON / CSV / Markdown 三条直接下载路径；每种格式明确标注用途、数据范围与能否恢复，并移除低价值的原始文本预览。导入区改称“恢复备份”，明确只恢复已同步仓库的组织数据，不会新增 star 或仓库；en / zh-CN 文案同步更新。

> 视觉系统升级（2026-07-13，见 `logs/2026-07-13-graphite-glass-visual-system.md`、ADR 0009）：按 Impeccable 的 shape → colorize → critique → audit → polish 流程，将 Primer/独立 Lumno 色彩重构为 **Asterism Graphite Glass**。Light/Dark 使用冷蓝石墨灰阶，单一电光蓝统一品牌、主操作、链接、焦点与选中状态；玻璃严格限制在顶栏、搜索、筛选、切换器与浮层等交互层，内容卡片和图表保持实体表面。Logo、Dashboard 图表、Repo Card、Sidebar、Login、Drawer/Dialog 与共享 UI token 已同步；响应式触控目标、键盘激活、focus-visible、reduced-motion 与无 blur 降级完成。Impeccable detector 对 `apps/web/src`、`packages/ui/src` 均为 0 findings；lint/typecheck/test/build 全绿，核心颜色组合达到 WCAG 2.1 AA。

> 修复（2026-06-30，见 `logs/2026-06-30-sync-stars-deploy-fix.md`）：顶部栏「Sync」此前报通用错误，根因是 `sync-stars` Edge Function **从未部署**到项目（端点 404）。已 `supabase functions deploy sync-stars`（现 `ACTIVE v1`），并让 `invokeSyncStars` 透传函数返回的真实错误（`FunctionsHttpError.context`）+ toast 附 `description`，避免再吞错。`provider_token` 不持久化的局限不变（刷新后需重登）。**部署是每环境一次性手工步骤**。

> 修复（2026-07-06，见 `logs/2026-07-06-ui-dist-alias-fix.md`）：`packages/ui` 的 dev/watch 产物曾残留 `@/lib/utils`、`@/components/*` path alias，导致 Web Vite 消费 `@asterism/ui/dist` 时报 `[plugin:vite:import-analysis] Failed to resolve import "@/lib/utils"`。已将 `packages/ui/src` 内部导入改为相对路径并重建，`dist` 不再含 `@/` alias。

> 修复（2026-07-06，见 `logs/2026-07-06-github-session-reconnect.md`）：刷新/恢复 Supabase 会话后可能缺少 GitHub `provider_token`，此前点击 Sync 只提示 session 过期，但界面仍显示已登录且没有重新登录入口。已将「Asterism 已登录但 GitHub 授权需刷新」建模为独立状态：应用顶部显示提示条并提供唯一可见的 Reconnect GitHub 主入口，点击后立即显示 pending 反馈，账号菜单保留备用入口，并新增 web 侧 Vitest 回归测试。

> 修复（2026-07-06，见 `logs/2026-07-06-app-page-scrollbar.md`）：应用内页面级纵向滚动统一由 `AppLayout` 主内容区承担，Browse / Collection Detail 的仓库虚拟列表不再创建内部纵向滚动条，滚动条贴主内容区右边缘；全局 scrollbar thumb 调轻调细，局部弹层/菜单/代码预览滚动保留。

> 优化（2026-07-06，见 `logs/2026-07-06-browse-sticky-toolbar.md`）：Browse 页上下分栏，标题 + 筛选栏固定、仅列表区滚动；`main` 恢复统一 `p-6`，不再用 sticky 或各页面补 `pt-6`。

> 优化（2026-07-06，见 `logs/2026-07-06-card-tag-overflow.md`）：Browse 卡片视图的 GitHub topics 与用户自定义 tags 统一为单行 chip 行，按真实宽度动态折叠为 `+n`，hover/focus 展示剩余项 tooltip，避免长标签撑高卡片。

> 优化（2026-07-07，见 `logs/2026-07-07-glass-segmented-controls.md`）：设计系统新增按 Lumno 源码值对齐的 `GlassControlRow`、`GlassRail` 与滑块式 `SegmentedControl`（page noise、stuck row 背景/line、4px blur、4px inset、8px/14px tab padding、源码色值/动效），先落地 Browse 视图切换、Settings 主题切换与 Browse 筛选 rail；限定玻璃质感只作为控制区承托，不扩散到主卡片或列表行。

> 基础设施（2026-07-07，见 `logs/2026-07-07-agent-skills-vendor.md`）：新增项目级 agent skills 治理层 `knowledge/skills/`，vendor `vercel-labs/agent-skills` 的 React / composition / Vercel 部署与优化 skills，并同步到仓库内 `.agents/skills/`；根 `AGENTS.md` 已声明触发规则，后续 React 与 Vercel 相关任务需按需读取对应 skill，且本项目 contracts 优先。

> 修复（2026-07-07，见 `logs/2026-07-07-glass-control-fixes.md`）：复查磨砂控制条复刻发现三处偏差并修复——Browse 吸顶动效未接线（`GlassControlRow` 从未收到 `stuck`，已接入基于 `listScrollElement.scrollTop` 的检测）、Settings 主题切换误用磨砂吸顶条（`GlassRail`/`SegmentedControl` 新增 `variant: 'glass'|'solid'`，Settings 改用 `solid` 且去掉 `GlassControlRow` 包裹）、意外带回水彩背景图（已从 `app-layout.tsx` 移除引用）。尺寸/圆角/透明度/变换保留 Lumno 原始字面量不变；散落的硬编码颜色新增为专属 `--glass-*` token 集中管理，视觉零差异。

> 优化（2026-07-08，见 `logs/2026-07-07-browse-view-switch-perf.md`、`logs/2026-07-08-browse-tab-immediate-response.md`、`logs/2026-07-08-browse-tab-paint-boundary.md`）：Browse 宫格/列表切换收敛为最终方案——tab 本地选中态与 `SegmentedControl` 滑块立即响应；内容视图通过 double `requestAnimationFrame` 让出一次 paint 后再用 `startTransition` 提交；grid/list 首次访问后常驻挂载，后续仅 CSS 显隐，避免虚拟列表反复重建；视图偏好仍异步持久化到 Zustand/localStorage。

> 部署（2026-07-08，见 `logs/2026-07-08-vercel-prod-deploy.md`）：Asterism Web（`apps/web`，Vite SPA）首次部署到 Vercel **生产环境**，项目落在团队 `xcm1115s-projects`，生产稳定域名为 `https://asterism-xcm1115s-projects.vercel.app`。新增仓库根 `vercel.json` 固化 framework=vite、installCommand=`pnpm install`、buildCommand=`turbo run build --filter=@asterism/web`、outputDirectory=apps/web/dist 与 SPA 回退路由 `/ (.*) → /index.html`；将 `package.json` 的 `prepare` 脚本改为「仅在 git 仓库内安装 lefthook」，规避 Vercel 构建环境（无 `.git`）下 `pnpm install` 因 `lefthook install` 失败导致构建中止；`.gitignore` 增补 `.vercel/`。生产环境变量 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 沿用既有值（9 天前已配置，无需覆盖）。**关键后续**：需把生产域名加入 Supabase Auth 的 Site URL / Redirect URLs，否则 GitHub OAuth 登录回调会失败。

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

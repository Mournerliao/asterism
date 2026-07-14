# Contextual GitHub reconnect

## Context

Supabase 会话仍有效但 GitHub provider token 缺失时，应用此前在 Topbar 下方显示横跨整个 Shell 的持久 banner。该状态只影响同步能力，却以全局故障的视觉优先级推挤所有页面内容，并与账号菜单中的 Reconnect 重复。

## Changes

- 移除 AppLayout 的 GitHubSessionBanner 及其组件，恢复状态不再改变页面高度。
- Topbar 始终保留同步入口；需要恢复时原位切换为 warning 风格的 Reconnect GitHub，移动端使用图标、tooltip 和 aria-label，pending 显示 Connecting。
- User Menu 增加“GitHub connection expired”状态标题、恢复同步说明和备用 Reconnect 动作。
- Browse / Dashboard 空状态在需要恢复时直接提供 Reconnect，不再隐藏主操作。
- `useSyncStars` 暴露 reconnect pending 状态，所有入口沿用同一恢复行为；失败继续通过 toast 反馈。
- en / zh-CN 文案从技术性的授权刷新说明改为面向任务的连接恢复说明。
- Topbar 的短说明 tooltip 按内容宽度收缩并保持单行，避免固定最大宽度与平衡换行共同产生无意义留白。

## Verification

- 正常同步、需要恢复、恢复 pending、桌面与移动端 Topbar、User Menu、Browse / Dashboard 空状态视觉与键盘验收。
- 页面高度在状态切换前后保持稳定，已有仓库仍可浏览。
- Impeccable detector、lint、typecheck、test 与 build 通过。

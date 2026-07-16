# 2026-07-16 · README 缓存与恢复状态（Issue #4）

## 目标

让 README 的每个请求结果在已打开的 App Shell 工作区内可理解、可恢复，并以 ETag 感知的短期内存缓存减少无效 GitHub 传输，且不持久化 README 或 provider token。

## 实现

- `packages/db` 保持 success / not found / not in library / rate limited / reconnect required / retryable error 的公开 outcome，并在传输层接收 `not_modified`；只有 ETag 与现有成功缓存匹配时才复用 HTML。
- Web 查询 key 只包含用户与规范化 owner/name，不包含 provider token 或 ETag；TanStack Query 提供并发去重和 5 分钟 stale time，重新请求时只从当前 QueryClient 读取成功缓存。
- Edge HTTP handler 从 Deno 适配层中拆出可测试边界：JWT 和精确成员校验先于 GitHub；当前 provider token 优先、缺失时匿名请求；GitHub `html+json` media type 的原始 HTML body 按文本读取，ETag 通过 `If-None-Match` 往返，304 不重复传输 HTML。函数目录成为独立 workspace，使 HTTP 边界测试不反向依赖 Web 包。
- no README 使用“Check again”，not in library 返回 Browse，retryable error 原位重试；rate limit 与 reconnect 提供 Reconnect GitHub 和 Open on GitHub。所有恢复按钮在窄屏维持 44px 触控高度。
- 新增 `readme.checkAgain` en / zh-CN 文案；没有新增持久缓存、数据库迁移或 token 日志。

## TDD 与验证

- DB 测试覆盖全部公开 outcome、token omission、ETag/304 复用与无缓存拒绝。
- Edge HTTP 边界测试覆盖缺失/无效 JWT、成员拒绝、authenticated success、anonymous public fallback、全部 GitHub outcome、ETag/304 和响应不泄漏 token。
- Web 查询测试覆盖稳定 key、5 分钟 freshness、并发 dedup、ETag refresh 和无 localStorage 写入；路由测试覆盖每个专属恢复状态、rate-limit 双操作和原位 retry。
- Impeccable 浏览器验收：真实登录 App Shell 的 retryable 状态在 desktop light、390×844 light/dark 下无横向溢出；移动 header 与恢复按钮均为 44px，深色 foreground / muted 层级正确。
- 当前远端函数仍未部署；真实 authenticated / anonymous / 304 浏览器链保留在 BACKLOG，自动化 HTTP 边界已完整覆盖。

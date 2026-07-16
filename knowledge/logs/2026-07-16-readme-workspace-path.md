# 2026-07-16 · README 工作区端到端路径（Issue #3）

## 目标

从 Repo Quick Look 进入保留 App Shell 的 README 工作区，建立成员授权的 GitHub HTML 读取、清洗渲染、来源返回与未保存笔记保护的首个端到端 tracer bullet。

## 实现

- Quick Look Overview 底部新增 `BookOpen + Read README + chevron` 全宽导航行；移动目标 44px，使用 hover/focus/active 既有 token，无 Card 或 primary mutation 样式。
- 新增 `/repos/:owner/:name/readme`，仓库基础路由自动重定向；工作区保持 Sidebar/Topbar，52px 响应式 header 立即显示来源返回、仓库身份与 GitHub 外链，README 请求期间使用文档形状骨架。
- Browse 与 Collection 入口携带验证过的 route state；Collection 返回原详情路由，直链、无效来源或仓库身份不一致回退 Browse。
- Repo Inspector controller 增加 deferred route intent，复用原保存/放弃/继续编辑对话框；显式 bypass 仅覆盖已获用户决策的内部导航，保存失败保留草稿与原路由。
- `packages/db` 新增类型化 README outcome 与 Edge Function 调用；Web TanStack Query 使用用户/owner/name 稳定 key、5 分钟 stale time，不持久化响应。
- `read-repo-readme` 先验证 JWT 与 `user_stars` 成员关系，再请求 GitHub REST HTML；支持 provider token 可选传递、匿名公开回退与 no README / membership / rate limit / reconnect / retryable outcomes。
- DOMPurify 后再执行显式允许列表，移除可执行元素与危险 URL；fragment 留在 Asterism，仓库相对链接指向 GitHub，图片限制为安全 HTTP(S) 或仓库 raw 路径。新增固定 Graphite Glass 兼容 Markdown CSS。
- en / zh-CN 全量外部化；新增 DOMPurify、Happy DOM 测试依赖。

## TDD 与验证

- 聚焦测试：DB outcome 3、HTML 安全与链接 2、来源返回与双语 5、Repo Inspector 草稿决策 4、工作区授权成功/成员拒绝双语 4，共新增 18 个断言场景。
- 浏览器：真实登录态检查 Quick Look 与路由；桌面 dark、移动 390×844 dark/light 均无横向溢出，工作区 header 52px，移动返回与 GitHub 外链均为 44×44；基础路由重定向成功。
- 本轮未部署远端 Edge Function，因此真实浏览器成功内容仍需部署后补验；本地 retryable error 状态符合预期并已记入 BACKLOG。
- 工程门：lint、typecheck、full test、build（最终结果见提交前验证）。

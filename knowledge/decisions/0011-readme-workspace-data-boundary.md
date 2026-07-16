# ADR 0011 · README 工作区实时读取与安全边界

- Status: Accepted
- Date: 2026-07-16

## Context

Repo Quick Look 适合快速检查与整理，不适合承载完整 README。新工作区需要在 Asterism 内阅读 GitHub 生成的 HTML，同时只能允许当前用户已同步的 starred 仓库，且远端 HTML 不能成为持久业务数据或执行不受信内容。

## Options

1. 客户端直接请求 GitHub：实现简单，但无法在请求前可靠执行 Asterism 资料库成员授权，也会把 GitHub token 与上游策略散落到 Web。
2. 将 README HTML 写入 Postgres：可复用现有 RLS，但会制造易过期的重复数据与额外迁移、同步和清理成本。
3. 经受保护 Edge Function 实时读取，并在客户端清洗：复用 Supabase 会话边界，能在 GitHub 请求前校验成员关系，同时维持 README 的短期缓存与非持久属性。

## Decision

采用方案 3。工作区路由通过 TanStack Query 调用 `packages/db`，再调用 `read-repo-readme` Edge Function。函数先验证 Supabase JWT，再以 `user_id + repos.full_name` 精确相等确认 `user_stars` 成员关系；只有通过后才请求 GitHub REST README HTML。当前会话若有 `provider_token` 则只用于该次上游请求，否则允许公开仓库匿名回退。token 不记录、不缓存、不持久化。

HTML 不进入 Postgres、Dexie 或浏览器持久存储。TanStack Query 以用户和仓库身份作为稳定 key，在 5 分钟 freshness 内去重；重新验证时把成功结果的 ETag 传给 Edge Function，函数以 `If-None-Match` 请求 GitHub，304 仅复用 ETag 匹配的内存 HTML。Web 在渲染前执行 DOMPurify 与第二层显式 tag/attribute allowlist，移除脚本、事件属性、表单、可执行 embed 与危险 URL；fragment 留在工作区，仓库相对链接转向 GitHub，外链使用新标签页与安全 rel。固定 Markdown CSS 随应用版本发布。

## Consequences

- 每个 Supabase 环境必须单独部署 `read-repo-readme`，未部署时客户端显示可恢复错误。
- GitHub 网络、速率限制与 README 缺失成为类型化的短期状态，而不是数据库状态。
- Edge Function 是独立 Deno 部署单元，不能依赖 workspace package，因此函数与 `packages/db` 各自声明同一组 outcome；Web 入口仍执行运行时校验，变更协议时必须同步两端。
- 后续 Outline 与视觉语料库可沿此链深化，无需变更数据库 schema。

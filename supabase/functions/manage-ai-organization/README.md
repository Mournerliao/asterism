# Edge Function · `manage-ai-organization`

受信的 AI 整理草稿生命周期：`generate`、`read`、`update-review`、`discard`。函数验证
Supabase JWT，所有读取与写入按该 `user_id` 限定；普通客户端对
`ai_organization_drafts` 无表权限。

生成固定读取 1–50 个已 Star 仓库的最新 Postgres 元数据、当前标签 / 集合与关系。仅当
`include_notes_in_ai=true` 时读取笔记，并按每条 2,000 个 Unicode code points 截断。README
不会被查询。函数只接受 active、有效且 model 精确匹配最近 capability 测试的 Connection；
凭据在本次调用内解密，经与 Connection 管理相同的 SSRF / allowlist / 同源重定向边界调用
Provider。

Provider 调用与严格 schema 校验先完成；成功后通过单个数据库函数原子插入或替换该用户的
唯一草稿。网络、超时、Provider 或 schema 错误不会触碰旧草稿。草稿只保存验证后的建议、
repository ID 快照与 Connection / adapter / model provenance，不保存 credential 或原始响应。

持久化草稿使用 review schema v2：现有关系建议带稳定 ID 且默认 `selected=true`，建议新建
分类带稳定 ID、依赖的 repository ID 范围且默认 `approved=false`。每次
`update-review` 只修改一项选择，并必须携带当前 `expectedRevision`；数据库函数用
compare-and-set 原子推进 revision。旧 revision 返回稳定 conflict 结果，不覆盖较新的审阅选择。

## 部署

先依次应用 `20260723120000_ai_organization_drafts.sql` 与
`20260723160000_ai_organization_review.sql`，并按
`../manage-ai-connections/README.md` 配置 `AI_CREDENTIAL_ENCRYPTION_KEYS`、
`AI_CREDENTIAL_ACTIVE_VERSION` 与 `AI_CUSTOM_ENDPOINT_ALLOWLIST`，再执行：

```bash
supabase functions deploy manage-ai-organization
```

Smoke test 前需准备：已登录用户、1–50 个已同步 Star、通过 Generation capability 测试且已
设为 active 的 Connection/model。分别验证生成后读取、取消一条关系建议、新分类单独批准、
刷新后恢复审阅选择、用旧 revision 触发 conflict、显式丢弃，以及故意让 Provider 返回错误时
旧草稿及其审阅状态仍可读取。不要在命令、fixture 或日志中写入真实 credential。

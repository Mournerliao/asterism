# manage-organization-tasks

受信 Organization Task 生命周期接口。客户端只发送目标、任务 ID、期望 revision
和结构化决定；函数使用用户 JWT 确定 ownership，并以 service role 执行候选发现、
快照固化、Generation 披露批准与结束。

部署：

```sh
supabase functions deploy manage-organization-tasks
```

该函数不读取 credential，也不调用 Generation Provider。候选扫描会分页读取完整授权
Star 库、当前 canonical、笔记授权输入和可用的浏览器 derived embedding；客户端可选提交
本地生成的目标向量，向量只用于候选发现且不会进入任务投影。Opportunity 只持久化
kind/count，接受时由当前 locale 的翻译资源固化 Task goal。

依次应用 `20260728180000_organization_tasks.sql` 与
`20260728183000_localized_organization_opportunity_goal.sql` 后再部署。

# read-repo-readme

受保护的 README 读取边界：校验 Supabase 会话与 `user_stars` 成员关系后，才请求 GitHub REST README HTML。返回内容不写入 Postgres 或 Dexie；客户端必须在渲染前按允许列表清洗 HTML。

部署：

```sh
supabase functions deploy read-repo-readme
```

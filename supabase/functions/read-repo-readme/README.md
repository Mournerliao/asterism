# read-repo-readme

受保护的 README 读取边界：校验 Supabase 会话与 `user_stars` 成员关系后，才请求 GitHub REST README HTML。优先使用当前请求携带的 GitHub provider token；缺少 token 时请求公开仓库。短期客户端缓存通过 ETag / `If-None-Match` 重新验证，304 响应不会重复传输 HTML。token 与 README 均不记录、不写入 Postgres 或浏览器持久存储；客户端必须在渲染前按允许列表清洗 HTML。

部署：

```sh
supabase functions deploy read-repo-readme
```

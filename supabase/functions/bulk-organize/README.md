# bulk-organize

`bulk-organize` 是 Issue #11 的受信批量关系写入路径。函数验证 Supabase JWT，随后使用 service role：

- 创建固定 repository ID 范围与逐关系执行账本；
- 以 50 条为上限领取有界批次，幂等添加/移除 tag 与 collection 关系；
- 记录成功、可重试失败与终止失败，并只重试可重试项；
- 在用户明确接受剩余终止失败后结束操作。

普通客户端对 `bulk_operations` / `bulk_operation_items` 只有本人行的读取权限，不能直接写入状态或关系。函数不会调用 GitHub API，也不会执行 star/unstar。

```bash
supabase functions deploy bulk-organize
```

运行时只使用 Supabase 自动注入的 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`，不得把 service-role key 放入 Web 环境变量。

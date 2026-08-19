# bulk-organize

`bulk-organize` 是 Issue #11 的受信批量关系写入路径。函数验证 Supabase JWT，随后使用 service role：

- 创建固定 repository ID 范围与逐关系执行账本；
- 以 50 条为上限领取有界批次；collection 经受信 mutation RPC
  原子记录 relation head、effective mutation receipt 与 item identity；
- 记录成功、可重试失败与终止失败，并只重试可重试项；
- 在用户明确接受剩余终止失败后结束操作。

普通客户端对 `bulk_operations` / `bulk_operation_items` 只有本人行的读取权限，不能直接写入状态或关系。函数不会调用 GitHub API，也不会执行 star/unstar。

`bulk-organize` create 请求只接受 `manual`，并要求 interaction（当前可创建
`bulk_dialog` / `collection_dial`）与 UUID `clientRequestId`。相同用户重复提交同一个
`clientRequestId` 会恢复同一 operation。历史 `promotion` 账本可继续读取，但产品不再创建
AI 来源的 operation。`undo` 请求绑定原 Collection Dial operation 与独立 UUID
`clientRequestId`：服务端只为 30 秒窗口内、原 add receipt 仍匹配 relation head 的关系创建唯一
`collection_dial_undo` operation，并固化 eligible / skipped / conflict / expired 投影；Undo 本身继续使用同一有界执行与精确 retry 生命周期。

```bash
supabase functions deploy bulk-organize
```

运行时只使用 Supabase 自动注入的 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`，不得把 service-role key 放入 Web 环境变量。

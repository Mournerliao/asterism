# 2026-08-18 · 关闭 #33 并部署 Collection Dial Undo 远端

## 目标

把已合入 `main` 的 #33 服务端边界推到维护者 Supabase 项目 `hqtrmulypxwdqvzlkhke`，关闭 GitHub #33，解锁 #34。

## 执行

- `supabase migration list --linked` 显示远端已到 `20260814120000`，仅缺 `20260814170000`。
- dry-run 确认只会推送 `20260814170000_collection_dial_undo.sql` 后执行 `supabase db push --linked --yes`。
- `supabase functions deploy bulk-organize --project-ref hqtrmulypxwdqvzlkhke --use-api`，函数由 ACTIVE v4 升为 v5。
- 远端查询确认 `create_collection_dial_undo` 存在；migration list 现为 Local=Remote，含 `20260814170000`。
- 关闭 GitHub #33。未提交真实表单，未改动 canonical 数据。

## 后续

#34 真实连续桌面 10 / 移动 5 验收与 throwaway prototype 退役现在可以领取。

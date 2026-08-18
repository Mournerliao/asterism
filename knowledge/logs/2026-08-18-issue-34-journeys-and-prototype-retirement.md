# 2026-08-18 · #34 真实连续任务验收与原型退役

## 目标

在真实 authenticated Browse、已部署 bulk-organize 与 RLS 上完成 Collection Dial 连续旅程验收，修复范围内缺陷，然后退役 throwaway prototype。

## 验收证据（Chrome `document.title` 前缀 `ASTERISM34:`）

- 连续两次成功 Undo：`fancydirty/mediary-scout`、`King-zzk/Steam-Workshops-Tools-SWTools`，均为 Removed 1。
- List：Grip Space → Q/E → Enter → Added 1 → Undo。
- 多选冻结：已有 `microsoft/AI-For-Beginners` + 未加入 `King-zzk/Steam-Workshops-Tools-SWTools`；筛选隐藏后仍写入 `Added 1 · Already there 1`。
- embedding 静默：Dial 内无 AI / Sparkles / opt-in / embedding model；`aria-live` 存在。
- 390×844 连续 5 项 add+undo：`done:mobile5:`（title 截断，循环在全部 5 项后才宣告 done）。
- viewport / a11y：inner≈194 cap=3；inner=920 cap=5；inner=1440 cap=7；dark 抽样；焦点进入 Dial、Escape 恢复 Grip。账号当时只有 1 个集合，故渲染 targets=1，窗口容量仍按宽度切换。

DEV 页内验收脚本仅用于本轮测量，未合入仓库。

## 范围内修复

- `apply_collection_relation_mutation` 中 PL/pgSQL 变量 `undo_item` 与表别名同名，导致 Undo apply 失败；迁移 `20260818150000_fix_collection_dial_undo_apply.sql` 已推远端。
- 客户端：成功 Undo 在 `onWriteCommitted` 后立刻宣告，并取消 in-flight list 以免盖掉结果；Retry Undo 按 `lastErrorCode` 映射 i18n（不拼接服务端原文）；More 重开清空搜索。

## 原型退役

- 删除 Browse `?prototype=collection-dial` 分支、`collection-dial-prototype` 组件/CSS、假数据与只服务原型的 i18n。
- 许可文件夹 SVG 迁到 `packages/ui/src/assets/collection-dial/`；生产 `FolderArtwork` 继续用设计 token 着色同一几何。

## 残留

- 临时集合已删除。2026-08-18 19:30 在已登录 Chrome `/collections` 核到 `0 collections` 与 empty state `No collections yet`，未见 `#34 temp`。
- 未实测：桌面连续 10、Grid pointer drop、虚拟化卸载、More/New 真路径、Undo 冲突/过期、390 滚动误触、200% zoom / reduced motion。合入后不要关闭 #34，直到这些项有证据或明确降级。

## 后续

#34 保持开放；Phase 2.2 仍为实现中，直到余下旅程补测或明确裁剪。

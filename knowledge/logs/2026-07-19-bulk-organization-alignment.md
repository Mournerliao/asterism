# 2026-07-19 · 批量整理可靠写入对齐

## 结论

- “全选当前筛选结果”在触发时固化为 repository ID 范围；筛选变化或后续同步不扩大该范围。
- 批量标签 / 集合以单条关系变更为最小执行与重试单位；成功不回滚，重复添加或移除按幂等成功处理。
- 用户确认后持久化批量操作与逐项结果，使刷新、关闭或网络中断后仍可恢复。
- 失败区分为可重试与终止；终止失败不能原样循环重试，需用户明确结束或修正后重新发起。
- 选中导出沿用 JSON / CSV / Markdown：JSON 是合并式可恢复部分备份，CSV / Markdown 只导出；导出读取固定范围内的最新权威数据，不建立写操作记录。

## 开发起点

先实现 `bulk_operations` / `bulk_operation_items`、`packages/db` 的批量操作边界与幂等执行，再接 Web 多选、结果恢复和选中导出。AI 草稿确认后复用同一路径，不单独设计 AI 写入通道。

## 文档同步

已更新 product / architecture / data-model contracts、roadmap、PROGRESS、BACKLOG，并新增 ADR 0023。

# 2026-07-19 · 批量整理 issues 发布

按 tracer-bullet 纵向切片把 ADR 0023 与批量导出契约发布为两个 GitHub Issues：

- #11 `Add reliable bulk organization`：稳定选择范围、tags / collections 批量关系变更、持久化逐项结果、幂等写入、失败分类与跨刷新恢复。
- #12 `Export selected repositories`：固定选择范围的 JSON 部分备份、CSV 清单与 Markdown 可读归档。

两项均标记 `ready-for-agent`；#12 的正文引用 #11，并已建立 GitHub 原生 blocked-by 依赖。现有 open issues 在发布前为空，没有重复工单。

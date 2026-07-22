# 2026-07-23 · AI 整理建议草稿补充对齐

## 目标

复核 Phase 2 AI 切片 B 已有合同与 ADR，只补齐仍会改变实现边界的未决项，不重复讨论已经接受的 BYOK、人工确认、数据披露与批量恢复原则。

## 对齐结果

- 现有标签 / 集合候选以稳定 ID + 显示名称发送给模型；模型必须引用稳定 ID，服务端拒绝未知或越权 ID。建议新建分类使用带 `relationType` 的名称，并由服务端规范化及检查大小写、空白与近似名称。
- 每个用户最多一个活动草稿。开始新生成前提示替换；新生成成功后原子替换，失败保留旧草稿。
- 单次 AI 生成最多处理 50 个仓库，不做隐式分块。超过时保留选择并要求缩小范围；手动批量整理与导出不受影响。长文本按调用前披露的上限截断，具体默认值留给 PRD。
- 确认草稿由受信数据库事务重新校验最终勾选、幂等创建已确认的新分类、建立 `source: "ai_draft"` 的批量操作及逐关系项目；只有操作成功落库后才删除草稿。实际关系写入继续复用现有批量执行器及部分失败恢复。

## 文档同步

已同步 `contracts/product.md`、`architecture.md`、`data-model.md`、`ui-ux.md`、`roadmap.md`、`state/PROGRESS.md` 与 `state/BACKLOG.md`。这些结论细化 ADR 0020 / 0023 的既有边界，不新增难以逆转的架构决策，因此未新增 ADR。

## 下一步

本轮对齐已综合为 GitHub #14「Add reviewable AI organization drafts」PRD。PRD 采用已确认的 handler / Provider / UI / 真实 Supabase 测试接缝，把已启用笔记的默认截断值定为每条 2,000 个 Unicode code points，并覆盖错误分类、生成响应校验与 UI 状态。

`/to-issues` 随后将 PRD 拆为 3 个 `ready-for-agent` tracer-bullet issues：#15 生成 / 恢复有界草稿（无 blocker）、#16 持久化人工审阅（blocked by #15）、#17 受信确认到可靠批量操作及真实环境验收（blocked by #16）。#16 / #17 已建立 GitHub 原生 blocked-by 依赖，issue 正文同时保留可读依赖指针。下一步从 #15 开始 `/implement`。

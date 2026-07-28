# 2026-07-28 · 自然 AI 整理 tickets

## 目标

将 GitHub #23 的 Phase 2.1 Organization Task 规格拆成少量、单会话可完成的 tracer-bullet tickets，并在 GitHub 建立真实 blocking edges。

## 结果

- 初稿 12 张票被用户明确判定过细；重新按用户可见纵向能力压缩为 5 张线性 tickets。
- GitHub #24：创建、发现候选并批准持久 Organization Task，无 blocker。
- GitHub #25：可恢复的内部分页 Generation 与 Organization Plan，blocked by #24。
- GitHub #26：风险分层审阅与可靠执行，blocked by #25。
- GitHub #27：基于有效关系 mutation identity 的安全 Task Undo，blocked by #26。
- GitHub #28：旧 AI 草稿迁移、生产切换与 selection-first 路径退役，blocked by #27。
- 五张票均标记 `ready-for-agent`，GitHub 原生依赖已核验为完整线性链；父规格 #23 未关闭、未修改。
- 每张票自身包含相关失败恢复、en / zh-CN、WCAG 2.1 AA、测试 seam、部署说明与四道工程门禁，不另设横向补测试 ticket。

## Frontier

GitHub #24 无 blocker，可在全新会话中用 `/implement` 领取；#25–#28 必须等待各自直接前置票关闭。

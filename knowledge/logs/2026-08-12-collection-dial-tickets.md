# 2026-08-12 · Collection Dial tracer-bullet tickets

## 目标

把 GitHub #29 的 Phase 2.2 buildable spec 拆为单个 fresh context 可实现、可独立验收的 blockers-first tickets，并在 GitHub 使用原生 blocking edges；本轮不进入实现。

## 粒度裁决

首轮 proposal 有 8 张 tickets，用户认为过多。经合并输入 modality、mutation seam 的 expand–contract 阶段，以及 More / New / Undo / recovery 接线，用户批准最终 5 张：

1. #30 `refactor(collections): establish trusted relation mutations`
2. #31 `feat(collections): ship the production Collection Dial`
3. #32 `feat(collections): support frozen scopes and semantic ordering`
4. #33 `feat(collections): add More, New, Undo, and recovery`
5. #34 `test(collections): validate journeys and retire the prototype`

## Blocking edges

GitHub 原生依赖已创建并逐张回读核验：

- #30：`blocked_by=0`，blocking #31
- #31：blocked by #30，blocking #32
- #32：blocked by #31，blocking #33
- #33：blocked by #32，blocking #34
- #34：blocked by #33，`blocking=0`

因此当前唯一可领取 frontier 是 #30。5 张 tickets 均带 `ready-for-agent`，当前无 assignee。

## 边界

- 每张 issue 均引用父规格 #29，并包含用户结果、验收条件与 blocking reference。
- 没有关闭或修改父规格，没有领取 ticket，没有修改生产代码，没有运行实现门禁或部署。
- 临时 issue body 文件已删除；GitHub Issues 是 ticket 权威，knowledge 保存恢复指针。

## 下一步

如用户批准开始实现，在 fresh context 对 #30 运行 `/implement`。#30 关闭后才领取 #31，之后沿原生依赖链 blockers-first 推进；每张 ticket 完成后清空上下文，不把上一张的实现细节当成隐式输入。

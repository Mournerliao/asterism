# 2026-08-12 · Collection Dial buildable spec

## 目标

从 ADR 0033、正式产品 / UI / 数据契约和 throwaway prototype primary source 恢复上下文，为 Phase 2.2 形成可拆票、可验收的生产规格；本轮不进入实现。

## 结果

- 已发布 GitHub #29 `spec(collections): build Collection Dial for direct organization`，标签为 `ready-for-agent`。
- 候选在拿起时冻结完整 repository ID scope 与集合目录；quick targets 最多 7 个。embedding 不可用、范围超过 50 或多选没有简单多数共识时，无提示地退化为当前会话 MRU 与稳定顺序；v1 不显示未经真实阈值校准的 Suggested badge。
- 单项与多选统一复用持久 `bulk-organize` HTTP 生命周期，以 `(user_id, client_request_id)` 防止响应丢失后重复创建 operation；多选仍遵守 ADR 0023 的逐关系执行、部分成功和精确重试。
- More / New 在 Dialog / Sheet 中承接 frozen scope。More 只搜索冻结 catalog；New 的主动作明确为创建并加入，创建成功而关系写入失败时只重试关系，不重复创建或偷偷删除集合。
- ADR 0034 重新建立了收窄到 collection relationship 的 effective mutation identity：所有真实 INSERT / DELETE 推进 relation head，no-op 不推进；Undo 只反转原 operation 真正新增且当前 head 仍匹配 receipt 的关系，不覆盖后续用户意图。
- 规格定义 pointer / touch / keyboard 共用 reducer、Quick Look 未保存笔记 preflight、虚拟项卸载、7px pointer threshold、移动 Grip 与滚动协调、a11y / i18n、reduced motion、真实桌面 10 项 / 移动 5 项测量和 prototype retirement gate。

## 边界

- 未修改生产代码、schema migration、Edge Function 或部署环境。
- 未创建实现 tickets；`/to-tickets` 按 skill 要求必须先向用户展示 ticket 粒度与 blocking edges，获得批准后才发布。
- 临时 issue body 文件在远端发布成功后删除；完整规格以 GitHub #29 为 tracker 权威，知识库保留决策、状态和恢复指针。

## 下一步

在当前未清空的上下文完成 `/to-tickets` proposal。批准后按依赖顺序创建 tracer-bullet issues、应用 `ready-for-agent`，并建立 GitHub 原生 blocking edges；仍不进入实现。

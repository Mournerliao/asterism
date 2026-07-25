# 2026-07-26 · 检索优先系列（ADR 0026，#18–#22）收尾

## 目标

复核 ADR 0026 检索优先系列五张票的完成与关闭状态，补齐遗漏的 issue 关闭动作，并同步持久状态层。

## 核对结论

- **Phase 2 本体（AI BYOK + 批量整理，#11–#17）**：早于 2026-07-23 收尾——roadmap 标 Done、GitHub issues 全部 CLOSED，见 `2026-07-23-phase2-closure-release.md`。本次无需变更。
- **检索优先系列（#18–#22）**：#18–#21 已于 2026-07-25 前关闭；**#22 实现已于 2026-07-25 落地并提交（`647226c` + 修复 `4a36fd2`），但 GitHub issue 一直保持 OPEN**，且实现日志缺 `pnpm build` 门禁记录——本次收尾补齐。

## 收尾动作

1. **门禁复核**（2026-07-26，全部通过）：
   - `pnpm lint`：326 files，0 error / 38 既有 `noNonNullAssertion` warning（热循环内，见 #22 日志）。
   - `pnpm typecheck`：8 个 workspace package。
   - `pnpm test`：core 185 / db 65 / functions 94 / web 170，全部通过。
   - `pnpm build`：通过（经代理完成 embedding 资产校验；仅既有主 chunk warning，未抬高阈值）。
2. **关闭 GitHub #22**：附逐项 acceptance criteria 核对说明（HDBSCAN 纯向量聚类、零依赖命名、星图区域层、promotion 显式动作 + 快照固化、0023 账本复用 + `source: 'promotion'`、安静的镜子、en / zh-CN + a11y、门禁全绿）。
3. **状态同步**：
   - `state/BACKLOG.md`：「检索优先范式继续落地」项勾选为已全部落地。
   - `state/PROGRESS.md`：恢复点更新为 #18–#22 全部交付并关闭，下一步 Phase 3。
   - `logs/2026-07-25-issue-22-emergent-clusters-promotion.md`：追加 Closure 段记录 build 门禁与关闭动作。

## 边界说明

- roadmap 阶段表不变：检索优先系列按 `roadmap.md` L63 属 ADR 0026 之后的独立里程碑，不追溯改写 Phase 2 的合同范围与 Done 日期。
- 不创建 semver / Changelog / Git tag；首个公开版本发布工程仍是独立 backlog 项。
- 无代码变更、无新增 ADR。

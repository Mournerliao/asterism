> 先读：ADR 0026 §8 涌现簇 + promotion；ADR 0023（持久化批量写入账本）、ADR 0025（确认与执行解耦）；`knowledge/contracts/data-model.md` 的 `bulk_operations`。

## What to build

在 derived 侧自动浮现「主题区域」（涌现簇），并让用户把某个簇**主动固化**为普通 canonical 集合——这是双平面里**唯一的写入桥**。簇由纯向量密度聚类得到（不混 topic / language），默认从簇内 topics / 高频词起名（BYOK generation 仅可选增益）。promotion 是显式动作 + 轻审阅（改名、剔除个别 repo、确认），写入**复用 0023 持久化逐项批量账本**，新增 `bulk_operations.source = 'promotion'` 作 provenance。性格是**「安静的镜子」**：系统绝不主动提示加集合。

**prototype 先行**：HDBSCAN 类聚类的最小簇大小 / 距离度量参数先用 `/prototype` 实测。

## Acceptance criteria

- [ ] 涌现簇 = 纯向量密度聚类（HDBSCAN 类：自动定簇数 + 允许孤立点不属任何簇），**不预设 k、不混 topic / language**；同批 star 每次簇一致。
- [ ] 簇命名默认零依赖（topics / 高频词）；BYOK generation 未配置不影响簇可用。
- [ ] 簇作为星图（#21）的「区域层」呈现。
- [ ] promotion 为用户发起的**显式动作 + 轻审阅态**；固化那刻**快照**选中 repos 成为普通 `collections` 成员，此后与 derived 簇互不影响（canonical 神圣性硬保障）。
- [ ] promotion 写入**复用 0023 账本**与既有有界执行器 / 恢复；`bulk_operations.source` 扩展加入 `promotion`（迁移 CHECK、RPC、`packages/db` 类型与受信执行路径同步）。
- [ ] **安静的镜子**：新 star 照常自动嵌入并归簇，但系统绝不主动提示 promotion。
- [ ] en / zh-CN、a11y；`pnpm lint / typecheck / test / build` 全绿；更新 `knowledge/state/*` 与 `logs/`。

## Blocked by

- #19 — 浏览器内 embedding 运行时与全库回填（需向量）。
- #21 — 石墨语义星图（簇是星图的「区域层」，promotion 在 derived 视图上发起）。

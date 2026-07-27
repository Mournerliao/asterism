# 2026-07-27 · Related Stars review findings 修复

## 背景

局部语义邻域实现 review 发现 5 项问题：增量回填后 embedding list 的 10 分钟 fresh cache 未失效、render 重复同步读取 localStorage、测试用类型断言规避索引不确定性、opt-in 读写逻辑重复，以及 core 暴露了产品未使用的候选池 / 数量调参接口。

## 修复

- 新增 app 内部 `embedding-consent` 单一状态源，集中 storage key、许可缓存、准备状态与 React subscription。
- 区分用户许可和向量可用性：已许可用户首次进入仍为 `preparing`，成功才进入 `available`，失败进入 `degraded`。
- 每轮准备使用独立 token；旧异步轮次完成时无法覆盖较新的准备状态。
- Related Stars 只在 `available` 时查询和派生结果；检查 / 回填 / 失败期间整段静默。
- 回填成功后主动失效 `embeddingKeys.list(userId)`；查询在准备期间保持 disabled，解锁后读取完整新鲜向量。
- core 将互为 Top-12 与最多 5 条收为实现内领域不变量，删除 `SemanticNeighborhoodOptions` 及其 barrel export。
- 测试改用具名 fixture，移除 `as StarredRepoRecord`。

## 回归覆盖

- localStorage 许可只读取一次，重复 render 使用内存缓存。
- `disabled → preparing → available` 与失败后的 `degraded` 状态。
- 旧准备轮次不能提前解锁新轮次。
- Related Stars 在准备期间不查询，完成后读取并展示。
- 每次成功准备后失效当前用户的 embedding list query。
- 固定 Top-12 的单向近邻拒绝，以及固定 5 条上限。

## 验证

- `pnpm lint`：通过。
- `pnpm typecheck`：全仓通过。
- `pnpm test`：全仓 512 tests 通过（core 167、db 67、functions 94、web 184）。
- `pnpm build`：全仓通过；Web 仅保留既有主 chunk > 500 kB warning。

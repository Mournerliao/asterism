# 2026-08-14 · GitHub #32 冻结多选范围与语义排序

## 目标与边界

在 #31 的单项生产 Collection Dial 上增加稳定多选范围、精确部分成员写入和静默语义候选排序。范围严格停在
#32：不实现 More / New、Undo、刷新后的 Dial UI 恢复或原型退役。

## 实现

- 选择模式只为已选 Grid / List 项显示 44px Grip。拿起时按选择顺序去重并冻结完整 repository ID 范围、
  集合目录、每个目标的已有 / 缺失数量及缺失 ID；筛选、排序、同步和虚拟卸载只改变可见投影。
- 完整包含范围的集合不进入候选；部分包含仍可选，但 operation 保留完整 `source_repo_ids`，只为冻结的
  missing item subset 创建逐关系 items。Edge Function 严格校验 subset 非空、去重且属于完整范围，RPC 幂等
  绑定完整范围与缺失子集；无缺失目标不创建 operation / receipt。
- 每次多选拿起使用独立 client request ID 与持久账本。owner-scoped、security-invoker 的服务端 exists 查询直接
  判断任意未完成多选，不受最近 20 条历史窗口、Supabase 行数上限或 offset 漂移影响；查询 pending / error 时
  多选 fail closed。本地 pending scope ref 与 reducer 同时封住 create 返回前的竞态，committing 阶段不可关闭。
  未完成多选只阻止新多选，单项和 bulk dialog 继续按各自 interaction 工作。
- 浏览器只提供与默认模型、当前仓库内容指纹匹配的新鲜向量。集合至少两个成员向量才形成 centroid；单项按
  cosine similarity 排序；2–50 项中每个能产生 top-1 的有效向量投一票，仅至少两票且占有效票严格多数的目标
  被提升。超过 50、未 opt-in、查询失败、向量不足或无共识均静默回退 session MRU、更新时间、规范化名称和 ID。
- 推荐信号只改变候选顺序，不显示 AI、Sparkles、badge、相似度或诊断日志。ready / pending / success / failure
  使用冻结 membership 基线与 operation items 播报准确双语计数；failure 使用 assertive alert。

## TDD、审查与验证

- Core 覆盖 scope 去重冻结、部分成员计数、单项 centroid、2–50 top-1 严格多数、无共识、超过 50 fallback、
  无效向量不进入有效票分母、陈旧响应与未完成多选竞态。
- Web / DB / Edge Function 覆盖选中项 Grip、精确 missing subset payload、幂等持久 operation、只重试失败项、
  transport / convergence 精确计数、未完成账本超出最近历史窗口及严格输入拒绝。
- 双轴 review 发现并修复：未完成 operation 的 20 条窗口截断、create 期间多选竞态、transport / convergence
  错误计数、Dial 对 bulk dialog 的全局锁、failure live region 礼貌等级，以及有效票分母边界。
- `pnpm lint`、`pnpm typecheck`、`pnpm test`（333 tests）与 `pnpm build` 通过；保留既有 Web chunk warning。
- `pnpm test:db` 已尝试，但本机 Docker / OrbStack daemon 未启动，Supabase 本地 Postgres 无法连接；SQL migration
  与 pgTAP 断言已加入，Edge Function handler / projection tests 通过，数据库门禁仍由 CI 的本地 Supabase 执行。
- 真实 in-app Chromium 验证 Grid / List、390×844、选中项才显示 Grip、两个选中项在筛选只剩一项可见后仍显示
  “2 selected / 1 hidden by filters”，移动 List 可见 Grip 为 44×44，控制台无错误。维护者账号没有 collection，
  未为了 smoke 创建或修改真实数据；完整 scope 提交由 operation / handler 自动化覆盖，单项入口保留并通过回归。

## 后续

下一 frontier 为 #33：More / New、每次成功独立 Undo 与 durable recovery。真实连续桌面 10 项 / 移动 5 项任务、
完整生产写入 journey 和 throwaway prototype 退役仍属于 #34。

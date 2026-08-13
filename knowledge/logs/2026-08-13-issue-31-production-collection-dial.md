# 2026-08-13 · GitHub #31 单项生产 Collection Dial

## 目标与边界

把经 ADR 0033 接受的 Collection Dial 作为 Browse 的真实单仓库整理入口落地，但不复用、改名或连接
throwaway prototype。范围严格停在 #31：不实现多选、semantic ordering、More / New、Undo、durable recovery
增强或原型退役。

## 实现

- `packages/core` 新增页面无关的候选排序、冻结 pickup snapshot 与 reducer。候选排除已含完整 scope 的集合，
  最多 7 个，按 session MRU、更新时间倒序、规范化名称与 ID 稳定排序。
- `packages/ui` 新增受控 `CollectionDial` 与 44px `CollectionDialGrip`。组件按自身容器宽度呈现 7 / 5 / 3
  奇数窗口，active 尽量居中、序列不循环；隐藏目标退出 pointer、Tab 与 accessibility tree。
- Browse grid / list 的 Grip 不改变原卡片 / 行的 Enter、Space 与 Quick Look 语义。Space 拿起；指针超过 7px
  才拿起；触控只允许 Grip，滚动和卡片长按不触发。源项虚拟卸载后窗口级手势仍可完成。
- 点击文件夹与 Q/E 只选择；Enter / 明确按钮确认；目标上 pointerup 一步确认；盘外松手、pointercancel、
  Escape 或路由卸载取消未确认手势。Quick Look 脏笔记拒绝关闭时中止拿起并保留 draft / focus。
- 写入复用受信 bulk operation seam，interaction 为 `collection_dial`，带稳定 client request ID。
  只有权威 operation 成功且 collection query 收敛后才播报成功；失败保留冻结 scope 和 target 供重试或取消。
- 所有文案已加入 `en` / `zh-CN`，状态经 `aria-live` 播报，并支持 focus restore、dark mode 与 reduced motion。

## TDD 与验证

预先固定三个测试 seam：core reducer / 排序、共享 UI 键盘与 a11y、Browse 持久 operation 集成。自动化覆盖
候选冻结与排除、非循环选择、选择 / 确认分离、重试状态、7px 阈值、Quick Look 脏笔记保护、grid / list
Grip 隔离、幂等 operation 与 query 收敛门槛。

- `pnpm lint`：通过，293 files。
- `pnpm --filter @asterism/core typecheck`、UI / Web typecheck：通过。
- `pnpm test`：通过，core 68、db 37、supabase functions 27、web 182 tests。
- `pnpm build`：通过；保留既有 Web chunk-size warning。
- 真实浏览器：1536 / 1024 / 390 / 320、grid / list、light / dark、Q/E、Enter、Escape、指针取消、焦点恢复
  与 reduced motion 均验证；200% 有效宽度另有 ResizeObserver 自动化回归。

维护者账号当时没有集合，因此没有为了 smoke 创建或修改真实集合数据；真实写入边界以持久 operation 集成测试
覆盖，浏览器验收刻意只走无写入的选择 / 取消路径。

双轴 code review 发现并修复四个边缘条件：指针拿起后将键盘焦点交给 Dial；焦点恢复只选择当前可见
grid / list 的 Grip；操作按钮保留原生 Enter 语义；success 成为不可再次选择或提交的终态。对应回归测试已加入。

## 后续

下一 frontier 为 #32 冻结多选范围与 semantic ordering。More / New / Undo 和 durable recovery 属于 #33，真实连续
任务与原型退役属于 #34。

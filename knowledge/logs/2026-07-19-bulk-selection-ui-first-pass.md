# Bulk selection UI first pass

## 目标

根据 Impeccable 双代理评审，先修复 Browse 批量选择中最影响范围信任感与连续操作的问题，不扩展 Shift 范围选择，也不重做批量整理 Dialog。

## 实现

- 将批量选择控制区重排为明确的模式标题、范围摘要与动作组；0 选中时只突出选择当前范围，有选择后才显示清空与批量整理。
- 按当前可见范围提供“选择 / 添加 / 取消选择全部”三种准确文案；集合更新使用 immutable Set，并保留其他筛选条件下的隐藏选择。
- 显示被当前筛选隐藏的已选数量，避免仅凭总数猜测最终提交范围。
- 网格卡片使用 surface + inset ring + check mark；列表行在 2026-07-20 的降噪复核后改为 surface + checkbox，避免全选时逐行完整 ring 形成线条墙。
- 选择模式内不再提供 Quick Look；2026-07-20 复核后，卡片仅保留项目名为 GitHub 外链，描述与其余区域统一切换选择，表格仍使用纯选择路径。
- 选择模式隐藏视图切换，减少与当前任务无关的并列决策；工具栏保留安全换行布局。
- 新增 en / zh-CN 文案与 filtered-scope Set 回归测试。

## 技能与工具

- Impeccable：先运行 critique，再按 Asterism Graphite Glass、product register 与 WCAG 2.1 AA 约束落地；设计 hook 对 Browse 与 Repo Card 均为 0 findings。
- Vercel React Best Practices：用派生状态和 functional Set 更新避免 effect 同步、状态覆盖与不必要的持久化。
- 复用现有 `Button`、`GlassControlRow`、Card/Table 与设计 tokens，没有新增依赖或平行组件体系。

## 验证

- `pnpm lint`：通过，241 files。
- `pnpm typecheck`：通过，9 tasks。
- `pnpm test`：通过；Web 25 files / 125 tests，仓库 7 tasks 全部成功。
- `pnpm build`：通过；保留已知的 Web 主 chunk warning，不调整阈值。
- 浏览器视觉检查：当前会话未暴露 Chrome 控制接口，无法生成改后登录态截图；以用户基线截图、响应式源码审查、Impeccable hook 与完整工程门禁作为 fallback。后续仍建议在真实登录态复核 light/dark、en/zh-CN、窄屏换行与跨筛选选择。

## 迭代

本轮修复了两类验证反馈：将 `role="region"` 改为语义化 `<section>`，并应用 Biome 的最终格式化；随后全部门禁通过。

用户在列表视图复核时发现选择框未显示。定向 DOM 测试确认选择框节点已渲染且为绝对定位，但 Grid 化的虚拟表格行没有 `relative` 定位上下文；选择框相对外层定位后被表格的 `overflow-clip` 裁掉。为行补充 `relative` 后，测试由红转绿；没有调整表格列宽、行高或选择语义。

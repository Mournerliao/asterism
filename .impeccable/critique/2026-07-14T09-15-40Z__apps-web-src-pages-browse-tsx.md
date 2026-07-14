---
target: apps/web/src/pages/browse.tsx（Browse 列表/表格视图）
total_score: 28
p0_count: 0
p1_count: 3
timestamp: 2026-07-14T09-15-40Z
slug: apps-web-src-pages-browse-tsx
---
# Browse 列表页设计评审

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | 总数、视图、排序、加载/同步/错误状态完整；筛选结果变化的无障碍公告未验证。 |
| 2 | Match System / Real World | 4/4 | Repository、Language、Stars、Tags、Starred 符合 GitHub 用户心智。 |
| 3 | User Control and Freedom | 3/4 | 可切换视图、清除筛选和重试；Drawer/Popover 的退出与状态恢复未做 live 验证。 |
| 4 | Consistency and Standards | 3/4 | 视觉系统一致；整行 button 内嵌 link 不符合标准表格交互语义。 |
| 5 | Error Prevention | 3/4 | 筛选控件约束清晰；行与外链的双点击路径容易造成误触。 |
| 6 | Recognition Rather Than Recall | 3/4 | 主要筛选和排序可见；图标式视图切换依赖 tooltip，溢出 tags 没有 `+n`。 |
| 7 | Flexibility and Efficiency | 2/4 | 有搜索、组合筛选、排序和虚拟滚动；列表缺少更完整的快速判断上下文。 |
| 8 | Aesthetic and Minimalist Design | 3/4 | 克制专业，但宽屏列分配和整列空 Tags 让极简变成信息利用率不足。 |
| 9 | Error Recovery | 3/4 | 代码提供错误重试、无结果清除、未同步与 reconnect 恢复动作。 |
| 10 | Help and Documentation | 1/4 | 当前任务表面缺少上下文帮助；对专家不阻塞，但首次学习依赖试错。 |
| **Total** |  | **28/40** | **Good：基础扎实，但发布前应修复关键信息、移动端与表格语义。** |

## Anti-Patterns Verdict

**LLM assessment**：不会让人一眼认定是 AI 生成。Graphite 中性色、单一蓝色强调、标准表格、克制圆角与阴影都符合成熟开发者工具；没有 cream SaaS、渐变文字、玻璃卡片墙、hero metric、uppercase eyebrow 等套路。问题更接近“默认管理后台表格”：Asterism 的个人整理价值在 list mode 中表达不足。

**Deterministic scan**：对 `browse.tsx`、`repo-table.tsx`、`browse-repo-list.tsx`、`repo-filter-bar.tsx`、`repo-view-toggle.tsx`、`repo-collection.tsx` 的扫描返回 exit 0、`[]`，共 0 findings；没有 rule、文件位置或 false positive。扫描干净不等于通过运行时 a11y/响应式验证。

**Visual overlays**：浏览器自动化可用，但新 tab 访问 `http://localhost:5173/browse` 返回 `ERR_CONNECTION_REFUSED`。无法完成 mutable injection 预检，未启动 live-server、未注入 `detect.js`，因此没有可靠的用户可见 overlay。视觉判断使用用户提供的 2668×2552 静态截图作为 fallback。

## Overall Impression

这是一个安静、可信、信息架构合理的开发者工具页面，但目前更像“整理过的 GitHub stars 表格”，还没有充分体现“个人知识星图”。最大机会不是增加装饰，而是让每一行更快回答三个问题：这个仓库现在是否活跃、我为什么收藏它、我是否已经整理过它。

## What's Working

1. **视觉系统克制可信**：背景、细边框、蓝色链接、语言色点和 segmented control 都服务状态与结构，没有装饰噪音。
2. **筛选层级清楚**：Language、Topic 与 More filters 形成渐进披露，排序独立靠右，避免七八个同级筛选器挤成一排。
3. **状态与性能基础扎实**：实现覆盖 loading/error/empty/no-results/sync，并针对数百到上千仓库使用虚拟滚动。

## Priority Issues

### [P1] 列表缺少做判断所需的关键状态

**Why it matters**：产品契约要求每个仓库项展示最近更新时间和归档状态；当前表格只显示 Starred date，完全不显示 `pushed_at` 与 `archived`。用户甚至可以按更新时间排序，却看不到排序依据，容易误判停更仓库。

**Fix**：将末列改为紧凑的 activity 区：主值显示 Updated，次值或 tooltip 保留 Starred；归档仓库在仓库名旁显示已有 outline Archived badge。窄屏优先保留 Archived，日期可降级为 tooltip/详情。

**Suggested command**：`$impeccable harden apps/web/src/components/repo-table.tsx`

### [P1] 表格行的复合交互语义不可靠

**Why it matters**：`<tr role="button">` 内部又嵌套 GitHub `<a>`，把原生 row、button 和 link 三种语义叠在一起。键盘和屏幕阅读器用户可能无法预测 Enter/Space/Tab 的目标；视觉上也没有解释“点名称去 GitHub、点行空白开 Drawer”。

**Fix**：保留 `<tr>` 原生 row 语义，在 Repository cell 内提供明确的“打开详情”button，并与 GitHub 外链作为 sibling；外链增加可识别的 external-link cue/accessible name；详情按钮提供明确 focus ring。虚拟表格补充总行数与虚拟行索引语义并做 NVDA/VoiceOver 实测。

**Suggested command**：`$impeccable audit apps/web/src/components/repo-table.tsx`

### [P1] 移动端仍被 640px 最小表宽锁死

**Why it matters**：`min-w-[640px]` 无条件生效；即使窄屏已隐藏 Language、Tags、Starred，375px 手机仍必须横向滚动。它直接冲突于“响应式 Web 首要”的验收标准。

**Fix**：窄屏采用 `min-w-full table-fixed`，仅在足够宽的 breakpoint 使用固定最小宽度；Repository 吸收剩余空间，Stars 固定窄宽并右对齐。在 320/375/768px、长仓库名、中文描述和 200% zoom 下验证。视图切换 raw button 同时补足 coarse pointer 44×44px 命中区域。

**Suggested command**：`$impeccable adapt apps/web/src/components/repo-table.tsx`

### [P2] 宽屏空间分配浪费，并弱化 Asterism 的整理价值

**Why it matters**：截图中 Repository 内容被限制在约 340px，Tags 整列为空，Starred 被推到最右；眼睛需要跨越长距离确认同一行。list mode 还丢失 collection/note 状态，tags 超过 3 个直接截断且没有 `+n`。

**Fix**：用 `colgroup`/`table-layout` 让 Repository 吸收剩余宽度；Language、Stars、日期保持紧凑。无 tags 时收缩/隐藏 Tags 列；有 tags 时显示 2–3 个并加 `+n` tooltip。把 collection count 与 note presence 合并为紧凑 Organization cell 或并入 Tags cell，保持 56px 行高。

**Suggested command**：`$impeccable layout apps/web/src/components/repo-table.tsx`

## Persona Red Flags

**Alex（Power User）**：他会优先使用 list mode 快速扫描，但 archived、updated、collection/note 与第 4 个之后的 tags 都不可见；无法一次判断仓库是否仍活跃、是否已经整理。仓库名外链与整行详情的双路径还要求首次试错学习。

**Sam（Accessibility-Dependent User）**：`tr[role=button]` 内嵌 link 是明确的语义红旗；行焦点只改变背景且移除 outline。虚拟表格未见显式总行数/虚拟索引，能否正确宣布“第 n 行，共 509 行”需要真实辅助技术验证。

**Casey（Mobile User）**：640px 最小表宽让手机必须横向滚动；隐藏多列后仍没换来真正的窄屏结构。视图切换 raw button 可能绕过现有 coarse-pointer 44px 规则。

## Minor Observations

- ISO 日期精确且适合技术用户，但不利于快速扫描；可用相对日期作主值、完整日期作 tooltip/accessible label。
- `MAX_TAGS = 3` 直接截断，没有 `+n`，会让用户误以为只有三个标签。
- Tags trigger 在用户没有标签时完全消失；若其它入口没有引导，新用户可能不知道该能力存在。
- light theme 的静态截图不足以验证 hover、focus、sticky、Drawer、dark theme 和玻璃合成后的实际对比度。
- Language 同时使用色点与文字，避免了纯颜色编码，这是正确的。

## Questions to Consider

1. List mode 的目标是“更紧凑”，还是“最快找回并整理仓库”？如果是后者，为什么 archived、updated、collection、note 和溢出 tags 都难以看见？
2. 用户在点击前，如何知道 repo name 会离开 Asterism，而同一行空白处会打开 Drawer？
3. 面对 509 个仓库，用户应在三秒内优先认出 GitHub popularity，还是自己曾经做过的分类与笔记？
4. 宽屏的大量空白是在创造克制，还是在浪费本可承载个人组织上下文的空间？

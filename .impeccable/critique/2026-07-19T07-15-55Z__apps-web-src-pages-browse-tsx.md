---
timestamp: 2026-07-19T07-15-55Z
slug: apps-web-src-pages-browse-tsx
---
# Asterism Browse 批量选择 UI/UX 评审

Method: dual-agent (A: /root/assessment_a · B: /root/assessment_b)

## Design Health Score

Nielsen 总分：23/40（Acceptable）。

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2 | 模式边界与选择范围不够可见 |
| 2 | Match System / Real World | 3 | Clear 与 Cancel 对象不同但层级相近 |
| 3 | User Control and Freedom | 3 | 缺少隐藏选择管理与明确退出捷径 |
| 4 | Consistency and Standards | 2 | 网格与列表的选中反馈不一致 |
| 5 | Error Prevention | 2 | Select all 会静默替换已有选择 |
| 6 | Recognition Rather Than Recall | 2 | 隐藏项与快照语义需要用户记忆 |
| 7 | Flexibility and Efficiency | 3 | 缺少范围选择与更高效的键盘操作 |
| 8 | Aesthetic and Minimalist Design | 2 | 状态、范围、动作、视图切换平铺 |
| 9 | Error Recovery | 3 | 执行后的恢复强，选择阶段较弱 |
| 10 | Help and Documentation | 1 | 没有解释筛选快照与隐藏选择 |

## Strengths

- 通过 repository ID 固化筛选快照，技术语义符合产品契约。
- Card/Table 均提供键盘选择与 ARIA 状态，selected count 使用 aria-live。
- 0 项禁用执行、pending 防误关闭、局部失败可重试，执行阶段恢复链条成熟。

## Priority issues

1. P1：网格卡片只改变左上小 checkbox，整卡不呈现 bulkSelected；列表则整行高亮，反馈不一致。
2. P1：顶部把 selected count、Select all、Clear、Organize、Cancel、view toggle 平铺，未形成“模式—范围—动作”层级。
3. P1：筛选变化后隐藏选择仍参与计数和提交，但界面不说明；Select all filtered 会静默覆盖原 Set。
4. P2：批量模式仍保留普通浏览交互。卡片仓库名可跳 GitHub；列表外链点击还会冒泡并切换选择。
5. P2：响应式仅依赖 flex-wrap；中英文长文案在窄屏会重排漂移，主动作仍远离拇指区。

## Cognitive load

截图状态存在超过四个并列决策点，且用户需要记住当前选择是否跨筛选、是否包含隐藏项、Select all 是追加还是替换。0 选中时 disabled primary 占据最高视觉权重，真正可执行的 Select all 反而降级。

## Emotional journey

进入模式缺少明确切换感；0 选中是流程低谷；大量全选时缺少范围证明，容易焦虑；整理 Dialog 与失败恢复是当前最令人安心的部分。

## Detector evidence

`detect.mjs --json apps/web/src` 返回 3 个 broken-image warning，均位于 README 清洗测试夹具，属于与生产批量 UI 无关的误报。批量选择目标有效 finding 为 0。浏览器新标签页可打开 localhost，但 mutable injection 被中止，未声称 overlay 或浏览器交互证据；视觉依据为用户截图，行为依据为源码。

## Recommended direction

将批量选择改造成明确的临时 mode bar：左侧模式与范围摘要，中部选择范围控制，右侧单一主动作和退出。网格/列表共享整面选中状态；显示 hidden-by-filter 数量；Select all 明确追加或替换语义；移动端采用底部 action bar。

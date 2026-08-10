---
target: Collection Dial 原型
total_score: 21
p0_count: 0
p1_count: 4
timestamp: 2026-08-10T18-13-22Z
slug: omponents-prototypes-collection-dial-prototype-tsx
---
# Collection Dial 原型设计评审

Method: dual-agent (A: `/root/critique_design` · B: `/root/critique_evidence`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2 | 当前集合明确，但活动仓库、pending 与失败说明几乎只对屏幕阅读器可见。 |
| 2 | Match System / Real World | 3 | 文件夹张开与吸入符合现实隐喻，但缺少实际托盘，Q/E 又偏游戏控制。 |
| 3 | User Control and Freedom | 3 | 有 Escape、Undo、Retry 和边界禁用，但盘面没有可见取消出口。 |
| 4 | Consistency and Standards | 2 | 内部风格一致，但与 Asterism 产品表面割裂；按钮说“选择”却直接提交。 |
| 5 | Error Prevention | 2 | 拖动阈值和 hover 预反馈有效，但 selected、open、ready-to-receive 三态混在一起。 |
| 6 | Recognition Rather Than Recall | 2 | 集合名称可见，但用户必须记住活动仓库、点击语义与 Escape 规则。 |
| 7 | Flexibility and Efficiency | 3 | 支持 pointer、click、Q/E、箭头、Enter 和 wheel，但重复流程被固定动画拖慢。 |
| 8 | Aesthetic and Minimalist Design | 2 | 中心层级明确，但大片空白和 bloom 代替了真实结构，边缘标签难读。 |
| 9 | Error Recovery | 1 | 有 Retry 外形，但失败原因不可见，模拟失败分支重试仍会永久失败。 |
| 10 | Help and Documentation | 1 | 盘面缺少就地任务说明，几种操作方式之间的关系不清楚。 |
| **Total** |  | **21/40** | **Acceptable：显著改进后才能进入正式产品** |

## Anti-Patterns Verdict

这不是典型的 AI 卡片网格、渐变文字或廉价玻璃拟态；文件夹结构和动作链有明确创作意图。问题属于 product slop：`strangeness without purpose`。第一眼更像漂浮的 Cover Flow / 游戏物品栏，而不是可信的生产力工具。巨大白色 bloom 承担空间定义，但真正的半圆容器被隐藏；视觉记忆点存在，任务语义却不足。

CLI detector 对 `collection-dial-prototype.tsx` 返回退出码 0、JSON `[]`、0 findings。浏览器在登录页曾命中一条 `transition: width`，但不属于目标页面，已排除。原型页面没有完成可靠的 overlay 注入，因此没有声称存在用户可见覆盖层；本次以用户截图、目标 DOM、TSX/CSS 和静态响应式证据作为 fallback。

## Overall Impression

最值得保留的是“张开—接收—吸入”这条实体动作链。最大的机会不是把文件夹画得更漂亮，而是恢复完整的 `repo → collection` 因果，并给文件夹一个真正承托它们的物理结构。当前用户只能清楚看到 destination，看不到正在处理的 object，也无法确信点击究竟是选择还是提交。

## What’s Working

1. 中心目标层级清楚：居中、放大、抬升、品牌蓝和张开状态五个信号一致，且不只依赖颜色。
2. 文件夹实体构造具有因果：背板、纸张、开口和前片共同服务 hover 与投放反馈，而不是纯装饰。
3. 基础交互骨架扎实：容器宽度由 ResizeObserver 驱动，可见窗口为 7/5/3；隐藏项退出 tab/辅助技术树；Q/E 有 44px 命中、边界禁用、焦点、ARIA 与 reduced-motion 分支。

## Priority Issues

### [P1] 任务对象从视野中消失

- **Why it matters**：盘面只呈现目标 `Frontend`，活动仓库藏在 `sr-only`，scrim 又削弱源列表。连续处理时用户无法确认“正在把什么放到哪里”，错投风险很高。
- **Fix**：在盘面中心上方保留稳定的 `object → destination` 状态行，例如 `vercel/ai → Frontend`；ready、pending、success、failure 都在同一位置更新。拖拽中的 repo chip 可以视觉上成为进入文件夹的纸张，同时降低 scrim 对源上下文的抹除。
- **Suggested command**：`$impeccable clarify`

### [P1] “选择”和“提交”语义冲突

- **Why it matters**：folder 的 ARIA 文案是“选择集合”，点击却立即调用提交；中心文件夹 idle 时也保持张开，selected、hover 与 ready-to-receive 无法区分。新用户会靠误操作和 Undo 才理解规则。
- **Fix**：收敛为单一模型。推荐拖拽松手才提交；点击或箭头只改变目标，再以明确的 `Add to Frontend` / Enter 提交。若坚持 click-to-commit，文案与 ARIA 必须改为 `Add vercel/ai to Frontend`，并提供可见取消。
- **Suggested command**：`$impeccable shape`

### [P1] “半圆盘”没有形成物理承托

- **Why it matters**：截图上方大面积空白，文件夹漂浮在 glow 中；CSS 甚至隐藏了 `.collection-dial-tray__arc`。Q/E 控件远离主体，像两个浮动遥控器。这让画面更接近 Cover Flow，而不是实体收纳盘。
- **Fix**：将交互收成约 260–320px 高的底部 shelf，使用克制的石墨半椭圆 rim/basin、遮挡和接触阴影，让文件夹插入容器；Q/E 贴近 rim 两端并增加 `4/7` 范围反馈。删除承担装饰作用的 radial glow。
- **Suggested command**：`$impeccable layout`

### [P1] Retry 是不可兑现的恢复承诺

- **Why it matters**：视觉用户看不到具体失败信息，只看到突兀的 Retry；模拟分支按 repo id 永久失败，Retry 每次仍失败，会快速摧毁对原型的信任。
- **Fix**：在 object→destination 状态行明确显示失败原因与“目标仍保留”；让首次 Retry 成功，或提供显式失败计数与 Cancel。pending 时锁住重复提交。
- **Suggested command**：`$impeccable harden`

### [P2] 边缘集合名称不可读

- **Why it matters**：12px label 被 0.72 scale 缩成约 8.6px，还随文件夹旋转。`Developer experience` 等长名称在小字号、斜角和低对比下难以辨认。
- **Fix**：将 label 从 folder transform 中解耦，保持至少 12px 和水平基线；长名称截断并提供 tooltip/完整 ARIA。两端只缩物体，不缩文字。
- **Suggested command**：`$impeccable typeset`

## Cognitive Load

8 项中失败 3 项，属于中等认知负荷：Chunking、Minimal choices、Working memory。负荷来源不是元素数量本身，而是关键语义不在元素上：7 个集合和两枚步进控件同屏，用户还要记住活动仓库、点击是否提交以及如何取消。Single focus、Grouping、Visual hierarchy、One thing at a time、Progressive disclosure 基本成立。

## Emotional Journey

进入时，中心文件夹张开有明显惊喜；拖拽靠近并吸入是当前最有说服力的峰值。低谷发生在盘面覆盖内容后：用户不知道正在处理哪个仓库，也不确定点击会发生什么。成功 toast + Undo 能形成良好结束，但永久失败的 Retry 会让 peak-end 完全反转。

## Persona Red Flags

- **Alex（Power User）**：Q/E、Enter 和 wheel 是效率基础，但每个仓库都要观看 360ms 进场与 460ms 投放；连续 10 个时固定等待明显。集合多于 7 时也缺少搜索/jump。
- **Jordan（First-Timer）**：看不到活动仓库或可见的操作动词；Q/E 像游戏按键；点击看似选择，实际立即写入；盘面没有显式 Cancel。
- **Sam（Keyboard/低视力）**：焦点、ARIA 和 reduced-motion 基础不错，但 live region 切换目标时没有播报集合名，按钮语义与实际动作不一致；边缘约 8.6px 旋转标签不可接受。现有 reduced-motion 只取消 tray/toast 动画和投放位移，文件夹自身 transition 没有全部关闭。

## Minor Observations

- `.collection-dial-tray__arc` 存在但隐藏，说明组件命名与实际物理身份已经漂移。
- inactive folder 与浅色背景过于接近；应增加实体轮廓和遮挡，不应继续加大 glow。
- 已有 `activeRepo`、`target`、`dragHint`、`failure` 等双语 key，却从视觉层移除，恰好暴露当前信息缺口。
- 360/460ms 超出产品界面常规 150–250ms；首次可以有戏剧性，连续工作流应缩到约 180–240ms。
- 垂直 wheel 会直接切换集合，容易和继续滚动页面混淆，应只在盘面明确 hover/focus 时接管。
- 蓝色选中用途正确，但整只文件夹饱和度略高；可让 rim/outline 承担 selection，文件夹主体保留中性材质。

## Questions to Consider

1. 原型真正要验证的是“实体文件夹是否增加投放把握”，还是“半圆轮盘是否比标准 collection picker 更高效”？同时验证会混淆 verdict。
2. 点击文件夹究竟是选择目标还是完成写入？如果不能用一个动词稳定回答，交互模型还没收敛。
3. 这个物体是 tray、dial 还是 fan？明确物理身份后，边界、遮挡和控制位置才会自然确定。
4. 桌面真的需要 7 个完整目标，还是 5 个可读目标加 2 个半露预告更符合实体容器感？

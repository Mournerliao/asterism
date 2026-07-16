# Repo Quick Look 可移动窗口

日期：2026-07-16

## 问题

桌面与平板上的 Repo Quick Look 具有独立窗口的表面、圆角和阴影，但只能停留在预设位置，视觉形态与操作能力不一致；用户也无法在浮窗遮挡列表内容时主动移开它。

## 实现

- 仓库身份所在的完整首行作为拖动区域，不添加 drag icon 或其他冗余视觉提示；标题栏形态本身即表达移动能力。
- 从仓库链接开始的 pointer 位移达到 4px 后才判定为拖动并抑制随后 click；未达到阈值的短按仍正常打开 GitHub。关闭按钮显式排除，前后导航位于拖动区域之外。
- pointer capture 延迟到位移超过 4px、真正进入拖动时才启用，避免按下阶段提前把仓库链接的原生 click 重定向给标题栏。
- 快速二次拖动的回归复现证明：指针可能在标题栏收到阈值 move 前直接跨出区域，导致局部 move/up 监听完全丢失。现将 move/up/cancel 生命周期提升到 window，标题栏仅负责 pointerdown；达到阈值后再由原 surface 建立 capture，兼顾快速拖动连续性与短按链接。
- 右下角默认定位引入了第二个边界问题：首次拖动提交 inline top 时仍保留 class 的 `bottom: 24px`，auto-height fixed 外层因此被拉伸到当前位置与页面底部之间，第二次 clamp 将拉伸高度误判为浮窗高度。自由定位现在同步设置 `bottom: auto`，确保边界计算始终使用真实内容高度。
- 桌面与平板的默认位置统一为视口右下角 24px，避免居中浮层遮挡列表起始内容；用户拖动后使用显式 fixed left / top 维持当前位置。
- 移除桌面浮窗固定高度，让窗口按 Overview、Tags、Collections 与 Notes 的实际内容收缩；最大高度保持 736px，超出时由主体内部滚动。
- pointer drag 期间仅更新 GPU transform，结束时再提交 fixed left / top，避免持续修改布局属性。
- 位置限制在视口四周 12px 安全边距内；用户调整窗口尺寸后自动把浮窗收回可见区域。
- 拖动仅用于 `>=768px` 的非模态浮窗；手机底部 Sheet 保持原生手势与位置。

## 验证

- Impeccable detector 对目标组件 0 findings；全仓 lint、Web typecheck、28 项 Web 测试与 Web production build 通过。
- 本地真实浏览器验证完整首行呈现 grab 光标，标题栏空白区域可移动浮窗；拖动结束后提交 fixed 坐标且 transform 归零。
- 重新打开浮窗时实测右侧与底部间距均为 24px；标题首行只包含一个仓库链接与一个关闭按钮，不存在 drag icon、冗余按钮或占位。
- 延迟 pointer capture 后，真实浏览器短按仓库身份成功新开对应 GitHub URL，标题栏不再覆盖链接 click。
- 空笔记仓库实测窗口由固定 736px 收缩为 498px，底部仍保持 24px；内容区 scrollHeight 与 clientHeight 同为 496px，不产生额外空白或无意义滚动。
- 快速二次拖动通过 CDP 底层输入事件建立确定性回归：修复前从标题栏单帧跨出区域时窗口移动 0px；window 生命周期修复后第一次移动 430px，紧接的第二次反向拖动移动 442px，均未脱手。
- 位置约束回归同样由 CDP 重放：修复前首次拖动后 fixed 外层同时保留 top 与 `bottom: 24px`，第二次向下请求 369px 仅移动 12px；清除 bottom 后浮窗高度稳定为 498px，第二次从 top 87px 移至 210px，并正确抵达底部 12px 安全边界。
- 项目目前没有浏览器集成测试基线，Vitest Node 单测无法覆盖真实 pointer hit-testing / capture 生命周期；本次保留 CDP 重放结果作为运行日志，不为单一浮窗引入 Playwright 测试栈或拖拽运行时依赖。
- 默认布局在 `>=768px` 使用右下角 24px；pointer 拖动后的坐标限制在 12px 安全边距内。
- 仓库链接保留原生 anchor、完整 href 与 focus ring，4px pointer 阈值仅在真实拖动后抑制 click；关闭按钮通过独立 window-control 标记排除拖动。

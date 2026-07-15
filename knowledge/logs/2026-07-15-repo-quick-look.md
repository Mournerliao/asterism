# Repo Quick Look 悬浮详情改造

日期：2026-07-15

## 目标

把会挤压主内容的停靠式 Repo Inspector 改为瞬时、非模态的 Quick Look，同时保留连续浏览与笔记编辑安全。

## 实现

- `AppLayout` 恢复单一 main，Repo Quick Look 只挂载一次；桌面右侧、平板居中通过 body portal 悬浮，手机保留最大 `90svh` 的底部 Sheet。
- 删除 Pin、Expand、Peek / Focus、跨路由保持与对应 store / i18n 分支；头部只保留仓库身份、GitHub 外链和关闭。
- 卡片与表格行增加稳定 trigger；打开和关闭从可见 trigger 展开/收回，相邻内容只做 crossfade，reduced motion 下直接切换。
- 支持同项 toggle、外部点击、Esc、J/K、上一项 / 下一项、焦点返回和虚拟列表自动定位。
- dirty note 继续保护切换仓库、外部关闭、Esc、同项 toggle 与路由离开，确认前不执行关闭动画。
- 内容统一为 Overview → Tags → Collections → Notes 单列，沿用 13 / 12 / 11px 语义字号与 Geist Mono 数字层级。

## 验证

- Chrome 1440px：main 打开前后均为 `x=240 / width=1200`；Quick Look 为 `480×736`，`top=72 / right=24`。
- Chrome 1024px：main 打开前后均为 `x=240 / width=784`；Quick Look 水平居中，无横向溢出。
- Chrome 390px：底部 Sheet 高度为 `759.59px / 844px = 90svh`，无横向溢出。
- 实测外部关闭、焦点返回、J/K、dirty note 三选项、light / dark、200% zoom、reduced-motion；控制台无 warning / error。
- Impeccable detector、lint、typecheck、test 与 build 全量执行。

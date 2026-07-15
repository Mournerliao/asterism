# 0010 · 采用自适应 Repo Quick Look

- Status: Accepted
- Date: 2026-07-15
- Supersedes: 固定右侧 Repo Detail Drawer 与双态停靠式 Repo Inspector

## Context

停靠式 Repo Inspector 通过 Peek / Focus 和 Pin 强化了“工作区”概念，但实际使用中这些状态没有产生足够价值，反而让详情打开时主内容缩窄并横向重排。详情的真实任务是快速扫读、连续比较和轻量整理，因此需要保持瞬时、可撤销且不改变列表空间关系。

## Decision

1. `AppLayout` 只保留单一 main 布局并挂载一次 Repo Quick Look；页面仅注册当前排序后的仓库上下文。
2. `≥1280px` 使用 body portal 的右侧固定悬浮窗，`768–1279px` 使用居中非模态悬浮窗，`<768px` 保留底部 Sheet。悬浮窗不占据 flex 空间、不使用遮罩或焦点锁定。
3. 删除 Peek / Focus、Pin、Expand 与跨路由保持；store 只持有当前 record、排序 context、相邻导航与关闭能力，任何路由变化都关闭。
4. 卡片和列表提供稳定 trigger 与选择态；同项再次点击关闭，其他项直接切换，`J` / `K` 和上一项 / 下一项按当前可见顺序导航。
5. 悬浮窗从可见 trigger 以 220ms ease-out 展开/收回，相邻内容使用 120ms crossfade，reduced motion 下取消位移缩放。
6. 笔记草稿由 Inspector Provider 托管；切换、外部点击、Esc、同项 toggle、路由变化与页面卸载统一进行 dirty guard。
7. 内容固定为 Overview → Tags → Collections → Notes 单列；身份与元数据沿用 18 / 13 / 12 / 11px 的紧凑层级。

## Consequences

- 主内容打开前后的 x 与 width 完全稳定，用户可以继续滚动和操作列表。
- 桌面和平板失去“持久工作区”的能力，但状态模型、头部控制和响应式分支显著减少。
- 手机仍使用熟悉的 modal 底部 Sheet；未保存笔记保护保持一致。
- portal 与文档级外部点击监听需要明确处理 trigger、Dialog 和焦点恢复边界。

## Alternatives considered

1. **独立详情路由**：可获得最大编辑空间，但破坏 Browse 连续比较和快速返回的节奏。
2. **停靠式 Peek / Focus 工作区**：编辑空间更大，但打开会改变主内容布局，模式与 Pin 在实际使用中价值不足。
3. **始终使用加宽 modal Drawer**：实现简单，但宽屏遮罩会中断列表操作与连续比较。

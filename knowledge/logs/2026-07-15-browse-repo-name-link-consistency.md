# Browse 仓库名称链接一致性

日期：2026-07-15

## 目标

统一宫格与表格中仓库名称的点击行为，减少同一信息在不同视图中的交互歧义，同时保留表格整行快速打开详情的高效路径。

## 实现

- 表格仓库名称改为新窗口打开对应 GitHub 仓库，与卡片视图一致。
- 表格整行的非交互区域继续打开 Asterism 详情抽屉，并支持 Enter / Space。
- 移除名称旁重复的 external-link 图标，避免两个相邻入口执行相同离站操作。
- 名称链接保留准确的 i18n `aria-label`、可见 focus ring、`noopener noreferrer`，行事件继续排除内部链接。
- 同步更新 Repo List 交互契约与项目进度。

## 验证

- 待完成：lint、typecheck、test、build、Impeccable detector 与浏览器交互复查。

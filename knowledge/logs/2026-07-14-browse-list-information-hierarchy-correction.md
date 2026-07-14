# Browse 列表信息层级修正

日期：2026-07-14

## 问题

首次响应式重构把“个人整理信息重要”错误地实现为固定 Organization 列。在大多数仓库尚未添加标签、集合或笔记时，该列只重复“Unorganized / 未整理”，没有提供可操作信息，却持续占用横向空间并挤压 Language。表头虽然使用较小字号，但和正文共用接近的颜色、字重及表面，层级辨识不足。

## 修正

- 移除 Organization 独立列和“Unorganized / 未整理”文案，语义表格由五列收敛为 Repository / Language / Stars / Activity 四列。
- 标签、集合数量和笔记状态仅在真实存在时显示，作为 Repository 第二行的右侧次级上下文；移动端仍留在 Repository cell 内，不增加额外表格列。
- `≥1024px` 为 Language 保留 9rem、Stars 5rem、Activity 8rem，Repository 吸收剩余空间；`640–1023px` 继续视觉隐藏 Language 并保留辅助技术语义。
- 表头升级为 40px muted band、12px semibold、`foreground/75`；正文 metadata 保持 12px regular，通过 surface、字重和对比度共同建立层级，不使用全大写或额外装饰。
- 替换 Language 的 `sr-only / not-sr-only` 组合，避免恢复可见状态时重置字号和内边距；改用只影响位置、尺寸与 clip-path 的响应式裁切。
- Skeleton、en / zh-CN 文案和 Repo List 合约同步更新。

## 验证

- 509 条真实数据中 Organization header 与 Unorganized cell 均为 0。
- 桌面 Language 宽 144px，TypeScript / JavaScript 完整显示；四列表头与 cell 的内容起点差均为 0。
- 四个表头 computed typography 均为 12px / 600，Language cell 为 12px / 400。
- 1024px table `clientWidth === scrollWidth` 且 Language 可见；768px 无横向溢出，Language 使用 clip-path 隐藏并保留 DOM 语义。
- 浏览器 console 无 error / warning；Impeccable detector、lint、typecheck、test、build 全部通过。

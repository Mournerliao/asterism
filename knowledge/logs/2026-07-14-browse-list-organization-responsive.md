# Browse 列表个人整理与响应式优化

日期：2026-07-14

## 背景

Browse 列表虽然视觉克制，但 Repository 描述被固定窄宽过早截断，Tags 整列经常为空，Updated 与 Archived 缺失；名称外链与整行详情形成复合交互，移动端还被 `min-w-[640px]` 强制横向滚动。这些问题让列表更像 GitHub Stars 表格，没有充分表达 Asterism 的个人整理价值。

## 实现

- 用响应式语义表格替换固定最小宽度表格，桌面行高 64px；移动端重排同一组 cell，并让 TanStack Virtual 按真实行高测量。
- 仓库名称改为详情抽屉主入口，GitHub 改为独立 external-link；移除 row button、嵌套 link 与整行焦点语义。
- 新增 Organization：用户标签动态折叠为 `+n`，并展示集合数量、笔记状态或“未整理”；列表不混入 GitHub topics。
- 新增 Archived badge 与 Updated / Starred 双时间 activity，保证更新时间排序依据可见。
- 1024px 保留五列，768px 隐藏 Language 视觉列，375/320px 堆叠且无横向滚动；隐藏列仍保留五列表头关联。
- SegmentedControl、详情入口与外链在 coarse pointer 下使用至少 44px 命中区域；en / zh-CN 文案同步更新。

## 验证

- `pnpm lint`：通过。
- `pnpm --filter @asterism/web typecheck`：通过。
- `pnpm test`：通过，core 24、db 2、web 24 项测试全部通过。
- `pnpm build`：通过；保留既有 `use-session` chunk 超过 500kB 的构建警告。
- Impeccable detector：相关 Browse / UI 文件 0 findings。
- 浏览器：1440 / 1024 / 768 / 375 / 320px 均无横向溢出；1024px 五列、768px 四个视觉列、移动端堆叠符合契约。
- 交互：名称 click / Enter 打开 Drawer，Escape 关闭；外链保持独立可访问名称；509 条数据长距离滚动后虚拟行从 `0–16` 更新为 `8–30`，无空白或运行时错误。
- 主题与语言：light / dark、en / zh-CN 均验证；移动端辅助技术树保持 Repository / Organization / Language / Stars / Activity 五列表头。

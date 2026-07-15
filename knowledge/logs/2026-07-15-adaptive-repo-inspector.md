# 自适应 Repo Inspector

日期：2026-07-15

## 目标

将常规 Repo Detail Drawer 升级为适合连续浏览与整理的自适应工作区，在宽屏保留 Browse 上下文，并为笔记编辑提供可靠的离开保护。

## 实现

- 新增 Peek / Focus 双态 Repo Inspector：桌面停靠、平板右侧 Sheet、手机底部 Sheet。
- 集中管理选择、当前排序上下文、Pin 与相邻导航；支持面板按钮和 `J` / `K` 快捷键。
- 卡片与列表增加完整选中态和虚拟列表滚动锚定；列表列布局改为由实际容器宽度驱动。
- Pin 仅在 Browse 与具体集合详情之间延续，进入其他页面自动关闭。
- 笔记草稿增加保存并继续、放弃并继续、继续编辑三选项拦截，并覆盖关闭、切换仓库、路由变化和页面卸载。
- 补齐 en / zh-CN 文案、store 单测、Repo Inspector UI 契约与 ADR 0010。

## 验证

- 真实浏览器验证桌面 2300px / 1280px、平板 1024px、手机 390px 的呈现与无横向溢出。
- 验证 Peek / Focus、上一项 / 下一项、`J` / `K`、Pin 路由边界及未保存笔记三选项流程。
- 验证 docked Inspector 挤压主内容时 Repo Table 按容器切换至移动布局。
- Impeccable detector、lint、typecheck、test 与 build 全量通过。

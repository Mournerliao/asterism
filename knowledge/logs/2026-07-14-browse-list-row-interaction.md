# Browse 列表整行详情交互

日期：2026-07-14

## 决策

列表模式采用整行详情交互：点击仓库行任意非交互区域均打开 Asterism Repo Detail Drawer；GitHub external-link 是唯一离开 Asterism 的行内入口。仓库名称不再创建与整行重复的详情按钮。

## 实现

- 虚拟 `tr` 保持原生 `row` 语义，同时在存在 `onSelect` 时加入 `tabIndex=0`、click、Enter 与 Space 处理。
- 行获得统一 pointer cursor、hover 背景与 inset focus ring，键盘焦点覆盖完整点击区域。
- 行事件只响应行自身或非交互内容；`a`、`button` 与 `[role=button]` 等内部控件不触发 Drawer。
- GitHub external-link 保留 `_blank`、`noopener noreferrer`、准确 aria-label 与独立 focus ring，并显式停止 click 冒泡。
- 移除仓库名称的详情 button 及其 coarse-pointer 专属选择器，避免重复 Tab stop。

## 验证

- 鼠标点击 `huggingface/tau` 行打开对应 Repository Details Drawer。
- 聚焦同一行按 Enter 打开对应 Drawer；Space 走相同处理分支并阻止页面滚动。
- 点击 external-link 新开 `https://github.com/huggingface/tau`，原页面 Drawer 保持关闭。
- 辅助技术快照中行名为 `Open details for huggingface/tau`，内部只有 GitHub link 作为独立交互。
- 浏览器 console 无 error / warning；lint、typecheck、test、build 与 Impeccable detector 全部通过。

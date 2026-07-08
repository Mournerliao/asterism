# 2026-07-08 · Browse tab 先 paint 再切内容实验

## 背景

Browse 视图切换已经移除同步 loading overlay，并让 tab 选中态与滑块先在事件路径内响应。但内容区的虚拟列表显隐、scroll element 关联、测量与滚动复位仍可能在同一轮事件后抢占主线程，导致用户体感不如 Settings 主题切换跟手。

## 变更

- `useBrowseView` 在提交内容视图前加入 double `requestAnimationFrame`，让 tab 视觉反馈先获得浏览器 paint 机会。
- 继续用 `startTransition` 提交内容视图，保持 grid/list 内容切换为非急迫更新。
- 用 `useRef` 保存待执行的 frame id；快速连续点击会取消旧 frame，只保留最后一次目标视图；卸载时取消未执行 frame。

## 验收

- 预期：Browse 点击 grid/list 后 tab 先动，内容随后切换；切换期间不出现 skeleton / `aria-busy`。
- 验证命令：`pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`。

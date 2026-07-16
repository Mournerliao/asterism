# 2026-07-17 · README header 仓库身份居中

## 目标

强化 README 工作区的页面标题层级，使仓库身份不再受左侧返回文案或右侧 Outline / GitHub 操作宽度影响，稳定处于 header 的视觉中心。

## 实现

- 将 header 从顺序 flex 布局收敛为 `1fr / auto / 1fr` 对称三列：返回动作靠左、仓库身份几何居中、Outline 与 GitHub 操作靠右。
- 仓库身份保留 owner 弱化、repo name 强调的既有样式，增加居中对齐和安全截断；返回动作在有限空间内同样允许截断。
- 保留移动端 44px 触控目标、平板 Popover、手机 Sheet、桌面 Outline rail 以及原有键盘和焦点语义，不新增颜色、间距 token 或动效。
- 路由测试增加 header 三列结构与仓库身份居中的回归断言，并把 Outline 懒加载等待条件改为目标控件出现，消除测试时序抖动。

## 验证

- README 页面定向 Vitest：23/23 通过。
- 完整 monorepo test / build：通过（Web 73 项测试；生产 CSS 已生成对称三列规则）。
- 变更文件 Biome check：通过。
- Web TypeScript typecheck：通过。
- Impeccable 静态设计检查：0 findings。
- 按用户要求未连接本地浏览器；响应式结果通过结构、现有 container-query 行为与构建产物验证。

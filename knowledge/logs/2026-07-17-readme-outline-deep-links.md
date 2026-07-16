# 2026-07-17 · README 自适应目录与 section 深链（Issue #7）

## 目标

为长 README 提供一套共享状态的自适应 Outline，使桌面、平板和手机在 pointer、键盘、自然滚动与复制深链场景下保持一致、可预测的导航语义。

## 实现

- 新增 `deriveReadmeOutline` 深模块：输入最终清洗 HTML，输出带稳定 heading target 的 HTML 与扁平目录；上下文排除单一文档标题 h1，但保留真实多 h1 sections，并选择最浅有效层级与下一个实际出现的深层级。
- 兼容 skipped levels、GitHub 嵌套 anchor、重复标题、中文标题、空文本与 fallback id；少于两个有效 section 时不显示任何 Outline 控件。
- README 主容器成为 container-query 根：`≥1100px` 呈现右侧实体 rail，`768–1099px` 呈现 header Graphite Glass Popover，`<768px` 呈现 bottom Sheet；三者共享 active state、选择接口与当前分支折叠规则。
- 选择条目写入当前路由 hash、滚动并聚焦 heading；关闭 Popover / Sheet 时保留 heading 焦点。自然滚动按 72px header threshold 更新 active section，并使用 Router `replace` 避免污染浏览器历史。
- 初始 section hash 在清洗内容加载后恢复定位；普通模式选择使用 smooth scroll，`prefers-reduced-motion: reduce` 改为即时滚动。en / zh-CN 新增 Outline 标签与导航名称。

## TDD 与验证

- 纯模块测试覆盖标题型 h1、真实 h1 sections、浅层 + 子层、跳级、GitHub anchor、重复与中文 fallback target。
- 路由级测试覆盖 desktop rail、tablet Popover、mobile Sheet、当前分支折叠、空 Outline、pointer/键盘等价激活、焦点恢复、复制深链、自然滚动 active 更新、history replace 与 reduced motion。
- 定向 Outline + README 页面共 25 项测试通过；Web TypeScript typecheck 通过。
- Impeccable 静态检测为 0 findings，生产 CSS 已确认生成 768px / 1100px 命名 container queries；完整 monorepo typecheck / test / build 通过。Codex 本地浏览器连接连续触发宿主闪退，因此本轮未重复执行 live visual inspection。

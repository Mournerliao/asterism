# Repo Quick Look 仓库链接一致性

日期：2026-07-16

## 问题

Repo Quick Look 的 owner 与 repo name 分占两行，并在名称旁增加独立 external-link 图标；这既让短仓库身份产生不必要的换行，也与 Browse 卡片、表格已经采用的“仓库名称作为唯一 GitHub 外链”不一致。

## 调整

- 浮窗头部改为单行 `owner / repo`，保持 18px 仓库身份层级并在可用宽度不足时整体截断。
- 仓库身份与关闭按钮共享 32px 控制高度并按视觉中线对齐，避免 28px 文字行高与 32px 图标按钮形成顶边错位。
- owner 与分隔符使用 muted 前景，repo name 使用既有 `--link` 语义色，hover 时下划线。
- 让整段仓库身份成为唯一 GitHub 外链，移除重复的 external-link 图标和 tooltip。
- 保留新窗口打开、`noopener noreferrer`、完整 i18n `aria-label` 与可见 focus ring。
- 同步更新 Repo Quick Look UI 契约，明确卡片、表格与浮窗共享同一离站交互模型。

## 验证

- Impeccable detector 对目标组件 0 findings；全仓 lint、Web typecheck、28 项 Web 测试与 Web production build 通过。
- 本地真实浏览器验证浮窗正常打开，仓库身份与关闭按钮容器均为 32px 高且中心点一致，垂直中心偏差为 0px；链接文字以 27px 行高居中于控制行。
- 长仓库身份沿用单行 `truncate`，不会挤压固定宽度的关闭按钮或引入头部换行。

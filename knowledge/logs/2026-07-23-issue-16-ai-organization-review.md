# GitHub #16 · 持久化 AI 整理审阅

- 日期：2026-07-23
- Issue：#16「Review and persist AI organization decisions」
- Parent：#14

## 交付结果

AI 整理草稿已从只读建议升级为可恢复的人工审阅工作流。Provider Adapter 仍输出严格的生成
schema v1；受信服务在持久化前转换为 review schema v2：

- 现有标签 / 集合关系建议获得草稿内稳定 ID，默认 `selected=true`，用户可逐项取消或恢复。
- 建议新建分类获得草稿内稳定 ID，默认 `approved=false`，必须单独批准。
- 新分类的 `repoIds` 是其依赖关系范围；未批准时界面和数据语义都明确阻止这些关系进入后续确认。
- 有效空建议仍作为可恢复草稿展示，可显式丢弃或由后续生成替换。

## 持久化与冲突边界

新增迁移 `20260723160000_ai_organization_review.sql`：

- 无损升级现有 schema v1 活动草稿，保留建议并补齐默认审阅状态。
- 增加 review schema v2 数据约束。
- 增加仅 `service_role` 可调用的 `update_ai_organization_draft_review` RPC。

客户端每次只提交一个审阅决定与 `expectedRevision`。Edge Function 先验证建议身份，再通过
数据库 compare-and-set 原子推进 revision；旧标签页得到稳定 `conflict` 结果，不覆盖较新决定。
TanStack Query 在冲突后重新读取权威草稿。普通客户端仍无草稿表写权限，所有数据访问继续经
`packages/db`。

## UI 与可访问性

Browse 的活动草稿按仓库分组，添加、移除、建议新建分类使用独立标题、图标、文字状态与
`aria-pressed` 控件，不依赖颜色区分。新分类先在全局审批区单独批准，各仓库内同时展示依赖
是否已解锁。保存中禁用重复操作与关闭；写失败保留服务器状态，revision 冲突使用双语
`role=alert` 提示。

Impeccable 静态检测无命中。用仅本地、复核后删除的视觉夹具检查：

- 1440×900，light / dark：640px 对话框，页脚固定，长内容只在主体滚动。
- 390×844：对话框宽 358px，全部代表性行 `scrollWidth === clientWidth`，无横向溢出。

## TDD 与验证

按公共缝执行 red → green：

- `manage-ai-organization` handler / service：v2 默认值、单项更新、非法输入、revision conflict。
- `@asterism/db`：安全投影守卫、更新请求与稳定 conflict 结果。
- Web 组件：按仓库分组、关系取消、新分类批准、冲突提示、刷新后恢复已保存状态。
- locale parity 与简体中文混排扫描。

最终门禁：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`：core 132 / db 53 / functions 87 / web 148
- `pnpm build`：通过；仅保留既有 Vite 主 chunk warning（约 800 kB / gzip 232 kB）

全量测试首次运行遇到一个既有 README 动效时序偶发失败；失败文件单独重跑通过，随后完整
`pnpm test` 再跑全绿。无新增 ADR；本切片细化 ADR 0020 / 0023 的既有边界。下一步是 #17：
把最终审阅决定经受信事务交接为 `source: "ai_draft"` 的可靠批量操作。

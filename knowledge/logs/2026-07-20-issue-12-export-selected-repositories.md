# 2026-07-20 · GitHub #12 导出所选仓库

## 目标

在 Browse 批量选择之上交付只读的“导出所选仓库”：以固定 repository ID 范围下载 JSON 部分备份、CSV 清单与 Markdown 可读归档；读取下载时的最新数据，不改动任何用户数据，也不创建写操作记录。同时收口 #11（可靠批量整理已于 2026-07-19 落地，GitHub issue 陈旧 OPEN）。

## 实现

- `@asterism/core` 新增纯函数 `scopeExportSnapshot(snapshot, repoFullNames)`：按 `fullName` 裁剪 `ExportSnapshot`，只保留范围内仓库及其相关标签 / 集合 / 关联 / 笔记，范围外名字忽略、绝不扩大导出。
- `apps/web/src/lib/export-snapshot.ts` 抽出共享 builder：`buildExportSnapshot` 把 repoId 键的查询数据映射为 `fullName` 键的 `ExportSnapshot`（原内联在导入/导出页）；`buildSelectedExportSnapshot` 组合 build + 派生选中 fullName + core 裁剪。import-export 页改用该 builder，去掉重复内联逻辑。
- `BulkExportDialog`（`components/bulk-export.tsx`）复用现有 Dialog、`serializeExport` 与 `downloadText`；用 `useNotesList({ enabled: open })` 延迟拉取笔记正文，避免拖累 Browse 热路径。三种格式各带说明与下载按钮，空选择或加载中禁用；失败态保留选择并原地重试。
- Browse 工具栏在批量模式下新增 Export 入口并渲染对话框；导出权威范围是 `selectedRepoIds`（与筛选无关），筛选变化不会扩大导出范围。
- en / zh-CN 新增 `bulk.export.*` 文案（含每格式说明），遵循简体中文半角空格与 Star 术语规范。

## TDD 与验证

- core：`scopeExportSnapshot` 先红后绿——范围内保留、范围外忽略、级联裁剪未用到的标签 / 集合。
- web：`buildExportSnapshot` 的 repoId→fullName 映射与 `buildSelectedExportSnapshot` 的裁剪组合；locale 双语 key 对齐与半角空格回归。
- 构建陷阱：`@asterism/core` 经 `main` 解析到 `dist`，新增导出后需 `pnpm --filter @asterism/core build` 才能被 Web 测试解析到。
- 最终全绿：`pnpm lint`（246 files）、`pnpm typecheck`（9 包）、`pnpm test`（core 28 / db 18 / functions 23 / web 135）、`pnpm build`（主 chunk warning 为既有观察项，与本次无关）。
- `/code-review` 子代理：Standards 与 Spec 双轴通过，无阻断项。

## 收口

- GitHub #11、#12 均已实现并验证，关闭对应 issue。
